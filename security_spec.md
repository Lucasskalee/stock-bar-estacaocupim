# Stokbar Cupim — Shared Workspace Security Specification (Phase 0)

## 1. Data Invariants
1. **Default-Deny Safety Net**: Every unmatched Firestore path is denied (`match /{document=**} { allow read, write: if false; }`).
2. **Single Hardened Workspace (`estacao-cupim`)**: Only `workspaceId == 'estacao-cupim'` is accepted on `/workspaces/{workspaceId}/...`.
3. **Verified Identity Only**: Every authenticated read/write requires `request.auth != null && request.auth.token.email_verified == true && request.auth.token.email != null`.
4. **Team Membership Master Gate**: Access to `beverages`, `meta`, and `shifts` is strictly limited to the bootstrap administrator (`skalee.razarth@gmail.com`) or users whose lowercase verified email exists in `/workspaces/estacao-cupim/members/{email}`.
5. **PII Isolation on Team Roster**: `/workspaces/estacao-cupim/members/{memberEmail}` restricts `list`, `create`, `update`, and `delete` strictly to workspace admins. Individual non-admin users may only `get` their own document (`request.auth.token.email.lower() == memberEmail`) to verify authorization.
6. **Privilege Escalation Prevention**: Non-admin users cannot create, update, or promote themselves in `/members`; the bootstrap admin (`skalee.razarth@gmail.com`) cannot be deleted or demoted.
7. **Strict Validation & Server Timestamps**: Every document write validates exact keys (`hasAll` + `hasOnly`), field types, string/list bounds, `updatedByUid == request.auth.uid`, immutable `workspaceId`/`createdByUid`/`createdAt`, and `request.time` server timestamps.
8. **Immutable Shift History & Tiered Deletion**: Closed `shifts` cannot be updated (`allow update: if false`) and can only be deleted by workspace admins.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return `PERMISSION_DENIED`)
1. **Unauthenticated Read**: `GET /workspaces/estacao-cupim/beverages/b1` without `request.auth`.
2. **Unverified Admin Email Spoof**: `GET /workspaces/estacao-cupim/members/a@b.com` with `email: "skalee.razarth@gmail.com"` and `email_verified: false`.
3. **Unauthorized Outsider Read**: `LIST /workspaces/estacao-cupim/beverages` by verified user `outsider@example.com` not listed in `/members`.
4. **Self-Promotion to Team/Admin**: `CREATE /workspaces/estacao-cupim/members/outsider@example.com` with `{"role": "admin"}` by `outsider@example.com`.
5. **PII Roster Scraping by Operator**: `LIST /workspaces/estacao-cupim/members` or `GET /workspaces/estacao-cupim/members/other@example.com` by role `operador`.
6. **Shadow Field Injection on Beverage**: `CREATE /workspaces/estacao-cupim/beverages/b1` including ghost field `"isAdmin": true`.
7. **Value Poisoning on Update**: `UPDATE /workspaces/estacao-cupim/beverages/b1` setting `inicial: "9999999"` (string instead of number) or `inicial: -5`.
8. **Identity Spoofing on Audit Trail**: `UPDATE /workspaces/estacao-cupim/beverages/b1` setting `updatedByUid: "another-uid"` (`!= request.auth.uid`).
9. **Immutable Field Tampering**: `UPDATE /workspaces/estacao-cupim/beverages/b1` altering `createdByUid` or `createdAt` or `workspaceId`.
10. **Client Timestamp Forgery**: `CREATE /workspaces/estacao-cupim/beverages/b1` passing backdated `createdAt` instead of `request.time`.
11. **Operator Deleting Closed Shift History**: `DELETE /workspaces/estacao-cupim/shifts/s1` by role `operador` (only `admin` allowed).
12. **Resource Poisoning / Invalid Path ID**: `CREATE /workspaces/estacao-cupim/beverages/bad$id` or `nome` > 120 chars or `shifts.itens` > 200 items.
