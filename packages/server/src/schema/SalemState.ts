import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Player } from "./Player";

export class SalemState extends Schema {
  @type("string") gamePhase: string = "lobby";
  @type("string") currentPlayerId: string = "";
  @type("number") timer: number = 0;
  @type("boolean") isPaused: boolean = false;
  @type("string") coordinatorId: string = "";
  @type("number") round: number = 0;
  @type("number") deckRemaining: number = 0;
  @type("boolean") currentTurnCanEnd: boolean = false;
  @type("string") blackCatOwnerId: string = "";
  @type("boolean") isNightKillResolved: boolean = false;
  @type("string") roomCode: string = "";
  @type("string") tryalTargetId: string = "";
  @type("string") tryalChooserId: string = "";

  @type({ map: Player }) players = new MapSchema<Player>();
  @type(["string"]) gameLog = new ArraySchema<string>();
}
