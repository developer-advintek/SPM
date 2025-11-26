"""Payout Management Router - Multi-currency, reconciliation, approval workflow"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from typing import List
from datetime import datetime, timezone
from decimal import Decimal
import sys
import os
import csv
import io
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models import Payout, PayoutCreate, User, ApprovalWorkflow, ApprovalStep
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/api/payouts", tags=["payouts"])

# Exchange rates (in production, fetch from real-time API)
EXCHANGE_RATES = {
    "USD": 1.0,
    "EUR": 0.92,
    "GBP": 0.79,
    "INR": 83.12,
    "CAD": 1.36
}

@router.post("/calculate", response_model=Payout)
async def calculate_payout(payout_data: PayoutCreate):
    """Calculate payout for a user for a period"""
    # Get all approved commissions for the user in the period
    commissions = await db.commission_calculations.find({
        "sales_rep_id": payout_data.user_id,
        "calculation_date": {
            "$gte": payout_data.payout_period_start.isoformat(),
            "$lte": payout_data.payout_period_end.isoformat()
        },
        "status": {"$in": ["calculated", "approved"]}
    }, {"_id": 0}).to_list(1000)
    
    # Sum up commissions
    total_commission = sum(
        Decimal(str(c.get('final_amount', 0))) for c in commissions
    )
    
    # Get any adjustments (bonuses, deductions)
    adjustments = await db.payout_adjustments.find({
        "user_id": payout_data.user_id,
        "period_start": {"$lte": payout_data.payout_period_end.isoformat()},
        "period_end": {"$gte": payout_data.payout_period_start.isoformat()}
    }, {"_id": 0}).to_list(100)
    
    total_adjustments = sum(
        Decimal(str(a.get('amount', 0))) for a in adjustments
    )
    
    # Calculate deductions (taxes, chargebacks, etc.)
    deductions = Decimal("0")
    
    # Convert to requested currency
    net_payout_usd = total_commission + total_adjustments - deductions
    currency = payout_data.currency
    conversion_rate = Decimal(str(EXCHANGE_RATES.get(currency, 1.0)))
    net_payout = net_payout_usd * conversion_rate
    
    payout = Payout(
        payout_period_start=payout_data.payout_period_start,
        payout_period_end=payout_data.payout_period_end,
        user_id=payout_data.user_id,
        total_commission=total_commission,
        adjustments=total_adjustments,
        deductions=deductions,
        net_payout=net_payout,
        currency=currency,
        status="calculated"
    )
    
    payout_dict = payout.model_dump()
    for key in ['payout_period_start', 'payout_period_end', 'created_at']:
        if key in payout_dict and payout_dict[key]:
            payout_dict[key] = payout_dict[key].isoformat()
    
    await db.payouts.insert_one(payout_dict)
    
    return payout

@router.get("", response_model=List[Payout])
async def list_payouts(
    user_id: str = None,
    status: str = None,
    skip: int = 0,
    limit: int = 100
):
    """List payouts with optional filters"""
    query = {}
    if user_id:
        query['user_id'] = user_id
    if status:
        query['status'] = status
    
    payouts = await db.payouts.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    for p in payouts:
        for key in ['payout_period_start', 'payout_period_end', 'created_at']:
            if key in p and isinstance(p[key], str):
                p[key] = datetime.fromisoformat(p[key])
        if 'processed_at' in p and p['processed_at']:
            p['processed_at'] = datetime.fromisoformat(p['processed_at'])
    
    return [Payout(**p) for p in payouts]

@router.get("/{payout_id}", response_model=Payout)
async def get_payout(payout_id: str):
    """Get payout by ID"""
    payout = await db.payouts.find_one({"id": payout_id}, {"_id": 0})
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    
    for key in ['payout_period_start', 'payout_period_end', 'created_at']:
        if key in payout and isinstance(payout[key], str):
            payout[key] = datetime.fromisoformat(payout[key])
    if 'processed_at' in payout and payout['processed_at']:
        payout['processed_at'] = datetime.fromisoformat(payout['processed_at'])
    
    return Payout(**payout)

@router.post("/{payout_id}/submit-approval")
async def submit_for_approval(payout_id: str, submitted_by: str = "system"):
    """Submit payout for approval workflow"""
    payout = await db.payouts.find_one({"id": payout_id}, {"_id": 0})
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    
    # Create approval workflow
    workflow = ApprovalWorkflow(
        workflow_type="payout",
        reference_id=payout_id,
        reference_type="payout",
        status="submitted",
        steps=[
            ApprovalStep(
                step_number=1,
                approver_id="manager",
                approver_role="manager",
                status="pending"
            ),
            ApprovalStep(
                step_number=2,
                approver_id="finance",
                approver_role="finance",
                status="pending"
            )
        ],
        initiated_by=submitted_by
    )
    
    workflow_dict = workflow.model_dump()
    workflow_dict['created_at'] = workflow_dict['created_at'].isoformat()
    workflow_dict['updated_at'] = workflow_dict['updated_at'].isoformat()
    
    await db.approval_workflows.insert_one(workflow_dict)
    
    # Update payout status
    await db.payouts.update_one(
        {"id": payout_id},
        {"$set": {"status": "pending_approval"}}
    )
    
    return {"message": "Payout submitted for approval", "workflow_id": workflow.id}

@router.post("/{payout_id}/approve")
async def approve_payout(payout_id: str, approver_id: str, comments: str = ""):
    """Approve a payout"""
    # Get workflow
    workflow = await db.approval_workflows.find_one({
        "reference_id": payout_id,
        "workflow_type": "payout"
    }, {"_id": 0})
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Approval workflow not found")
    
    # Find pending step
    steps = workflow['steps']
    approved_step = None
    for step in steps:
        if step['status'] == 'pending':
            step['status'] = 'approved'
            step['comments'] = comments
            step['timestamp'] = datetime.now(timezone.utc).isoformat()
            approved_step = step
            break
    
    # Check if all steps approved
    all_approved = all(s['status'] == 'approved' for s in steps)
    
    if all_approved:
        workflow['status'] = 'final_approved'
        payout_status = 'approved'
    else:
        workflow['status'] = 'l1_approved' if approved_step['step_number'] == 1 else 'l2_approved'
        payout_status = 'pending_approval'
    
    # Update workflow
    await db.approval_workflows.update_one(
        {"id": workflow['id']},
        {"$set": {"steps": steps, "status": workflow['status']}}
    )
    
    # Update payout
    await db.payouts.update_one(
        {"id": payout_id},
        {"$set": {"status": payout_status}}
    )
    
    return {"message": "Payout approved", "all_approved": all_approved}

@router.post("/{payout_id}/reject")
async def reject_payout(payout_id: str, approver_id: str, reason: str):
    """Reject a payout"""
    # Update workflow
    await db.approval_workflows.update_one(
        {"reference_id": payout_id, "workflow_type": "payout"},
        {"$set": {"status": "rejected"}}
    )
    
    # Update payout
    await db.payouts.update_one(
        {"id": payout_id},
        {"$set": {"status": "rejected", "rejection_reason": reason}}
    )
    
    return {"message": "Payout rejected"}

@router.post("/{payout_id}/process")
async def process_payout(payout_id: str):
    """Process approved payout for payment"""
    payout = await db.payouts.find_one({"id": payout_id}, {"_id": 0})
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    
    if payout['status'] != 'approved':
        raise HTTPException(
            status_code=400,
            detail="Payout must be approved before processing"
        )
    
    # Update status to processing
    await db.payouts.update_one(
        {"id": payout_id},
        {"$set": {
            "status": "processing",
            "processed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # In production: integrate with payment gateway
    # Simulate processing
    await db.payouts.update_one(
        {"id": payout_id},
        {"$set": {"status": "completed"}}
    )
    
    return {"message": "Payout processed successfully"}

@router.post("/{payout_id}/reconcile")
async def reconcile_payout(payout_id: str, actual_amount: float):
    """Reconcile payout with actual payment"""
    payout = await db.payouts.find_one({"id": payout_id}, {"_id": 0})
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    
    expected = Decimal(str(payout['net_payout']))
    actual = Decimal(str(actual_amount))
    variance = abs(expected - actual)
    
    if variance < Decimal("0.01"):  # Within 1 cent
        reconciliation_status = "matched"
    else:
        reconciliation_status = "variance_found"
    
    await db.payouts.update_one(
        {"id": payout_id},
        {"$set": {
            "reconciliation_status": reconciliation_status,
            "actual_amount": float(actual),
            "variance": float(variance)
        }}
    )
    
    return {
        "status": reconciliation_status,
        "expected": float(expected),
        "actual": float(actual),
        "variance": float(variance)
    }

@router.get("/{payout_id}/export")
async def export_payout_csv(payout_id: str):
    """Export payout details as CSV"""
    payout = await db.payouts.find_one({"id": payout_id}, {"_id": 0})
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
    
    # Get user details
    user = await db.users.find_one({"id": payout['user_id']}, {"_id": 0})
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(['Payout Report'])
    writer.writerow([''])
    writer.writerow(['Payout ID', payout['id']])
    writer.writerow(['User', user.get('full_name', 'N/A') if user else 'N/A'])
    writer.writerow(['Period Start', payout['payout_period_start']])
    writer.writerow(['Period End', payout['payout_period_end']])
    writer.writerow(['Total Commission', f"{payout['currency']} {payout['total_commission']}"])
    writer.writerow(['Adjustments', f"{payout['currency']} {payout['adjustments']}"])
    writer.writerow(['Deductions', f"{payout['currency']} {payout['deductions']}"])
    writer.writerow(['Net Payout', f"{payout['currency']} {payout['net_payout']}"])
    writer.writerow(['Status', payout['status']])
    
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=payout_{payout_id}.csv"}
    )

@router.get("/user/{user_id}/history")
async def get_user_payout_history(user_id: str):
    """Get payout history for a user"""
    payouts = await db.payouts.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    total_paid = sum(
        Decimal(str(p['net_payout']))
        for p in payouts
        if p['status'] == 'completed'
    )
    
    return {
        "user_id": user_id,
        "total_payouts": len(payouts),
        "total_amount_paid": float(total_paid),
        "payouts": payouts
    }
