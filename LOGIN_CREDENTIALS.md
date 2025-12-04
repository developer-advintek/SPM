# 🔐 Nexright Partner Management - Login Credentials

## 🌐 Application URL
**https://nexflow-ppm.preview.emergentagent.com/**

---

## ✅ All Test User Credentials

### 👤 Admin User
- **Email:** admin@test.com
- **Password:** admin123
- **Role:** admin
- **Access:** Full system access, all modules

### 👤 Partner Manager
- **Email:** pm@test.com
- **Password:** pm123
- **Role:** partner_manager
- **Access:** Partner management, assignments, reports

### 👤 Level 1 Approver
- **Email:** l1@test.com
- **Password:** l1_123
- **Role:** l1_approver
- **Access:** L1 approval queue, assign tiers, approve/reject

### 👤 Level 2 Approver
- **Email:** l2@test.com
- **Password:** l2_123
- **Role:** l2_approver
- **Access:** L2 approval queue, final approval/rejection

### 👤 Partner User ⭐
- **Email:** partner@test.com
- **Password:** partner123
- **Role:** partner
- **Access:** Partner Portal (view opportunities, log sales, track performance)
- **Company:** TechCorp Partners Inc.
- **Tier:** Gold

---

## 🎯 Quick Login Guide

### For Admin/PM/Approvers:
1. Go to: https://nexflow-ppm.preview.emergentagent.com/
2. Login with your credentials
3. Navigation shows: Dashboard, Partners, Products, Spiffs, etc.

### For Partners:
1. Go to: https://nexflow-ppm.preview.emergentagent.com/
2. Login as: **partner@test.com / partner123**
3. Click "My Portal" in navigation
4. View opportunities, log sales, track performance

---

## 📊 What Each User Can Do

### Admin (admin@test.com)
✅ Create/manage partners
✅ Create products with tier commissions
✅ Create spiff campaigns
✅ Create fulfillment assignments
✅ View all analytics
✅ Manage roles and permissions
✅ Access all modules

### Partner Manager (pm@test.com)
✅ Manage partners
✅ Create fulfillment assignments
✅ View partner performance
✅ Approve commissions
✅ View reports

### L1 Approver (l1@test.com)
✅ View L1 approval queue
✅ Assign partner tiers
✅ Approve partners (L1)
✅ Reject partners with comments
✅ Put partners on hold

### L2 Approver (l2@test.com)
✅ View L2 approval queue
✅ Final approval of partners
✅ Reject partners with comments
✅ Put partners on hold

### Partner (partner@test.com)
✅ View My Portal
✅ See assigned opportunities
✅ Log sales transactions
✅ Track progress towards targets
✅ View commission earnings
✅ Monitor milestone achievements
✅ Access personal analytics

---

## 🧪 Testing Scenarios

### Test 1: Admin Creates Partner
1. Login as: **admin@test.com / admin123**
2. Go to: Partners
3. Click: Create Partner
4. Fill form and submit
5. Partner starts in "pending_l1" status

### Test 2: L1 Approval
1. Login as: **l1@test.com / l1_123**
2. Go to: Partners → L1 Queue tab
3. Select tier for partner
4. Click: Approve & Send to L2

### Test 3: L2 Final Approval
1. Login as: **l2@test.com / l2_123**
2. Go to: Partners → L2 Queue tab
3. Click: Approve
4. Partner status changes to "approved"

### Test 4: Partner Views Opportunities
1. Login as: **partner@test.com / partner123**
2. Click: My Portal
3. View: Q4 Sales Boost opportunity
4. See: 2 products assigned (Laptop & Monitor)

### Test 5: Partner Logs Sale
1. In My Portal → Opportunities tab
2. Click: Log Sale
3. Select: Test Laptop Pro
4. Quantity: 2, Price: $1,200
5. Submit
6. See: Commission calculated automatically

---

## 💡 Important Notes

✅ **All logins verified and working**
✅ **Database:** spm_ppm_db (correct database)
✅ **Test data:** Complete and ready
✅ **Backend:** All APIs functional
✅ **Frontend:** All UIs complete

---

## 🎨 Features Available

### Admin/PM Dashboard
- Partner Management
- Product Management
- Spiff Campaigns
- Fulfillment Assignments
- Access Control (Roles/Groups/Permissions)
- Analytics & Reports
- User Management

### Partner Portal
- My Opportunities
- My Sales History
- Milestone Progress
- Performance Analytics
- Sales Logging
- Progress Tracking

---

## 🔧 Test Data Available

### Products
1. Test Laptop Pro (Gold: 12% commission)
2. Test Monitor 4K (Gold: 9% commission)

### Spiff Campaign
- Q4 Sales Boost ($50 per laptop bonus)
- Active for 90 days

### Partner Profile
- TechCorp Partners Inc.
- Gold tier
- Approved status
- Active fulfillment assignment

---

## 🚀 System Status

✅ **Backend:** Fully operational
✅ **Frontend:** Complete and functional
✅ **Authentication:** All users can login
✅ **Authorization:** Role-based access working
✅ **Database:** Test data loaded
✅ **APIs:** All endpoints verified

**Ready for complete end-to-end testing!**

---

## 📞 Quick Reference

**Application URL:** https://nexflow-ppm.preview.emergentagent.com/

**Admin Login:** admin@test.com / admin123
**Partner Login:** partner@test.com / partner123

**Partner Portal:** Navigate to "My Portal" after login

---

Last Updated: December 2, 2025
All credentials verified and working ✅
