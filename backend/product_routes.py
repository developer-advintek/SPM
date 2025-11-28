"""
Product Management Routes with Tier-based Commissions
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone
from models import Product, ProductCreate, User
from utils.security import get_current_user
import os
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB setup
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

product_router = APIRouter()

def can_manage_products(user: User) -> bool:
    """Check if user can manage products"""
    return user.role in ["admin", "finance", "partner_manager"]

@product_router.get("/products")
async def get_products(current_user: User = Depends(get_current_user)):
    """Get all products"""
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    return products

@product_router.get("/products/{product_id}")
async def get_product(product_id: str, current_user: User = Depends(get_current_user)):
    """Get product by ID"""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@product_router.post("/products")
async def create_product(product_data: ProductCreate, current_user: User = Depends(get_current_user)):
    """Create new product with tier-based commissions"""
    if not can_manage_products(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to create products")
    
    # Check if SKU already exists
    existing = await db.products.find_one({"sku": product_data.sku}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Product with this SKU already exists")
    
    product = Product(**product_data.model_dump())
    
    doc = product.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    # Convert tier_commissions to dict with string values for MongoDB
    doc['tier_commissions'] = {
        'bronze': str(product_data.tier_commissions.bronze),
        'silver': str(product_data.tier_commissions.silver),
        'gold': str(product_data.tier_commissions.gold),
        'platinum': str(product_data.tier_commissions.platinum)
    }
    doc['base_price'] = str(product_data.base_price)
    
    await db.products.insert_one(doc)
    
    return {"message": "Product created successfully", "product_id": product.id}

@product_router.put("/products/{product_id}")
async def update_product(product_id: str, product_data: ProductCreate, current_user: User = Depends(get_current_user)):
    """Update existing product"""
    if not can_manage_products(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to update products")
    
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Convert to dict and update
    update_data = product_data.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    update_data['tier_commissions'] = {
        'bronze': str(product_data.tier_commissions.bronze),
        'silver': str(product_data.tier_commissions.silver),
        'gold': str(product_data.tier_commissions.gold),
        'platinum': str(product_data.tier_commissions.platinum)
    }
    update_data['base_price'] = str(product_data.base_price)
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    return {"message": "Product updated successfully"}

@product_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: User = Depends(get_current_user)):
    """Deactivate product (soft delete)"""
    if not can_manage_products(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to delete products")
    
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": {"active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deactivated successfully"}

@product_router.get("/products/{product_id}/commission/{tier}")
async def get_product_commission_for_tier(product_id: str, tier: str, current_user: User = Depends(get_current_user)):
    """Get commission rate for a specific product and partner tier"""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if tier.lower() not in ["bronze", "silver", "gold", "platinum"]:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    commission_rate = product.get('tier_commissions', {}).get(tier.lower(), "0")
    
    return {
        "product_id": product_id,
        "product_name": product.get('name'),
        "tier": tier,
        "commission_rate": commission_rate
    }
