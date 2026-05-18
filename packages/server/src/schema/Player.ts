import { Schema, type, ArraySchema, view } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("number") seatIndex: number = -1;
  @type("boolean") isAlive: boolean = true;
  @type("boolean") isReady: boolean = false;
  @type("boolean") isHost: boolean = false;
  @type("string") characterName: string = "";
  @type("string") characterAbility: string = "";
  @type("number") accusationPoints: number = 0;
  @type("boolean") hasStocks: boolean = false;
  @type("boolean") hasAsylum: boolean = false;
  @type("boolean") hasPiety: boolean = false;
  @type("boolean") hasMatchmaker: boolean = false;
  @type("boolean") hasBlackCat: boolean = false;
  @type("number") handCardCount: number = 0;
  @type("number") tryalCardCount: number = 0;
  @type("number") tryalCardFaceUp: number = 0;
  @type("boolean") isCoordinator: boolean = false;
  @type("number") samuelParrisUsesRemainingPublic: number = 2;
  @type("boolean") titubaUsedPublic: boolean = false;

  // Private fields: only visible to the owning client via StateView
  @view() @type(["string"]) handCards = new ArraySchema<string>();
  @view() @type(["string"]) tryalCards = new ArraySchema<string>();

  // Public reconstruction of tryal card slots. Face-down cards hide their type.
  @type(["string"]) publicTryalCards = new ArraySchema<string>();

  // Server-only fields (not synchronized to any client)
  // These use non-decorated properties
  hasBeenWitch: boolean = false;
  hasBeenConstable: boolean = false;
  isConstable: boolean = false;
  isWitch: boolean = false;
  stocksCount: number = 0;
  matchmakerPartnerId: string = "";
  sessionId: string = "";
  isConnected: boolean = true;

  // Character ability usage tracking
  samuelParrisUsesRemaining: number = 2;
  titubaUsed: boolean = false;
}
