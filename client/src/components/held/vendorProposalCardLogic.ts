export function isProposalExpired(proposalExpiryIso: string, now: Date = new Date()): boolean {
  return new Date(proposalExpiryIso).getTime() <= now.getTime();
}
