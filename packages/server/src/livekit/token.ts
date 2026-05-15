import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? "devsecret";

/**
 * Generate a LiveKit access token for a player to join a voice room.
 * Room name format: salem-{roomCode}
 */
export async function generateVoiceToken(
  roomCode: string,
  playerId: string,
  playerName: string
): Promise<string> {
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: playerId,
    name: playerName,
  });

  token.addGrant({
    room: `salem-${roomCode}`,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return await token.toJwt();
}
