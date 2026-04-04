# HokeOS: Sovereign Operational Runbook (v2.0.0)

This definitive guide provides the protocols for managing the HokeOS Industrial Middleware, from the dirty floor of the yard to global financial arbitrage.

## 1.0 General Administration

- **Sovereign Dashboard**: [dashboard/page.tsx](file:///c:/Users/hetfw/hutchcore-platform/apps/hokeos-web/app/dashboard/page.tsx)
- **Identity Strategy**: Passwordless (Magic Links). Verify SMTP status before large-scale operator onboarding.

## 2.0 Yard Operations (Gloved-Touch)

- **Intake Gateway**: [dashboard/yard/page.tsx](file:///c:/Users/hetfw/hutchcore-platform/apps/hokeos-web/app/dashboard/yard/page.tsx)
- **Hardware Protocols**:
  - **Scale Weights**: Automated WebSocket sync. Use **Offline Override** for manual entry during Wi-Fi drops.
  - **Visual Audit**: High-speed camera triggers on `Gross` weight lock.
- **PWA Installation**: Operators should "Install to Home Screen" on all industrial tablets to enable Service Worker caching.

## 3.0 Commercial & Financial Flow

- **Lead Reconciliation**: [dashboard/finance/page.tsx](file:///c:/Users/hetfw/hutchcore-platform/apps/hokeos-web/app/dashboard/finance/page.tsx)
- **The Audit-Lock**:
  - Payouts are **blocked** unless the corresponding batch is in `certified` status.
  - Verify the `audit_hash` matches before authorizing large-scale ACH/Check disbursements.
- **Payment Channels**: Support for Stripe (ACH), Industrial Checks, and PayPal Payouts.

## 4.0 Sovereign Intelligence v3

- **Forecasting**: Statistical projections available for all supported metal types (XAU, XAG, XPT, XPD).
- **Arbitrage Gates**: [lib/ai/statistical-forecaster.ts](file:///c:/Users/hetfw/hutchcore-platform/apps/hokeos-web/lib/ai/statistical-forecaster.ts)
  - Analyze discrepancies between London, New York, Shanghai, and Tokyo gates.
  - **Caution**: Arbitrage simulations assume "Infinite Liquidity". Adjust for "Industrial Friction" (shipping/time) in final yield calculations.

## 5.0 Disaster Recovery & Offline Mode

- **Status Checks**: Verify `navigator.onLine` state in the Yard UI console.
- **Sync Protocol**: Local cached tickets sync to Postgres origin upon reconnection.
- **Manual Override**: Tagged as `is_offline_manual`. Requires supervisor signature in the audit trail.

---

**Hoke Recovery Systems - Mission Control**
*Certified Sovereign Environment v2.0.0*
