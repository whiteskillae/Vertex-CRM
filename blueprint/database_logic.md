# Database Logic & Schema Definitions

## Primary Entities

### 1. User (`User.js`)
- **Node Status**: `active`, `pending`, `blocked`.
- **Soft Delete**: `isDeleted` (Boolean).
- **Security**: OTP-based 2FA and JWT tokenization.
- **Logic**: Users created during registration start as `pending`. They must be `approved` by an Admin to become `active` nodes in the personnel list.

### 2. Message (`Message.js`)
- **Topology**: Links a `senderId` to a `receiverId`.
- **Content**: Supports text, file attachments (Cloudinary), and voice transmissions.
- **Status**: `isSeen` flag for read-receipt synchronization.

### 3. Lead (`Lead.js`)
- **Tracking**: Monitors lead source, status (e.g., `New`, `Negotiating`), and value.
- **Assignment**: Can be assigned to specific personnel for follow-up.

## Logic Implementation Patterns

### Soft Deletion
To prevent accidental data loss, the system uses an inclusive filter pattern:
```javascript
// Example filter for active nodes
const filter = { isDeleted: { $ne: true } };
```
This ensures legacy records (where `isDeleted` may be undefined) are correctly identified as active.

### Real-time Synchronization
The system utilizes Socket.io rooms named after the User's `_id`. 
- **Pattern**: `io.to(userId).emit('event', data)`
- **Benefit**: Targeted data delivery without broadcasting sensitive info to unauthorized nodes.
