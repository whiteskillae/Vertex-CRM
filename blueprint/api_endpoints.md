# API Endpoint Specification

## Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/login` | Initial login via Email/Password | Public |
| POST | `/verify-otp` | Validates 2FA OTP | Public |
| GET | `/contacts` | Fetch personnel list (verified nodes) | Protected |
| GET | `/pending` | Fetch users awaiting approval | Admin/Manager |
| PUT | `/:id/approve` | Authorize a new node | Admin/Manager |

## Messaging (`/api/messages`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/send` | Transmit a new message/file | Protected |
| GET | `/` | Retrieve message history | Protected |
| GET | `/contacts` | Discovery of recent chat nodes | Protected |
| POST | `/mark-seen` | Synchronize read status | Protected |

## Leads (`/api/leads`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Fetch all leads in sector | Admin/Manager |
| POST | `/` | Register new lead intelligence | Admin/Manager |
| PUT | `/:id` | Update lead parameters | Admin/Manager |

## Tasks (`/api/tasks`)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Retrieve assigned mission objectives | Protected |
| POST | `/` | Delegate new task | Admin/Manager |
| PUT | `/:id` | Update task status/progress | Protected |
