# Security Specification

## Data Invariants
1. A transaction must belong to an authenticated user and be stored under their `userId`.
2. A user can only read and write data under their own `users/{userId}` path.
3. Timestamps like `createdAt` must be set by the server.
4. IDs must be valid strings.

## The "Dirty Dozen" Payloads
1. Attempt to write to `users/attackerId/transactions/123` while logged in as `victimId`.
2. Attempt to read `users/victimId/accounts/456` while logged in as `attackerId`.
3. Attempt to create a transaction with a 2MB title string.
4. Attempt to update a transaction's `userId` field to a different value.
5. Attempt to delete a budget belonging to another user.
6. Attempt to create an account with a negative initial balance (if invalid).
7. Attempt to bypass `request.time` by sending a future `createdAt` date from the client.
8. Attempt to inject scripts into `personName` of a Debt.
9. Attempt to list all transactions in the system without a `userId` filter.
10. Attempt to update an immutable field like `createdAt`.
11. Attempt to create a document with a junk-character ID of 2KB.
12. Attempt to read user PII (if any) without being the owner.

## Test Runner (firestore.rules.test.ts)
(To be implemented if testing tools are available, usually omitted in AI Studio unless requested specifically, but I will provide the rules that prevent these).
