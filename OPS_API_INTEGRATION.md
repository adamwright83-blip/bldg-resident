# Ops API Integration Plan

## Confirmed Working:
- Admin form creates orders successfully
- Orders appear in /driver view immediately (admin → driver sync confirmed)

## Integration Approach:

Since ops.bldg.chat is a tRPC app (same template as bldg-chat), the API endpoint is:
```
POST https://laundrybh-enmkipk9.manus.space/api/trpc/orders.create
```

## Required Setup:

1. **Add APP_SHARED_API_SECRET to bldg-chat**
   - Use `webdev_request_secrets` to add the secret
   - Value should match ops.bldg.chat's APP_SHARED_API_SECRET

2. **Create server-side API call in bldg-chat**
   - After booking confirmation, call ops API
   - Use APP_SHARED_API_SECRET for authentication
   - Map bldg-chat booking data to ops order format

## Payload Structure (from admin form):

```typescript
{
  phone: string,        // E.164 format: "+13235559999"
  firstName: string,
  lastName: string,
  email?: string,
  unit: string,
  address: string,
  specialInstructions?: string,
  serviceType: "wash-fold" | "dry-cleaning",
  pickupDate: string,   // "2026-02-15"
  pickupWindow: string, // "7:00am–9:00am" | "9:00am–11:00am" | "11:00am–1:00pm" | "7:00pm–9:00pm"
  deliveryDate?: string,
  deliveryWindow?: string
}
```

## Data Mapping:

From bldg-chat `service_requests` table:
- `scheduledDate` → `pickupDate`
- `scheduledWindow` → `pickupWindow` (need to map "7–10 AM" → "7:00am–9:00am")
- `serviceType` → `serviceType` ("laundry" → "wash-fold")
- `notes` → `specialInstructions`

From bldg-chat user profile (need to add these fields):
- User's phone → `phone`
- User's first/last name → `firstName`, `lastName`
- User's unit number → `unit`
- Building address (hardcoded: "10000 Santa Monica Blvd, Los Angeles, CA 90067") → `address`

## Next Steps:

1. Add `webdev_request_secrets` for APP_SHARED_API_SECRET
2. Add user profile fields (phone, firstName, lastName, unit) to bldg_users table
3. Create `server/opsIntegration.ts` helper to call ops API
4. Update booking confirmation logic to call ops API
5. Test end-to-end: bldg-chat booking → ops admin → ops driver
