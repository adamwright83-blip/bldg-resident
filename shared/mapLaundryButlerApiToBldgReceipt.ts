/**
 * Back-compat path — prefer importing from
 * `@shared/receipt/vendors/laundry_butler/mapOrderReceiptToBldg`.
 */
export {
  mapLbOrderReceiptJsonToBldgReceipt,
  type LbOrderReceiptJson,
  type MapLbOrderReceiptToBldgOptions,
  orderPlacedDisplayIsMissing,
} from "./receipt/vendors/laundry_butler/mapOrderReceiptToBldg";
