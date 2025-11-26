"""Transaction Processing Router - Real-time commission processing with credit splits"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timezone
from decimal import Decimal
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models import (
    Transaction, TransactionCreate, CommissionCalculation,
    CreditAssignment, CreditAssignmentCreate, User
)
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

async def get_current_user():
    """Placeholder - implement actual auth"""
    pass

@router.post("", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate):
    """Create and process transaction in real-time"""
    # Calculate total amount
    total_amount = transaction.unit_price * transaction.quantity
    
    trans_dict = transaction.model_dump()
    trans_dict['id'] = Transaction().id
    trans_dict['total_amount'] = total_amount
    trans_dict['status'] = 'pending'
    trans_dict['created_at'] = datetime.now(timezone.utc)
    
    # Insert transaction
    await db.transactions.insert_one(trans_dict)
    
    # Trigger real-time commission calculation
    await process_transaction_commission(trans_dict['id'])
    
    return Transaction(**trans_dict)

async def process_transaction_commission(transaction_id: str):
    """Real-time commission processing"""
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        return
    
    # Get applicable commission plan
    plan = await db.commission_plans.find_one(
        {"status": "active", "plan_type": "individual"},
        {"_id": 0}
    )
    
    if not plan:
        await db.transactions.update_one(
            {"id": transaction_id},
            {"$set": {"status": "error", "processed_at": datetime.now(timezone.utc)}}
        )
        return
    
    # Calculate base commission
    base_amount = Decimal(str(transaction['total_amount']))
    commission_rate = Decimal("0.05")  # 5% default
    
    # Apply rules from plan
    for rule in plan.get('rules', []):
        if rule.get('rule_type') == 'percentage':
            rate = rule.get('action', {}).get('commission_rate')
            if rate:
                commission_rate = Decimal(str(rate)) / 100
    
    commission_amount = base_amount * commission_rate
    
    # Apply holdback (20% default)
    holdback_percent = Decimal("0.20")
    holdback_amount = commission_amount * holdback_percent
    final_amount = commission_amount - holdback_amount
    
    # Create commission calculation record
    calc = CommissionCalculation(
        transaction_id=transaction_id,
        sales_rep_id=transaction['sales_rep_id'],
        plan_id=plan['id'],
        base_amount=base_amount,
        commission_amount=commission_amount,
        adjustments=Decimal("0"),
        final_amount=final_amount,
        holdback_amount=holdback_amount,
        status="calculated"
    )
    
    calc_dict = calc.model_dump()
    calc_dict['calculation_date'] = calc_dict['calculation_date'].isoformat()
    calc_dict['created_at'] = calc_dict['created_at'].isoformat()
    
    await db.commission_calculations.insert_one(calc_dict)
    
    # Update transaction status
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {"status": "processed", "processed_at": datetime.now(timezone.utc)}}
    )

@router.get("", response_model=List[Transaction])
async def list_transactions(skip: int = 0, limit: int = 100):
    """List all transactions"""
    transactions = await db.transactions.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    return [Transaction(**t) for t in transactions]

@router.get("/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str):
    """Get transaction by ID"""
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return Transaction(**transaction)

@router.post("/{transaction_id}/credit-split", response_model=CreditAssignment)
async def assign_credit_split(transaction_id: str, assignment: CreditAssignmentCreate):
    """Assign multi-factor credit splits to transaction"""
    # Validate total credit is 100%
    total_credit = sum(Decimal(str(a.get('credit_percent', 0))) for a in assignment.assignments)
    if total_credit != Decimal("100"):
        raise HTTPException(
            status_code=400,
            detail=f"Total credit must equal 100%. Current: {total_credit}%"
        )
    
    # Check transaction exists
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    credit = CreditAssignment(
        transaction_id=transaction_id,
        assignments=assignment.assignments,
        total_credit_percent=total_credit,
        assignment_reason=assignment.assignment_reason
    )
    
    credit_dict = credit.model_dump()
    credit_dict['created_at'] = credit_dict['created_at'].isoformat()
    
    await db.credit_assignments.insert_one(credit_dict)
    
    # Recalculate commissions with credit splits
    await recalculate_with_splits(transaction_id, credit_dict)
    
    return credit

async def recalculate_with_splits(transaction_id: str, credit_assignment: dict):
    """Recalculate commissions based on credit splits"""
    # Get original commission calculation
    calc = await db.commission_calculations.find_one(
        {"transaction_id": transaction_id},
        {"_id": 0}
    )
    
    if not calc:
        return
    
    # Delete old calculation
    await db.commission_calculations.delete_many({"transaction_id": transaction_id})
    
    # Create new calculations for each assignee
    for assignment in credit_assignment['assignments']:
        user_id = assignment['user_id']
        credit_percent = Decimal(str(assignment['credit_percent'])) / 100
        
        new_calc = CommissionCalculation(
            transaction_id=transaction_id,
            sales_rep_id=user_id,
            plan_id=calc['plan_id'],
            base_amount=Decimal(str(calc['base_amount'])) * credit_percent,
            commission_amount=Decimal(str(calc['commission_amount'])) * credit_percent,
            adjustments=Decimal("0"),
            final_amount=Decimal(str(calc['final_amount'])) * credit_percent,
            holdback_amount=Decimal(str(calc['holdback_amount'])) * credit_percent,
            status="calculated",
            metadata={"role": assignment.get('role'), "credit_percent": float(credit_percent * 100)}
        )
        
        new_calc_dict = new_calc.model_dump()
        new_calc_dict['calculation_date'] = new_calc_dict['calculation_date'].isoformat()
        new_calc_dict['created_at'] = new_calc_dict['created_at'].isoformat()
        
        await db.commission_calculations.insert_one(new_calc_dict)

@router.get("/{transaction_id}/commissions")
async def get_transaction_commissions(transaction_id: str):
    """Get all commission calculations for a transaction"""
    calcs = await db.commission_calculations.find(
        {"transaction_id": transaction_id},
        {"_id": 0}
    ).to_list(100)
    return calcs

@router.post("/{transaction_id}/reprocess")
async def reprocess_transaction(transaction_id: str):
    """Reprocess transaction commission calculation"""
    await process_transaction_commission(transaction_id)
    return {"message": "Transaction reprocessed successfully"}
