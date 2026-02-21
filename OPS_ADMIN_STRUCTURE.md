# Ops Admin Form Structure

## URL: https://laundrybh-enmkipk9.manus.space/admin

## Form Fields (New Order tab):

1. **PHONE** - (323) 555-1234 format
2. **FIRST NAME** - Text input
3. **LAST NAME** - Text input
4. **EMAIL (OPTIONAL)** - Text input
5. **UNIT** - Text input
6. **ADDRESS** - Text input
7. **SPECIAL INSTRUCTIONS** - Text area
8. **SERVICE** - Buttons: "Wash & Fold" | "Dry Cleaning"
9. **PICKUP DATE** - Date picker (default: 02/15/2026)
10. **PICKUP WINDOW** - Select dropdown:
    - 7:00am–9:00am
    - 9:00am–11:00am
    - 11:00am–1:00pm
    - 7:00pm–9:00pm
11. **DELIVERY DATE (OPTIONAL)** - Date picker
12. **DELIVERY WINDOW (OPTIONAL)** - Select dropdown:
    - Same as pickup
    - 7:00am–9:00am
    - 9:00am–11:00am
    - 11:00am–1:00pm
    - 7:00pm–9:00pm
13. **Create Order** button

## Required Mapping from BLDG.chat:

- **phone** → PHONE (E.164 format, need to get from user profile or booking)
- **firstName + lastName** → FIRST NAME + LAST NAME (need to get from user profile)
- **unit** → UNIT (need to get from user profile or booking)
- **address** → ADDRESS (Opus LA address - hardcoded or from building config)
- **scheduledDate** → PICKUP DATE
- **scheduledWindow** → PICKUP WINDOW (need to map time format)
- **notes** → SPECIAL INSTRUCTIONS (from "Any details..." chip)
- **serviceType** → SERVICE (map "laundry" → "Wash & Fold")
- **status** → (implicit: "confirmed" when created)

## Next Steps:

1. Find the API endpoint that this form submits to
2. Understand the request payload format
3. Implement server-side call from bldg-chat to ops API
4. Handle authentication/authorization for cross-project API calls
