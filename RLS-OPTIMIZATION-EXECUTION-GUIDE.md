# RLS Optimization — Step-by-Step Execution Guide

**Status:** Ready for Implementation  
**Priority:** High (Performance Critical)  
**Timeline:** 1-2 hours (staging) + 15 minutes (production deployment)

---

## 📋 Pre-Execution Checklist

- [ ] Database backup created
- [ ] Staging environment available
- [ ] Migration script reviewed
- [ ] Team notified of optimization
- [ ] Monitoring tools ready
- [ ] Rollback plan documented

---

## 🔍 Step 1: Audit Your Database

### In Supabase SQL Editor:

1. Navigate to **SQL Editor**
2. Create new query
3. Copy the audit query:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  qual as policy_condition,
  CASE
    WHEN qual LIKE '%auth.uid()%' THEN '🔴 CRITICAL: auth.uid()'
    WHEN qual LIKE '%auth.%()%' THEN '🔴 CRITICAL: auth function'
    WHEN qual LIKE '%current_setting%' THEN '🔴 CRITICAL: current_setting()'
    ELSE '✅ OPTIMIZED'
  END as status
FROM pg_policies
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'extensions')
ORDER BY schemaname, tablename;
```

4. Execute query
5. **Document results** — Note which tables have `🔴 CRITICAL` status

### Example Output:
```
schemaname | tablename | policyname          | status
----------+----------+---------------------+---------------------------
public    | tenants  | tenants_self_read   | 🔴 CRITICAL: auth.uid()
public    | tenants  | tenants_self_write  | 🔴 CRITICAL: auth.uid()
public    | documents| org_isolation       | 🔴 CRITICAL: current_setting()
```

---

## 🛠️ Step 2: Prepare Migration Scripts

### For Each Affected Table:

**Example: optimizing `public.tenants` table**

1. Get current policy definitions:

```sql
SELECT
  policyname,
  qual as policy_condition,
  with_check
FROM pg_policies
WHERE tablename = 'tenants'
ORDER BY policyname;
```

2. Create replacement migration:

```sql
-- Drop old policies
DROP POLICY IF EXISTS "tenants_self_read" ON public.tenants;
DROP POLICY IF EXISTS "tenants_self_write" ON public.tenants;
DROP POLICY IF EXISTS "tenants_self_delete" ON public.tenants;

-- Create optimized policies
CREATE POLICY "tenants_self_read" ON public.tenants
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "tenants_self_write" ON public.tenants
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "tenants_self_delete" ON public.tenants
  FOR DELETE
  USING ((select auth.uid()) = user_id);
```

---

## 🧪 Step 3: Test in Staging

### Before Applying Changes:

1. **Create a staging snapshot** of your database
2. Run a baseline performance test:

```sql
-- Record baseline
EXPLAIN ANALYZE
SELECT * FROM public.tenants WHERE user_id = auth.uid() LIMIT 10;
```

3. Apply the migration script to staging
4. Run the same query again and compare execution time:

```sql
-- Test optimized version
EXPLAIN ANALYZE
SELECT * FROM public.tenants WHERE user_id = auth.uid() LIMIT 10;
```

### Expected Results:
- Execution time should decrease 50-95%
- Same number of rows returned
- No permission errors

### Validation Tests:

**Test 1: Ensure access control still works**

```sql
-- User A should see only their own data
-- If user_id = 'user-123', they should see only rows where user_id = 'user-123'
SELECT * FROM public.tenants LIMIT 10;
```

**Test 2: Verify denied access returns empty**

```sql
-- Create a test as a different user would attempt
-- Should return 0 rows (permission denied implicitly)
SELECT * FROM public.tenants WHERE user_id != auth.uid();
```

---

## 🚀 Step 4: Deploy to Production

### Pre-deployment:

1. Schedule during low-traffic window (off-hours recommended)
2. Notify team of planned optimization
3. Have rollback script ready
4. Enable query logging

### Deployment Steps:

**In Supabase SQL Editor (Production):**

1. **Backup database** (Supabase handles this, but verify)
2. Copy migration script
3. Execute in batches (one table at a time)
4. Verify each table after migration

```sql
-- After each table optimization, verify policies exist
SELECT policyname, qual FROM pg_policies 
WHERE tablename = 'tenants';
```

### Batch Strategy (Reduce Risk):

```sql
-- Batch 1: Simple tables (no complex auth)
-- - tenants
-- - users
-- - profiles

-- Batch 2: Multi-tenant tables (org isolation)
-- - documents
-- - projects
-- - teams

-- Batch 3: Complex tables (role-based + ownership)
-- - posts
-- - comments
-- - settings
```

Wait 5-10 minutes between batches to monitor for issues.

---

## ✅ Step 5: Validation & Monitoring

### Immediate Validation (Post-Deployment):

1. **Check RLS policies are in place:**

```sql
SELECT COUNT(*) as total_policies FROM pg_policies
WHERE schemaname = 'public';
```

2. **Test application functionality:**
   - [ ] User login works
   - [ ] User sees own data
   - [ ] User cannot see other user's data
   - [ ] Filters/searches work correctly
   - [ ] No permission denied errors in logs

3. **Monitor for errors:**

```sql
-- Check for RLS-related errors in application logs
-- Look for: "permission denied for schema public"
-- Look for: "new row violates row-level security policy"
```

### Performance Validation (24-48 hours):

Monitor these metrics:

```sql
-- Query execution times
SELECT
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
WHERE query LIKE '%SELECT%tenants%'
ORDER BY mean_time DESC;

-- Should show reduced mean_time compared to baseline
```

**Expected improvements:**
- Query time: 50-98% faster
- CPU usage: 30-50% lower
- Memory overhead: 20-40% reduced

---

## 🔄 Step 6: Post-Deployment Monitoring

### Daily (First Week):

- [ ] Check application logs for errors
- [ ] Verify no permission denied errors spike
- [ ] Monitor query performance (should be faster)
- [ ] Test user access from different accounts

### Weekly:

- [ ] Review query performance metrics
- [ ] Confirm optimization stability
- [ ] Update documentation

### Monthly:

- [ ] Baseline comparison (before vs. after)
- [ ] Identify any new tables needing optimization
- [ ] Plan next optimization cycle

---

## 📊 Performance Metrics to Track

### Before Optimization:
```
Table: public.tenants (100K rows)
Query: SELECT * FROM public.tenants WHERE user_id = auth.uid()
Time: ~500ms
Rows: ~50 (average)
```

### After Optimization:
```
Table: public.tenants (100K rows)
Query: SELECT * FROM public.tenants WHERE user_id = auth.uid()
Time: ~15ms ← 97% faster
Rows: ~50 (same)
```

---

## 🆘 Troubleshooting

### Problem: Permission Denied Errors Increase

**Cause:** RLS policy was broken during recreation  
**Solution:**
1. Stop application traffic to affected table
2. Rollback policy: `DROP POLICY "name" ON table; CREATE POLICY ...` with original condition
3. Review policy syntax carefully
4. Retry

### Problem: Optimization Had No Effect

**Cause:** Policy may not have direct auth() call, or other bottleneck exists  
**Solution:**
1. Verify original policy had `auth.uid()` directly
2. Check if performance bottleneck is elsewhere (network, disk)
3. Run `EXPLAIN ANALYZE` to identify actual bottleneck

### Problem: Query Returns Different Results

**Cause:** Policy logic change during optimization  
**Solution:**
1. Compare original and optimized policy syntax
2. Ensure logic is identical (just syntax differs)
3. Rollback and review

### Problem: Application Crashes After Deployment

**Cause:** Policy syntax error or breaking change  
**Solution:**
1. Immediately rollback to previous policy
2. Review policy SQL for errors
3. Test in staging before retry

---

## 🔙 Rollback Procedure (If Needed)

If optimization causes issues:

```sql
-- Restore original policies
DROP POLICY IF EXISTS "tenants_self_read" ON public.tenants;
CREATE POLICY "tenants_self_read" ON public.tenants
  FOR SELECT
  USING (auth.uid() = user_id);  -- Original pattern (not optimized)

DROP POLICY IF EXISTS "tenants_self_write" ON public.tenants;
CREATE POLICY "tenants_self_write" ON public.tenants
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify rollback
SELECT policyname, qual FROM pg_policies WHERE tablename = 'tenants';
```

**Note:** Even after rollback, keep the optimization scripts for redeployment after troubleshooting.

---

## 📝 Documentation

### Update Your Internal Docs:

- [ ] Add optimization date to changelog
- [ ] Document which tables were optimized
- [ ] Note performance improvements achieved
- [ ] Update RLS best practices guide
- [ ] Archive original policy definitions (for reference)

### Example Changelog Entry:

```markdown
## 2026-05-14 — RLS Performance Optimization

**Tables Optimized:**
- public.tenants (auth.uid() caching)
- public.documents (current_setting() caching)
- public.projects (multi-condition optimization)

**Performance Improvements:**
- Average query time: -95%
- CPU overhead: -40%
- Memory usage: -25%

**Changes:**
- Wrapped auth.uid() calls in (select auth.uid())
- Wrapped current_setting() calls in (select current_setting())
- No application code changes required

**Testing:**
- Staging validation: PASSED
- Production deployment: 2026-05-14 22:00 UTC
- Performance verified: 2026-05-15 10:00 UTC
```

---

## ✨ Success Criteria

✅ **Optimization Complete When:**

1. All critical RLS policies are optimized
2. No new `auth.uid()` calls in policy conditions
3. No new `current_setting()` calls in policy conditions
4. Performance tests show 50%+ improvement
5. All RLS access controls work correctly
6. No permission-related errors in logs
7. Application functions normally
8. Team has been notified of completion

---

## 📞 Support & Questions

If you encounter issues during optimization:

1. Check the **Troubleshooting** section above
2. Review the audit results to ensure all policies were identified
3. Verify syntax matches templates provided
4. Test in staging first before production
5. Keep detailed logs of all changes for audit trail

---

**EZZAHCOMM NEXUS Optimization Framework** — Continuous Performance Improvement
