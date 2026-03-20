export class UnsupportedReceiptVendorError extends Error {
  constructor(public readonly vendorId: string) {
    super(`Receipt vendor not supported: ${vendorId}`);
    this.name = "UnsupportedReceiptVendorError";
  }
}
