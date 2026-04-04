# HokeOS: Architectural Decision Records (ADRs)

This document formalizes the engineering decisions, trade-offs, and industrial strategies implemented in the HokeOS ecosystem (v2.0.0).

## [ADR-001] Session-Based Multi-Tenancy (IDOR Defense)

### ADR-001 Context
Industrial recovery data is strictly sovereign. Data leaks between teams are catastrophic.

### ADR-001 Decision
We moved from client-supplied `teamId` parameters to **Server-Side Session Resolution**.

- **Implementation**: The `getCurrentUser()` helper extracts the `activeTeamId` directly from the signed JWT/Session.
- **Enforcement**: Service layers and Server Actions are prohibited from accepting `teamId` as a client-passed argument in write operations unless verified against the session context.

### ADR-001 Consequences
- **Positive**: Eliminates Insecure Direct Object Reference (IDOR) as a viable attack vector.
- **Negative**: Adds a database/session lookup overhead to every authenticated request.

## [ADR-002] Immutable Audit Trace

### ADR-002 Context
Settlements involve significant financial value. Audit logs must be tamper-proof.

### ADR-002 Decision
We implemented a dedicated `audit_trace` table with **Database-Level Immutability**.

- **Implementation**: A PostgreSQL trigger is applied to the table that aborts any `UPDATE` or `DELETE` attempt.
- **Category Scoping**: Actions are categorized into `security`, `recovery`, `system`, and `analytics`.

### ADR-002 Consequences
- **Positive**: Provides a reliable Forensic Trail for compliance.
- **Negative**: Table growth requires proactive partitioning strategies.

## [ADR-003] Exponential Backoff & Circuit Breakers (Resilience)

### ADR-003 Context
External Metal Price APIs are unstable. Immediate failure results in platform blindness.

### ADR-003 Decision
Implemented a 3-tier resilience strategy for price ingestion:

1. **Exponential Backoff**: 3 retry attempts with increasing delay.
2. **Circuit Breaking**: In-memory state marks the provider as "Degraded" after 5 failures, stopping all origin requests for a 10-minute cooldown.
3. **Sovereign Fallback**: Automated switch to a deterministic mathematical model based on 30-day volatility if all external gates are closed.

## [ADR-004] Volatility Forecasting (Segmented Regression)

### ADR-004 Context
Recovery platform yields are highly sensitive to market fluctuations. Simple averages are insufficient for industrial volatility.

### ADR-004 Decision
Upgrade to **Sovereign Forecast v2** utilizing **Segmented Polynomial Regression**.

- **Strategy**: Detects market inflection points by splitting the history into "Baseline" and "Momentum" segments.
- **Confidence**: Weighted standard deviation against data density and source reliability.

## [ADR-005] Identity Sovereignty (Passwordless Authentication)

### ADR-005 Context
Static passwords in an industrial scrap ecosystem are vulnerable to credential theft (phishing, stuffing).

### ADR-005 Decision
Migrated from **Passwords** to **Passwordless (Magic Links & Passkeys)**.

- **Implementation**: NextAuth `DrizzleAdapter` with `verification_tokens` for asynchronous email logic.
- **SSO Fallback**: Integrated framework support for SAML/OIDC (Auth0/Okta) to support enterprise recycling operations as a planned roadmap enhancement.

### ADR-005 Consequences
- **Positive**: Eliminates the most common attack surface (passwords). Implements a non-repudiable "Trust Side-Channel".
- **Negative**: Adds dependency on reliable email delivery (mitigated by Sovereign Fallback SMTP).

## [ADR-006] Distributed Rate Limiting & Idempotency

### ADR-006 Context
Industrial platforms are targets for scraping/DDoS and concurrent job execution (noisy neighbors).

### ADR-006 Decision
Implemented **Redis-based Volumetric Guarding** and **Idempotency Locks**.

- **Middleware Rate Limiting**: Limit global API requests based on IP address stored in Redis.
- **Ingestion Idempotency**: Job-level locks prevent concurrent mutation of historical metal spot prices for the same window.

## [ADR-007] Hardware-First Design (Yard Operations)

### ADR-007 Context
Industrial yard operators work in environments where traditional desktop UIs fail (gloves, glare, dust, speed pressure).

### ADR-007 Decision
Implemented a dedicated **Yard Mode** with a **Hardware-First** interaction model.

- **Ticketing**: Tickets are the primary state-container for intake, moving from `Gross` -> `Tare` -> `Verified`.
- **Hardware SDK**: Standardized mock interface for Scales (WebSocket) and Cameras (RTSP) to ensure tactile reactivity.
- **UX Strategy**: High-contrast, touch-first components (min 24pt buttons) with linear, non-destructive workflows.

### ADR-007 Consequences
- **Positive**: Dramatically reduces "Time-to-Ticket" (< 45s). Improves data integrity via automated sensor capture.
- **Negative**: Adds front-end complexity to manage real-time scale synchronization and hardware exception handling.

## [ADR-008] Commercial Integrity (Settlement Invariants)

### ADR-008 Context
Industrial payouts involve high financial stakes. Non-repudiable proof of intake is required for secure settlement.

### ADR-008 Decision
Implemented **Settlement Integrity Invariants** that link every financial payout to a verified audit trace.

- **Certification Lock**: Settlements can *only* be initiated for batches/tickets in the `certified` status.
- **Audit-Trace Invariant**: The `audit_hash` generated during certification is persisted in the settlement record.
- **Payout Verification**: Payouts (ACH, Check, PayPal) are recorded as child records of settlements, creating a complete trace from `Scale Intake -> Audit Capture -> Financial Reconciliation -> Disbursement`.

### ADR-008 Consequences
- **Positive**: Provides institutional-grade financial security. Eliminates "Ghost Payouts" without corresponding yard intake.
- **Negative**: Adds a mandatory two-step workflow (Certify then Settle) for all financial disbursements.

## [ADR-012] Offline-First Operational Strategy (PWA)

### ADR-012 Context
Scrap yards are industrial environments with unreliable "Dirty Wi-Fi" and spotty LTE coverage. A network drop during a `Gross/Tare` cycle stops the financial pump.

### ADR-012 Decision
Adopt a **Progressive Web App (PWA)** strategy with aggressive asset caching and local ticket persistence.

- **Implementation**: Service Worker (`sw.js`) caches critical UI assets. `localStorage` is used for ticket caching.
- **Consistency Model**: Eventual Consistency. Locally cached tickets are reconciled with the server-side audit trail upon restoration of connectivity.

### ADR-012 Consequences
- **Positive**: Zero operational downtime for yard intake during network outages.
- **Negative**: Potential for clock-skew between local client and UTC server timestamps.

## [ADR-013] Industrial Determinism & Idempotency

### ADR-013 Context
Industrial recovery requires institutional-grade auditability. Calculations must be verifiable by external parties (Partners/Auditors).

### ADR-013 Decision
Enforce **Industrial Determinism** across all settlement and yield calculations.

- **Invariant**: Any calculation derived from the same `audit_hash` (Yard Intake Snapshot) MUST yield an identical settlement payout.
- **Idempotency**: All investigation triggers and payment executions are idempotent to protect against double-spending and duplicate ticket generation in high-latency conditions.

### ADR-013 Consequences
- **Positive**: Prevents financial manipulation and ensures that the platform is audit-ready.
- **Negative**: Requires strict control over the floating-point precision of yield calculations.

---

**Hoke Recovery Systems - Platform Engineering**
*Dossier Redline: 2026-03-30*
*Certified Sovereign Environment v2.0.0-PROTOTYPE*
