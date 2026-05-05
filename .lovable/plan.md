
## Changes

### 1. Disable forced password change (`src/hooks/useUserRole.ts`)

Set `forcePasswordChange` to always return `false`. The `ForcePasswordChange` component stays in the codebase but will never render.

### 2. User creation modal: replace default password with custom field (`src/components/users/UserFormDialog.tsx`)

- Add a `password` state field and a corresponding form input (with show/hide toggle and `PasswordStrength` indicator)
- Add validation: password is required in create mode and must pass `isPasswordStrong()`
- Send the user-entered password in the `create-user-v2` body instead of hardcoded `Mudar@123`
- Remove `forcePasswordChange` / `force_password_change` from the request body
- Remove the info box about the temporary password (lines 274-278)
- Reset the password field in `resetForm()`

### 3. Verify profile password change (already exists)

`ProfileModal.tsx` already has an "Alterar Senha" section using `supabase.auth.updateUser({ password })` with strength validation and confirmation. No changes needed here.

### Files modified
- `src/hooks/useUserRole.ts` — one-line change
- `src/components/users/UserFormDialog.tsx` — add password field, remove default password and forced change flags
