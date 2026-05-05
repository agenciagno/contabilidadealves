
## Diagnosis

The edge function `create-user-v2` is deployed and responding correctly (confirmed via test call returning proper 400 for missing fields). The frontend URL pattern using `VITE_SUPABASE_URL` is also correct.

However, using raw `fetch()` with `import.meta.env.VITE_SUPABASE_URL` can cause 404s in production if the env var isn't properly injected at build time, or if there are subtle CORS/routing issues.

## Plan

### 1. Redeploy the edge function
Force a fresh deployment of `create-user-v2` to ensure the published app hits the latest version.

### 2. Migrate all frontend calls to `supabase.functions.invoke()`
Replace raw `fetch()` calls with the Supabase SDK method `supabase.functions.invoke('create-user-v2', { body: ... })`. This is more reliable because:
- It automatically uses the correct base URL from the client config
- It handles auth headers automatically
- It avoids potential env var issues in production builds

**Files to update:**
- `src/components/users/UserFormDialog.tsx` (2 calls)
- `src/components/settings/ClientCompaniesTab.tsx` (3 calls)

No logic changes -- only the transport layer (fetch -> supabase.functions.invoke). The request bodies and error handling remain identical.
