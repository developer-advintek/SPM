"""
Sales Transaction & Commission Management Routes
End-to-end sales entry, commission calculation, approval, and payout
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone
from decimal import Decimal
from models import SaleTransaction, SaleTransactionCreate, PayoutBatch, PayoutBatchCreate, User
from utils.security import verify_token
import os
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB setup
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

sales_router = APIRouter()
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

def can_manage_sales(user: User) -> bool:
    """Check if user can manage sales"""
    return user.role in ["admin", "finance", "partner_manager"]

def can_approve_commissions(user: User) -> bool:
    """Check if user can approve commissions"""
    return user.role in ["admin", "finance"]

# ============= SALES ENTRY =============

@sales_router.post("/sales")
async def create_sale(sale_data: SaleTransactionCreate, current_user: User = Depends(get_current_user)):
    """
    Create new sale transaction and auto-calculate commission
    Can be created by: Admin, Finance, Partner Manager, or the Partner themselves
    """
    # Verify partner exists
    partner = await db.partners.find_one({"id": sale_data.partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Only allow partner to create their own sales or admins to create for anyone
    if current_user.role == "partner" and current_user.id != partner.get('user_id'):
        raise HTTPException(status_code=403, detail="You can only create sales for yourself")
    
    # Verify product exists
    product = await db.products.find_one({"id": sale_data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Calculate total amount
    total_amount = Decimal(str(sale_data.unit_price)) * sale_data.quantity
    
    # Get partner tier
    partner_tier = partner.get('tier', 'bronze').lower()
    
    # Calculate base commission from product tier rates
    tier_commission_rate = Decimal(str(product.get('tier_commissions', {}).get(partner_tier, "0")))
    commission_amount = (total_amount * tier_commission_rate) / Decimal("100")
    
    # Check for active spiffs for this partner and product
    now = datetime.now(timezone.utc).isoformat()
    active_spiffs = await db.spiffs.find({
        "status": "active",
        "start_date": {"$lte": now},
        "end_date": {"$gte": now},
        "target_products": sale_data.product_id
    }, {"_id": 0}).to_list(100)
    
    # Calculate spiff bonus
    spiff_bonus = Decimal("0")
    for spiff in active_spiffs:
        # Check if partner is eligible
        is_eligible = False
        if spiff.get('assignment_type') == 'tier' and partner_tier in spiff.get('target_tiers', []):
            is_eligible = True
        elif spiff.get('assignment_type') == 'individual' and sale_data.partner_id in spiff.get('target_partners', []):
            is_eligible = True
        
        if is_eligible:
            incentive_amount = Decimal(str(spiff.get('incentive_amount', '0')))
            if spiff.get('incentive_type') == 'fixed':
                spiff_bonus += incentive_amount * sale_data.quantity
            else:  # percentage
                spiff_bonus += (total_amount * incentive_amount) / Decimal("100")
    
    # Create sale transaction
    sale = SaleTransaction(
        **sale_data.model_dump(),
        total_amount=total_amount,
        commission_amount=commission_amount,
        spiff_bonus=spiff_bonus,
        total_commission=commission_amount + spiff_bonus,
        created_by=current_user.id
    )
    
    doc = sale.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['sale_date'] = doc['sale_date'].isoformat()
    doc['total_amount'] = str(total_amount)
    doc['commission_amount'] = str(commission_amount)
    doc['spiff_bonus'] = str(spiff_bonus)
    doc['total_commission'] = str(commission_amount + spiff_bonus)
    doc['unit_price'] = str(sale_data.unit_price)
    
    await db.sales.insert_one(doc)
    
    return {
        "message": "Sale created successfully",
        "sale_id": sale.id,
        "total_amount": str(total_amount),
        "commission_breakdown": {
            "base_commission": str(commission_amount),
            "commission_rate": str(tier_commission_rate) + "%",
            "spiff_bonus": str(spiff_bonus),
            "total_commission": str(commission_amount + spiff_bonus)
        }
    }

@sales_router.get("/sales")
async def get_sales(
    partner_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get sales transactions with optional filters"""
    query = {}
    
    # If partner user, only show their sales
    if current_user.role == "partner":
        # Get partner record for this user
        partner = await db.partners.find_one({"user_id": current_user.id}, {"_id": 0})
        if partner:
            query["partner_id"] = partner.get('id')
    elif partner_id:
        query["partner_id"] = partner_id
    
    if status:
        query["commission_status"] = status
    
    sales = await db.sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    return sales

@sales_router.get("/sales/{sale_id}")
async def get_sale(sale_id: str, current_user: User = Depends(get_current_user)):
    """Get sale by ID"""
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Check access
    if current_user.role == "partner":
        partner = await db.partners.find_one({"user_id": current_user.id}, {"_id": 0})
        if not partner or sale.get('partner_id') != partner.get('id'):
            raise HTTPException(status_code=403, detail="Access denied")
    
    return sale

# ============= COMMISSION APPROVAL =============

@sales_router.patch("/sales/{sale_id}/approve")
async def approve_commission(sale_id: str, current_user: User = Depends(get_current_user)):
    """Approve commission for a sale"""
    if not can_approve_commissions(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to approve commissions")
    
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    if sale.get('commission_status') != 'pending':
        raise HTTPException(status_code=400, detail=f"Sale already {sale.get('commission_status')}")
    
    result = await db.sales.update_one(
        {"id": sale_id},
        {"$set": {
            "commission_status": "approved",
            "approved_by": current_user.id,
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to approve commission")
    
    return {"message": "Commission approved successfully"}

@sales_router.patch("/sales/{sale_id}/reject")
async def reject_commission(sale_id: str, reason: str, current_user: User = Depends(get_current_user)):
    """Reject commission for a sale"""
    if not can_approve_commissions(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to reject commissions")
    
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    result = await db.sales.update_one(
        {"id": sale_id},
        {"$set": {
            "commission_status": "rejected",
            "approved_by": current_user.id,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": reason
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to reject commission")
    
    return {"message": "Commission rejected"}

@sales_router.post("/sales/bulk-approve")
async def bulk_approve_commissions(sale_ids: List[str], current_user: User = Depends(get_current_user)):
    """Bulk approve multiple commissions"""
    if not can_approve_commissions(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to approve commissions")
    
    result = await db.sales.update_many(
        {"id": {"$in": sale_ids}, "commission_status": "pending"},
        {"$set": {
            "commission_status": "approved",
            "approved_by": current_user.id,
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Approved {result.modified_count} commissions"}

# ============= PAYOUT PROCESSING =============

@sales_router.post("/payouts/batch")
async def create_payout_batch(batch_data: PayoutBatchCreate, current_user: User = Depends(get_current_user)):
    """Create payout batch for approved commissions"""
    if not can_approve_commissions(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to process payouts")
    
    # Get all approved sales for these partners in the period
    query = {
        "partner_id": {"$in": batch_data.partner_ids},
        "commission_status": "approved"
    }
    
    sales = await db.sales.find(query, {"_id": 0}).to_list(10000)
    
    if not sales:
        raise HTTPException(status_code=400, detail="No approved commissions found for payout")
    
    # Calculate totals
    total_amount = sum(Decimal(str(sale.get('total_commission', '0'))) for sale in sales)
    
    # Create payout batch
    batch = PayoutBatch(
        **batch_data.model_dump(),
        total_amount=total_amount,
        transaction_count=len(sales),
        created_by=current_user.id
    )
    
    doc = batch.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['total_amount'] = str(total_amount)
    
    await db.payout_batches.insert_one(doc)
    
    # Mark sales as paid
    sale_ids = [sale['id'] for sale in sales]
    await db.sales.update_many(
        {"id": {"$in": sale_ids}},
        {"$set": {
            "commission_status": "paid",
            "paid_at": datetime.now(timezone.utc).isoformat(),
            "payout_batch_id": batch.id
        }}
    )
    
    return {
        "message": "Payout batch created successfully",
        "batch_id": batch.id,
        "total_amount": str(total_amount),
        "transaction_count": len(sales)
    }

@sales_router.get("/payouts")
async def get_payout_batches(current_user: User = Depends(get_current_user)):
    """Get all payout batches"""
    if not can_approve_commissions(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    batches = await db.payout_batches.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return batches

@sales_router.get("/payouts/{batch_id}")
async def get_payout_batch(batch_id: str, current_user: User = Depends(get_current_user)):
    """Get payout batch details"""
    if not can_approve_commissions(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    batch = await db.payout_batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Payout batch not found")
    
    # Get all sales in this batch
    sales = await db.sales.find({"payout_batch_id": batch_id}, {"_id": 0}).to_list(10000)
    
    return {
        "batch": batch,
        "sales": sales
    }

# ============= ANALYTICS & REPORTING =============

@sales_router.get("/analytics/overview")
async def get_analytics_overview(current_user: User = Depends(get_current_user)):
    """Get overall analytics"""
    # Total sales
    all_sales = await db.sales.find({}, {"_id": 0}).to_list(10000)
    
    total_sales_amount = sum(Decimal(str(sale.get('total_amount', '0'))) for sale in all_sales)
    total_commissions = sum(Decimal(str(sale.get('total_commission', '0'))) for sale in all_sales)
    
    pending_commissions = sum(
        Decimal(str(sale.get('total_commission', '0'))) 
        for sale in all_sales 
        if sale.get('commission_status') == 'pending'
    )
    
    approved_commissions = sum(
        Decimal(str(sale.get('total_commission', '0'))) 
        for sale in all_sales 
        if sale.get('commission_status') == 'approved'
    )
    
    paid_commissions = sum(
        Decimal(str(sale.get('total_commission', '0'))) 
        for sale in all_sales 
        if sale.get('commission_status') == 'paid'
    )
    
    return {
        "total_sales": len(all_sales),
        "total_sales_amount": str(total_sales_amount),
        "total_commissions": str(total_commissions),
        "pending_commissions": str(pending_commissions),
        "approved_commissions": str(approved_commissions),
        "paid_commissions": str(paid_commissions),
        "commission_statuses": {
            "pending": len([s for s in all_sales if s.get('commission_status') == 'pending']),
            "approved": len([s for s in all_sales if s.get('commission_status') == 'approved']),
            "rejected": len([s for s in all_sales if s.get('commission_status') == 'rejected']),
            "paid": len([s for s in all_sales if s.get('commission_status') == 'paid'])
        }
    }

@sales_router.get("/analytics/partner/{partner_id}")
async def get_partner_analytics(partner_id: str, current_user: User = Depends(get_current_user)):
    """Get analytics for specific partner"""
    # Check access
    if current_user.role == "partner":
        partner = await db.partners.find_one({"user_id": current_user.id}, {"_id": 0})
        if not partner or partner.get('id') != partner_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    sales = await db.sales.find({"partner_id": partner_id}, {"_id": 0}).to_list(10000)
    
    total_sales = len(sales)
    total_revenue = sum(Decimal(str(sale.get('total_amount', '0'))) for sale in sales)
    total_earned = sum(Decimal(str(sale.get('total_commission', '0'))) for sale in sales)
    pending_amount = sum(
        Decimal(str(sale.get('total_commission', '0'))) 
        for sale in sales 
        if sale.get('commission_status') == 'pending'
    )
    paid_amount = sum(
        Decimal(str(sale.get('total_commission', '0'))) 
        for sale in sales 
        if sale.get('commission_status') == 'paid'
    )
    
    return {
        "partner_id": partner_id,
        "total_sales": total_sales,
        "total_revenue": str(total_revenue),
        "total_earned": str(total_earned),
        "pending_amount": str(pending_amount),
        "paid_amount": str(paid_amount)
    }

@sales_router.get("/analytics/product/{product_id}")
async def get_product_analytics(product_id: str, current_user: User = Depends(get_current_user)):
    """Get analytics for specific product"""
    sales = await db.sales.find({"product_id": product_id}, {"_id": 0}).to_list(10000)
    
    total_quantity = sum(sale.get('quantity', 0) for sale in sales)
    total_revenue = sum(Decimal(str(sale.get('total_amount', '0'))) for sale in sales)
    
    return {
        "product_id": product_id,
        "total_sales": len(sales),
        "total_quantity": total_quantity,
        "total_revenue": str(total_revenue)
    }
