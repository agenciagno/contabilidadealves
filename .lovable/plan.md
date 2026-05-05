## Problem

When editing an existing user, the `UserFormDialog` calls the `create-user-v2` Edge Function, which fails with a non-2xx error. The Edge Function should only be used for creating new users.

## Solution

Replace the Edge Function call in edit mode (lines 136-155 of `UserFormDialog.tsx`) with a direct Supabase client update:

```typescript
const { error } = await supabase
  .from('profiles')
  .update({
    full_name: fullName,
    role,
    status_active: statusActive,
    is_super_admin: role === 'super_admin',
    allowed_modules: resolvedModules,
  })
  .eq('user_id', editUser!.userId);
```

This works because the `profiles` table already has RLS policies allowing admins and super admins to update profiles in their company.

## Files modified

- `src/components/users/UserFormDialog.tsx` -- replace Edge Function call with direct `.update()` in edit mode only. Create mode remains unchanged.
