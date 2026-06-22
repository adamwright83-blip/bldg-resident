import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { PROPOSAL_COPY } from "@/lib/proposalCopy";
import { isProposalExpired } from "./vendorProposalCardLogic";
import type { VendorProposalCardData } from "./vendorProposalTypes";

interface VendorProposalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: VendorProposalCardData | null;
  notFound?: boolean;
}

/**
 * Full-detail proposal sheet. This is the only place the real consent CTA
 * renders -- the compact VendorProposalCard stays passive on purpose, since
 * it lives in a scrollable list and a deliberate detail view is the safer
 * place for a resident-triggered write.
 */
export default function VendorProposalSheet({ open, onOpenChange, proposal, notFound }: VendorProposalSheetProps) {
  const approveMutation = trpc.proposals.approve.useMutation();

  if (notFound) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="vpc-sheet">
          <SheetHeader>
            <SheetTitle>Proposal</SheetTitle>
          </SheetHeader>
          <div className="vpc-expired-label">{PROPOSAL_COPY.notFound}</div>
        </SheetContent>
      </Sheet>
    );
  }
  if (!proposal) return null;
  const isExpired = isProposalExpired(proposal.proposal_expiry);

  const hasApprovedThisProposal = approveMutation.isSuccess
    && approveMutation.data?.versionId === proposal.proposal_version_id;
  const approveFailedThisProposal = approveMutation.isError
    && approveMutation.variables?.versionId === proposal.proposal_version_id;
  const approveNotAllowed = approveFailedThisProposal && approveMutation.error?.data?.code === "NOT_FOUND";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="vpc-sheet">
        <SheetHeader>
          <SheetTitle>{proposal.vendor_display_name}</SheetTitle>
          <SheetDescription>{proposal.service_label}</SheetDescription>
        </SheetHeader>

        <div className="vpc-card" style={{ boxShadow: "none", maxWidth: "none" }}>
          <div className="vpc-summary">{proposal.resident_safe_summary}</div>

          {proposal.offered_window && (
            <div className="vpc-row"><span>When</span><span>{proposal.offered_window.label}</span></div>
          )}
          {proposal.quoted_price && (
            <div className="vpc-row"><span>Quote</span><span>{proposal.quoted_price.label}</span></div>
          )}
          {proposal.truth_language.availability && (
            <div className="vpc-row"><span>Status</span><span>{proposal.truth_language.availability}</span></div>
          )}
          {proposal.vendor_source_display_type && (
            <div className="vpc-row"><span>Source</span><span>{proposal.vendor_source_display_type}</span></div>
          )}

          {proposal.fit && <div className="vpc-fit">{proposal.fit.sentence}</div>}
          {proposal.reputation && <div className="vpc-reputation">{proposal.reputation.summary}</div>}

          {isExpired ? (
            <div className="vpc-expired-label">This offer has expired</div>
          ) : hasApprovedThisProposal ? (
            <div className="vpc-cta-reassurance">{PROPOSAL_COPY.consentRecordedNotice}</div>
          ) : approveNotAllowed ? (
            <div className="vpc-expired-label">{PROPOSAL_COPY.consentUnavailableNotice}</div>
          ) : approveFailedThisProposal ? (
            <div className="vpc-expired-label">{PROPOSAL_COPY.consentFailedNotice}</div>
          ) : proposal.cta.visible ? (
            <>
              <button
                className="vpc-cta"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate({ versionId: proposal.proposal_version_id })}
              >
                {PROPOSAL_COPY.ctaPrimary}
              </button>
              <div className="vpc-cta-reassurance">{PROPOSAL_COPY.ctaReassurance}</div>
            </>
          ) : null}

          <div className="vpc-disclaimer">{proposal.truth_language.disclaimer}.</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
