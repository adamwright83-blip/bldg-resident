import { randomUUID } from "node:crypto";
import { getChatHistory } from "../db";

export interface ResidentAgentSession {
  sessionId: string;
  conversationId: string;
}

function readSessionFromMetadata(metadata: unknown): ResidentAgentSession | null {
  const agent = (metadata as any)?.residentAgent;
  if (
    agent &&
    typeof agent.sessionId === "string" &&
    typeof agent.conversationId === "string"
  ) {
    return {
      sessionId: agent.sessionId,
      conversationId: agent.conversationId,
    };
  }
  return null;
}

export async function getOrCreateResidentAgentSession(
  bldgUserId: number
): Promise<ResidentAgentSession> {
  const history = await getChatHistory(bldgUserId, 30);
  for (let i = history.length - 1; i >= 0; i--) {
    const existing = readSessionFromMetadata(history[i].metadata);
    if (existing) return existing;
  }

  return {
    sessionId: `resident-session-${randomUUID()}`,
    conversationId: `resident-conversation-${randomUUID()}`,
  };
}

export function withResidentAgentMetadata(
  session: ResidentAgentSession,
  metadata: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...metadata,
    residentAgent: {
      sessionId: session.sessionId,
      conversationId: session.conversationId,
    },
  };
}
