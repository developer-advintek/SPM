"""
Spiff Campaign Management Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
from datetime import datetime, timezone
from models import Spiff, SpiffCreate, User
from utils.security import verify_token
import os
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB setup
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

spiff_router = APIRouter()
security = HTTPBearer()

# Auth dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user)

def can_manage_spiffs(user: User) -> bool:
    """Check if user can manage spiffs"""
    return user.role in ["admin", "finance", "partner_manager"]

@spiff_router.get("/spiffs")
async def get_spiffs(current_user: User = Depends(get_current_user)):
    """Get all spiff campaigns"""
    spiffs = await db.spiffs.find({}, {"_id": 0}).to_list(1000)
    return spiffs

@spiff_router.get("/spiffs/active")
async def get_active_spiffs(current_user: User = Depends(get_current_user)):
    """Get active spiff campaigns"""
    now = datetime.now(timezone.utc).isoformat()
    spiffs = await db.spiffs.find({
        "status": "active",
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }, {"_id": 0}).to_list(1000)
    return spiffs

@spiff_router.get("/spiffs/{spiff_id}")
async def get_spiff(spiff_id: str, current_user: User = Depends(get_current_user)):
    """Get spiff by ID"""
    spiff = await db.spiffs.find_one({"id": spiff_id}, {"_id": 0})
    if not spiff:
        raise HTTPException(status_code=404, detail="Spiff campaign not found")
    return spiff

@spiff_router.post("/spiffs")
async def create_spiff(spiff_data: SpiffCreate, current_user: User = Depends(get_current_user)):
    """Create new spiff campaign"""
    if not can_manage_spiffs(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to create spiff campaigns")
    
    # Validation
    if spiff_data.assignment_type == "tier" and not spiff_data.target_tiers:
        raise HTTPException(status_code=400, detail="Target tiers required when assignment_type is 'tier'")
    
    if spiff_data.assignment_type == "individual" and not spiff_data.target_partners:
        raise HTTPException(status_code=400, detail="Target partners required when assignment_type is 'individual'")
    
    if not spiff_data.target_products:
        raise HTTPException(status_code=400, detail="At least one product must be selected")
    
    # Verify products exist
    for product_id in spiff_data.target_products:
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    
    # If individual assignment, verify partners exist
    if spiff_data.assignment_type == "individual":
        for partner_id in spiff_data.target_partners:
            partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
            if not partner:
                raise HTTPException(status_code=404, detail=f"Partner {partner_id} not found")
    
    spiff = Spiff(**spiff_data.model_dump(), created_by=current_user.id)
    
    doc = spiff.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    doc['start_date'] = doc['start_date'].isoformat()
    doc['end_date'] = doc['end_date'].isoformat()
    doc['incentive_amount'] = str(spiff_data.incentive_amount)
    
    await db.spiffs.insert_one(doc)
    
    return {"message": "Spiff campaign created successfully", "spiff_id": spiff.id}

@spiff_router.put("/spiffs/{spiff_id}")
async def update_spiff(spiff_id: str, spiff_data: SpiffCreate, current_user: User = Depends(get_current_user)):
    """Update existing spiff campaign"""
    if not can_manage_spiffs(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to update spiff campaigns")
    
    existing = await db.spiffs.find_one({"id": spiff_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Spiff campaign not found")
    
    update_data = spiff_data.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    update_data['start_date'] = spiff_data.start_date.isoformat()
    update_data['end_date'] = spiff_data.end_date.isoformat()
    update_data['incentive_amount'] = str(spiff_data.incentive_amount)
    
    await db.spiffs.update_one({"id": spiff_id}, {"$set": update_data})
    
    return {"message": "Spiff campaign updated successfully"}

@spiff_router.patch("/spiffs/{spiff_id}/status")
async def update_spiff_status(spiff_id: str, status: str, current_user: User = Depends(get_current_user)):
    """Update spiff campaign status"""
    if not can_manage_spiffs(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to update spiff status")
    
    if status not in ["active", "inactive", "expired"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.spiffs.update_one(
        {"id": spiff_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Spiff campaign not found")
    
    return {"message": f"Spiff campaign status updated to {status}"}

@spiff_router.delete("/spiffs/{spiff_id}")
async def delete_spiff(spiff_id: str, current_user: User = Depends(get_current_user)):
    """Delete spiff campaign"""
    if not can_manage_spiffs(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to delete spiff campaigns")
    
    result = await db.spiffs.delete_one({"id": spiff_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Spiff campaign not found")
    
    return {"message": "Spiff campaign deleted successfully"}

@spiff_router.get("/spiffs/partner/{partner_id}")
async def get_partner_eligible_spiffs(partner_id: str, current_user: User = Depends(get_current_user)):
    """Get spiff campaigns eligible for a specific partner"""
    # Get partner to check tier
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    partner_tier = partner.get('tier', '').lower()
    
    # Get active spiffs
    now = datetime.now(timezone.utc).isoformat()
    all_spiffs = await db.spiffs.find({
        "status": "active",
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }, {"_id": 0}).to_list(1000)
    
    # Filter eligible spiffs
    eligible_spiffs = []
    for spiff in all_spiffs:
        if spiff.get('assignment_type') == 'tier' and partner_tier in spiff.get('target_tiers', []):
            eligible_spiffs.append(spiff)
        elif spiff.get('assignment_type') == 'individual' and partner_id in spiff.get('target_partners', []):
            eligible_spiffs.append(spiff)
    
    return eligible_spiffs
