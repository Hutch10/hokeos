# HokeOS v2.0.0: Pilot Outreach & Execution Strategy

This document provides the disciplined framework for landing the first industrial pilot and executing the critical first 7 days of on-site validation.

---

## 🏗️ Part 1: Pilot Outreach Strategy
**Target**: Mid-to-large sized metal recovery yards (2-5 secondary recycling sites).
**Tone**: Problem-solution focused, high-integrity, zero hype.

### ✉️ The High-Credibility Outreach Draft
**Subject**: Pilot Proposal: Industrial Ticket-to-Settlement Middleware (HokeOS)

**Message**:
> [Contact Name],
>
> I am reaching out to propose a 2-week, controlled pilot of HokeOS—a high-integrity industrial middleware prototype focused on the transition from yard intake (scales/sensors) to a high-fidelity settlement trail.
>
> **The Problem We Address**: Legacy yard systems often create friction during high-pressure intake cycles, resulting in reconciliation errors and "Ghost Payouts" that are difficult to audit.
>
> **The HokeOS Solution**:
> - **Tactile Yard Mode**: Optimized for gloved-hand, high-glare tablet use with deterministic intake flows.
> - **Audit-Locked Settlement**: Every payout is linked to a non-repudiable certified batch hash.
> - **Operational Continuity**: PWA-based offline support ensures zero downtime during Wi-Fi outages.
>
> **Pilot Terms**:
> - **Duration**: 7–14 days.
> - **Scope**: Parallel testing alongside your existing system (no production displacement required).
> - **Data Ownership**: You retain 100% of the audit traces and ROI metrics generated.
>
> Our objective for this pilot is to gather real-world operator feedback and break-fix data under "Dirty Floor" conditions.
>
> Are you available for a 15-minute technical walkthrough this week?
>
> Best,
> [Your Name]
> Platform Engineering, Hoke Recovery Systems

---

## 📋 Part 2: Day-by-Day Day 1 Pilot Plan
**Primary Goal**: Zero critical failures and measurable operational improvement over a 7-day window.

### Day 0: Pre-Flight & Integration
- **Script Run**: Execute `node scripts/handover-preflight.js` on-site.
- **Hardware Audit**: Confirm RS-232 bridge to tablet WebSocket is stable for the primary gross scale.
- **PWA Setup**: Install HokeOS as a standalone app on 2–3 operator tablets.

### Day 1: Tactile Onboarding (The "Dirty Floor" Test)
- **Morning**: Shadow the primary scale house operator.
- **Execution**: Run 5 inbound tickets in parallel with the legacy system.
- **Metric**: Record "Time-to-Ticket" (Target: < 45s).
- **Feedback Loop**: Adjust button contrast/sizing based on real operator glare and glove use.

### Day 2: The Audit-Lock Verification
- **Execution**: Move 10 tickets from `Gross` -> `Tare` -> `Verified`.
- **Validation**: Perform a manual audit audit-hash recalculation to prove **Industrial Determinism**.
- **Commercial Flow**: Verify the settlement preview accurately reflects current market spot prices (via the Statistical Weighting Model).

### Day 3: Failure Condition Stress-Test
- **Simulations**:
  - **Wi-Fi Drop**: Manually disable Wi-Fi during an active ticket; verify PWA/localStorage offline sync.
  - **Scale Jam**: Verify "Offline Override" logic records the `is_offline_manual` flag correctly.
- **Goal**: Confirm the "Operational Continuity" ADR-012 invariant.

### Day 4: Intelligence & Analytics Review
- **Dashboard Walkthrough**: Review the Performance Heatmap with the Yard Manager.
- **Validation**: Compare HokeOS statistical forecasts against actual daily price movements.

### Day 5: Forensic Audit Certification
- **Certification**: Generate 5 sample [SYSTEM_CERTIFICATION.md](file:///c:/Users/hetfw/hutchcore-platform/apps/hokeos-web/SYSTEM_CERTIFICATION.md) reports for the yard's finance lead.
- **Success Criteria**: No "Ghost Payouts" or hash-mismatches recorded.

### Days 6-7: Operational Polish & Handoff
- **Execution**: Full-shift autonomous use by a trained operator (with shadow backup).
- **Final Report**: Compile the "Pilot ROI Dossier" for the Enterprise Partner.

---
**Hoke Recovery Systems - Platform Engineering**
*Dossier Redline: 2026-03-30*
*Version: v2.0.0-PLAN (Pilot Execution Edition)*
