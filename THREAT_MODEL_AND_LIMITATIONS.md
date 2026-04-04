# HokeOS v2.0.0: Threat Model & Architectural Limitations

This document provides transparent disclosure of the security boundaries, attack surfaces, and intentional engineering constraints of the HokeOS Industrial Middleware.

## 1.0 Trust Boundaries

HokeOS operates across three primary trust zones:

1.  **Client Zone (The Yard)**: Industrial tablets (PWA) running in the yard. Untrusted environment.
2.  **Logic Zone (The Middleware)**: Vercel-hosted Next.js Server Components and Actions. Trusted environment.
3.  **Origin Zone (The Data)**: Supabase-hosted PostgreSQL and Redis. Fully trusted environment.

## 2.0 Security Model & Tenant Isolation

HokeOS v2.0.0 implements **Application-Layer Multitenancy**.

- **Mechanics**: Every database query is strictly scoped by `team_id` at the service layer using Drizzle's query builder. 
- **The Gap**: Database-level Row Level Security (RLS) is currently **NOT active**. Isolation depends on developer discipline and service-layer enforcement.
- **Goal**: Full PostgreSQL RLS implementation is identified as a pre-requisite for the Enterprise Pilot.

## 3.0 Attack Surfaces

1.  **Magic Link Entry Points**: Publicly accessible NextAuth endpoints. Protected by standard rate-limiting.
2.  **Hardware Mock SDKs (WebSocket)**: Currently unauthenticated mock gates. Real-world serial integration will require a VPN or mutual TLS (mTLS).
3.  **SSE Streaming**: Exposed and single-instance limited. Not horizontally scalable in the current architecture.

## 4.0 Operational Limitations (Known Constraints)

| Component | Current State (v2.0.0) | Intentional Constraint / Planned Move |
| :-- | :-- | :-- |
| **Authentication** | Passwordless (Magic Links) | OIDC (SAML/Okta) is the next roadmap priority. |
| **Forecasting** | Rolling Window Statistical Model | Transition to on-chain verifiable price gates planned. |
| **Audit Log** | Append-Only (Trigger enforced) | Hash-chaining and external anchoring planned for v3.0. |
| **Scale** | Single-Instance Deployment | Designed for low-to-moderate concurrency environments. |

## 5.0 Industrial Determinism (Primary Defense)

HokeOS defends itself against financial fraud via **Determinism**. 
- **Invariant**: Any price recalculation derived from the raw `audit_hash` MUST yield an identical settlement payout.
- **Idempotency**: All investigation triggers and settlement executions are idempotent to prevent double-spending in unstable network conditions.

---

**Certified by Hoke Recovery Systems - Platform Engineering**
*Dossier Redline: 2026-03-30*
