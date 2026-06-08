interface SessionState {
  gameId: number;
  startTime: number;
}

const activeSessions: Record<string, SessionState> = {};

export function startGameSession(gameId: number): string {
  const sessionId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  activeSessions[sessionId] = {
    gameId,
    startTime: Date.now(),
  };

  // Trigger play count increment asynchronously
  fetch(`/api/games/play/${gameId}`, { method: "POST" }).catch(err =>
    console.warn("Could not increment play count via API:", err)
  );

  return sessionId;
}

export function getSessionDuration(sessionId: string): number {
  const session = activeSessions[sessionId];
  if (!session) return 0;
  return Math.max(0, Math.round((Date.now() - session.startTime) / 1000));
}

export async function endAndTrackSession(
  sessionId: string,
  completed: boolean,
  score?: number
): Promise<boolean> {
  const session = activeSessions[sessionId];
  if (!session) return false;

  const durationSeconds = Math.max(1, Math.round((Date.now() - session.startTime) / 1000));
  const gameId = session.gameId;

  delete activeSessions[sessionId];

  try {
    const res = await fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId,
        sessionId,
        durationSeconds,
        completed,
        score,
      }),
    });
    return res.ok;
  } catch (error) {
    console.warn("Failed to send gameplay telemetry:", error);
    return false;
  }
}
