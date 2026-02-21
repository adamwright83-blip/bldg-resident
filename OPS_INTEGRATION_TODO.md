# Ops Integration Work Order - TONIGHT ONLY

## Priority: End-to-end operations value (NO POLISH)

### 0. Fix Modify Time Bug
- [x] Debug why time window doesn't update in database when modify time is clicked
- [x] Test modify time flow end-to-end
- [x] Verify database update

### 1. BLDG.chat → ops.bldg.chat/admin Integration (CRITICAL)
- [ ] Identify ops system API endpoint for creating pickup records
- [ ] Map required fields:
  - [ ] resident full name
  - [ ] unit number
  - [ ] building address (Opus LA address)
  - [ ] phone (E.164)
  - [ ] scheduled date
  - [ ] time window
  - [ ] status = confirmed
  - [ ] notes (from "Any details..." chip + freeform messages)
- [ ] Implement API call from bldg-chat to ops system
- [ ] Test: Place booking in app.bldg.chat
- [ ] Verify: Booking appears in ops.../admin with all correct fields

### 2. Admin → Driver View Sync (CRITICAL)
- [ ] Open laundrybh-enmkipk9.manus.space/driver
- [ ] Verify test booking appears in driver view
- [ ] Confirm record is actionable for correct date/window

### 3. Stripe Test Mode Status (SECONDARY)
- [ ] Check if Stripe is connected end-to-end
- [ ] If yes: Test resident payment flow and verify recording
- [ ] If no: Connect Stripe test mode
- [ ] Document which payment flow is implemented (immediate vs later-from-admin)
- [ ] Flag any missing API keys

### 4. Confirmation Card Copy (QUICK)
- [ ] Add gray line at bottom of laundry confirmation card
- [ ] Text: "Fulfilled by Laundry Butler."

### Verification Requirements
- [ ] Screenshot of test booking in app.bldg.chat
- [ ] Screenshot of same booking in ops.../admin
- [ ] Screenshot of same booking in ops.../driver
- [ ] Stripe status report

## DO NOT WORK ON (until items 1-4 verified)
- Active bookings bar polish
- Logo animation
- Community features
- Onboarding diagrams
- Cancellation friction
- Any styling tweaks
