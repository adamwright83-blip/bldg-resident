/** Single source of truth for resident-visible proposal copy. Truth strings here must match the admin-api contract verbatim. */
export const PROPOSAL_COPY = {
  /** Reserved for the future approval-mutation slice. Do not render as a button in the read-only slice. */
  ctaPrimary: "Let HELD try to book this",
  /** Reserved alongside ctaPrimary -- was paired with the CTA button, do not render without it. */
  ctaReassurance: "Nothing is confirmed until the provider accepts.",
  helperPending: "HELD will ask before trying to book.",
  availability: "Available, not booked",
  disclaimer: "Nothing is confirmed until provider acceptance is verified",
  notFound: "This proposal is no longer available.",
  loadFailed: "We couldn't load this right now.",
} as const;
