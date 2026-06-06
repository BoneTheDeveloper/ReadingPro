# Security Checklist

## Auth

- Protected APIs call `getAuthenticatedUser()`.
- Protected pages route through Clerk middleware.
- Clerk production and development keys are separated.
- User profile sync stores only needed profile fields.

## Authorization

- User-owned reads/writes include authenticated `userId`.
- Cross-user missing resources return `404` where possible.
- Dictionary shared-data reads still require auth in current routes.
- Local blob route is disabled outside development.

## Input Validation

- JSON bodies use Zod.
- Query/path params are validated before use.
- Multipart values are narrowed explicitly.
- AI outputs crossing runtime boundaries are validated where structured.

## Data And Secrets

- `DIRECT_URL` is migrations-only.
- Provider/CI tokens are not exposed to browser/runtime.
- Private Blob access requires owner verification before future signed URL exposure.
- Logs avoid full sensitive payloads and raw secrets.

## Deployment

- Run typecheck, lint, tests, and build before production.
- Review migration SQL before production deploy.
- Verify env vars per target environment.
