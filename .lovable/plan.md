
## Overview

Implement active session control: register on login, remove on logout, realtime-driven forced disconnect, revoked message on login page, and a super admin sessions panel.

---

## 1. Register session on login (`src/contexts/AuthContext.tsx`)

In the `signIn` method, after the status check passes (status is active), change the profile select to also fetch `company_id`. Then insert into `active_sessions` with a `crypto.randomUUID()` stored in `localStorage` as `session_uuid`.

## 2. Remove session on logout (`src/contexts/AuthContext.tsx`)

In the `signOut` method, before calling `supabase.auth.signOut()`, read `session_uuid` from localStorage, delete the matching row from `active_sessions`, and clear localStorage.

## 3. Realtime session listener (`src/components/layout/AppLayout.tsx`)

Add a `useEffect` that subscribes to `postgres_changes` on `active_sessions` filtering by `session_uuid=eq.${sessionUuid}` for `DELETE` events. When triggered:
- Remove `session_uuid` from localStorage
- Call `supabase.auth.signOut()`
- Redirect to `/auth?reason=session_revoked`

Cleanup the channel on unmount.

## 4. Session revoked message (`src/pages/Auth.tsx`)

On mount, check for `?reason=session_revoked` in URL search params. If present:
- Show a yellow warning banner with Shield icon: "Sua sessão foi encerrada pelo administrador."
- Auto-dismiss after 5 seconds
- Remove the query param from URL

## 5. Active Sessions panel (`src/components/users/ActiveSessionsPanel.tsx`)

New component rendered inside `UsersTab` (below the users table), visible only to super admins.

- Query `active_sessions` joined with profiles (`full_name`, `email`) ordered by `logged_in_at DESC`
- Auto-refresh every 30 seconds via `refetchInterval`
- Manual refresh button with `RefreshCw` icon
- Table columns: Usuário, Dispositivo (parsed from user agent), Conectado desde (dd/MM/yyyy HH:mm), Ação
- Disconnect button per row: deletes the session row; realtime handles the rest
- Parse device_info with simple regex to show browser + OS

## 6. Integrate panel in UsersTab (`src/components/users/UsersTab.tsx`)

Import `ActiveSessionsPanel` and render it after the AlertDialog, passing `companyId`. Only render when the current user is super admin (check via `useUserRole`).

---

## Files to create
- `src/components/users/ActiveSessionsPanel.tsx`

## Files to modify
- `src/contexts/AuthContext.tsx` — session insert on login, delete on logout
- `src/components/layout/AppLayout.tsx` — realtime DELETE listener
- `src/pages/Auth.tsx` — session_revoked warning
- `src/components/users/UsersTab.tsx` — render ActiveSessionsPanel

No database changes needed — `active_sessions` table and realtime are already configured.
