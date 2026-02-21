# CRITICAL FIXES - Phase 1.5 Polish Pass

## Issue 1: Logo Still in Header
**Problem:** Black square logo icon still showing in top left header
**Expected:** Header shows only "BLDG.chat" text, no logo image
**Status:** NOT FIXED
- [ ] Remove `<img src="/assets/logo.png">` from header
- [ ] Add "BLDG.chat" text to header
- [ ] Verify on live app - no black square visible

## Issue 2: Thursday Scheduling Bug
**Problem:** Typed "laundry" at 1 AM Sunday Feb 15, got Thursday Feb 20 (should be Tuesday Feb 17)
**Root Cause:** getBookingDefaults() still has Thursday bias or not deploying
**Status:** NOT FIXED
- [ ] Read current getBookingDefaults() code
- [ ] Verify no "Thursday" or day index 4 references
- [ ] Check if function is actually being called
- [ ] Test on live app: type "laundry" and verify date is NOT Thursday
- [ ] Expected: Tuesday Feb 17 (next weekday after 24h buffer from Sunday 1 AM)

## Verification Steps
1. Load app.bldg.chat
2. Check header - should see "BLDG.chat" text only, no logo image
3. Type "laundry" in chat
4. Verify returned date is NOT Thursday Feb 20
5. Verify returned date IS Tuesday Feb 17 (or next available weekday)
