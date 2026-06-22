/** Single source of truth for resident-visible proposal copy. Truth strings here must match the admin-api contract verbatim. */
export const PROPOSAL_COPY = {
  /** The real consent button, rendered only in VendorProposalSheet. */
  ctaPrimary: "Let HELD try to book this",
  ctaReassurance: "Nothing is confirmed until the provider accepts.",
  /** Passive helper text shown only in the compact VendorProposalCard, which never renders the CTA itself. */
  helperPending: "HELD will ask before trying to book.",
  availability: "Available, not booked",
  disclaimer: "Nothing is confirmed until provider acceptance is verified",
  notFound: "This proposal is no longer available.",
  loadFailed: "We couldn't load this right now.",
  consentRecordedNotice: "HELD will try to book this.",
  consentUnavailableNotice: "This option is no longer available.",
  consentFailedNotice: "We couldn't send that — try again.",
} as const;
