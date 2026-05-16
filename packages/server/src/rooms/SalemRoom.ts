import { Room, Client } from "colyseus";
import { StateView } from "@colyseus/schema";
import { SalemState } from "../schema/SalemState";
import { Player } from "../schema/Player";
import { GameEngine } from "../game/GameEngine";
import {
  CardType,
  MIN_PLAYERS,
  MAX_PLAYERS,
  ROOM_CODE_LENGTH,
  RECONNECT_TIMEOUT,
} from "../../../shared/src";

interface JoinOptions {
  name: string;
  roomCode?: string;
}

export interface RoomLookup {
  roomId: string;
  clients: number;
  maxClients: number;
  locked: boolean;
  room?: SalemRoom;
}

const roomCodeRegistry = new Map<string, SalemRoom>();

export function getRoomByCode(roomCode: string): RoomLookup | null {
  const room = roomCodeRegistry.get(roomCode.toUpperCase());
  if (!room) return null;

  return {
    roomId: room.roomId,
    clients: room.clients.length,
    maxClients: room.maxClients,
    locked: room.locked,
    room,
  };
}

// Room code charset: no ambiguous chars (0/O, 1/I/L)
const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export class SalemRoom extends Room<SalemState> {
  private engine: GameEngine | null = null;
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private playerSessionMap: Map<string, string> = new Map(); // sessionId -> playerId

  onCreate(): void {
    const state = new SalemState();
    state.roomCode = generateRoomCode();
    this.setState(state);
    roomCodeRegistry.set(state.roomCode, this);

    this.maxClients = MAX_PLAYERS;
    this.autoDispose = false;

    this.registerMessageHandlers();
  }

  getEngine(): GameEngine | null {
    return this.engine;
  }

  onJoin(client: Client, options: JoinOptions): void {
    const playerId = client.sessionId;
    const playerName = sanitizeName(options?.name, this.state.players.size);

    // Check if this is a reconnection
    for (const [existingSessionId, existingPlayerId] of this.playerSessionMap) {
      const existingPlayer = this.state.players.get(existingPlayerId);
      if (existingPlayer && existingPlayer.name === playerName && !existingPlayer.isConnected) {
        // Reconnection
        existingPlayer.isConnected = true;
        existingPlayer.sessionId = client.sessionId;
        this.playerSessionMap.delete(existingSessionId);
        this.playerSessionMap.set(client.sessionId, existingPlayerId);

        // Clear reconnect timer
        const timer = this.reconnectTimers.get(existingPlayerId);
        if (timer) {
          clearTimeout(timer);
          this.reconnectTimers.delete(existingPlayerId);
        }

        // Set up StateView for reconnected client
        this.setupClientView(client, existingPlayer);

        return;
      }
    }

    // New player joining
    if (this.state.gamePhase !== "lobby") {
      client.leave(4000); // Game already started
      return;
    }

    const player = new Player();
    player.id = playerId;
    player.name = playerName;
    player.seatIndex = this.state.players.size;
    player.sessionId = client.sessionId;

    // First player is host
    if (this.state.players.size === 0) {
      player.isHost = true;
    }

    this.state.players.set(playerId, player);
    this.playerSessionMap.set(client.sessionId, playerId);

    // Set up StateView so the player can see their private data
    this.setupClientView(client, player);
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
    const playerId = this.playerSessionMap.get(client.sessionId);
    if (!playerId) return;

    const player = this.state.players.get(playerId);
    if (!player) return;

    if (this.state.gamePhase === "lobby") {
      // In lobby: remove player entirely
      this.state.players.delete(playerId);
      this.playerSessionMap.delete(client.sessionId);

      // Reassign host if needed
      if (player.isHost && this.state.players.size > 0) {
        const firstPlayer = this.getFirstPlayer();
        if (firstPlayer) {
          firstPlayer.isHost = true;
        }
      }

      // Reassign seat indices
      let seatIdx = 0;
      this.state.players.forEach((p) => {
        p.seatIndex = seatIdx++;
      });

      return;
    }

    // During game: mark as disconnected and allow reconnection
    player.isConnected = false;

    if (!consented) {
      // Allow reconnection within timeout
      const timer = setTimeout(() => {
        // Timeout expired: treat as permanent leave
        this.reconnectTimers.delete(playerId);
        // Player remains in game but marked as disconnected
        // The game continues without them (auto-actions on timeout)
      }, RECONNECT_TIMEOUT * 1000);

      this.reconnectTimers.set(playerId, timer);
    }
  }

  onDispose(): void {
    if (this.state.roomCode) {
      roomCodeRegistry.delete(this.state.roomCode);
    }

    // Clean up
    if (this.engine) {
      this.engine.dispose();
    }

    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();
  }

  private setupClientView(client: Client, player: Player): void {
    const view = new StateView();
    view.add(player);
    client.view = view;
  }

  private registerMessageHandlers(): void {
    this.onMessage("ready", (client) => {
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;

      const player = this.state.players.get(playerId);
      if (!player) return;

      player.isReady = !player.isReady;
    });

    this.onMessage("start_game", (client, message) => {
      if (this.state.gamePhase !== "lobby" || this.engine) return;

      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;

      const player = this.state.players.get(playerId);
      if (!player || !player.isHost) return;

      if (this.state.players.size < MIN_PLAYERS) return;

      // Check all players are ready
      let allReady = true;
      this.state.players.forEach((p) => {
        if (!p.isReady && !p.isHost) {
          allReady = false;
        }
      });
      if (!allReady) return;

      // Set coordinator. Default to host when the lobby selection is empty.
      const coordinatorId = message?.coordinatorId;
      this.state.coordinatorId =
        coordinatorId && this.state.players.has(coordinatorId)
          ? coordinatorId
          : playerId;

      this.state.players.forEach((p) => {
        p.isCoordinator = p.id === this.state.coordinatorId;
      });

      // Initialize game engine
      this.engine = new GameEngine(
        this.state,
        (type, data) => this.broadcast(type, data),
        (targetPlayerId, type, data) => {
          // Find client by player ID
          for (const c of this.clients) {
            const cPlayerId = this.playerSessionMap.get(c.sessionId);
            if (cPlayerId === targetPlayerId) {
              c.send(type, data);
              break;
            }
          }
        }
      );

      this.engine.startGame();
    });

    this.onMessage("play_cards", (client, message) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;

      const cards = message?.cards as CardType[] | undefined;
      const targetId = message?.targetId as string | undefined;
      const secondaryTargetId = message?.secondaryTargetId as string | undefined;

      if (!cards || !targetId || cards.length === 0) return;

      this.engine.handlePlayCards(playerId, cards, targetId, secondaryTargetId);
    });

    this.onMessage("draw_cards", (client) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;

      this.engine.handleDrawCards(playerId);
    });

    this.onMessage("end_turn", (client) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;

      this.engine.handleEndTurn(playerId);
    });

    this.onMessage("choose_tryal_card", (client, message) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;

      const targetId = message?.targetId as string | undefined;
      const cardIndex = message?.cardIndex as number | undefined;

      if (!targetId || cardIndex === undefined) return;

      this.engine.handleChooseTryalCard(playerId, targetId, cardIndex);
    });

    this.onMessage("witch_place_blackcat", (client, message) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;

      const targetId = message?.targetId as string | undefined;
      if (!targetId) return;

      this.engine.handleWitchPlaceBlackCat(playerId, targetId);
    });

    this.onMessage("witch_kill", (client, message) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;

      const targetId = message?.targetId as string | undefined;
      if (!targetId) return;

      this.engine.handleWitchKill(playerId, targetId);
    });

    this.onMessage("witch_vote", (client, message) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;

      const targetId = message?.targetId as string | undefined;
      if (!targetId) return;

      this.engine.handleWitchVote(playerId, targetId);
    });

    this.onMessage("witch_confirm", (client) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;

      this.engine.handleWitchConfirm(playerId);
    });

    this.onMessage("constable_protect", (client, message) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;

      const targetId = message?.targetId as string | undefined;
      if (!targetId) return;

      this.engine.handleConstableProtect(playerId, targetId);
    });

    this.onMessage("confess", (client, message) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;

      const cardIndex = message?.cardIndex as number | undefined;
      if (cardIndex === undefined) return;

      this.engine.handleConfess(playerId, cardIndex);
    });

    this.onMessage("conspiracy_pass", (client, message) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;

      const cardIndex = message?.cardIndex as number | undefined;
      if (cardIndex === undefined) return;

      this.engine.handleConspiracyPass(playerId, cardIndex);
    });

    this.onMessage("use_character_skill", (client, message) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;

      this.engine.handleUseCharacterSkill(playerId, {
        cardCount: message?.cardCount as number | undefined,
        cardIndexes: message?.cardIndexes as number[] | undefined,
        deckOrder: message?.deckOrder as CardType[] | undefined,
        targetId: message?.targetId as string | undefined,
      });
    });

    // Coordinator messages
    this.onMessage("coordinator_pause", (client) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;
      this.engine.pauseGame(playerId);
    });

    this.onMessage("coordinator_resume", (client) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;
      this.engine.resumeGame(playerId);
    });

    this.onMessage("coordinator_extend_time", (client, message) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;

      const seconds = message?.seconds as number | undefined;
      if (!seconds) return;

      this.engine.extendTime(playerId, seconds);
    });

    this.onMessage("coordinator_skip_phase", (client) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;
      this.engine.skipPhase(playerId);
    });

    this.onMessage("coordinator_end_timer", (client) => {
      if (!this.engine) return;
      const playerId = this.playerSessionMap.get(client.sessionId);
      if (!playerId) return;
      this.engine.endTimer(playerId);
    });
  }

  private getFirstPlayer(): Player | undefined {
    let first: Player | undefined;
    this.state.players.forEach((player) => {
      if (!first) first = player;
    });
    return first;
  }
}

function sanitizeName(name: string | undefined, fallbackIndex: number): string {
  const trimmed = name?.trim().slice(0, 12);
  return trimmed || `Player ${fallbackIndex + 1}`;
}
