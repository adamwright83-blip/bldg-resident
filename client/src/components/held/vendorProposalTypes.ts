/** Mirrors the admin-api's resident-safe proposal contract verbatim. Never add fields beyond this. */
export type VendorProposalCardData = {
  proposal_id: string;
  proposal_version_id: string;
  service_category: string;
  service_label: string;
  resident_safe_summary: string;
  vendor_display_name: string;
  vendor_source_display_type: string | null;
  offered_window: { start: string; end: string; label: string } | null;
  quoted_price: { amount_cents: number; currency: string; label: string } | null;
  proposal_expiry: string;
  readiness: string;
  truth_language: { availability: string | null; authority: string; disclaimer: string };
  fit: { sentence: string } | null;
  reputation: { summary: string; source_display_type: string } | null;
  evidence_labels: string[];
  cta: { visible: boolean; primary_text: string; reassurance: string; authority_only: true };
};
