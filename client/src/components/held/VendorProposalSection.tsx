import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import VendorProposalCard from "./VendorProposalCard";
import VendorProposalSheet from "./VendorProposalSheet";
import type { VendorProposalCardData } from "./vendorProposalTypes";

/**
 * Passive proposal surface. Renders nothing when there are no proposals --
 * no empty-state chrome for a passive banner. Loading is a brief spinner
 * only, never a fake skeleton card. Network/auth failures fail silently
 * here (no internal error detail surfaced) since this is a passive banner,
 * not a primary navigation destination.
 */
export default function VendorProposalSection() {
  const { data, isLoading } = trpc.proposals.list.useQuery(undefined, { retry: false });
  const [openVersionId, setOpenVersionId] = useState<string | null>(null);

  const detailQuery = trpc.proposals.get.useQuery(
    { versionId: openVersionId ?? "" },
    { enabled: Boolean(openVersionId), retry: false },
  );

  if (isLoading) {
    return (
      <div className="vpc-section-loading">
        <Spinner />
      </div>
    );
  }

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  const detail: VendorProposalCardData | null = openVersionId && detailQuery.data
    ? (detailQuery.data as VendorProposalCardData)
    : null;
  const notFound = Boolean(openVersionId) && Boolean(detailQuery.error) && !detailQuery.isLoading;

  return (
    <div className="vpc-section">
      {items.map(item => (
        <VendorProposalCard
          key={item.proposal_version_id}
          proposal={item as VendorProposalCardData}
          onOpen={() => setOpenVersionId(item.proposal_version_id)}
        />
      ))}
      <VendorProposalSheet
        open={Boolean(openVersionId)}
        onOpenChange={isOpen => { if (!isOpen) setOpenVersionId(null); }}
        proposal={detail}
        notFound={notFound}
      />
    </div>
  );
}
