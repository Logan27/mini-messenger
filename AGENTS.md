# Messenger Project - AI Assistant Guidelines

## Critical Constraints (Non-obvious)
- **100 users maximum** - Hard scale limit, not expandable
- **Admin approval required** - All user registrations need manual approval
- **30-day retention** - Messages auto-deleted after 30 days
- **$50-60/month budget** - Strict operational cost target

## Architecture Patterns (Non-obvious)
- **P2P video calls** - Server only handles signaling, not media streams
- **Feature-Sliced Design** - Frontend uses FSD architecture
- **libsodium E2E encryption** - Not Signal protocol, uses specific key exchange
- **Windows development** - Use `.\venv\Scripts\activate`, not `source venv/bin/activate`

## Development Workflow (Non-obvious)
- **Roadmap compliance** - Must follow `docs/roadmap.md` exactly, update after tasks
- **100% certainty required** - Never deploy changes that might break existing functionality
- **DRY principle** - No code duplication allowed
- **Early returns** - Use for cleaner error handling

## Security Requirements (Non-obvious)
- **ClamAV scanning** - All file uploads scanned for malware
- **XOR validation** - Joi schemas use `.xor('recipientId', 'groupId')`
- **Rate limiting tiers** - Multiple tiers: login(5/min), API(100/min), upload(10/hour)
- **End-to-end encryption** - Messages encrypted client-side before server storage

## Deployment Constraints (Non-obvious)
- **Single server only** - No load balancer or multi-server setup
- **Specific server specs** - 4 vCPU, 8GB RAM, 160GB SSD minimum
- **Windows commands** - Use Windows-specific Python activation syntax