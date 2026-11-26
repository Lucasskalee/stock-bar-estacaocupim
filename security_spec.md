# Security Specification — Stokbar Cupim (Firestore)

## 1. Data Invariants
1. Every document under `/users/{userId}/beverages/{beverageId}`, `/users/{userId}/meta/{metaId}`, and `/users/{userId}/shifts/{shiftId}` MUST belong strictly to `request.auth.uid == userId` AND have `ownerId == request.auth.uid`.
2. Every write operation requires a verified authenticated user (`request.auth != null && request.auth.token.email_verified == true`).
3. Document IDs (`userId`, `beverageId`, `metaId`, `shiftId`) MUST match `^[a-zA-Z0-9_\-]+$` with length <= 128 on single-document operations (`get`, `create`, `update`, `delete`).
4. `Beverage.categoria` MUST belong to the strict allowlist: `['Cerveja', 'Refrigerante', 'Água', 'Suco', 'Destilado', 'Vinho', 'Outros']`.
5. Numeric stock fields (`inicial`, `final`, `ideal`) MUST be either `null` or a non-negative number (`>= 0 && <= 100000`).
6. `ShiftMeta.dataOperacional` and `ShiftRecord.dataOperacional` MUST match `^[0-9]{4}-[0-9]{2}-[0-9]{2}$` (length 10).
7. `ShiftRecord` documents are immutable after creation (no `update` allowed; only `create`, `get`, `list`, `delete` by owner).
8. `ShiftRecord.itens` array MUST be strictly bounded (`size() <= 200`) and validate the first element type if non-empty.
9. `createdAt` and `ownerId` are immutable after creation; `createdAt == request.time` on create and `updatedAt == request.time` on create/update.
10. No PII (email, phone, address) is stored in Firestore collections.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Read**: `GET /users/uid1/beverages/bev1` with `auth == null`.
2. **Cross-Tenant Read**: `GET /users/uidA/beverages/bev1` authenticated as `uidB`.
3. **Unverified Email Write**: `CREATE /users/uid1/beverages/bev1` with `email_verified: false`.
4. **Identity Spoofing on Create**: `CREATE /users/uid1/beverages/bev1` with `{ ownerId: "uid2", ... }`.
5. **Shadow Ghost Field Injection**: `CREATE /users/uid1/beverages/bev1` with extra key `isAdmin: true`.
6. **ID Poisoning**: `CREATE /users/uid1/beverages/${"a".repeat(200)}` (length > 128).
7. **Invalid Category Enum**: `CREATE /users/uid1/beverages/bev1` with `categoria: "Combustível"`.
8. **Negative / Overflow Stock Value**: `UPDATE /users/uid1/beverages/bev1` with `final: -5` or `final: 9999999`.
9. **Owner Hijack on Update**: `UPDATE /users/uid1/beverages/bev1` attempting to mutate `ownerId` or `createdAt`.
10. **Forged Client Timestamp**: `CREATE /users/uid1/beverages/bev1` with `createdAt: "2020-01-01T00:00:00Z"` instead of server `request.time`.
11. **Mutating Immutable Shift History**: `UPDATE /users/uid1/shifts/shift1` attempting to tamper with `totalConsumo`.
12. **Unbounded Array / Invalid Date Format**: `CREATE /users/uid1/shifts/shift1` with `dataOperacional: "hoje"` or `itens.size() > 200`.
