# MongoDB Database Export & Connection Information

**Export Date**: December 4, 2025  
**Database Name**: `spm_ppm_db`  
**Application**: Nexright SPM/PPM Platform

---

## 📦 What's Included in This Export

### 1. BSON Binary Dumps (Full Backup)
Located in: `/app/db_export/spm_ppm_db/`

These are MongoDB's native binary format and include all data with complete fidelity:
- `users.bson` - 21 user accounts
- `partners.bson` - 58 partner records
- `products.bson` - 16 products
- `spiffs.bson` - 2 spiff campaigns
- `fulfillment_assignments.bson` - 1 fulfillment assignment
- `custom_roles.bson` - 5 custom roles
- `custom_groups.bson` - 2 custom groups
- `commission_plans.bson` - 1 commission plan
- `eligibility_rules.bson` - 1 eligibility rule
- `audit_logs.bson` - 377 audit log entries

### 2. JSON Exports (Human Readable)
Located in: `/app/db_export/`

Key collections exported as JSON arrays for easy viewing/importing:
- `users.json`
- `partners.json`
- `products.json`
- `spiffs.json`
- `fulfillment_assignments.json`
- `custom_roles.json`
- `custom_groups.json`

---

## 🔌 Current Database Connection

### Connection String:
```
mongodb://localhost:27017
```

### Database Name:
```
spm_ppm_db
```

### Full Connection URI:
```
mongodb://localhost:27017/spm_ppm_db
```

### Environment Configuration:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=spm_ppm_db
```

---

## 🔄 How to Restore This Database

### Option 1: Using mongorestore (Recommended)
```bash
# Restore entire database
mongorestore --uri="mongodb://localhost:27017" /app/db_export/

# Restore to a different database name
mongorestore --uri="mongodb://localhost:27017" --nsFrom="spm_ppm_db.*" --nsTo="new_db_name.*" /app/db_export/

# Restore specific collection
mongorestore --uri="mongodb://localhost:27017/spm_ppm_db" --collection=users /app/db_export/spm_ppm_db/users.bson
```

### Option 2: Using mongoimport (JSON files)
```bash
# Import JSON file
mongoimport --uri="mongodb://localhost:27017/spm_ppm_db" --collection=users --file=/app/db_export/users.json --jsonArray

# Import all JSON files
for file in /app/db_export/*.json; do
  collection=$(basename "$file" .json)
  mongoimport --uri="mongodb://localhost:27017/spm_ppm_db" --collection="$collection" --file="$file" --jsonArray
done
```

---

## 🌐 Connecting from External Tools

### MongoDB Compass:
```
Connection String: mongodb://localhost:27017
Database: spm_ppm_db
```

### Python (pymongo):
```python
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["spm_ppm_db"]

# Example: Get all users
users = db.users.find({}, {"_id": 0})
```

### Node.js (mongoose):
```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/spm_ppm_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
```

### MongoDB Shell:
```bash
mongosh mongodb://localhost:27017/spm_ppm_db
```

---

## 📊 Database Statistics

| Collection | Documents | Size |
|-----------|-----------|------|
| users | 21 | 6.8 KB |
| partners | 58 | 103 KB |
| products | 16 | 5.4 KB |
| spiffs | 2 | 1.4 KB |
| fulfillment_assignments | 1 | 665 B |
| custom_roles | 5 | 1.9 KB |
| custom_groups | 2 | 835 B |
| commission_plans | 1 | 386 B |
| eligibility_rules | 1 | 298 B |
| audit_logs | 377 | 330 KB |
| **TOTAL** | **484** | **~520 KB** |

---

## 🔐 Security Notes

⚠️ **IMPORTANT**: This export contains:
- **Hashed passwords** (bcrypt) - Secure, but keep export private
- **User emails and personal information** - Handle per GDPR/privacy regulations
- **Business data** - Treat as confidential company information

**Recommendations**:
1. Do NOT commit database dumps to public repositories
2. Encrypt exports if transferring over network
3. Store in secure, access-controlled locations
4. Delete old exports after migration/backup verification

---

## 📝 Export Commands Used

```bash
# Binary dump (BSON)
mongodump --uri="mongodb://localhost:27017/spm_ppm_db" --out=/app/db_export

# JSON exports
mongoexport --uri="mongodb://localhost:27017/spm_ppm_db" --collection=users --out=/app/db_export/users.json --jsonArray
# (repeated for each collection)
```

---

## ✅ Verification

To verify the export integrity:

```bash
# Check collection counts
mongosh mongodb://localhost:27017/spm_ppm_db --quiet --eval "db.getCollectionNames().forEach(c => print(c + ': ' + db[c].countDocuments()))"

# Compare with restored database
mongorestore --uri="mongodb://localhost:27017" --nsFrom="spm_ppm_db.*" --nsTo="test_restore.*" /app/db_export/
mongosh mongodb://localhost:27017/test_restore --quiet --eval "db.getCollectionNames().forEach(c => print(c + ': ' + db[c].countDocuments()))"
```

---

**Need Help?**
- MongoDB Documentation: https://www.mongodb.com/docs/
- mongodump reference: https://www.mongodb.com/docs/database-tools/mongodump/
- mongorestore reference: https://www.mongodb.com/docs/database-tools/mongorestore/
