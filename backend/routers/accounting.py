"""Accounting Ledger Router - ASC 606/IFRS 15 Compliance"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from datetime import datetime, timezone
from decimal import Decimal
from pydantic import BaseModel
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/api/accounting", tags=["accounting"])

class LedgerEntry(BaseModel):
    id: str
    entry_date: datetime
    transaction_id: str
    account_type: str  # commission_expense, revenue_recognition, liability, asset
    debit_amount: Decimal = Decimal("0")
    credit_amount: Decimal = Decimal("0")
    balance: Decimal = Decimal("0")
    description: str
    period: str  # YYYY-MM format
    status: str = "posted"
    created_at: datetime = datetime.now(timezone.utc)

class RevenueRecognition(BaseModel):
    id: str
    transaction_id: str
    total_revenue: Decimal
    recognized_revenue: Decimal = Decimal("0")
    deferred_revenue: Decimal = Decimal("0")
    recognition_schedule: List[Dict[str, Any]] = []  # {date, amount, status}
    compliance_standard: str = "ASC 606"
    created_at: datetime = datetime.now(timezone.utc)

@router.post("/ledger/entry")
async def create_ledger_entry(
    transaction_id: str,
    account_type: str,
    debit: float = 0,
    credit: float = 0,
    description: str = ""
):
    """Create a new ledger entry"""
    from uuid import uuid4
    
    entry = LedgerEntry(
        id=str(uuid4()),
        entry_date=datetime.now(timezone.utc),
        transaction_id=transaction_id,
        account_type=account_type,
        debit_amount=Decimal(str(debit)),
        credit_amount=Decimal(str(credit)),
        balance=Decimal(str(debit)) - Decimal(str(credit)),
        description=description,
        period=datetime.now(timezone.utc).strftime("%Y-%m")
    )
    
    entry_dict = entry.model_dump()
    entry_dict['entry_date'] = entry_dict['entry_date'].isoformat()
    entry_dict['created_at'] = entry_dict['created_at'].isoformat()
    for key in ['debit_amount', 'credit_amount', 'balance']:
        entry_dict[key] = str(entry_dict[key])
    
    await db.ledger_entries.insert_one(entry_dict)
    return entry

@router.get("/ledger/entries")
async def get_ledger_entries(
    account_type: str = None,
    period: str = None,
    limit: int = 100
):
    """Get ledger entries with optional filters"""
    query = {}
    if account_type:
        query['account_type'] = account_type
    if period:
        query['period'] = period
    
    entries = await db.ledger_entries.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return entries

@router.get("/ledger/balance")
async def get_account_balance(account_type: str, period: str = None):
    """Get balance for an account type"""
    query = {"account_type": account_type}
    if period:
        query['period'] = period
    
    entries = await db.ledger_entries.find(query, {"_id": 0}).to_list(1000)
    
    total_debit = sum(Decimal(str(e.get('debit_amount', 0))) for e in entries)
    total_credit = sum(Decimal(str(e.get('credit_amount', 0))) for e in entries)
    balance = total_debit - total_credit
    
    return {
        "account_type": account_type,
        "period": period or "all",
        "total_debit": float(total_debit),
        "total_credit": float(total_credit),
        "balance": float(balance),
        "entry_count": len(entries)
    }

@router.post("/revenue/recognize")
async def recognize_revenue(transaction_id: str):
    """Create revenue recognition schedule per ASC 606/IFRS 15"""
    from uuid import uuid4
    
    # Get transaction
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    total_revenue = Decimal(str(transaction['total_amount']))
    
    # Create recognition schedule (example: recognize over 12 months)
    schedule = []
    monthly_amount = total_revenue / 12
    
    for month in range(12):
        schedule.append({
            "period": month + 1,
            "date": (datetime.now(timezone.utc).replace(day=1) + 
                    timedelta(days=30 * month)).isoformat(),
            "amount": float(monthly_amount),
            "status": "scheduled"
        })
    
    recognition = RevenueRecognition(
        id=str(uuid4()),
        transaction_id=transaction_id,
        total_revenue=total_revenue,
        recognized_revenue=Decimal("0"),
        deferred_revenue=total_revenue,
        recognition_schedule=schedule,
        compliance_standard="ASC 606"
    )
    
    rec_dict = recognition.model_dump()
    rec_dict['created_at'] = rec_dict['created_at'].isoformat()
    for key in ['total_revenue', 'recognized_revenue', 'deferred_revenue']:
        rec_dict[key] = str(rec_dict[key])
    
    await db.revenue_recognition.insert_one(rec_dict)
    
    # Create initial ledger entries
    await create_ledger_entry(
        transaction_id=transaction_id,
        account_type="deferred_revenue",
        credit=float(total_revenue),
        description="Initial revenue deferral per ASC 606"
    )
    
    return recognition

@router.post("/revenue/recognize-period")
async def recognize_period_revenue(transaction_id: str, period: int):
    """Recognize revenue for a specific period"""
    recognition = await db.revenue_recognition.find_one(
        {"transaction_id": transaction_id},
        {"_id": 0}
    )
    
    if not recognition:
        raise HTTPException(status_code=404, detail="Revenue recognition not found")
    
    # Find the period in schedule
    schedule = recognition['recognition_schedule']
    period_entry = next((s for s in schedule if s['period'] == period), None)
    
    if not period_entry:
        raise HTTPException(status_code=404, detail="Period not found in schedule")
    
    if period_entry['status'] == 'recognized':
        return {"message": "Period already recognized"}
    
    # Update schedule
    period_entry['status'] = 'recognized'
    amount = Decimal(str(period_entry['amount']))
    
    # Update totals
    recognized = Decimal(str(recognition['recognized_revenue'])) + amount
    deferred = Decimal(str(recognition['deferred_revenue'])) - amount
    
    await db.revenue_recognition.update_one(
        {"id": recognition['id']},
        {"$set": {
            "recognized_revenue": str(recognized),
            "deferred_revenue": str(deferred),
            "recognition_schedule": schedule
        }}
    )
    
    # Create ledger entries
    await create_ledger_entry(
        transaction_id=transaction_id,
        account_type="revenue_recognized",
        credit=float(amount),
        description=f"Revenue recognition for period {period}"
    )
    
    await create_ledger_entry(
        transaction_id=transaction_id,
        account_type="deferred_revenue",
        debit=float(amount),
        description=f"Deferred revenue reduction for period {period}"
    )
    
    return {
        "message": "Revenue recognized",
        "period": period,
        "amount": float(amount),
        "total_recognized": float(recognized),
        "total_deferred": float(deferred)
    }

@router.get("/revenue/schedule/{transaction_id}")
async def get_revenue_schedule(transaction_id: str):
    """Get revenue recognition schedule for a transaction"""
    recognition = await db.revenue_recognition.find_one(
        {"transaction_id": transaction_id},
        {"_id": 0}
    )
    
    if not recognition:
        raise HTTPException(status_code=404, detail="Revenue recognition not found")
    
    return recognition

@router.get("/commission/accrual")
async def get_commission_accrual(period: str = None):
    """Get commission accrual report"""
    query = {}
    if period:
        query['period'] = period
    
    # Get all calculated commissions
    commissions = await db.commission_calculations.find(
        {"status": {"$in": ["calculated", "approved"]}},
        {"_id": 0}
    ).to_list(10000)
    
    if period:
        # Filter by period
        period_start = datetime.strptime(period, "%Y-%m")
        commissions = [
            c for c in commissions
            if datetime.fromisoformat(c['calculation_date']).strftime("%Y-%m") == period
        ]
    
    total_accrued = sum(Decimal(str(c['commission_amount'])) for c in commissions)
    total_holdback = sum(Decimal(str(c.get('holdback_amount', 0))) for c in commissions)
    total_payable = sum(Decimal(str(c['final_amount'])) for c in commissions)
    
    return {
        "period": period or "all",
        "total_commissions": len(commissions),
        "total_accrued": float(total_accrued),
        "total_holdback": float(total_holdback),
        "total_payable": float(total_payable),
        "by_status": {
            "calculated": len([c for c in commissions if c['status'] == 'calculated']),
            "approved": len([c for c in commissions if c['status'] == 'approved']),
            "paid": len([c for c in commissions if c['status'] == 'paid'])
        }
    }

@router.get("/commission/expense")
async def get_commission_expense_report(period: str):
    """Get commission expense report for a period"""
    # Get all paid commissions in the period
    payouts = await db.payouts.find({
        "status": "completed"
    }, {"_id": 0}).to_list(1000)
    
    period_payouts = []
    for p in payouts:
        created = datetime.fromisoformat(p['created_at'])
        if created.strftime("%Y-%m") == period:
            period_payouts.append(p)
    
    total_expense = sum(Decimal(str(p['net_payout'])) for p in period_payouts)
    
    # Get by currency
    by_currency = {}
    for p in period_payouts:
        currency = p['currency']
        amount = Decimal(str(p['net_payout']))
        by_currency[currency] = by_currency.get(currency, Decimal("0")) + amount
    
    return {
        "period": period,
        "total_payouts": len(period_payouts),
        "total_expense_usd": float(total_expense),
        "by_currency": {k: float(v) for k, v in by_currency.items()},
        "avg_payout": float(total_expense / len(period_payouts)) if period_payouts else 0
    }

@router.get("/reports/trial-balance")
async def get_trial_balance(period: str):
    """Get trial balance for a period"""
    # Get all ledger entries for the period
    entries = await db.ledger_entries.find(
        {"period": period},
        {"_id": 0}
    ).to_list(10000)
    
    # Group by account type
    accounts = {}
    for entry in entries:
        account = entry['account_type']
        if account not in accounts:
            accounts[account] = {
                "debit": Decimal("0"),
                "credit": Decimal("0"),
                "balance": Decimal("0")
            }
        
        accounts[account]["debit"] += Decimal(str(entry.get('debit_amount', 0)))
        accounts[account]["credit"] += Decimal(str(entry.get('credit_amount', 0)))
        accounts[account]["balance"] = accounts[account]["debit"] - accounts[account]["credit"]
    
    # Convert to float for JSON
    for account in accounts:
        accounts[account] = {
            k: float(v) for k, v in accounts[account].items()
        }
    
    total_debit = sum(Decimal(str(a["debit"])) for a in accounts.values())
    total_credit = sum(Decimal(str(a["credit"])) for a in accounts.values())
    
    return {
        "period": period,
        "accounts": accounts,
        "total_debit": float(total_debit),
        "total_credit": float(total_credit),
        "balanced": abs(float(total_debit - total_credit)) < 0.01
    }
