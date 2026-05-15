import {
  CardType,
  DECK_COMPOSITION,
  TRYAL_CARD_DISTRIBUTION,
  TryalCardType,
  HAND_SIZE_INITIAL,
} from "../../../shared/src";
import { Player } from "../schema/Player";

export interface TryalCard {
  type: TryalCardType;
  faceUp: boolean;
}

/**
 * Manages the Salem deck, discard pile, and tryal card distribution.
 */
export class CardDeck {
  private deck: CardType[] = [];
  private discardPile: CardType[] = [];
  private tryalCards: Map<string, TryalCard[]> = new Map();

  /**
   * Build the initial Salem deck according to DECK_COMPOSITION.
   * Black Cat, Night, and Conspiracy are handled separately per rules.
   */
  buildInitialDeck(): void {
    this.deck = [];
    this.discardPile = [];

    const excludeFromInitialDeck: CardType[] = ["black_cat", "night", "conspiracy"];

    for (const [cardType, count] of Object.entries(DECK_COMPOSITION)) {
      if (excludeFromInitialDeck.includes(cardType as CardType)) {
        continue;
      }
      for (let i = 0; i < count; i++) {
        this.deck.push(cardType as CardType);
      }
    }

    this.shuffle(this.deck);
  }

  /**
   * Deal initial hand cards to each player (3 cards each).
   * If a player draws a Conspiracy card during dealing, reshuffle and redeal.
   */
  dealInitialHands(players: Player[]): Map<string, CardType[]> {
    const hands = new Map<string, CardType[]>();

    for (const player of players) {
      const hand: CardType[] = [];
      for (let i = 0; i < HAND_SIZE_INITIAL; i++) {
        const card = this.drawTop();
        if (card !== null) {
          hand.push(card);
        }
      }
      hands.set(player.id, hand);
    }

    return hands;
  }

  /**
   * After dealing initial hands, shuffle Conspiracy back into the deck
   * and place Night at the bottom.
   */
  finalizeInitialDeck(): void {
    // Add Conspiracy and shuffle it in
    this.deck.push("conspiracy");
    this.shuffle(this.deck);

    // Place Night at the very bottom
    this.deck.unshift("night");
  }

  /**
   * Deal tryal cards to players based on player count.
   * Returns a map of playerId -> TryalCard[].
   */
  dealTryalCards(players: Player[]): Map<string, TryalCard[]> {
    const playerCount = players.length;
    const distribution = TRYAL_CARD_DISTRIBUTION[playerCount];
    if (!distribution) {
      throw new Error(`Unsupported player count for tryal cards: ${playerCount}`);
    }

    const tryalPool: TryalCardType[] = [];

    for (let i = 0; i < distribution.notWitch; i++) {
      tryalPool.push("not_witch");
    }
    for (let i = 0; i < distribution.witch; i++) {
      tryalPool.push("witch");
    }
    for (let i = 0; i < distribution.constable; i++) {
      tryalPool.push("constable");
    }

    this.shuffle(tryalPool);

    const result = new Map<string, TryalCard[]>();
    let poolIndex = 0;

    for (const player of players) {
      const cards: TryalCard[] = [];
      for (let i = 0; i < distribution.perPlayer; i++) {
        if (poolIndex < tryalPool.length) {
          cards.push({ type: tryalPool[poolIndex], faceUp: false });
          poolIndex++;
        }
      }
      result.set(player.id, cards);
    }

    this.tryalCards = result;
    return result;
  }

  /**
   * Draw a card from the top of the deck.
   * Returns null if deck is empty.
   */
  drawTop(): CardType | null {
    if (this.deck.length === 0) {
      this.recycleDiscardPileIntoDeck();
    }

    if (this.deck.length === 0) {
      return null;
    }
    return this.deck.pop() ?? null;
  }

  /**
   * Draw two cards for a player's draw action.
   * Handles black cards (Night, Conspiracy) by returning them separately.
   */
  drawCards(count: number, twoPlayerMode: boolean): { normalCards: CardType[]; blackCards: CardType[] } {
    const normalCards: CardType[] = [];
    const blackCards: CardType[] = [];

    for (let i = 0; i < count; i++) {
      let card = this.drawTop();
      if (card === null) break;

      // In two-player endgame, skip blue cards
      if (twoPlayerMode) {
        while (card !== null && isBlueCard(card)) {
          this.discardPile.push(card);
          card = this.drawTop();
        }
        if (card === null) break;
      }

      if (card === "night" || card === "conspiracy") {
        blackCards.push(card);
      } else {
        normalCards.push(card);
      }
    }

    return { normalCards, blackCards };
  }

  /**
   * Add cards to the discard pile.
   */
  discard(cards: CardType[]): void {
    this.discardPile.push(...cards);
  }

  /**
   * Rebuild deck after night phase:
   * 1. Combine remaining deck cards + discard pile
   * 2. Remove Night and Conspiracy
   * 3. Shuffle
   * 4. Add Conspiracy shuffled in
   * 5. Place Night at the bottom
   */
  rebuildDeck(): void {
    // Merge remaining deck and discard pile
    const allCards = [...this.deck, ...this.discardPile];
    this.discardPile = [];

    // Remove Night and Conspiracy
    const filtered = allCards.filter((c) => c !== "night" && c !== "conspiracy");

    this.deck = filtered;
    this.shuffle(this.deck);

    // Shuffle Conspiracy back in
    this.deck.push("conspiracy");
    this.shuffle(this.deck);

    // Place Night at the bottom
    this.deck.unshift("night");
  }

  /**
   * Prepare the Salem deck before dealing fresh hands after night.
   * Night and Conspiracy must not be dealt into player hands; they are added
   * back only after every living player receives their new three-card hand.
   */
  prepareForNewDayHands(): void {
    const allCards = [...this.deck, ...this.discardPile];
    this.discardPile = [];
    this.deck = allCards.filter((c) => c !== "night" && c !== "conspiracy");
    this.shuffle(this.deck);
  }

  /**
   * Deal new hands to surviving players after night phase.
   */
  dealNewHands(players: Player[]): Map<string, CardType[]> {
    const hands = new Map<string, CardType[]>();

    for (const player of players) {
      if (!player.isAlive) continue;
      const hand: CardType[] = [];
      for (let i = 0; i < HAND_SIZE_INITIAL; i++) {
        const card = this.drawTop();
        if (card !== null) {
          hand.push(card);
        }
      }
      hands.set(player.id, hand);
    }

    return hands;
  }

  getDeckSize(): number {
    return this.deck.length;
  }

  getDiscardPileSize(): number {
    return this.discardPile.length;
  }

  getDiscardPile(): CardType[] {
    return [...this.discardPile];
  }

  /**
   * For Tituba's ability: get the entire deck for viewing/rearranging.
   */
  getDeck(): CardType[] {
    return [...this.deck];
  }

  /**
   * For Tituba's ability: replace the deck with a rearranged version.
   */
  setDeck(newDeck: CardType[]): void {
    this.deck = [...newDeck];
  }

  /**
   * Test helper: move one copy of a card to the top of the draw pile.
   * drawTop() pops from the end, so "top" means the end of this array.
   */
  putOnTop(card: CardType): void {
    const deckIndex = this.deck.indexOf(card);
    if (deckIndex !== -1) {
      this.deck.splice(deckIndex, 1);
    } else {
      const discardIndex = this.discardPile.indexOf(card);
      if (discardIndex !== -1) {
        this.discardPile.splice(discardIndex, 1);
      }
    }
    this.deck.push(card);
  }

  /**
   * For Samuel Parris: draw cards from discard pile.
   */
  drawFromDiscard(count: number): CardType[] {
    const drawn: CardType[] = [];
    for (let i = 0; i < count && this.discardPile.length > 0; i++) {
      const card = this.discardPile.pop();
      if (card !== undefined) {
        drawn.push(card);
      }
    }
    return drawn;
  }

  private recycleDiscardPileIntoDeck(): void {
    if (this.discardPile.length === 0) return;

    const discarded = [...this.discardPile];
    this.discardPile = [];

    const hasNight = discarded.includes("night");
    const hasConspiracy = discarded.includes("conspiracy");
    this.deck = discarded.filter((card) => card !== "night" && card !== "conspiracy");
    this.shuffle(this.deck);

    if (hasConspiracy) {
      this.deck.push("conspiracy");
      this.shuffle(this.deck);
    }

    if (hasNight) {
      this.deck.unshift("night");
    }
  }

  /**
   * Fisher-Yates shuffle.
   */
  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  }
}

function isBlueCard(card: CardType): boolean {
  return card === "piety" || card === "asylum" || card === "matchmaker" || card === "black_cat";
}
