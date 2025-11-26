"""Spiff Center Router - Short-term incentives management"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timezone
from decimal import Decimal
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models import Spiff, SpiffCreate, User
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/api/spiffs", tags=["spiffs"])

@router.post("", response_model=Spiff)
async def create_spiff(spiff: SpiffCreate, created_by: str = "admin"):
    """Create a new spiff/short-term incentive"""
    spiff_obj = Spiff(
        **spiff.model_dump(),
        created_by=created_by,
        status="draft"
    )
    
    spiff_dict = spiff_obj.model_dump()
    spiff_dict['start_date'] = spiff_dict['start_date'].isoformat()
    spiff_dict['end_date'] = spiff_dict['end_date'].isoformat()
    spiff_dict['created_at'] = spiff_dict['created_at'].isoformat()
    
    await db.spiffs.insert_one(spiff_dict)
    return spiff_obj

@router.get("", response_model=List[Spiff])
async def list_spiffs(status: str = None):
    """List all spiffs, optionally filtered by status"""
    query = {}
    if status:
        query['status'] = status
    
    spiffs = await db.spiffs.find(query, {"_id": 0}).to_list(100)
    for s in spiffs:
        s['start_date'] = datetime.fromisoformat(s['start_date'])
        s['end_date'] = datetime.fromisoformat(s['end_date'])
        s['created_at'] = datetime.fromisoformat(s['created_at'])
    return [Spiff(**s) for s in spiffs]

@router.get("/active", response_model=List[Spiff])
async def get_active_spiffs():
    """Get all currently active spiffs"""
    now = datetime.now(timezone.utc)
    
    spiffs = await db.spiffs.find({}, {"_id": 0}).to_list(100)
    active_spiffs = []
    
    for s in spiffs:
        start = datetime.fromisoformat(s['start_date'])
        end = datetime.fromisoformat(s['end_date'])
        
        if start <= now <= end and s['status'] == 'active':
            s['start_date'] = start
            s['end_date'] = end
            s['created_at'] = datetime.fromisoformat(s['created_at'])
            active_spiffs.append(Spiff(**s))
    
    return active_spiffs

@router.get("/{spiff_id}", response_model=Spiff)
async def get_spiff(spiff_id: str):
    """Get spiff by ID"""
    spiff = await db.spiffs.find_one({"id": spiff_id}, {"_id": 0})
    if not spiff:
        raise HTTPException(status_code=404, detail="Spiff not found")
    
    spiff['start_date'] = datetime.fromisoformat(spiff['start_date'])
    spiff['end_date'] = datetime.fromisoformat(spiff['end_date'])
    spiff['created_at'] = datetime.fromisoformat(spiff['created_at'])
    return Spiff(**spiff)

@router.put("/{spiff_id}/activate")
async def activate_spiff(spiff_id: str):
    """Activate a spiff"""
    result = await db.spiffs.update_one(
        {"id": spiff_id},
        {"$set": {"status": "active"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Spiff not found")
    
    return {"message": "Spiff activated successfully"}

@router.put("/{spiff_id}/end")
async def end_spiff(spiff_id: str):
    """End a spiff early"""
    result = await db.spiffs.update_one(
        {"id": spiff_id},
        {"$set": {"status": "ended", "end_date": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Spiff not found")
    
    return {"message": "Spiff ended successfully"}

@router.delete("/{spiff_id}")
async def delete_spiff(spiff_id: str):
    """Delete a spiff (draft only)"""
    spiff = await db.spiffs.find_one({"id": spiff_id}, {"_id": 0})
    if not spiff:
        raise HTTPException(status_code=404, detail="Spiff not found")
    
    if spiff['status'] != 'draft':
        raise HTTPException(
            status_code=400,
            detail="Can only delete draft spiffs"
        )
    
    await db.spiffs.delete_one({"id": spiff_id})
    return {"message": "Spiff deleted successfully"}

@router.get("/user/{user_id}/eligible")
async def get_user_eligible_spiffs(user_id: str):
    """Get spiffs a user is eligible for"""
    now = datetime.now(timezone.utc)
    
    # Get user's territory and segments
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all active spiffs
    spiffs = await db.spiffs.find({"status": "active"}, {"_id": 0}).to_list(100)
    
    eligible_spiffs = []
    for s in spiffs:
        start = datetime.fromisoformat(s['start_date'])
        end = datetime.fromisoformat(s['end_date'])
        
        # Check if spiff is currently active
        if start <= now <= end:
            s['start_date'] = start
            s['end_date'] = end
            s['created_at'] = datetime.fromisoformat(s['created_at'])
            eligible_spiffs.append(s)
    
    return eligible_spiffs

@router.post("/{spiff_id}/calculate/{user_id}")
async def calculate_spiff_payout(spiff_id: str, user_id: str):
    """Calculate spiff payout for a user"""
    spiff = await db.spiffs.find_one({"id": spiff_id}, {"_id": 0})
    if not spiff:
        raise HTTPException(status_code=404, detail="Spiff not found")
    
    # Get user's qualifying transactions during spiff period
    start = datetime.fromisoformat(spiff['start_date'])
    end = datetime.fromisoformat(spiff['end_date'])
    
    transactions = await db.transactions.find({
        "sales_rep_id": user_id,
        "transaction_date": {"$gte": start, "$lte": end},
        "status": "processed"
    }, {"_id": 0}).to_list(1000)
    
    # Filter by spiff criteria
    qualifying_transactions = []
    for trans in transactions:
        product = await db.products.find_one({"id": trans['product_id']}, {"_id": 0})
        if product and product.get('sku') in spiff.get('target_products', []):
            qualifying_transactions.append(trans)
    
    # Calculate payout
    total_amount = sum(Decimal(str(t['total_amount'])) for t in qualifying_transactions)
    
    if spiff['incentive_type'] == 'fixed':
        payout = spiff['incentive_amount']
    elif spiff['incentive_type'] == 'percentage':
        payout = total_amount * (Decimal(str(spiff['incentive_amount'])) / 100)
    else:  # multiplier
        # Get base commission
        base_commissions = await db.commission_calculations.find({
            "sales_rep_id": user_id,
            "transaction_id": {"$in": [t['id'] for t in qualifying_transactions]}
        }, {"_id": 0}).to_list(1000)
        
        base_total = sum(Decimal(str(c['commission_amount'])) for c in base_commissions)
        payout = base_total * Decimal(str(spiff['incentive_amount']))
    
    return {
        "spiff_id": spiff_id,
        "user_id": user_id,
        "qualifying_transactions": len(qualifying_transactions),
        "total_qualifying_amount": float(total_amount),
        "payout_amount": float(payout),
        "incentive_type": spiff['incentive_type']
    }
