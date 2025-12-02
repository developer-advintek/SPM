# Test Credentials & Testing Guide

## 🔐 Test User Credentials

### Admin User
- **Email:** admin@test.com
- **Password:** admin123
- **Role:** admin
- **Access:** Full system access

### Partner Manager
- **Email:** pm@test.com
- **Password:** pm123
- **Role:** partner_manager
- **Access:** Partner management, assignments

### L1 Approver
- **Email:** l1@test.com
- **Password:** l1_123
- **Role:** l1_approver
- **Access:** Level 1 partner approvals

### L2 Approver
- **Email:** l2@test.com
- **Password:** l2_123
- **Role:** l2_approver
- **Access:** Level 2 partner approvals

### Partner User ⭐
- **Email:** partner@test.com
- **Password:** partner123
- **Role:** partner
- **Access:** Partner Portal
- **Company:** TechCorp Partners Inc.
- **Tier:** Gold (12% laptop commission, 9% monitor commission)

---

## 📦 Test Data Available

### Products
1. **Test Laptop Pro**
   - Gold Tier Commission: 12%
   - Part of spiff campaign
   
2. **Test Monitor 4K**
   - Gold Tier Commission: 9%
   - Standard product

### Active Spiff Campaign
- **Name:** Q4 Sales Boost
- **Incentive:** $50 bonus per laptop sold
- **Period:** 90 days from creation
- **Eligible Products:** Test Laptop Pro
- **Eligible Tiers:** Gold, Platinum

### Fulfillment Assignment
- **Partner:** TechCorp Partners Inc.
- **Products:** Test Laptop Pro + Test Monitor 4K
- **Linked Spiff:** Q4 Sales Boost
- **Target:** 20 units
- **Status:** Active

### Milestones
1. **First Sale** - Complete 1 sale → $100 bonus
2. **10 Sales Club** - Complete 10 sales → $500 bonus
3. **Revenue Leader** - Generate $50,000 revenue → $2000 bonus

---

## 🧪 Testing Guide

### Test Scenario 1: Partner Portal Navigation
1. Login as: **partner@test.com / partner123**
2. Verify "My Portal" appears in navigation
3. Click "My Portal"
4. Verify you see:
   - 4 analytics cards (Total Sales, Revenue, Commission, Active Opportunities)
   - 3 tabs (Opportunities, Sales, Milestones)

### Test Scenario 2: View Opportunities
1. In Partner Portal, go to "Opportunities" tab
2. You should see:
   - "Q4 Sales Boost" opportunity card
   - 2 products (Test Laptop Pro, Test Monitor 4K)
   - Commission rates displayed
   - Spiff incentive ($50 per laptop)
   - Progress bar showing 0/20 (0%)
   - "Log Sale" button

### Test Scenario 3: Log a Sale
1. Click "Log Sale" button
2. Select Product: **Test Laptop Pro**
3. Quantity: **2**
4. Unit Price: **1200** (per laptop)
5. Customer Reference: **CUST-001** (optional)
6. Click "Log Sale"
7. Expected Results:
   - Total Amount: $2,400
   - Base Commission (12%): $288
   - Spiff Bonus ($50 x 2): $100
   - **Total Commission: $388**
8. Verify:
   - Sale appears in "My Sales" tab
   - Progress updates to 2/20 (10%)
   - Analytics cards update
   - Milestone progress updates

### Test Scenario 4: Log Second Sale (Monitor)
1. Click "Log Sale" again
2. Select Product: **Test Monitor 4K**
3. Quantity: **3**
4. Unit Price: **500** (per monitor)
5. Click "Log Sale"
6. Expected Results:
   - Total Amount: $1,500
   - Base Commission (9%): $135
   - Spiff Bonus: $0 (monitors not in spiff)
   - **Total Commission: $135**
7. Verify:
   - Total progress now 5/20 (25%)
   - Total sales: 2 transactions
   - Total revenue: $3,900

### Test Scenario 5: Check Milestones
1. Go to "Milestones" tab
2. You should see:
   - **First Sale** - Status: Achieved ✓
   - **10 Sales Club** - Progress: 5/10 (50%)
   - **Revenue Leader** - Progress: $3,900/$50,000 (7.8%)
3. Progress bars should show correct percentages

### Test Scenario 6: Admin Creates Assignment (Admin View)
1. Logout and login as: **admin@test.com / admin123**
2. Navigation will show "Partners" (not "My Portal")
3. You can create new assignments via API or future UI
4. View analytics at `/api/fulfillment/analytics/overview`

---

## 📊 Commission Calculation Examples

### Example 1: Laptop Sale with Spiff
```
Product: Test Laptop Pro
Quantity: 3 units
Unit Price: $1,000
Partner Tier: Gold

Calculation:
- Total Amount: 3 × $1,000 = $3,000
- Base Commission: $3,000 × 12% = $360
- Spiff Bonus: 3 × $50 = $150
- Total Commission: $360 + $150 = $510
```

### Example 2: Monitor Sale (No Spiff)
```
Product: Test Monitor 4K
Quantity: 5 units
Unit Price: $400
Partner Tier: Gold

Calculation:
- Total Amount: 5 × $400 = $2,000
- Base Commission: $2,000 × 9% = $180
- Spiff Bonus: $0 (not part of spiff)
- Total Commission: $180
```

### Example 3: Mixed Sale
```
2 Laptops @ $1,000 = $2,000
  → Commission: $240 + Spiff: $100 = $340

4 Monitors @ $500 = $2,000
  → Commission: $180 + Spiff: $0 = $180

Total Commission: $520
```

---

## 🎯 Key URLs

- **Login:** https://partnerpro-2.preview.emergentagent.com/
- **Partner Portal:** /partner-portal
- **Admin Partners:** /partners
- **Products:** /products
- **Spiffs:** /spiff-center
- **Access Control:** /access-control

---

## 🔄 Reset Test Data

If you want to reset and start fresh, you can:
1. Delete all sales: Clear `sales` collection
2. Reset assignment progress: Set `actual_quantity` and `actual_revenue` to 0
3. Reset milestones: Delete `milestone_progress` collection

---

## 📝 Notes

- Commission is calculated automatically server-side
- Spiff bonuses only apply if sale date is within spiff period
- Partners can only log sales for assigned products
- Milestone progress updates automatically with each sale
- All data is audit-logged for compliance

---

## 🆘 Troubleshooting

**Problem:** Partner sees empty opportunities
- **Solution:** Make sure partner has status "approved" and has an active fulfillment assignment

**Problem:** Spiff bonus not applying
- **Solution:** Check that:
  1. Product is in spiff's target_products
  2. Sale date is between spiff start_date and end_date
  3. Spiff status is "active"

**Problem:** Can't log sale
- **Solution:** Verify:
  1. Partner is approved
  2. Product is in an active assignment
  3. Product exists in database

---

## 🎉 What to Expect

After logging a few sales, you should see:
- ✅ Real-time commission calculations
- ✅ Progress bars updating
- ✅ Milestones being achieved
- ✅ Analytics cards reflecting data
- ✅ Sales history with status badges
- ✅ Beautiful UI with gradient cards

The system is production-ready and fully functional!
