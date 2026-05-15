import {
  CharacterName,
  CHARACTER_DEFINITIONS,
  CharacterDefinition,
} from "../../../shared/src";

export interface CharacterAbilityContext {
  playerId: string;
  characterName: CharacterName;
}

/**
 * Get character definition by name.
 */
export function getCharacterDefinition(name: CharacterName): CharacterDefinition | undefined {
  return CHARACTER_DEFINITIONS.find((c) => c.name === name);
}

/**
 * Shuffle and assign characters to players.
 * Returns an array of character assignments in seat order.
 */
export function assignCharacters(playerCount: number): CharacterName[] {
  const available: CharacterName[] = CHARACTER_DEFINITIONS.map((c) => c.name);
  shuffleArray(available);
  return available.slice(0, playerCount);
}

/**
 * Get the accusation threshold for a player based on their character
 * and whether they have Piety.
 *
 * - Default: 7 points
 * - George Burroughs: 9 points
 * - With Piety: threshold is doubled (14 normally, 18 for Burroughs)
 */
export function getAccusationThreshold(characterName: CharacterName, hasPiety: boolean): number {
  let base = 7;
  if (characterName === "george_burroughs") {
    base = 9;
  }
  return hasPiety ? base * 2 : base;
}

/**
 * Thomas Danforth's ability: triggers tryal at 6 points instead of 7.
 * Returns the threshold at which Danforth can trigger an early tryal.
 */
export function getDanforthEarlyThreshold(hasPiety: boolean): number {
  const base = 6;
  return hasPiety ? base * 2 : base;
}

/**
 * Cotton Mather's ability: Evidence cards are worth 4 points instead of 3.
 */
export function getEvidenceValue(attackerCharacter: CharacterName): number {
  if (attackerCharacter === "cotton_mather") {
    return 4;
  }
  return 3;
}

/**
 * Will Griggs's ability: Alibi can be used as a 7-point Witness
 * against players with Piety.
 */
export function canUseAlibiAsWitness(
  attackerCharacter: CharacterName,
  targetHasPiety: boolean
): boolean {
  return attackerCharacter === "will_griggs" && targetHasPiety;
}

/**
 * Mary Warren's ability: immune to Matchmaker effect.
 */
export function isImmuneToMatchmaker(characterName: CharacterName): boolean {
  return characterName === "mary_warren";
}

/**
 * Samuel Parris's ability: draw from discard pile (2 uses total).
 */
export function canDrawFromDiscard(
  characterName: CharacterName,
  usesRemaining: number
): boolean {
  return characterName === "samuel_parris" && usesRemaining > 0;
}

/**
 * Tituba's ability: view and rearrange the deck (1 use total).
 */
export function canRearrangeDeck(
  characterName: CharacterName,
  hasUsed: boolean
): boolean {
  return characterName === "tituba" && !hasUsed;
}

/**
 * John Proctor's ability: loot a dead player's hand cards.
 */
export function canLootDeadPlayer(characterName: CharacterName): boolean {
  return characterName === "john_proctor";
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
}
