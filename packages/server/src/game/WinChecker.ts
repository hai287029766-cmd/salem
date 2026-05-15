import { Player } from "../schema/Player";
import { TryalCard } from "./CardDeck";
import { Winner } from "../../../shared/src";

export interface WinCheckResult {
  gameOver: boolean;
  winner: Winner | null;
}

/**
 * Check win conditions for Salem 1692.
 *
 * Townspeople win: all Witch tryal cards (across ALL players, alive or dead) are face up.
 * Witches win: all non-witch players (players who have never held a witch card) are dead.
 */
export function checkWinConditions(
  players: Map<string, Player>,
  tryalCardMap: Map<string, TryalCard[]>
): WinCheckResult {
  // Check townspeople victory: all witch tryal cards are face up
  let allWitchCardsRevealed = true;
  let witchCardExists = false;

  for (const [, cards] of tryalCardMap) {
    for (const card of cards) {
      if (card.type === "witch") {
        witchCardExists = true;
        if (!card.faceUp) {
          allWitchCardsRevealed = false;
          break;
        }
      }
    }
    if (!allWitchCardsRevealed) break;
  }

  if (witchCardExists && allWitchCardsRevealed) {
    return { gameOver: true, winner: "townspeople" };
  }

  // Check witch victory: all non-witch players are dead
  // "Once a witch, always a witch" -- hasBeenWitch flag
  let aliveNonWitchExists = false;

  for (const [, player] of players) {
    if (player.isAlive && !player.hasBeenWitch) {
      aliveNonWitchExists = true;
      break;
    }
  }

  if (!aliveNonWitchExists) {
    return { gameOver: true, winner: "witches" };
  }

  return { gameOver: false, winner: null };
}

/**
 * Check if a player should die because all their tryal cards are face up.
 */
export function shouldPlayerDie(tryalCards: TryalCard[]): boolean {
  if (tryalCards.length === 0) return false;
  return tryalCards.every((card) => card.faceUp);
}
