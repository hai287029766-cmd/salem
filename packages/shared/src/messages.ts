import { CardType, GamePhase, TryalCardType } from "./types";

export type ClientMessage =
  | { type: "ready" }
  | { type: "start_game"; coordinatorId?: string }
  | { type: "play_cards"; cards: CardType[]; targetId: string; secondaryTargetId?: string }
  | { type: "draw_cards" }
  | { type: "end_turn" }
  | { type: "choose_tryal_card"; targetId: string; cardIndex: number }
  | { type: "witch_place_blackcat"; targetId: string }
  | { type: "witch_kill"; targetId: string }
  | { type: "witch_vote"; targetId: string }
  | { type: "witch_confirm" }
  | { type: "constable_protect"; targetId: string }
  | { type: "confess"; cardIndex: number }
  | { type: "decline_confess" }
  | { type: "conspiracy_pass"; cardIndex: number }
  | {
      type: "use_character_skill";
      cardCount?: number;
      cardIndexes?: number[];
      deckOrder?: CardType[];
      targetId?: string;
    }
  | { type: "coordinator_pause" }
  | { type: "coordinator_resume" }
  | { type: "coordinator_extend_time"; seconds: number }
  | { type: "coordinator_skip_phase" }
  | { type: "coordinator_end_timer" };

export type ServerEvent =
  | { type: "phase_change"; phase: GamePhase; data?: Record<string, unknown> }
  | { type: "card_revealed"; playerId: string; cardType: TryalCardType; cardIndex: number }
  | { type: "player_killed"; playerId: string; playerName: string; reason: string }
  | { type: "game_over"; winner: "townspeople" | "witches" }
  | { type: "sound_effect"; sound: SoundType }
  | { type: "night_resolve_result"; killed: { id: string; name: string; reason: string } | null; protected: string | null; confessed: string | null; asylum: string | null; noTarget: boolean; matchmakerKilled: { id: string; name: string } | null }
  | { type: "your_role"; isWitch: boolean; isConstable: boolean; witchPartners?: string[] }
  | { type: "character_skill_result"; skill: string; deck?: CardType[]; availableCards?: CardType[]; targetId?: string; message?: string }
  | { type: "witch_vote_update"; votes: Record<string, string>; confirmed: string[]; voteCounts: Record<string, number>; witchPlayerIds: string[] }
  | { type: "paused"; by: string }
  | { type: "resumed"; by: string }
  | { type: "timer_extended"; seconds: number }
  | { type: "log"; message: string }
  | { type: "constable_auto_protect"; targetName: string }
  | { type: "constable_phase_info"; lastProtectedName: string }
  | { type: "draw_result"; count: number }
  | { type: "role_changed"; gained?: string; lost?: string; message: string }
  | { type: "protection_result"; saved: boolean; targetName?: string }
  | { type: "action_rejected"; message: string };

export type SoundType =
  | "card_flip"
  | "card_play"
  | "card_draw"
  | "card_deal"
  | "night_begin"
  | "dawn"
  | "gavel"
  | "death"
  | "tick"
  | "victory"
  | "witch_kill";
