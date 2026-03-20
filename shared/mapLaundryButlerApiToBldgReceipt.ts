/**
 * Back-compat path — prefer importing from
 * `@shared/receipt/vendors/laundry_butler/mapOrderReceiptToBldg`.
 */
export {
  mapLbOrderReceiptJsonToBldgReceipt,
  mapLbOrderReceiptJsonToBldgReceipt as mapLaundryButlerApiToBldgReceipt,
  type LbOrderReceiptJson,
  type MapLbOrderReceiptToBldgOptions,
  orderPlacedDisplayIsMissing,
} from "./receipt/vendors/laundry_butler/mapOrderReceiptToBldg";
