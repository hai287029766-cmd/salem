import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { SalemRoom, getRoomByCode } from "./rooms/SalemRoom";
import { generateVoiceToken } from "./livekit/token";
import path from "path";
import { COLYSEUS_ROOM_NAME } from "../../shared/src";
import type { CardType } from "../../shared/src";

const PORT = Number(process.env.PORT ?? 2567);

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// LiveKit token endpoint
app.get("/api/livekit-config", (_req, res) => {
  res.json({
    data: {
      url: process.env.LIVEKIT_URL ?? "",
      available: Boolean(process.env.LIVEKIT_URL),
    },
  });
});

app.post("/api/livekit-token", async (req, res) => {
  try {
    const { roomCode, playerId, playerName } = req.body as {
      roomCode?: string;
      playerId?: string;
      playerName?: string;
    };

    if (!roomCode || !playerId || !playerName) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing required fields: roomCode, playerId, playerName",
        },
      });
      return;
    }

    const token = await generateVoiceToken(roomCode, playerId, playerName);
    res.json({ data: { token } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: {
        code: "TOKEN_GENERATION_ERROR",
        message: `Failed to generate LiveKit token: ${message}`,
      },
    });
  }
});

app.get("/api/rooms/:roomCode", (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const room = getRoomByCode(roomCode);

  if (!room) {
    res.status(404).json({
      error: {
        code: "ROOM_NOT_FOUND",
        message: "Room not found",
      },
    });
    return;
  }

  const { room: _room, ...publicRoom } = room;
  res.json({ data: { roomCode, ...publicRoom } });
});

if (process.env.SALEM_E2E === "1") {
  app.post("/api/test/rooms/:roomCode/top-card", (req, res) => {
    const roomCode = req.params.roomCode.toUpperCase();
    const lookup = getRoomByCode(roomCode);
    const card = req.body?.card as CardType | undefined;
    if (!lookup?.room || !card) {
      res.status(404).json({ error: { message: "Room or card not found" } });
      return;
    }

    lookup.room.getEngine()?.setTopDeckCardForTest(card);
    res.json({ data: { ok: true } });
  });

  app.post("/api/test/rooms/:roomCode/player-hand", (req, res) => {
    const roomCode = req.params.roomCode.toUpperCase();
    const lookup = getRoomByCode(roomCode);
    const playerId = req.body?.playerId as string | undefined;
    const cards = req.body?.cards as CardType[] | undefined;
    if (!lookup?.room || !playerId || !Array.isArray(cards)) {
      res.status(404).json({ error: { message: "Room, player, or cards not found" } });
      return;
    }

    const ok = lookup.room.getEngine()?.setPlayerHandForTest(playerId, cards) ?? false;
    res.json({ data: { ok } });
  });
}

// Serve static client files in production
// process.cwd() should be packages/server/ in both dev and prod
const clientDistPath = path.resolve(process.cwd(), "../client/dist");
app.use(express.static(clientDistPath));

// SPA fallback: serve index.html for non-API routes
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/colyseus")) {
    next();
    return;
  }
  res.sendFile(path.join(clientDistPath, "index.html"), (err) => {
    if (err) {
      next();
    }
  });
});

// Create HTTP server and Colyseus game server with WebSocket transport
const httpServer = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

// Register room
gameServer.define(COLYSEUS_ROOM_NAME, SalemRoom);

gameServer.listen(PORT).then(() => {
  console.log(`Salem 1692 server running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});
