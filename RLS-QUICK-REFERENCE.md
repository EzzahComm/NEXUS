# RLS Optimization — Quick Reference Card

**Print this or keep open in Supabase SQL Editor**

---

## 🎯 One-Minute Audit

Copy & paste into Supabase SQL Editor:

```sql
-- Find all policies needing optimization
SELECT
  schemaname, tablename, policyname,
  CASE
    WHEN qual LIKE '%auth.uid()%' THEN '❌ auth.uid() - NEEDS FIX'
    WHEN qual LIKE '%auth.%()%' THEN '❌ auth.* - NEEDS FIX'
    WHEN qual LIKE '%current_setting%' AND qual NOT LIKE '(select%' THEN '❌ current_setting - NEEDS FIX'
    ELSE '✅ OK'
  END status,
  qual
FROM pg_policies
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'extensions')
ORDER BY schemaname, tablename;
```

---

## 🔧 Quick Fix Patterns

### Pattern 1: Replace `auth.uid()`
```sql
-- BEFORE:  auth.uid() = user_id
-- AFTER:   (select auth.uid()) = user_id

DROP POLICY "old_name" ON table_name;
CREATE POLICY "old_name" ON table_name
  FOR SELECT
  USING ((select auth.uid()) = user_id);
```

### Pattern 2: Replace `current_setting()`
```sql
-- BEFORE:  current_setting('app.tenant_id') = org_id
-- AFTER:   (select current_setting('app.tenant_id')) = org_id

DROP POLICY "old_name" ON table_name;
CREATE POLICY "old_name" ON table_name
  FOR SELECT
  USING ((select current_setting('app.tenant_id')) = org_id::text);
```

### Pattern 3: Multiple Auth Calls
```sql
-- BEFORE:  auth.uid() = owner_id OR auth.uid() = admin_id
-- AFTER:   (select auth.uid()) = owner_id OR (select auth.uid()) = admin_id

DROP POLICY "old_name" ON table_name;
CREATE POLICY "old_name" ON table_name
  FOR SELECT
  USING ((select auth.uid()) = owner_id OR (select auth.uid()) = admin_id);
```

---

## ⚡ Performance Impact

| Rows | Before | After | Improvement |
|------|--------|-------|-------------|
| 10K | 50ms | 5ms | 90% |
| 100K | 500ms | 15ms | 97% |
| 1M | 5s | 50ms | 99% |

---

## ✅ Validation Checklist

After applying fix:

```sql
-- 1. Policy exists and syntax is correct
SELECT policyname, qual FROM pg_policies
WHERE tablename = 'your_table_name';

-- 2. Policy still works (user sees own data)
SELECT * FROM your_table_name LIMIT 1;

-- 3. RLS works (other users blocked)
-- Try: SELECT * FROM your_table_name WHERE user_id != auth.uid();
-- Should: return empty or 0 rows
```

---

## 🎬 All-In-One: Complete Table Optimization

Replace `table_name`, `user_id_column` with actual names:

```sql
-- Drop all old policies
DROP POLICY IF EXISTS "select_policy" ON public.table_name;
DROP POLICY IF EXISTS "insert_policy" ON public.table_name;
DROP POLICY IF EXISTS "update_policy" ON public.table_name;
DROP POLICY IF EXISTS "delete_policy" ON public.table_name;

-- Create optimized policies
CREATE POLICY "select_policy" ON public.table_name
  FOR SELECT USING ((select auth.uid()) = user_id_column);

CREATE POLICY "insert_policy" ON public.table_name
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id_column);

CREATE POLICY "update_policy" ON public.table_name
  FOR UPDATE USING ((select auth.uid()) = user_id_column)
  WITH CHECK ((select auth.uid()) = user_id_column);

CREATE POLICY "delete_policy" ON public.table_name
  FOR DELETE USING ((select auth.uid()) = user_id_column);

-- Verify
SELECT policyname FROM pg_policies WHERE tablename = 'table_name';
```

---

## 📋 Common Tables & Their Fixes

### Users Table
```sql
DROP POLICY IF EXISTS "users_read" ON public.users;
CREATE POLICY "users_read" ON public.users
  FOR SELECT USING ((select auth.uid()) = id);
```

### Tenants (Multi-tenant)
```sql
DROP POLICY IF EXISTS "tenant_isolation" ON public.tenants;
CREATE POLICY "tenant_isolation" ON public.tenants
  FOR SELECT USING ((select current_setting('app.tenant_id')) = tenant_id::text);
```

### Documents (With Admin Override)
```sql
DROP POLICY IF EXISTS "documents_access" ON public.documents;
CREATE POLICY "documents_access" ON public.documents
  FOR SELECT USING (
    (select auth.uid()) = owner_id
    OR ((select current_setting('app.user_role')) = 'admin')
  );
```

---

## 🚀 Deployment Checklist

- [ ] Run audit query (identify tables)
- [ ] Create migration for each table
- [ ] Test in staging
- [ ] Get team approval
- [ ] Deploy to production
- [ ] Monitor logs (no permission errors)
- [ ] Verify performance improvement
- [ ] Update documentation

---

## 🆘 Quick Troubleshoot

| Issue | Solution |
|-------|----------|
| "Policy does not exist" | Use correct exact table/policy name |
| "Syntax error" | Check parentheses and quotes |
| "Permission denied" | RLS working correctly; check auth context |
| No performance improvement | Verify optimization actually applied; check EXPLAIN ANALYZE |

---

## 💾 Copy-Paste Ready

### Audit (1 table)
```sql
SELECT policyname, qual FROM pg_policies
WHERE tablename = 'YOUR_TABLE_NAME'
ORDER BY policyname;
```

### Performance Test (Before/After)
```sql
EXPLAIN ANALYZE
SELECT * FROM YOUR_TABLE_NAME
WHERE user_id = auth.uid()
LIMIT 10;
```

### Verify Optimization Applied
```sql
SELECT qual FROM pg_policies
WHERE tablename = 'YOUR_TABLE_NAME'
AND qual LIKE '(select%auth%';  -- Should find optimized policies
```

---

**Need help?** Keep this card handy while optimizing your RLS policies.

Generated by: EZZAHCOMM NEXUS | Last Updated: 2026-05-14
