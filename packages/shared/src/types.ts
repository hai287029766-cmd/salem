export type GamePhase =
  | "lobby"
  | "dealing"
  | "dawn"
  | "day_turn"
  | "tryal"
  | "conspiracy"
  | "night_witch"
  | "night_constable"
  | "night_confess"
  | "night_resolve"
  | "game_over";

export type CardColor = "red" | "green" | "blue" | "black";

export type CardType =
  | "accusation"
  | "evidence"
  | "witness"
  | "alibi"
  | "stocks"
  | "robbery"
  | "scapegoat"
  | "curse"
  | "piety"
  | "asylum"
  | "matchmaker"
  | "black_cat"
  | "night"
  | "conspiracy";

export type TryalCardType = "witch" | "not_witch" | "constable";

export type CharacterName =
  | "samuel_parris"
  | "thomas_danforth"
  | "tituba"
  | "john_proctor"
  | "mary_warren"
  | "george_burroughs"
  | "will_griggs"
  | "cotton_mather";

export interface CardDefinition {
  type: CardType;
  color: CardColor;
  nameCn: string;
  nameEn: string;
  description: string;
  accusationValue?: number;
}

export interface CharacterDefinition {
  name: CharacterName;
  nameCn: string;
  nameEn: string;
  ability: string;
}

export interface TryalCardInfo {
  type: TryalCardType;
  faceUp: boolean;
}

export type Winner = "townspeople" | "witches";

export interface PlayerReveal {
  playerId: string;
  name: string;
  isWitch: boolean;
  isConstable: boolean;
  character: CharacterName;
}
