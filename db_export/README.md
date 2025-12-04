# 📦 Database Export Package

**Exported from**: Nexright SPM/PPM Application  
**Export Date**: December 4, 2025  
**Total Size**: ~680 KB

---

## 📂 Package Contents

```
db_export/
├── README.md                          ← You are here
├── DB_CONNECTION_INFO.md              ← Connection details & restore instructions
│
├── spm_ppm_db/                        ← Full MongoDB BSON dump (binary format)
│   ├── users.bson
│   ├── partners.bson
│   ├── products.bson
│   ├── spiffs.bson
│   ├── fulfillment_assignments.bson
│   ├── custom_roles.bson
│   ├── custom_groups.bson
│   ├── commission_plans.bson
│   ├── eligibility_rules.bson
│   ├── audit_logs.bson
│   └── *.metadata.json                ← Collection metadata
│
└── *.json                             ← Human-readable JSON exports
    ├── users.json
    ├── partners.json
    ├── products.json
    ├── spiffs.json
    ├── fulfillment_assignments.json
    ├── custom_roles.json
    └── custom_groups.json
```

---

## 🚀 Quick Start

### View Data (Human Readable)
```bash
# View users
cat users.json | jq .

# View partners
cat partners.json | jq .
```

### Restore Database
```bash
# Full restore
mongorestore --uri="mongodb://localhost:27017" ./spm_ppm_db/

# Restore to different database
mongorestore --uri="mongodb://localhost:27017" \
  --nsFrom="spm_ppm_db.*" \
  --nsTo="my_new_db.*" \
  ./spm_ppm_db/
```

### Connect to Database
```bash
# Connection String
mongodb://localhost:27017/spm_ppm_db

# Using mongosh
mongosh mongodb://localhost:27017/spm_ppm_db
```

---

## 📊 Database Contents

| Collection | Count | Description |
|-----------|-------|-------------|
| users | 21 | User accounts (admin, partners, approvers) |
| partners | 58 | Partner companies & onboarding |
| products | 16 | Product catalog |
| spiffs | 2 | Sales incentive campaigns |
| fulfillment_assignments | 1 | Partner sales opportunities |
| custom_roles | 5 | Admin-defined roles |
| custom_groups | 2 | User groups |
| commission_plans | 1 | Commission calculation rules |
| eligibility_rules | 1 | Commission eligibility logic |
| audit_logs | 377 | Complete activity tracking |

**Total Documents**: 484

---

## 📖 Documentation

- **Full Schema**: See `/app/DATABASE_SCHEMA.md` in the main repository
- **Connection Info**: See `DB_CONNECTION_INFO.md` in this directory
- **Restore Instructions**: See `DB_CONNECTION_INFO.md`

---

## ⚠️ Security Warning

This export contains sensitive data:
- ✅ Passwords are hashed (bcrypt) - secure
- ⚠️ User emails and personal information
- ⚠️ Business data and partner information

**Do not**:
- Commit to public repositories
- Share without encryption
- Store in unsecured locations

---

## 🔄 Next Steps

1. **Use "Save to Github"** in the chat to commit these files to your repository
2. Add `/app/db_export/` to `.gitignore` if you want to keep it private
3. Consider encrypting the export if transferring externally

---

**Need help?** Check `DB_CONNECTION_INFO.md` for detailed instructions!
