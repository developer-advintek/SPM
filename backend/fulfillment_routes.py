"""
Partner Fulfillment Routes
Manages partner product assignments, sales logging, performance tracking, and milestones
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime, timezone
from decimal import Decimal
from models import (
    User, FulfillmentAssignment, FulfillmentAssignmentCreate,
    SaleTransaction, SaleTransactionCreate, Milestone, MilestoneCreate,
    PartnerMilestoneProgress, AuditLog
)
from utils.security import verify_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB setup
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

fulfillment_router = APIRouter(prefix="/api/fulfillment", tags=["fulfillment"])
security = HTTPBearer()

# Dependency to get current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    return User(**{k: v for k, v in user.items() if k not in ['password_hash', 'google_id']})

def is_admin_or_pm(user: User) -> bool:
    """Check if user is admin or partner manager"""
    return user.role in ["admin", "partner_manager"]

def is_partner(user: User) -> bool:
    """Check if user is a partner"""
    return user.role == "partner"

async def create_audit_log(user_id: str, action_type: str, resource_type: str, resource_id: str, state_before, state_after):
    """Create audit log entry"""
    audit = AuditLog(
        user_id=user_id,
        action_type=action_type,
        resource_type=resource_type,
        resource_id=resource_id,
        state_before=state_before,
        state_after=state_after
    )
    doc = audit.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.audit_logs.insert_one(doc)

# ============= FULFILLMENT ASSIGNMENTS =============

@fulfillment_router.post("/assignments")
async def create_fulfillment_assignment(assignment_data: FulfillmentAssignmentCreate, current_user: User = Depends(get_current_user)):
    """
    Create a fulfillment assignment for a partner
    Admin/PM assigns products to partners for selling
    """
    if not is_admin_or_pm(current_user):
        raise HTTPException(status_code=403, detail="Only admin or partner manager can create assignments")
    
    # Verify partner exists and is approved
    partner = await db.partners.find_one({"id": assignment_data.partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    if partner.get('status') != 'approved':
        raise HTTPException(status_code=400, detail="Only approved partners can receive fulfillment assignments")
    
    # Verify products exist
    for product_id in assignment_data.product_ids:
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    
    # If spiff-based, verify spiff exists
    if assignment_data.spiff_id:
        spiff = await db.spiffs.find_one({"id": assignment_data.spiff_id}, {"_id": 0})
        if not spiff:
            raise HTTPException(status_code=404, detail="Spiff not found")
    
    # Create assignment
    assignment = FulfillmentAssignment(
        **assignment_data.model_dump(),
        assigned_by=current_user.id
    )
    
    doc = assignment.model_dump()
    for key in ['start_date', 'end_date', 'created_at', 'updated_at']:
        if doc.get(key):
            doc[key] = doc[key].isoformat()
    
    # Convert Decimal fields to float for MongoDB
    for key in ['target_revenue', 'actual_revenue', 'completion_percentage']:
        if doc.get(key) is not None:
            doc[key] = float(doc[key])
    
    await db.fulfillment_assignments.insert_one(doc)
    await create_audit_log(current_user.id, "fulfillment_assignment_created", "fulfillment", assignment.id, None, doc)
    
    return {"message": "Fulfillment assignment created successfully", "assignment_id": assignment.id, "assignment": doc}

@fulfillment_router.get("/assignments")
async def get_all_assignments(
    partner_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get fulfillment assignments
    - Admin/PM: Can see all assignments or filter by partner
    - Partner: Can only see their own assignments
    """
    query = {}
    
    if is_partner(current_user):
        # Partners can only see their own assignments
        # Find partner record linked to this user
        partner = await db.partners.find_one({"user_id": current_user.id}, {"_id": 0})
        if not partner:
            return {"assignments": [], "total": 0}
        query["partner_id"] = partner['id']
    elif partner_id:
        # Admin/PM filtering by specific partner
        query["partner_id"] = partner_id
    
    if status:
        query["status"] = status
    
    assignments = await db.fulfillment_assignments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with partner and product details
    for assignment in assignments:
        # Get partner details
        partner = await db.partners.find_one({"id": assignment['partner_id']}, {"_id": 0, "company_name": 1, "tier": 1})
        if partner:
            assignment['partner_name'] = partner.get('company_name')
            assignment['partner_tier'] = partner.get('tier')
        
        # Get product details
        product_details = []
        for product_id in assignment.get('product_ids', []):
            product = await db.products.find_one({"id": product_id}, {"_id": 0, "name": 1})
            if product:
                product_details.append({"id": product_id, "name": product['name']})
        assignment['products'] = product_details
        
        # Get spiff details if applicable
        if assignment.get('spiff_id'):
            spiff = await db.spiffs.find_one({"id": assignment['spiff_id']}, {"_id": 0, "name": 1})
            if spiff:
                assignment['spiff_name'] = spiff['name']
    
    return {"assignments": assignments, "total": len(assignments)}

@fulfillment_router.get("/assignments/my-opportunities")
async def get_my_opportunities(current_user: User = Depends(get_current_user)):
    """
    Get current partner's active opportunities (assigned products they can sell)
    For partner portal
    """
    if not is_partner(current_user):
        raise HTTPException(status_code=403, detail="Only partners can access this endpoint")
    
    # Find partner record
    partner = await db.partners.find_one({"user_id": current_user.id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner profile not found")
    
    # Get active assignments
    assignments = await db.fulfillment_assignments.find({
        "partner_id": partner['id'],
        "status": "active"
    }, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with product and spiff details
    opportunities = []
    for assignment in assignments:
        # Get products
        products = []
        for product_id in assignment.get('product_ids', []):
            product = await db.products.find_one({"id": product_id}, {"_id": 0})
            if product:
                # Get partner's commission for this product based on tier
                tier_commissions = product.get('tier_commissions', {})
                partner_tier = partner.get('tier', 'bronze')
                commission_rate = tier_commissions.get(partner_tier, 0)
                
                products.append({
                    "id": product['id'],
                    "name": product['name'],
                    "description": product.get('description'),
                    "commission_rate": commission_rate
                })
        
        # Get spiff details
        spiff_details = None
        if assignment.get('spiff_id'):
            spiff = await db.spiffs.find_one({"id": assignment['spiff_id']}, {"_id": 0})
            if spiff:
                spiff_details = {
                    "id": spiff['id'],
                    "name": spiff['name'],
                    "description": spiff.get('description'),
                    "incentive_amount": float(spiff.get('incentive_amount', 0)),
                    "incentive_type": spiff.get('incentive_type'),
                    "start_date": spiff.get('start_date'),
                    "end_date": spiff.get('end_date')
                }
        
        opportunities.append({
            "assignment_id": assignment['id'],
            "products": products,
            "spiff": spiff_details,
            "target_quantity": assignment.get('target_quantity'),
            "target_revenue": assignment.get('target_revenue'),
            "actual_quantity": assignment.get('actual_quantity', 0),
            "actual_revenue": assignment.get('actual_revenue', 0),
            "completion_percentage": assignment.get('completion_percentage', 0),
            "start_date": assignment.get('start_date'),
            "end_date": assignment.get('end_date'),
            "notes": assignment.get('notes')
        })
    
    return {"opportunities": opportunities, "total": len(opportunities)}

@fulfillment_router.put("/assignments/{assignment_id}/status")
async def update_assignment_status(assignment_id: str, status_data: dict, current_user: User = Depends(get_current_user)):
    """Update assignment status"""
    if not is_admin_or_pm(current_user):
        raise HTTPException(status_code=403, detail="Only admin or partner manager can update assignment status")
    
    assignment = await db.fulfillment_assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    new_status = status_data.get('status')
    if new_status not in ['active', 'completed', 'expired', 'cancelled']:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    await db.fulfillment_assignments.update_one(
        {"id": assignment_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Assignment status updated successfully"}

# ============= PARTNER SALES LOGGING =============

@fulfillment_router.post("/sales")
async def log_partner_sale(sale_data: SaleTransactionCreate, current_user: User = Depends(get_current_user)):
    """
    Log a sale transaction
    - Partners can log their own sales
    - Admin/PM can log sales for any partner
    """
    partner_id = sale_data.partner_id
    
    # If partner user, verify they're logging their own sale
    if is_partner(current_user):
        partner = await db.partners.find_one({"user_id": current_user.id}, {"_id": 0})
        if not partner or partner['id'] != partner_id:
            raise HTTPException(status_code=403, detail="Partners can only log their own sales")
    
    # Verify partner exists and is approved
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    if partner.get('status') != 'approved':
        raise HTTPException(status_code=400, detail="Only approved partners can log sales")
    
    # Verify product exists
    product = await db.products.find_one({"id": sale_data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if partner has an active assignment for this product
    assignment = await db.fulfillment_assignments.find_one({
        "partner_id": partner_id,
        "product_ids": sale_data.product_id,
        "status": "active"
    }, {"_id": 0})
    
    if not assignment:
        raise HTTPException(
            status_code=400,
            detail="Partner does not have an active assignment for this product. Contact admin for product assignment."
        )
    
    # Calculate commission
    total_amount = sale_data.unit_price * sale_data.quantity
    
    # Get partner tier and commission rate
    partner_tier = partner.get('tier', 'bronze')
    tier_commissions = product.get('tier_commissions', {})
    commission_rate = tier_commissions.get(partner_tier, 0) / 100  # Convert percentage to decimal
    commission_amount = total_amount * Decimal(str(commission_rate))
    
    # Check for applicable spiff bonus
    spiff_bonus = Decimal("0")
    if assignment.get('spiff_id'):
        spiff = await db.spiffs.find_one({"id": assignment['spiff_id']}, {"_id": 0})
        if spiff and spiff.get('status') == 'active':
            # Check if sale date is within spiff period
            sale_date = sale_data.sale_date
            if isinstance(sale_date, str):
                sale_date = datetime.fromisoformat(sale_date)
            
            spiff_start = spiff.get('start_date')
            spiff_end = spiff.get('end_date')
            if isinstance(spiff_start, str):
                spiff_start = datetime.fromisoformat(spiff_start)
            if isinstance(spiff_end, str):
                spiff_end = datetime.fromisoformat(spiff_end)
            
            if spiff_start <= sale_date <= spiff_end:
                incentive_amount = spiff.get('incentive_amount', 0)
                if spiff.get('incentive_type') == 'fixed':
                    spiff_bonus = Decimal(str(incentive_amount)) * sale_data.quantity
                else:  # percentage
                    spiff_bonus = total_amount * (Decimal(str(incentive_amount)) / 100)
    
    total_commission = commission_amount + spiff_bonus
    
    # Create sale transaction
    sale = SaleTransaction(
        **sale_data.model_dump(),
        total_amount=total_amount,
        commission_amount=commission_amount,
        spiff_bonus=spiff_bonus,
        total_commission=total_commission,
        created_by=current_user.id
    )
    
    doc = sale.model_dump()
    for key in ['sale_date', 'created_at', 'approved_at', 'paid_at']:
        if doc.get(key):
            doc[key] = doc[key].isoformat()
    
    # Convert Decimal to float
    for key in ['unit_price', 'total_amount', 'commission_amount', 'spiff_bonus', 'total_commission']:
        if doc.get(key) is not None:
            doc[key] = float(doc[key])
    
    await db.sales.insert_one(doc)
    
    # Update assignment progress
    await db.fulfillment_assignments.update_one(
        {"id": assignment['id']},
        {
            "$inc": {
                "actual_quantity": sale_data.quantity,
                "actual_revenue": float(total_amount)
            },
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Recalculate completion percentage
    updated_assignment = await db.fulfillment_assignments.find_one({"id": assignment['id']}, {"_id": 0})
    if updated_assignment:
        completion = Decimal("0")
        if updated_assignment.get('target_quantity'):
            completion = (Decimal(str(updated_assignment['actual_quantity'])) / Decimal(str(updated_assignment['target_quantity']))) * 100
        elif updated_assignment.get('target_revenue'):
            completion = (Decimal(str(updated_assignment['actual_revenue'])) / Decimal(str(updated_assignment['target_revenue']))) * 100
        
        await db.fulfillment_assignments.update_one(
            {"id": assignment['id']},
            {"$set": {"completion_percentage": float(completion)}}
        )
    
    # Check and update milestone progress
    await update_milestone_progress(partner_id, assignment['id'])
    
    await create_audit_log(current_user.id, "sale_logged", "sale", sale.id, None, doc)
    
    return {
        "message": "Sale logged successfully",
        "sale_id": sale.id,
        "total_amount": float(total_amount),
        "commission_amount": float(commission_amount),
        "spiff_bonus": float(spiff_bonus),
        "total_commission": float(total_commission)
    }

@fulfillment_router.get("/sales/my-sales")
async def get_my_sales(current_user: User = Depends(get_current_user)):
    """Get sales logged by the current partner"""
    if not is_partner(current_user):
        raise HTTPException(status_code=403, detail="Only partners can access this endpoint")
    
    # Find partner record
    partner = await db.partners.find_one({"user_id": current_user.id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner profile not found")
    
    # Get sales
    sales = await db.sales.find({"partner_id": partner['id']}, {"_id": 0}).sort("sale_date", -1).to_list(1000)
    
    # Enrich with product details
    for sale in sales:
        product = await db.products.find_one({"id": sale['product_id']}, {"_id": 0, "name": 1})
        if product:
            sale['product_name'] = product['name']
    
    return {"sales": sales, "total": len(sales)}

# ============= MILESTONES =============

@fulfillment_router.post("/milestones")
async def create_milestone(milestone_data: MilestoneCreate, current_user: User = Depends(get_current_user)):
    """Create a milestone for tracking partner performance"""
    if not is_admin_or_pm(current_user):
        raise HTTPException(status_code=403, detail="Only admin or partner manager can create milestones")
    
    milestone = Milestone(**milestone_data.model_dump())
    
    doc = milestone.model_dump()
    if doc.get('created_at'):
        doc['created_at'] = doc['created_at'].isoformat()
    
    # Convert Decimal to float
    for key in ['threshold', 'reward_amount']:
        if doc.get(key) is not None:
            doc[key] = float(doc[key])
    
    await db.milestones.insert_one(doc)
    
    return {"message": "Milestone created successfully", "milestone_id": milestone.id}

@fulfillment_router.get("/milestones")
async def get_milestones(current_user: User = Depends(get_current_user)):
    """Get all milestones"""
    milestones = await db.milestones.find({}, {"_id": 0}).to_list(1000)
    return {"milestones": milestones, "total": len(milestones)}

@fulfillment_router.get("/milestones/my-progress")
async def get_my_milestone_progress(current_user: User = Depends(get_current_user)):
    """Get current partner's milestone progress"""
    if not is_partner(current_user):
        raise HTTPException(status_code=403, detail="Only partners can access this endpoint")
    
    # Find partner record
    partner = await db.partners.find_one({"user_id": current_user.id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner profile not found")
    
    # Get milestone progress
    progress = await db.milestone_progress.find({"partner_id": partner['id']}, {"_id": 0}).to_list(1000)
    
    # Enrich with milestone details
    for prog in progress:
        milestone = await db.milestones.find_one({"id": prog['milestone_id']}, {"_id": 0})
        if milestone:
            prog['milestone_name'] = milestone['name']
            prog['milestone_description'] = milestone.get('description')
            prog['reward_amount'] = milestone.get('reward_amount')
            prog['reward_type'] = milestone.get('reward_type')
    
    return {"progress": progress, "total": len(progress)}

async def update_milestone_progress(partner_id: str, assignment_id: str):
    """Update milestone progress based on assignment performance"""
    # Get all milestones
    milestones = await db.milestones.find({}, {"_id": 0}).to_list(1000)
    
    # Get assignment
    assignment = await db.fulfillment_assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        return
    
    for milestone in milestones:
        milestone_type = milestone['milestone_type']
        threshold = Decimal(str(milestone['threshold']))
        
        # Calculate current value based on milestone type
        if milestone_type == 'quantity':
            current_value = Decimal(str(assignment.get('actual_quantity', 0)))
        else:  # revenue
            current_value = Decimal(str(assignment.get('actual_revenue', 0)))
        
        # Calculate percentage
        percentage = (current_value / threshold * 100) if threshold > 0 else Decimal("0")
        
        # Check if progress record exists
        existing_progress = await db.milestone_progress.find_one({
            "partner_id": partner_id,
            "milestone_id": milestone['id'],
            "assignment_id": assignment_id
        }, {"_id": 0})
        
        if existing_progress:
            # Update existing progress
            status = "achieved" if percentage >= 100 else "in_progress"
            update_data = {
                "current_value": float(current_value),
                "percentage_complete": float(percentage),
                "status": status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if status == "achieved" and existing_progress.get('status') != "achieved":
                update_data['achieved_at'] = datetime.now(timezone.utc).isoformat()
            
            await db.milestone_progress.update_one(
                {"id": existing_progress['id']},
                {"$set": update_data}
            )
        else:
            # Create new progress record
            status = "achieved" if percentage >= 100 else "in_progress"
            progress = PartnerMilestoneProgress(
                partner_id=partner_id,
                milestone_id=milestone['id'],
                assignment_id=assignment_id,
                current_value=current_value,
                threshold=threshold,
                percentage_complete=percentage,
                status=status,
                achieved_at=datetime.now(timezone.utc) if status == "achieved" else None
            )
            
            doc = progress.model_dump()
            for key in ['created_at', 'updated_at', 'achieved_at']:
                if doc.get(key):
                    doc[key] = doc[key].isoformat()
            
            # Convert Decimal to float
            for key in ['current_value', 'threshold', 'percentage_complete']:
                if doc.get(key) is not None:
                    doc[key] = float(doc[key])
            
            await db.milestone_progress.insert_one(doc)

# ============= PERFORMANCE ANALYTICS =============

@fulfillment_router.get("/analytics/partner/{partner_id}")
async def get_partner_analytics(partner_id: str, current_user: User = Depends(get_current_user)):
    """Get comprehensive analytics for a partner"""
    # Partners can only see their own analytics
    if is_partner(current_user):
        partner = await db.partners.find_one({"user_id": current_user.id}, {"_id": 0})
        if not partner or partner['id'] != partner_id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif not is_admin_or_pm(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get partner details
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Get all sales
    sales = await db.sales.find({"partner_id": partner_id}, {"_id": 0}).to_list(10000)
    
    # Calculate metrics
    total_sales = len(sales)
    total_revenue = sum(Decimal(str(sale.get('total_amount', 0))) for sale in sales)
    total_commission = sum(Decimal(str(sale.get('total_commission', 0))) for sale in sales)
    pending_commission = sum(Decimal(str(sale.get('total_commission', 0))) for sale in sales if sale.get('commission_status') == 'pending')
    approved_commission = sum(Decimal(str(sale.get('total_commission', 0))) for sale in sales if sale.get('commission_status') == 'approved')
    paid_commission = sum(Decimal(str(sale.get('total_commission', 0))) for sale in sales if sale.get('commission_status') == 'paid')
    
    # Get active assignments
    active_assignments = await db.fulfillment_assignments.find({
        "partner_id": partner_id,
        "status": "active"
    }, {"_id": 0}).to_list(1000)
    
    # Get milestone achievements
    achievements = await db.milestone_progress.find({
        "partner_id": partner_id,
        "status": "achieved"
    }, {"_id": 0}).to_list(1000)
    
    return {
        "partner_id": partner_id,
        "partner_name": partner.get('company_name'),
        "partner_tier": partner.get('tier'),
        "metrics": {
            "total_sales": total_sales,
            "total_revenue": float(total_revenue),
            "total_commission": float(total_commission),
            "pending_commission": float(pending_commission),
            "approved_commission": float(approved_commission),
            "paid_commission": float(paid_commission)
        },
        "active_assignments": len(active_assignments),
        "milestones_achieved": len(achievements)
    }

@fulfillment_router.get("/analytics/overview")
async def get_analytics_overview(current_user: User = Depends(get_current_user)):
    """Get overall fulfillment analytics (Admin/PM only)"""
    if not is_admin_or_pm(current_user):
        raise HTTPException(status_code=403, detail="Only admin or partner manager can access analytics overview")
    
    # Get all assignments
    all_assignments = await db.fulfillment_assignments.find({}, {"_id": 0}).to_list(10000)
    active_assignments = [a for a in all_assignments if a.get('status') == 'active']
    
    # Get all sales
    all_sales = await db.sales.find({}, {"_id": 0}).to_list(10000)
    
    # Calculate metrics
    total_revenue = sum(Decimal(str(sale.get('total_amount', 0))) for sale in all_sales)
    total_commission = sum(Decimal(str(sale.get('total_commission', 0))) for sale in all_sales)
    
    # Top performing partners
    partner_performance = {}
    for sale in all_sales:
        partner_id = sale.get('partner_id')
        if partner_id not in partner_performance:
            partner_performance[partner_id] = {
                "sales_count": 0,
                "revenue": Decimal("0"),
                "commission": Decimal("0")
            }
        partner_performance[partner_id]["sales_count"] += 1
        partner_performance[partner_id]["revenue"] += Decimal(str(sale.get('total_amount', 0)))
        partner_performance[partner_id]["commission"] += Decimal(str(sale.get('total_commission', 0)))
    
    # Get top 5 partners
    top_partners = sorted(
        partner_performance.items(),
        key=lambda x: x[1]["revenue"],
        reverse=True
    )[:5]
    
    # Enrich with partner names
    top_partners_list = []
    for partner_id, metrics in top_partners:
        partner = await db.partners.find_one({"id": partner_id}, {"_id": 0, "company_name": 1, "tier": 1})
        if partner:
            top_partners_list.append({
                "partner_id": partner_id,
                "partner_name": partner.get('company_name'),
                "partner_tier": partner.get('tier'),
                "sales_count": metrics["sales_count"],
                "revenue": float(metrics["revenue"]),
                "commission": float(metrics["commission"])
            })
    
    return {
        "overview": {
            "total_assignments": len(all_assignments),
            "active_assignments": len(active_assignments),
            "total_sales": len(all_sales),
            "total_revenue": float(total_revenue),
            "total_commission": float(total_commission)
        },
        "top_partners": top_partners_list
    }
