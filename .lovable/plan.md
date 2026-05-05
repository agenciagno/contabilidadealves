
## Problem

The `useUserRole` hook has two bugs preventing the forced password change screen from showing:

1. **Null-coalescing operator masks null values**: On line 28, `(pwData as any).password_changed_at ?? undefined` converts `null` to `undefined` because `??` treats `null` as a nullish value. Then line 51 checks `=== null`, which never matches since the value is now `undefined`.

2. **`force_password_change` column is ignored**: The DB has a `force_password_change` boolean column, but the hook never reads it. Per the user's requirements, both `force_password_change: true` OR `password_changed_at: null` should trigger the mandatory password change screen.

## Fix (single file: `src/hooks/useUserRole.ts`)

1. **Add `force_password_change` to the main profile query** (line 14): include it in the `.select()` string.

2. **Fix the null-coalescing on line 28**: Change `?? undefined` to an explicit check:
   ```typescript
   passwordChangedAt = (pwData as any).password_changed_at;
   // passwordChangedAt will be null (from DB) or a string — both are valid
   // Only set to undefined if the query itself failed (catch block)
   ```

3. **Update the `forcePasswordChange` logic** (line 49-51):
   ```typescript
   const forcePasswordChange = isSuperAdmin
     ? false
     : (data?.passwordChangedAt === null || data?.force_password_change === true);
   ```
   - Super admins: never forced
   - `passwordChangedAt === null` OR `force_password_change === true`: show forced change screen
   - `passwordChangedAt === undefined` (query failed / column missing): treat as already changed (resilience fallback)

No layout, routing, or other functionality changes.
