"""
Access Control Routes - Custom Roles, Groups, and Permissions Management
Allows admins to create and manage custom roles, groups, and permissions
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime, timezone
from uuid import uuid4
from models import (
    CustomRole, CustomRoleCreate, CustomGroup, CustomGroupCreate,
    User, AuditLog
)
from utils.security import verify_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB setup
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

access_control_router = APIRouter(prefix="/api/access-control", tags=["access-control"])
security = HTTPBearer()

# Available permissions in the system
AVAILABLE_PERMISSIONS = [
    # Dashboard & Analytics
    "view_dashboard",
    "view_analytics",
    
    # User Management
    "view_users",
    "create_users",
    "edit_users",
    "delete_users",
    
    # Partner Management
    "view_partners",
    "create_partners",
    "edit_partners",
    "delete_partners",
    "approve_l1",
    "approve_l2",
    "reject_partners",
    "assign_partner_tier",
    
    # Product Management
    "view_products",
    "create_products",
    "edit_products",
    "delete_products",
    
    # Spiff Management
    "view_spiffs",
    "create_spiffs",
    "edit_spiffs",
    "delete_spiffs",
    
    # Sales & Commission
    "view_sales",
    "create_sales",
    "edit_sales",
    "approve_commissions",
    "process_payouts",
    
    # Reports
    "view_reports",
    "export_reports",
    
    # Access Control
    "manage_roles",
    "manage_groups",
    "manage_permissions",
    
    # System Settings
    "manage_settings",
    "view_audit_logs"
]

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

def is_admin(user: User) -> bool:
    """Check if user is admin"""
    return user.role == "admin"

async def create_audit_log(user_id: str, action_type: str, resource_type: str, resource_id: str, state_before: Optional[dict], state_after: Optional[dict]):
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

# ============= PERMISSIONS =============

@access_control_router.get("/permissions")
async def get_available_permissions(current_user: User = Depends(get_current_user)):
    """Get all available permissions in the system"""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return {
        "permissions": AVAILABLE_PERMISSIONS,
        "categories": {
            "Dashboard & Analytics": [p for p in AVAILABLE_PERMISSIONS if "dashboard" in p or "analytics" in p],
            "User Management": [p for p in AVAILABLE_PERMISSIONS if "users" in p],
            "Partner Management": [p for p in AVAILABLE_PERMISSIONS if "partners" in p or "approve" in p or "tier" in p],
            "Product Management": [p for p in AVAILABLE_PERMISSIONS if "products" in p],
            "Spiff Management": [p for p in AVAILABLE_PERMISSIONS if "spiffs" in p],
            "Sales & Commission": [p for p in AVAILABLE_PERMISSIONS if "sales" in p or "commissions" in p or "payouts" in p],
            "Reports": [p for p in AVAILABLE_PERMISSIONS if "reports" in p],
            "Access Control": [p for p in AVAILABLE_PERMISSIONS if "roles" in p or "groups" in p or "permissions" in p],
            "System": [p for p in AVAILABLE_PERMISSIONS if "settings" in p or "audit" in p]
        }
    }

# ============= CUSTOM ROLES =============

@access_control_router.get("/roles")
async def get_all_roles(current_user: User = Depends(get_current_user)):
    """Get all custom roles"""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get custom roles from database
    custom_roles = await db.custom_roles.find({}, {"_id": 0}).to_list(1000)
    
    # Convert datetime strings to datetime objects
    for role in custom_roles:
        if isinstance(role.get('created_at'), str):
            role['created_at'] = datetime.fromisoformat(role['created_at'])
        if isinstance(role.get('updated_at'), str):
            role['updated_at'] = datetime.fromisoformat(role['updated_at'])
    
    # Add system roles
    system_roles = [
        {"id": "admin", "name": "Administrator", "description": "Full system access", "is_custom": False, "permissions": ["*"]},
        {"id": "partner_manager", "name": "Partner Manager", "description": "Manage partners", "is_custom": False, "permissions": ["view_partners", "create_partners", "edit_partners"]},
        {"id": "l1_approver", "name": "L1 Approver", "description": "Level 1 approval", "is_custom": False, "permissions": ["approve_l1", "assign_partner_tier"]},
        {"id": "l2_approver", "name": "L2 Approver", "description": "Level 2 approval", "is_custom": False, "permissions": ["approve_l2"]},
        {"id": "partner", "name": "Partner", "description": "Partner user", "is_custom": False, "permissions": ["view_dashboard"]},
    ]
    
    return {
        "system_roles": system_roles,
        "custom_roles": custom_roles,
        "total": len(system_roles) + len(custom_roles)
    }

@access_control_router.post("/roles")
async def create_custom_role(role_data: CustomRoleCreate, current_user: User = Depends(get_current_user)):
    """Create a new custom role"""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if role name already exists
    existing = await db.custom_roles.find_one({"name": role_data.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Role name already exists")
    
    # Create role
    role = CustomRole(
        **role_data.model_dump(),
        created_by=current_user.id
    )
    
    doc = role.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.custom_roles.insert_one(doc)
    await create_audit_log(current_user.id, "custom_role_created", "custom_role", role.id, None, doc)
    
    return {"message": "Custom role created successfully", "role_id": role.id}

@access_control_router.put("/roles/{role_id}")
async def update_custom_role(role_id: str, role_data: CustomRoleCreate, current_user: User = Depends(get_current_user)):
    """Update a custom role"""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get existing role
    existing = await db.custom_roles.find_one({"id": role_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Update role
    update_data = role_data.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.custom_roles.update_one({"id": role_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "custom_role_updated", "custom_role", role_id, existing, update_data)
    
    return {"message": "Custom role updated successfully"}

@access_control_router.delete("/roles/{role_id}")
async def delete_custom_role(role_id: str, current_user: User = Depends(get_current_user)):
    """Delete a custom role"""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if role exists
    role = await db.custom_roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Check if role is assigned to any users
    users_with_role = await db.users.count_documents({"role": role['name']})
    if users_with_role > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete role. {users_with_role} users are assigned this role.")
    
    # Delete role
    await db.custom_roles.delete_one({"id": role_id})
    await create_audit_log(current_user.id, "custom_role_deleted", "custom_role", role_id, role, None)
    
    return {"message": "Custom role deleted successfully"}

# ============= CUSTOM GROUPS =============

@access_control_router.get("/groups")
async def get_all_groups(current_user: User = Depends(get_current_user)):
    """Get all custom groups"""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    groups = await db.custom_groups.find({}, {"_id": 0}).to_list(1000)
    
    # Convert datetime strings
    for group in groups:
        if isinstance(group.get('created_at'), str):
            group['created_at'] = datetime.fromisoformat(group['created_at'])
        if isinstance(group.get('updated_at'), str):
            group['updated_at'] = datetime.fromisoformat(group['updated_at'])
        
        # Get user details for each group
        user_ids = group.get('user_ids', [])
        users = []
        for user_id in user_ids:
            user = await db.users.find_one({"id": user_id}, {"_id": 0, "full_name": 1, "email": 1})
            if user:
                users.append(user)
        group['users'] = users
    
    return {"groups": groups, "total": len(groups)}

@access_control_router.post("/groups")
async def create_custom_group(group_data: CustomGroupCreate, current_user: User = Depends(get_current_user)):
    """Create a new custom group"""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if group name already exists
    existing = await db.custom_groups.find_one({"name": group_data.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Group name already exists")
    
    # Create group
    group = CustomGroup(
        **group_data.model_dump(),
        created_by=current_user.id
    )
    
    doc = group.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.custom_groups.insert_one(doc)
    await create_audit_log(current_user.id, "custom_group_created", "custom_group", group.id, None, doc)
    
    return {"message": "Custom group created successfully", "group_id": group.id, "group": doc}

@access_control_router.put("/groups/{group_id}")
async def update_custom_group(group_id: str, group_data: CustomGroupCreate, current_user: User = Depends(get_current_user)):
    """Update a custom group"""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get existing group
    existing = await db.custom_groups.find_one({"id": group_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Update group
    update_data = group_data.model_dump()
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.custom_groups.update_one({"id": group_id}, {"$set": update_data})
    await create_audit_log(current_user.id, "custom_group_updated", "custom_group", group_id, existing, update_data)
    
    return {"message": "Custom group updated successfully"}

@access_control_router.delete("/groups/{group_id}")
async def delete_custom_group(group_id: str, current_user: User = Depends(get_current_user)):
    """Delete a custom group"""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if group exists
    group = await db.custom_groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Delete group
    await db.custom_groups.delete_one({"id": group_id})
    await create_audit_log(current_user.id, "custom_group_deleted", "custom_group", group_id, group, None)
    
    return {"message": "Custom group deleted successfully"}

@access_control_router.post("/groups/{group_id}/add-users")
async def add_users_to_group(group_id: str, user_data: dict, current_user: User = Depends(get_current_user)):
    """Add users to a group"""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    group = await db.custom_groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    user_ids = user_data.get('user_ids', [])
    current_users = group.get('user_ids', [])
    
    # Add new users (avoid duplicates)
    for user_id in user_ids:
        if user_id not in current_users:
            current_users.append(user_id)
    
    await db.custom_groups.update_one(
        {"id": group_id},
        {"$set": {"user_ids": current_users, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Added {len(user_ids)} users to group"}

@access_control_router.post("/groups/{group_id}/remove-users")
async def remove_users_from_group(group_id: str, user_data: dict, current_user: User = Depends(get_current_user)):
    """Remove users from a group"""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    group = await db.custom_groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    user_ids = user_data.get('user_ids', [])
    current_users = group.get('user_ids', [])
    
    # Remove users
    for user_id in user_ids:
        if user_id in current_users:
            current_users.remove(user_id)
    
    await db.custom_groups.update_one(
        {"id": group_id},
        {"$set": {"user_ids": current_users, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Removed {len(user_ids)} users from group"}

# ============= USER PERMISSIONS =============

@access_control_router.get("/users/{user_id}/permissions")
async def get_user_permissions(user_id: str, current_user: User = Depends(get_current_user)):
    """Get all permissions for a user (from role + groups)"""
    if not is_admin(current_user) and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    permissions = set()
    
    # Get permissions from role
    user_role = user.get('role')
    if user_role == 'admin':
        permissions = set(AVAILABLE_PERMISSIONS)
    else:
        # Check custom roles
        custom_role = await db.custom_roles.find_one({"name": user_role}, {"_id": 0})
        if custom_role:
            permissions.update(custom_role.get('permissions', []))
    
    # Get permissions from groups
    groups = await db.custom_groups.find({"user_ids": user_id}, {"_id": 0}).to_list(1000)
    for group in groups:
        permissions.update(group.get('permissions', []))
    
    return {
        "user_id": user_id,
        "role": user_role,
        "permissions": list(permissions),
        "groups": [g['name'] for g in groups]
    }
