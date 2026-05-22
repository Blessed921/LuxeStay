# Security Specification - LuxeStay

## Data Invariants
1. A **Listing** must have an `ownerId` that matches the creator's UID.
2. A **Booking** can only be created if the `listingId` exists and the `totalPrice` matches the calculated price (though price validation is best done server-side or via strict rules if possible).
3. A user can only modify their own **Booking** status to 'cancelled'.
4. **User** profiles are public for reading but only modifiable by the owner.

## The "Dirty Dozen" Payloads (Denial Expected)
1. **Identity Spoofing**: Creating a listing with someone else's `ownerId`.
2. **Shadow Field**: Adding `isVerified: true` to a listing.
3. **Ghost Update**: Changing `ownerId` of an existing listing.
4. **Price Poisoning**: Setting listing price to negative.
5. **Role Escalation**: Setting user role to 'admin' via profile update.
6. **Orphaned Booking**: Booking a non-existent listing.
7. **Cross-User Booking Access**: Reading another user's booking details.
8. **Unauthorized Status Change**: A random user confirming someone else's booking.
9. **ID Poisoning**: Using a 2KB string as a document ID.
10. **Timestamp Spoofing**: Providing a client-side `createdAt` date in the future.
11. **PII Leak**: Unauthorized read of private user data (not yet implemented but guarded).
12. **Recursive Write**: Rapidly creating 1000 listings in a second (rate-limiting via rules).

## Test Runner logic
The `firestore.rules` will be verified against these scenarios.
