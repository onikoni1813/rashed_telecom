# Operational Runbook: Backup, Disaster Recovery & Ledger Reconciliation

**System:** Rashed Telecom Shop Management PWA  
**Database:** PostgreSQL 18  
**Storage:** Supabase Storage (Private Buckets) / Local Attachments  
**Timezone:** `Asia/Dhaka`  
**Currency:** BDT (৳)  

---

## 1. Automated & Scheduled Backup Procedures

### A. Daily Logical Backup (`pg_dump`)
Run the following script daily via cron or scheduled task:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/rashed_telecom"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/rashed_telecom_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

# Export custom binary compressed backup with BLOBs and schema
pg_dump \
  -h localhost \
  -p 5432 \
  -U postgres \
  -d rashed_telecom \
  -F c \
  -b \
  -v \
  -f "${FILENAME}"

# Retain last 30 daily backups
find "${BACKUP_DIR}" -type f -name "rashed_telecom_*.dump" -mtime +30 -delete

echo "[$(date)] Backup completed: ${FILENAME}"
```

### B. Point-in-Time Recovery (PITR) & WAL Archiving
In `postgresql.conf`:
```ini
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /var/backups/wal_archive/%f && cp %p /var/backups/wal_archive/%f'
max_wal_senders = 3
```

---

## 2. Disaster Recovery & Restoration Procedures

### Step 1: Prepare Clean Target Database
```sql
-- Connect as postgres superuser
DROP DATABASE IF EXISTS rashed_telecom_recovery;
CREATE DATABASE rashed_telecom_recovery
  WITH OWNER = postgres
  ENCODING = 'UTF8'
  LC_COLLATE = 'English_United States.1252'
  LC_CTYPE = 'English_United States.1252';
```

### Step 2: Restore from Compressed Dump Archive
```bash
pg_restore \
  -h localhost \
  -p 5432 \
  -U postgres \
  -d rashed_telecom_recovery \
  -v \
  --clean \
  --if-exists \
  /var/backups/rashed_telecom/rashed_telecom_20261024_120000.dump
```

---

## 3. Post-Restoration Reconciliation & Invariant Checks

After restoring, run the following SQL queries to ensure zero financial or stock drift:

### A. General Ledger Zero-Discrepancy Check
Total debits across all journal lines must exactly equal total credits:
```sql
SELECT 
  ROUND(SUM(debit), 2) AS total_debit,
  ROUND(SUM(credit), 2) AS total_credit,
  ROUND(SUM(debit) - SUM(credit), 2) AS variance
FROM journal_lines;
-- EXPECTED VARIANCE: 0.00
```

### B. Stock Movement vs Stock Balance Reconciliation
Calculated quantity from stock movements must match current `StockBalance`:
```sql
SELECT 
  p.sku,
  p.name,
  sb.quantity_on_hand AS balance_table_qty,
  COALESCE(SUM(
    CASE 
      WHEN sm.movement_type IN ('PURCHASE_RECEIPT', 'CUSTOMER_RETURN', 'ADJUSTMENT_IN') THEN sm.quantity
      WHEN sm.movement_type IN ('SALE', 'SUPPLIER_RETURN', 'REPAIR_CONSUMPTION', 'ADJUSTMENT_OUT') THEN -sm.quantity
      ELSE 0
    END
  ), 0) AS calculated_ledger_qty,
  (sb.quantity_on_hand - COALESCE(SUM(
    CASE 
      WHEN sm.movement_type IN ('PURCHASE_RECEIPT', 'CUSTOMER_RETURN', 'ADJUSTMENT_IN') THEN sm.quantity
      WHEN sm.movement_type IN ('SALE', 'SUPPLIER_RETURN', 'REPAIR_CONSUMPTION', 'ADJUSTMENT_OUT') THEN -sm.quantity
      ELSE 0
    END
  ), 0)) AS discrepancy
FROM products p
JOIN stock_balances sb ON sb.product_id = p.id
LEFT JOIN stock_movements sm ON sm.product_id = p.id
GROUP BY p.sku, p.name, sb.quantity_on_hand
HAVING (sb.quantity_on_hand - COALESCE(SUM(
    CASE 
      WHEN sm.movement_type IN ('PURCHASE_RECEIPT', 'CUSTOMER_RETURN', 'ADJUSTMENT_IN') THEN sm.quantity
      WHEN sm.movement_type IN ('SALE', 'SUPPLIER_RETURN', 'REPAIR_CONSUMPTION', 'ADJUSTMENT_OUT') THEN -sm.quantity
      ELSE 0
    END
  ), 0)) != 0;
-- EXPECTED: 0 rows returned
```

### C. Customer Receivables Reconciliation
Sum of customer sales minus payments must match `Customer.totalDue`:
```sql
SELECT 
  c.name,
  c.phone,
  c.total_due AS customer_table_due,
  COALESCE(s.billed_amount, 0) - COALESCE(p.paid_amount, 0) AS calculated_due,
  (c.total_due - (COALESCE(s.billed_amount, 0) - COALESCE(p.paid_amount, 0))) AS discrepancy
FROM customers c
LEFT JOIN (
  SELECT customer_id, SUM(total_amount) AS billed_amount 
  FROM sales 
  GROUP BY customer_id
) s ON s.customer_id = c.id
LEFT JOIN (
  SELECT customer_id, SUM(amount) AS paid_amount 
  FROM payments 
  GROUP BY customer_id
) p ON p.customer_id = c.id
WHERE (c.total_due - (COALESCE(s.billed_amount, 0) - COALESCE(p.paid_amount, 0))) != 0;
-- EXPECTED: 0 rows returned
```

---

## 4. Emergency Access Revocation & Key Rotation

If an employee leaves or a device is compromised:

1. **Immediate Revocation in Database:**
   ```sql
   UPDATE shop_members 
   SET is_active = false 
   WHERE user_id = '<COMPROMISED_USER_UUID>' AND shop_id = '<SHOP_UUID>';
   ```
2. **Supabase Auth Session Revocation:**
   In Supabase Dashboard -> Authentication -> Users -> Select User -> "Revoke all sessions".
3. **Audit Log Inspection:**
   Query the audit log for all actions executed by the actor in the past 24 hours:
   ```sql
   SELECT created_at, action, entity_type, entity_id, reason, ip_address 
   FROM audit_logs 
   WHERE actor_id = '<COMPROMISED_USER_UUID>' 
   ORDER BY created_at DESC;
   ```
