# Complete Database Schema for Nexright SPM/PPM Application

**Database Name**: `spm_ppm_db`  
**Total Collections**: 10

---

## 1. 👤 USERS Collection
**Total Documents**: 21

### Schema:
```javascript
{
  _id: ObjectId,
  id: String (UUID),                    // Custom ID
  email: String,                         // Unique email
  full_name: String,
  password: String,                      // bcrypt hashed password
  role: String,                          // 'admin', 'finance', 'rep', 'partner', 'l1_approver', 'l2_approver'
  active: Boolean,
  territory_id: String | null,
  manager_id: String | null,
  google_id: String | null,
  created_at: String (ISO 8601),
  updated_at: String (ISO 8601)
}
```

### Sample Data:
- **Admin**: admin@test.com
- **Finance**: finance@test.com  
- **Sales Rep**: rep@test.com
- **Partners**: testpartner123@example.com

---

## 2. 🤝 PARTNERS Collection
**Total Documents**: 58

### Schema:
```javascript
{
  _id: ObjectId,
  id: String (UUID),
  company_name: String,
  contact_name: String,
  contact_email: String,
  user_id: String | null,                     // Reference to users.id
  phone: String,
  website: String | null,
  business_type: String | null,
  tax_id: String | null,
  years_in_business: String | Number | null,
  number_of_employees: String | Number | null,
  expected_monthly_volume: String | null,
  business_address: String | null,
  
  // Status & Progress
  tier: String,                                // 'bronze', 'silver', 'gold', 'platinum'
  status: String,                              // 'pending_l1', 'pending_l2', 'approved', 'rejected', 'on_hold'
  onboarding_progress: Number,                 // 0-100
  
  // Documents
  documents: [
    {
      document_type: String,                   // 'business_license', 'tax_id', etc.
      document_name: String,
      document_data: String,                   // Base64 encoded
      uploaded_at: String (ISO 8601),
      verified: Boolean,
      verified_by: String | null,
      verified_at: String | null
    }
  ],
  
  // Approval Workflow (NEW)
  approval_workflow: [
    {
      level: Number,                           // 1 or 2
      approver_id: String,
      approver_name: String,
      status: String,                          // 'pending', 'approved', 'rejected'
      action_date: String (ISO 8601),
      comments: String,
      rejection_reason: String | null
    }
  ],
  
  // Product Assignment
  assigned_products: [String],                 // Array of product IDs
  
  // Tracking Fields
  rejection_count: Number,
  on_hold: Boolean,
  hold_reason: String | null,
  disqualified: Boolean,
  disqualification_reason: String | null,
  
  // Timestamps
  submitted_at: String (ISO 8601) | null,
  approved_at: String (ISO 8601) | null,
  approved_by: String | null,
  created_by: String,
  created_at: String (ISO 8601),
  updated_at: String (ISO 8601),
  
  // Legacy fields (older records)
  review_history: Array | undefined
}
```

### Key Fields:
- **Tiers**: bronze, silver, gold, platinum
- **Status Flow**: pending_l1 → pending_l2 → approved (or on_hold, rejected)
- **Documents**: Encrypted/base64 encoded business documents

---

## 3. 📦 PRODUCTS Collection
**Total Documents**: 16

### Schema:
```javascript
{
  _id: ObjectId,
  id: String (UUID),
  sku: String,                                 // Product SKU
  name: String,                                // Product name
  category: String,                            // 'Asset', 'Services', 'Software', etc.
  commission_rate_code: String,                // '1001', '1002', 'STANDARD'
  gross_margin_percent: String,                // '10', '15', '45.50'
  base_commission_rate: String,                // '5', '8.75', '15'
  eligible: Boolean,                           // Commission eligibility
  version: Number | undefined,
  active: Boolean | undefined,
  created_at: String (ISO 8601),
  updated_at: String (ISO 8601)
}
```

### Sample Products:
- **SIMCARD** (SKU: SIM) - Asset category
- **Internet Service** (SKU: Broadband) - Services category
- **Enterprise Software License** (SKU: PROD-001) - Software category

---

## 4. 🎯 SPIFFS Collection (Campaigns)
**Total Documents**: 2

### Schema:
```javascript
{
  _id: ObjectId,
  id: String (UUID),
  name: String,                                // Campaign name
  description: String,
  start_date: String (ISO 8601),
  end_date: String (ISO 8601),
  
  // Targeting
  target_products: [String],                   // Array of product IDs
  assignment_type: String,                     // 'individual', 'tier'
  target_tiers: [String],                      // ['silver', 'gold'] (if assignment_type = 'tier')
  target_partners: [String],                   // Array of partner IDs (if assignment_type = 'individual')
  
  // Incentive
  incentive_amount: String,                    // '2.5', '50'
  incentive_type: String,                      // 'percentage', 'fixed'
  
  // Status
  status: String,                              // 'active', 'inactive', 'completed'
  
  // Metadata
  created_by: String,                          // User ID
  created_at: String (ISO 8601),
  updated_at: String (ISO 8601)
}
```

### Sample Campaigns:
- **APAC Sales campaign**: 2.5% bonus on 3 products for silver tier partners
- **Q4 Sales Boost**: $50 fixed bonus per laptop

---

## 5. 📋 FULFILLMENT_ASSIGNMENTS Collection
**Total Documents**: 1

### Schema:
```javascript
{
  _id: ObjectId,
  id: String (UUID),
  partner_id: String,                          // Reference to partners.id
  spiff_id: String,                            // Reference to spiffs.id
  product_ids: [String],                       // Array of product IDs
  assignment_type: String,                     // 'spiff', 'standard'
  
  // Dates
  start_date: String (ISO 8601),
  end_date: String (ISO 8601),
  
  // Targets
  target_quantity: Number,                     // Sales target
  notes: String,
  
  // Status & Progress
  status: String,                              // 'active', 'completed', 'expired'
  actual_quantity: Number,                     // Actual sales made
  actual_revenue: Number,                      // Total revenue
  completion_percentage: Number,               // 0-100
  
  // Metadata
  assigned_by: String,                         // User ID who assigned
  created_at: String (ISO 8601),
  updated_at: String (ISO 8601)
}
```

### Purpose:
Links partners to their sales opportunities (products + spiff campaigns). Partners see these in their fulfillment portal.

---

## 6. 💰 COMMISSION_PLANS Collection
**Total Documents**: 1

### Schema:
```javascript
{
  _id: ObjectId,
  id: String (UUID),
  name: String,
  description: String,
  plan_type: String,                           // 'partner', 'employee', 'hybrid'
  effective_start: String (ISO 8601),
  effective_end: String (ISO 8601) | null,
  rules: Array,                                // Commission calculation rules
  status: String,                              // 'draft', 'active', 'archived'
  version: Number,
  created_by: String,
  created_at: String (ISO 8601),
  updated_at: String (ISO 8601)
}
```

---

## 7. 🔐 CUSTOM_ROLES Collection
**Total Documents**: 5

### Schema:
```javascript
{
  _id: ObjectId,
  id: String (UUID),
  name: String,                                // 'Sales Manager', 'Finance Manager'
  description: String,
  permissions: [String],                       // ['view_sales', 'create_sales', 'approve_commissions']
  is_custom: Boolean,                          // true for custom roles
  created_by: String,
  created_at: String (ISO 8601),
  updated_at: String (ISO 8601)
}
```

### Sample Roles:
- **Sales Manager**: view_sales, create_sales, edit_sales, approve_commissions
- **Finance Manager**: approve_commissions, process_payouts, view_reports

### Available Permissions:
- view_sales, create_sales, edit_sales
- view_products, create_products, edit_products
- view_partners, create_partners, edit_partners
- approve_commissions, process_payouts
- view_reports, export_reports
- view_dashboard

---

## 8. 👥 CUSTOM_GROUPS Collection
**Total Documents**: 2

### Schema:
```javascript
{
  _id: ObjectId,
  id: String (UUID),
  name: String,                                // 'Sales Team', 'Finance Team'
  description: String,
  role_id: String | null,                      // Reference to custom_roles.id
  permissions: [String],                       // Group-level permissions
  user_ids: [String],                          // Array of user IDs in this group
  created_by: String,
  created_at: String (ISO 8601),
  updated_at: String (ISO 8601)
}
```

### Sample Groups:
- **Sales Team**: view_sales, create_sales, view_products, view_partners
- **Finance Team**: approve_commissions, process_payouts, view_reports

---

## 9. ⚖️ ELIGIBILITY_RULES Collection
**Total Documents**: 1

### Schema:
```javascript
{
  _id: ObjectId,
  id: String (UUID),
  product_type: String,                        // 'Services', 'Hardware', 'Software'
  sales_channel: String,                       // 'Partner', 'Direct', 'Hybrid'
  customer_segment: String,                    // 'Normal', 'Enterprise', 'SMB'
  eligible: Boolean,                           // Commission eligibility
  commission_rate_override: Number | null,     // Override rate if any
  effective_start: String (ISO 8601),
  effective_end: String (ISO 8601) | null,
  created_at: String (ISO 8601)
}
```

---

## 10. 📝 AUDIT_LOGS Collection
**Total Documents**: 377

### Schema:
```javascript
{
  _id: ObjectId,
  id: String (UUID),
  user_id: String,                             // Who performed the action
  action_type: String,                         // 'user_registration', 'partner_approved', 'product_created'
  resource_type: String,                       // 'user', 'partner', 'product', 'spiff'
  resource_id: String,                         // ID of affected resource
  state_before: Object | null,                 // State before action
  state_after: Object,                         // State after action
  ip_address: String | null,
  user_agent: String | null,
  timestamp: String (ISO 8601)
}
```

### Action Types:
- user_registration, user_login, user_update
- partner_created, partner_approved, partner_rejected
- product_created, product_updated
- spiff_created, spiff_updated
- commission_calculated, commission_paid

---

## 🔗 Key Relationships

```
users (role: 'partner')
  ↓ (user_id)
partners
  ↓ (id)
fulfillment_assignments (partner_id)
  ↓ (spiff_id)
spiffs
  ↓ (target_products)
products

users
  ↓ (id)
custom_groups (user_ids)
  ↓ (role_id)
custom_roles
```

---

## 🚨 Critical Notes

1. **Database Name**: Always use `spm_ppm_db` (NOT `ppm_database`)
2. **MongoDB Projections**: Always exclude `_id` field: `{"_id": 0}`
3. **Partner Status Flow**: 
   - Admin-led: pending_l1 → pending_l2 → approved
   - Self-registration: Same flow, but user creates account first
   - Can go to "on_hold" at any L1/L2 stage
4. **Fulfillment Assignment**: Currently NOT auto-created when spiff is created (THIS IS THE BUG TO FIX)
5. **Custom IDs**: All collections use custom UUID `id` field (NOT MongoDB's `_id`)

---

## 📊 Data Statistics

| Collection | Count |
|-----------|-------|
| users | 21 |
| partners | 58 |
| products | 16 |
| spiffs | 2 |
| commission_plans | 1 |
| custom_roles | 5 |
| custom_groups | 2 |
| fulfillment_assignments | 1 |
| eligibility_rules | 1 |
| audit_logs | 377 |

---

**Generated**: December 2025  
**Database**: MongoDB 
**Application**: Nexright SPM/PPM Platform
