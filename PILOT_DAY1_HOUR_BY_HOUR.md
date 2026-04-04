# HokeOS v2.0.0: Day 1 Pilot Execution (On-Site)

This plan moves HokeOS from "Internally Validated Prototype" to "Proven Under Pressure." It focuses on shadow-testing and identifying friction points without disrupting yard operations.

---

## 📅 Day 1 Schedule (07:00 AM - 04:00 PM)

### 🕗 07:00 - 08:30: Integration & Baseline
- **Hardware Audit**: Confirm RS-232 bridge to tablet WebSocket is stable for the primary gross scale.
- **PWA Setup**: Install HokeOS as a standalone app on 2 operator tablets.
- **Shadow Mode**: Open HokeOS alongside the yard's primary legacy system.
- **Baseline**: Observe the first 5 inbound trucks in the legacy system without interacting with HokeOS. Record the operator's current ticket time.

### 🕘 08:30 - 10:00: Parallel Intake (Shadow Trial)
- **Execution**: Operator processes inbound tickets on the legacy system; **You** (or a second operator) parallel-process the same tickets on HokeOS.
- **Verification**: Ensure the `Gross Weight` accurately reflects the live scale read in both systems.
- **Metric Trace**: Verify the `audit_hash` is correctly generated for every intake event.

### 🕙 10:00 - 12:00: The "Glove & Glare" Stress Test
- **Tactile Audit**: Have the lead operator process 5 tickets on HokeOS while wearing their standard industrial gloves.
- **Sunlight Test**: Position the tablet at the most glare-prone angle in the scale-house.
- **Observation**: Note every "missed tap" or "mis-click." Adjust button contrast and target size on-site if needed.

### 🕛 12:00 - 13:00: Mid-Shift Audit Trace Validation
- **Reconciliation**: Compare the first 25 tickets from HokeOS against the legacy records.
- **Integrity Check**: Confirm that all settlement previews in HokeOS match the legacy dollar-values for the recorded weights.
- **Determinism Check**: Re-run the settlement calculation for 3 tickets to prove the **Industrial Determinism** invariant.

### 🕐 13:00 - 15:00: Resilience Testing (Controlled Failure)
- **Network Drop**: Manually disable the scale-house Wi-Fi during a high-volume intake window (5+ trucks in line).
- **Offline Sync**: Verify that the operator can still process tickets to `localStorage` and that they sync immediately when connectivity is restored.
- **Legacy Match**: Ensure the "Offline Override" flag is correctly set and the data matches the legacy fallbacks.

### 🕒 15:00 - 16:00: Post-Shift Debrief & Fix-List
- **Operator Feedback**: Capture core friction points and edge-case exceptions.
- **The "Broken" List**: Document every edge-case where the mock SDKs had to be manually overridden. 
- **Next-Day Prep**: Triage all UI/UX friction for a Day 2 refinement deployment.

---

## 🎯 Day 1 Success Criteria
- **Shadow Operation**: 25+ parallel tickets processed with zero data loss.
- **Ticket Time**: Sustained average ticket processing time < 45 seconds.
- **Integrity**: 100% match between HokeOS settlement previews and legacy dollar values.
- **Feedback**: Documented list of at least 3 high-signal operator friction points.

## 🚨 Abort Conditions (Critical Safety/Ops)
- **System Latency**: UI response time exceeds 2 seconds during weight capture.
- **Input Failure**: Repeated failure to capture scale input requiring more than 3 taps.
- **Operator Confusion**: The UI blocks the standard "Scale house flow" causing a backup in the truck line.

## 📝 Operator Feedback Questions
1. "Where did the screen slow you down today?"
2. "Was any text too small to read through the dust/glare?"
3. "Did you feel confident that the weight was captured correctly without double-checking the legacy scale?"

---
**Hoke Recovery Systems - Platform Engineering**
*Dossier Grounded Revision: 2026-03-30*
*Version: v2.0.0-PROTOTYPE (Grounded Execution Edition)*
