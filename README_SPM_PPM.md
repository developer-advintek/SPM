# SPM/PPM Enterprise System - Sales and Partner Performance Management

A comprehensive, enterprise-grade application for managing sales commissions, partner performance, and revenue operations.

## 🏗️ Architecture

**Technology Stack:**
- **Backend:** FastAPI (Python) + Motor (Async MongoDB)
- **Frontend:** React 19 + Shadcn UI + TailwindCSS
- **Real-time:** WebSocket for live updates (3-second data refresh)
- **Database:** MongoDB with Decimal(19,4) precision for financial data
- **Security:** JWT + Google OAuth, RBAC, AES-256 encryption at rest

**Architecture Pattern:** Microservices-based (target: 5M transactions/day)

## 📋 Feature Overview - All 5 Phases Implemented

### **PHASE 1: Data & Governance Foundation**
✅ Product Catalog Management
- Bulk CSV upload capability
- Version control for product data
- Commission rate code validation
- Gross margin tracking
- Eligibility matrix

✅ Data Integrity Service
- Real-time normalization
- Error notification system
- Decimal(19,4) financial precision
- Malformed record rejection

### **PHASE 2: Core Calculation Engine (ICM Logic)**
✅ Commission Plan Designer
- Hybrid approach: Form-based + Visual flow builder
- No-code/Low-code rule engine
- Multiple rule types: Flat, Tiered, Percentage, Formula, Multiplier
- Circular dependency detection
- Precedence rule enforcement

✅ Real-time Processing
- Instant commission calculation
- WebSocket-powered live updates
- Read-only data store for calculations
- Earnings snapshot view

✅ Credit Assignment
- Multi-factor split credits
- Automatic 100% distribution validation
- Transaction-level credit tracking

✅ Spiff Center
- Short-term incentive programs
- Product/SKU targeting
- Time-bounded campaigns

### **PHASE 3: Partner & Financial Lifecycle**
✅ Partner Hub (Self-Service Portal)
- Onboarding progress tracking
- "My Payouts" section
- Document submission workflow
- Issue submission system

✅ Compliance Management
- Tax form handling
- Banking details (encrypted)
- Document versioning
- Approval workflows

✅ Approval Center
- Configurable workflow engine
- Multi-level approval (L1/L2/Final)
- States: Draft, Submitted, Approved, Rejected, Recalled
- 48-hour escalation alerts
- Delegation support

✅ Payout Manager
- Multi-currency support
- CSV/XML export
- Pre-release reconciliation reports
- Final approval workflow

✅ Vendor Tier Management
- Bronze, Silver, Gold, Platinum tiers
- Auto-assignment logic
- Commission Eligibility Matrix

### **PHASE 4: Strategic Management & Planning**
✅ Goal Setting & Quotas
- Top-down (cascading) quotas
- Bottom-up quota planning
- Bulk spreadsheet import/export
- Real-time attainment tracking

✅ Territory Management
- Geographic assignment
- Account potential modeling
- Approval-required changes

✅ Modeling & Forecasting
- Simulation environment
- Projected COS percentage
- Variance reports
- Scenario comparison (Conservative/Realistic/Optimistic)

✅ Accounting Integration
- ASC 606/IFRS 15 compliance
- Automated expense accruals
- Daily RESTful API feed

✅ Non-Financial Metrics (NFMs)
- Service activation rates
- Multiplier effects on commission
- Eligibility thresholds

### **PHASE 5: Analytics, Monitoring & UI**
✅ User Dashboards (Real-Time)
- My Earnings dashboard
- Team Performance scorecards
- 3-second data refresh via WebSocket
- Attainment tracking

✅ Support & Issue Management
- Comprehensive ticketing system
- SLA clock tracking (Critical: 4h, High: 24h, Medium: 48h, Low: 72h)
- Workflow states: New, Assigned, Investigating, Resolved, Closed
- Severity-based prioritization

✅ Channel Health Scorecard
- Partner health metrics
- NFM compliance rates
- Profitability trends

✅ Business Intelligence
- PDF/Excel export capability
- Channel profitability analysis
- Advanced forecasting
- <10 second query optimization

✅ Gamification
- Leaderboards
- Milestone recognition
- Running spiff campaign tracking

## 🔐 Security & Compliance

- **Encryption:** AES-256 at rest, TLS 1.2+ in transit
- **Access Control:** Strict RBAC with partner data isolation
- **Audit Trail:** 7-year retention, immutable logs
- **Audit Fields:** User ID, Timestamp (UTC), Action Type, State Before/After

## 👥 User Roles

1. **Admin** - Full system access
2. **Finance** - Financial operations, plan management
3. **Manager** - Team oversight, approvals
4. **Rep** - Personal dashboard, earnings view
5. **Partner** - Limited to own data, partner hub access

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- MongoDB

### Backend Setup
```bash
cd /app/backend
pip install -r requirements.txt
# Server runs on port 8001 via supervisor
```

### Frontend Setup
```bash
cd /app/frontend
yarn install
# Server runs on port 3000 via supervisor
```

### Environment Variables
**Backend (.env):**
- `MONGO_URL` - MongoDB connection
- `DB_NAME` - Database name
- `JWT_SECRET_KEY` - JWT signing key
- `ENCRYPTION_KEY` - AES-256 encryption key

**Frontend (.env):**
- `REACT_APP_BACKEND_URL` - Backend API URL

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration (JWT + Google OAuth)
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user

### Products (Phase 1)
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `POST /api/products/bulk-upload` - Bulk CSV upload

### Transactions
- `GET /api/transactions` - List transactions (RBAC filtered)
- `POST /api/transactions` - Create transaction (triggers real-time calculation)

### Commissions (Phase 2)
- `GET /api/commissions/my-earnings` - Get user earnings
- `GET /api/plans` - List commission plans
- `POST /api/plans` - Create commission plan (with circular detection)

### WebSocket
- `WS /ws/{user_id}` - Real-time updates connection

## 🎨 UI/UX Design Highlights

- **Modern Typography:** Space Grotesk (headings) + Inter (body)
- **Color Scheme:** Professional blues with subtle gradients
- **Responsive:** Mobile-first design
- **Accessibility:** Full keyboard navigation, ARIA labels
- **Performance:** <10s report generation, 3s real-time updates
- **Components:** Shadcn UI for consistency

## 🧪 Testing

The application includes comprehensive test coverage:
- Backend: FastAPI test client
- Frontend: React Testing Library
- E2E: Playwright automation
- All critical flows have data-testid attributes

## 📊 Performance Targets

- **Scalability:** 5 million transactions/day
- **Real-time Updates:** 3-second refresh
- **Report Generation:** <10 seconds
- **Database Queries:** Optimized indexes
- **API Response:** <200ms average

## 🔄 Data Flow

1. **Transaction Creation** → Real-time Commission Calculation → WebSocket Broadcast
2. **Commission Approval** → Payout Aggregation → Reconciliation → File Export
3. **Plan Changes** → Approval Workflow → Version Locking → Audit Log
4. **Partner Onboarding** → Document Verification → Compliance Check → Activation

## 📝 Mock Implementations

For MVP demonstration:
- **Email Service:** Console logging (ready for SendGrid/AWS SES)
- **Payment Processing:** Mock payout generation (ready for Stripe/PayPal)
- **Google OAuth:** Simplified flow (production-ready structure)

## 🛣️ Roadmap

**Completed (Current MVP):**
- ✅ All 5 phases fully implemented
- ✅ Real-time WebSocket updates
- ✅ Comprehensive RBAC
- ✅ Audit logging
- ✅ Multi-currency support
- ✅ Hybrid plan designer

**Future Enhancements:**
- AI-powered forecasting
- Advanced analytics dashboards
- Mobile apps
- Blockchain-based audit trail
- Advanced gamification

## 📞 Support

For issues and feature requests:
- Use the in-app "Submit an Issue" button
- Create a support ticket with severity level
- Track via SLA-monitored workflow

## 📄 License

Enterprise License - All Rights Reserved

---

**Built with ❤️ using FastAPI, React, and Modern Web Technologies**
