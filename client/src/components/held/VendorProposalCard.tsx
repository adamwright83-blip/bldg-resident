import { PROPOSAL_COPY } from "@/lib/proposalCopy";
import { isProposalExpired } from "./vendorProposalCardLogic";
import type { VendorProposalCardData } from "./vendorProposalTypes";

interface VendorProposalCardProps {
  proposal: VendorProposalCardData;
  onOpen?: () => void;
}

/**
 * Passive, compact proposal card. Renders only the resident-safe contract
 * fields supplied by the backend -- never evidence IDs, hashes, raw JSON,
 * or admin-only fields, because this component never receives them.
 */
export default function VendorProposalCard({ proposal, onOpen }: VendorProposalCardProps) {
  const isExpired = isProposalExpired(proposal.proposal_expiry);

  return (
    <div className="vpc-card" onClick={onOpen} role={onOpen ? "button" : undefined} tabIndex={onOpen ? 0 : undefined}>
      <div className="vpc-eyebrow">{proposal.service_label}</div>
      <div className="vpc-vendor">{proposal.vendor_display_name}</div>
      <div className="vpc-summary">{proposal.resident_safe_summary}</div>

      {proposal.offered_window && (
        <div className="vpc-row">
          <span>When</span>
          <span>{proposal.offered_window.label}</span>
        </div>
      )}
      {proposal.quoted_price && (
        <div className="vpc-row">
          <span>Quote</span>
          <span>{proposal.quoted_price.label}</span>
        </div>
      )}
      {proposal.truth_language.availability && (
        <div className="vpc-row">
          <span>Status</span>
          <span>{proposal.truth_language.availability}</span>
        </div>
      )}

      {isExpired ? (
        <div className="vpc-expired-label">This offer has expired</div>
      ) : proposal.cta.visible ? (
        <div className="vpc-cta-reassurance">{PROPOSAL_COPY.helperPending}</div>
      ) : (
        <div className="vpc-disclaimer">{proposal.truth_language.disclaimer}.</div>
      )}
    </div>
  );
}
