function normalizeInstruction(value: string) {
  return value.replace(/\s+/g, " ").replace(/[. ]+$/, "").trim();
}

export function extractReturnByInstruction(text: string): string | null {
  const match = text.match(
    /\b(?:return|returned|bring(?:\s+it)?\s+back|have\s+it\s+returned)\s+(?:it\s+)?(?:by|before)\s+([^.;,\n]+)/i
  );
  if (!match?.[1]) return null;

  const deadline = normalizeInstruction(match[1]);
  return deadline ? `Return by ${deadline}.` : null;
}

export function buildHeldSpecialInstructions(
  requestText: string,
  existingInstruction?: string | null
) {
  const parts = [
    existingInstruction?.trim() || "",
    /test\s+order\s+only/i.test(requestText) ? "TEST ORDER ONLY." : "",
    /do\s+not\s+dispatch/i.test(requestText) ? "Do not dispatch." : "",
    extractReturnByInstruction(requestText) || "",
  ].filter(Boolean);

  return parts.length ? Array.from(new Set(parts)).join(" ") : undefined;
}

export function getHeldRequestPayloadFields(requestText: string) {
  return {
    rawRequest: requestText,
    cleanedRequest: requestText,
    displayRequest: requestText,
  };
}
