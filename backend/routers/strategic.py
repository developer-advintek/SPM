"""Strategic Planning Router - Goals, Territories, Quotas, Forecasting"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timezone
from decimal import Decimal
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models import (
    Territory, TerritoryCreate, Quota, QuotaCreate,
    Forecast, ForecastCreate, NFM, NFMCreate, User
)
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

router = APIRouter(prefix="/api/strategic", tags=["strategic"])

# ========== TERRITORY MANAGEMENT ==========

@router.post("/territories", response_model=Territory)
async def create_territory(territory: TerritoryCreate):
    """Create a new territory"""
    terr = Territory(**territory.model_dump())
    
    terr_dict = terr.model_dump()
    terr_dict['created_at'] = terr_dict['created_at'].isoformat()
    terr_dict['updated_at'] = terr_dict['updated_at'].isoformat()
    terr_dict['account_potential'] = str(terr_dict['account_potential'])
    
    await db.territories.insert_one(terr_dict)
    return terr

@router.get("/territories", response_model=List[Territory])
async def list_territories():
    """List all territories"""
    territories = await db.territories.find({}, {"_id": 0}).to_list(100)
    for t in territories:
        t['created_at'] = datetime.fromisoformat(t['created_at'])
        t['updated_at'] = datetime.fromisoformat(t['updated_at'])
    return [Territory(**t) for t in territories]

@router.get("/territories/{territory_id}", response_model=Territory)
async def get_territory(territory_id: str):
    """Get territory by ID"""
    territory = await db.territories.find_one({"id": territory_id}, {"_id": 0})
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")
    
    territory['created_at'] = datetime.fromisoformat(territory['created_at'])
    territory['updated_at'] = datetime.fromisoformat(territory['updated_at'])
    return Territory(**territory)

@router.put("/territories/{territory_id}/assign/{user_id}")
async def assign_territory(territory_id: str, user_id: str):
    """Assign territory to a user"""
    # Check if territory exists
    territory = await db.territories.find_one({"id": territory_id}, {"_id": 0})
    if not territory:
        raise HTTPException(status_code=404, detail="Territory not found")
    
    # Check if user exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update territory
    await db.territories.update_one(
        {"id": territory_id},
        {"$set": {
            "assigned_rep_id": user_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update user
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"territory_id": territory_id}}
    )
    
    return {"message": "Territory assigned successfully"}

@router.get("/territories/{territory_id}/performance")
async def get_territory_performance(territory_id: str):
    """Get performance metrics for a territory"""
    # Get all users in this territory
    users = await db.users.find({"territory_id": territory_id}, {"_id": 0}).to_list(100)
    user_ids = [u['id'] for u in users]
    
    # Get transactions for this territory
    transactions = await db.transactions.find({
        "territory_id": territory_id,
        "status": "processed"
    }, {"_id": 0}).to_list(1000)
    
    total_revenue = sum(Decimal(str(t['total_amount'])) for t in transactions)
    
    # Get commissions
    commissions = await db.commission_calculations.find({
        "sales_rep_id": {"$in": user_ids}
    }, {"_id": 0}).to_list(1000)
    
    total_commission = sum(Decimal(str(c['commission_amount'])) for c in commissions)
    
    return {
        "territory_id": territory_id,
        "total_users": len(users),
        "total_transactions": len(transactions),
        "total_revenue": float(total_revenue),
        "total_commission": float(total_commission),
        "avg_revenue_per_user": float(total_revenue / len(users)) if users else 0
    }

# ========== QUOTA MANAGEMENT ==========

@router.post("/quotas", response_model=Quota)
async def create_quota(quota: QuotaCreate):
    """Create a new quota"""
    quota_obj = Quota(**quota.model_dump())
    
    quota_dict = quota_obj.model_dump()
    quota_dict['period_start'] = quota_dict['period_start'].isoformat()
    quota_dict['period_end'] = quota_dict['period_end'].isoformat()
    quota_dict['created_at'] = quota_dict['created_at'].isoformat()
    quota_dict['updated_at'] = quota_dict['updated_at'].isoformat()
    for key in ['quota_amount', 'current_attainment', 'attainment_percent']:
        quota_dict[key] = str(quota_dict[key])
    
    await db.quotas.insert_one(quota_dict)
    return quota_obj

@router.get("/quotas", response_model=List[Quota])
async def list_quotas(user_id: str = None):
    """List all quotas, optionally filtered by user"""
    query = {}
    if user_id:
        query['user_id'] = user_id
    
    quotas = await db.quotas.find(query, {"_id": 0}).to_list(100)
    for q in quotas:
        for key in ['period_start', 'period_end', 'created_at', 'updated_at']:
            if key in q and isinstance(q[key], str):
                q[key] = datetime.fromisoformat(q[key])
    
    return [Quota(**q) for q in quotas]

@router.get("/quotas/{quota_id}", response_model=Quota)
async def get_quota(quota_id: str):
    """Get quota by ID"""
    quota = await db.quotas.find_one({"id": quota_id}, {"_id": 0})
    if not quota:
        raise HTTPException(status_code=404, detail="Quota not found")
    
    for key in ['period_start', 'period_end', 'created_at', 'updated_at']:
        if key in quota and isinstance(quota[key], str):
            quota[key] = datetime.fromisoformat(quota[key])
    
    return Quota(**quota)

@router.put("/quotas/{quota_id}/activate")
async def activate_quota(quota_id: str):
    """Activate a quota"""
    result = await db.quotas.update_one(
        {"id": quota_id},
        {"$set": {"status": "active"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Quota not found")
    
    return {"message": "Quota activated"}

@router.get("/quotas/{quota_id}/progress")
async def get_quota_progress(quota_id: str):
    """Get real-time quota progress"""
    quota = await db.quotas.find_one({"id": quota_id}, {"_id": 0})
    if not quota:
        raise HTTPException(status_code=404, detail="Quota not found")
    
    # Get user's transactions in the quota period
    start = datetime.fromisoformat(quota['period_start'])
    end = datetime.fromisoformat(quota['period_end'])
    
    transactions = await db.transactions.find({
        "sales_rep_id": quota['user_id'],
        "transaction_date": {"$gte": start, "$lte": end},
        "status": "processed"
    }, {"_id": 0}).to_list(1000)
    
    if quota['quota_type'] == 'revenue':
        attainment = sum(Decimal(str(t['total_amount'])) for t in transactions)
    elif quota['quota_type'] == 'units':
        attainment = sum(t['quantity'] for t in transactions)
    else:  # deals
        attainment = Decimal(str(len(transactions)))
    
    quota_amount = Decimal(str(quota['quota_amount']))
    attainment_percent = (attainment / quota_amount * 100) if quota_amount > 0 else Decimal("0")
    
    # Update quota
    await db.quotas.update_one(
        {"id": quota_id},
        {"$set": {
            "current_attainment": str(attainment),
            "attainment_percent": str(attainment_percent)
        }}
    )
    
    return {
        "quota_id": quota_id,
        "quota_amount": float(quota_amount),
        "current_attainment": float(attainment),
        "attainment_percent": float(attainment_percent),
        "remaining": float(quota_amount - attainment),
        "status": "on_track" if attainment_percent >= 75 else "at_risk"
    }

# ========== FORECASTING & MODELING ==========

@router.post("/forecasts", response_model=Forecast)
async def create_forecast(forecast: ForecastCreate, created_by: str = "admin"):
    """Create a new forecast scenario"""
    # Calculate projections based on assumptions
    assumptions = forecast.assumptions
    
    # Get historical data
    start = forecast.period_start
    end = forecast.period_end
    
    # Simple projection based on growth rate assumption
    growth_rate = Decimal(str(assumptions.get('growth_rate', 0.1)))
    
    # Get recent transactions for baseline
    recent_transactions = await db.transactions.find({
        "status": "processed"
    }, {"_id": 0}).sort("transaction_date", -1).limit(1000).to_list(1000)
    
    recent_revenue = sum(Decimal(str(t['total_amount'])) for t in recent_transactions[:100])
    
    projected_revenue = recent_revenue * (Decimal("1") + growth_rate)
    
    # Assume 5% commission payout on average
    projected_payout = projected_revenue * Decimal("0.05")
    projected_cos = (projected_payout / projected_revenue * 100) if projected_revenue > 0 else Decimal("0")
    
    forecast_obj = Forecast(
        scenario_name=forecast.scenario_name,
        period_start=forecast.period_start,
        period_end=forecast.period_end,
        projected_revenue=projected_revenue,
        projected_payout=projected_payout,
        projected_cos_percent=projected_cos,
        assumptions=assumptions,
        variance_from_current=Decimal("0"),
        created_by=created_by
    )
    
    forecast_dict = forecast_obj.model_dump()
    forecast_dict['period_start'] = forecast_dict['period_start'].isoformat()
    forecast_dict['period_end'] = forecast_dict['period_end'].isoformat()
    forecast_dict['created_at'] = forecast_dict['created_at'].isoformat()
    
    await db.forecasts.insert_one(forecast_dict)
    return forecast_obj

@router.get("/forecasts", response_model=List[Forecast])
async def list_forecasts():
    """List all forecasts"""
    forecasts = await db.forecasts.find({}, {"_id": 0}).to_list(100)
    for f in forecasts:
        for key in ['period_start', 'period_end', 'created_at']:
            if key in f and isinstance(f[key], str):
                f[key] = datetime.fromisoformat(f[key])
    return [Forecast(**f) for f in forecasts]

@router.get("/forecasts/{forecast_id}/compare")
async def compare_forecast_to_actual(forecast_id: str):
    """Compare forecast to actual performance"""
    forecast = await db.forecasts.find_one({"id": forecast_id}, {"_id": 0})
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")
    
    # Get actual transactions in the forecast period
    start = datetime.fromisoformat(forecast['period_start'])
    end = datetime.fromisoformat(forecast['period_end'])
    
    transactions = await db.transactions.find({
        "transaction_date": {"$gte": start, "$lte": end},
        "status": "processed"
    }, {"_id": 0}).to_list(10000)
    
    actual_revenue = sum(Decimal(str(t['total_amount'])) for t in transactions)
    
    projected = Decimal(str(forecast['projected_revenue']))
    variance = actual_revenue - projected
    variance_percent = (variance / projected * 100) if projected > 0 else Decimal("0")
    
    return {
        "forecast_id": forecast_id,
        "projected_revenue": float(projected),
        "actual_revenue": float(actual_revenue),
        "variance": float(variance),
        "variance_percent": float(variance_percent),
        "accuracy": 100 - abs(float(variance_percent))
    }

# ========== NON-FINANCIAL METRICS (NFM) ==========

@router.post("/nfm", response_model=NFM)
async def create_nfm(nfm: NFMCreate):
    """Create a new Non-Financial Metric"""
    nfm_obj = NFM(**nfm.model_dump())
    
    nfm_dict = nfm_obj.model_dump()
    nfm_dict['created_at'] = nfm_dict['created_at'].isoformat()
    
    await db.nfm.insert_one(nfm_dict)
    return nfm_obj

@router.get("/nfm", response_model=List[NFM])
async def list_nfm(user_id: str = None):
    """List all NFMs, optionally filtered by user"""
    query = {}
    if user_id:
        query['user_id'] = user_id
    
    nfms = await db.nfm.find(query, {"_id": 0}).to_list(100)
    for n in nfms:
        if 'created_at' in n and isinstance(n['created_at'], str):
            n['created_at'] = datetime.fromisoformat(n['created_at'])
    
    return [NFM(**n) for n in nfms]

@router.put("/nfm/{nfm_id}/update-value")
async def update_nfm_value(nfm_id: str, actual_value: float):
    """Update actual value of an NFM"""
    result = await db.nfm.update_one(
        {"id": nfm_id},
        {"$set": {"actual_value": str(actual_value)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="NFM not found")
    
    # If linked to commission, calculate multiplier effect
    nfm = await db.nfm.find_one({"id": nfm_id}, {"_id": 0})
    if nfm and nfm.get('link_to_commission'):
        target = Decimal(str(nfm['target_value']))
        actual = Decimal(str(actual_value))
        
        if actual >= target:
            multiplier = nfm.get('multiplier_effect', 1.0)
            return {
                "message": "NFM updated",
                "target_met": True,
                "multiplier_applies": True,
                "multiplier": multiplier
            }
    
    return {"message": "NFM updated", "target_met": False}

@router.get("/nfm/{user_id}/impact")
async def get_nfm_commission_impact(user_id: str):
    """Calculate NFM impact on user's commission"""
    nfms = await db.nfm.find({
        "user_id": user_id,
        "link_to_commission": True
    }, {"_id": 0}).to_list(100)
    
    multipliers = []
    for nfm in nfms:
        target = Decimal(str(nfm['target_value']))
        actual = Decimal(str(nfm.get('actual_value', 0)))
        
        if actual >= target:
            multipliers.append(Decimal(str(nfm.get('multiplier_effect', 1.0))))
    
    # Calculate compound multiplier
    compound_multiplier = Decimal("1")
    for m in multipliers:
        compound_multiplier *= m
    
    return {
        "user_id": user_id,
        "nfm_count": len(nfms),
        "targets_met": len(multipliers),
        "compound_multiplier": float(compound_multiplier),
        "commission_boost_percent": float((compound_multiplier - 1) * 100)
    }
