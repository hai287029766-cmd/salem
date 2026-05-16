import {
  GamePhase,
  CardType,
  CARD_DEFINITIONS,
  TIMER_DEFAULTS,
  DRAW_COUNT,
  CharacterName,
} from "../../../shared/src";
import { SalemState } from "../schema/SalemState";
import { Player } from "../schema/Player";
import { CardDeck, TryalCard } from "./CardDeck";
import {
  assignCharacters,
  getCharacterDefinition,
  getAccusationThreshold,
  getDanforthEarlyThreshold,
  getEvidenceValue,
  canUseAlibiAsWitness,
  isImmuneToMatchmaker,
  canDrawFromDiscard,
  canRearrangeDeck,
  canLootDeadPlayer,
} from "./Characters";
import { checkWinConditions, shouldPlayerDie, WinCheckResult } from "./WinChecker";

export type BroadcastFn = (type: string, data: Record<string, unknown>) => void;
export type SendToPlayerFn = (playerId: string, type: string, data: Record<string, unknown>) => void;

export class GameEngine {
  private state: SalemState;
  private deck: CardDeck;
  private tryalCardMap: Map<string, TryalCard[]> = new Map();
  private broadcast: BroadcastFn;
  private sendToPlayer: SendToPlayerFn;

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private timerEndCallback: (() => void) | null = null;
  private timerPausedRemaining: number = 0;
  private dawnBlackCatPlacedBy: Set<string> = new Set();

  // Night phase state
  private witchKillTargetId: string = "";
  private constableProtectTargetId: string = "";
  private confessedPlayerIds: Set<string> = new Set();
  private witchVotes: Map<string, string> = new Map();
  private witchConfirmed: Set<string> = new Set();

  // Conspiracy state
  private conspiracyChoices: Map<string, number> = new Map();

  // Current turn state
  private hasPlayedCard: boolean = false;

  // Player order for turn rotation
  private playerOrder: string[] = [];
  private currentPlayerIndex: number = 0;

  // Front cards (accusation cards, blue cards in front of players)
  private frontCards: Map<string, CardType[]> = new Map();

  // Track matchmaker pairs
  private matchmakerHolders: string[] = [];

  // Track dead player hand for John Proctor looting
  private deadPlayerHand: Map<string, CardType[]> = new Map();

  constructor(
    state: SalemState,
    broadcast: BroadcastFn,
    sendToPlayer: SendToPlayerFn
  ) {
    this.state = state;
    this.deck = new CardDeck();
    this.broadcast = broadcast;
    this.sendToPlayer = sendToPlayer;
  }

  // -- Phase Transitions --

  startGame(): void {
    const players = this.getAlivePlayers();
    if (players.length < 4) return;

    this.state.round = 1;
    this.addLog("游戏已开始");

    // Assign characters
    const characters = assignCharacters(players.length);
    players.forEach((player, index) => {
      const charName = characters[index];
      const charDef = getCharacterDefinition(charName);
      player.characterName = charName;
      player.characterAbility = charDef?.ability ?? "";
    });

    // Deal tryal cards
    this.deck = new CardDeck();
    const tryalResult = this.deck.dealTryalCards(players);
    this.tryalCardMap = tryalResult;

    // Update player state from tryal cards
    for (const player of players) {
      const cards = tryalResult.get(player.id) ?? [];
      player.tryalCardCount = cards.length;
      player.tryalCardFaceUp = 0;

      // Serialize tryal cards to player's private view
      player.tryalCards.clear();
      for (const card of cards) {
        player.tryalCards.push(serializeTryalCard(card));
      }

      // Determine roles
      const hasWitch = cards.some((c) => c.type === "witch");
      const hasConstable = cards.some((c) => c.type === "constable");

      player.isWitch = hasWitch;
      player.hasBeenWitch = hasWitch;
      player.isConstable = hasConstable;
      player.samuelParrisUsesRemainingPublic = player.samuelParrisUsesRemaining;
      player.titubaUsedPublic = player.titubaUsed;

      this.frontCards.set(player.id, []);
      this.syncTryalCards(player.id);
    }

    // Build Salem deck and deal hands
    this.deck.buildInitialDeck();
    const hands = this.deck.dealInitialHands(players);

    for (const player of players) {
      const hand = hands.get(player.id) ?? [];
      player.handCards.clear();
      for (const card of hand) {
        player.handCards.push(card);
      }
      this.syncHandCount(player);
    }

    this.deck.finalizeInitialDeck();
    this.state.deckRemaining = this.deck.getDeckSize();

    // Send role info to each player
    for (const player of players) {
      this.sendRoleInfo(player.id);
    }

    // Set up player order by seat index
    this.playerOrder = players
      .sort((a, b) => a.seatIndex - b.seatIndex)
      .map((p) => p.id);

    this.state.currentTurnCanEnd = false;
    this.transitionTo("dealing");
  }

  private transitionTo(phase: GamePhase, resetDayTurnAction = true): void {
    this.clearTimer();
    this.state.gamePhase = phase;

    this.broadcast("phase_change", { phase });

    switch (phase) {
      case "dealing":
        this.handleDealingPhase();
        break;
      case "dawn":
        this.handleDawnPhase();
        break;
      case "day_turn":
        this.handleDayTurnPhase(resetDayTurnAction);
        break;
      case "tryal":
        this.handleTryalPhase();
        break;
      case "conspiracy":
        this.handleConspiracyPhase();
        break;
      case "night_witch":
        this.handleNightWitchPhase();
        break;
      case "night_constable":
        this.handleNightConstablePhase();
        break;
      case "night_confess":
        this.handleNightConfessPhase();
        break;
      case "night_resolve":
        this.handleNightResolvePhase();
        break;
      case "game_over":
        // Game over -- no timer needed
        break;
      default:
        break;
    }
  }

  // -- Phase Handlers --

  private handleDealingPhase(): void {
    this.broadcast("sound_effect", { sound: "card_deal" });
    this.addLog("所有玩家已发牌");

    // Auto-advance to dawn after 2 seconds
    setTimeout(() => {
      if (this.state.gamePhase === "dealing") {
        this.transitionTo("dawn");
      }
    }, 2000);
  }

  private handleDawnPhase(): void {
    this.dawnBlackCatPlacedBy.clear();
    this.broadcast("sound_effect", { sound: "dawn" });
    this.addLog("黎明 -- 女巫放置黑猫");

    this.startTimer(TIMER_DEFAULTS.dawn, () => {
      // If witches did not place black cat, assign randomly
      if (!this.state.blackCatOwnerId) {
        const alivePlayers = this.getAlivePlayers();
        if (alivePlayers.length > 0) {
          const randomPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
          this.placeBlackCat(randomPlayer.id);
        }
      }
      this.transitionTo("day_turn");
    });
  }

  private handleDayTurnPhase(resetTurnAction = true): void {
    if (resetTurnAction) {
      this.hasPlayedCard = false;
      this.state.currentTurnCanEnd = false;
    }

    // Skip dead players and players in stocks
    let attempts = 0;
    const maxAttempts = this.playerOrder.length;

    while (attempts < maxAttempts) {
      const playerId = this.playerOrder[this.currentPlayerIndex];
      const player = this.state.players.get(playerId);

      if (!player || !player.isAlive) {
        this.advancePlayerIndex();
        attempts++;
        continue;
      }

      if (player.hasStocks) {
        player.stocksCount--;
        if (player.stocksCount <= 0) {
          player.hasStocks = false;
        }
        this.addLog(`${player.name} 被关入枷锁，跳过此回合`);
        this.advancePlayerIndex();
        attempts++;
        continue;
      }

      break;
    }

    if (attempts >= maxAttempts) {
      // All players are dead or in stocks -- should not happen normally
      this.transitionTo("night_witch");
      return;
    }

    const currentId = this.playerOrder[this.currentPlayerIndex];
    this.state.currentPlayerId = currentId;
    const currentPlayer = this.state.players.get(currentId);
    if (currentPlayer) {
      this.addLog(`${currentPlayer.name}的回合`);
    }

    this.startTimer(TIMER_DEFAULTS.dayTurn, () => {
      if (this.hasPlayedCard) {
        // Player already played cards but did not explicitly end turn; advance
        this.endCurrentDayTurn();
      } else {
        // Auto draw if player did not act
        this.handleDrawCards(currentId);
      }
    });
  }

  private handleTryalPhase(): void {
    this.broadcast("sound_effect", { sound: "gavel" });

    this.startTimer(TIMER_DEFAULTS.tryal, () => {
      // Auto-choose first face-down tryal card if not chosen
      // This is handled by the tryal target context
    });
  }

  private handleConspiracyPhase(): void {
    this.conspiracyChoices.clear();
    this.broadcast("sound_effect", { sound: "card_flip" });
    this.addLog("阴谋！每名存活玩家从左边的玩家处拿取一张未公开的审判卡");

    this.startTimer(TIMER_DEFAULTS.conspiracy, () => {
      // Auto-assign for players who did not choose
      this.resolveConspiracy();
    });
  }

  private handleNightWitchPhase(): void {
    this.witchKillTargetId = "";
    this.witchVotes.clear();
    this.witchConfirmed.clear();
    this.confessedPlayerIds.clear();
    this.constableProtectTargetId = "";

    this.broadcast("sound_effect", { sound: "night_begin" });
    this.addLog("夜幕降临 -- 女巫选择击杀目标");

    // Check if any living witch exists
    const aliveWitches = this.getAlivePlayers().filter((p) => p.hasBeenWitch);
    if (aliveWitches.length === 0) {
      // No witches alive, skip to constable
      this.addLog("没有女巫存活 -- 跳过至警长阶段");
      this.transitionTo("night_constable");
      return;
    }

    this.startTimer(TIMER_DEFAULTS.nightWitch, () => {
      // Auto-confirm all unconfirmed witches; assign random target to those without a vote
      const aliveWitches = this.getAlivePlayers().filter((p) => p.hasBeenWitch);
      const nonWitchAlive = this.getAlivePlayers().filter((p) => !p.hasBeenWitch);
      for (const w of aliveWitches) {
        if (!this.witchVotes.has(w.id) && nonWitchAlive.length > 0) {
          this.witchVotes.set(
            w.id,
            nonWitchAlive[Math.floor(Math.random() * nonWitchAlive.length)].id,
          );
        }
        this.witchConfirmed.add(w.id);
      }
      this.resolveWitchVotes();
    });
  }

  private handleNightConstablePhase(): void {
    // Find alive constable
    const constable = this.getAlivePlayers().find((p) => p.isConstable);

    if (!constable) {
      this.addLog("没有警长可以保护任何人");
      this.transitionTo("night_confess");
      return;
    }

    this.addLog("警长选择保护对象");

    this.startTimer(TIMER_DEFAULTS.nightConstable, () => {
      // If constable did not choose, pick random (not self)
      if (!this.constableProtectTargetId && constable) {
        const others = this.getAlivePlayers().filter((p) => p.id !== constable.id);
        if (others.length > 0) {
          this.constableProtectTargetId = others[
            Math.floor(Math.random() * others.length)
          ].id;
        }
      }
      this.transitionTo("night_confess");
    });
  }

  private handleNightConfessPhase(): void {
    this.addLog("认罪窗口 -- 翻开一张审判卡来渡过夜晚");

    this.startTimer(TIMER_DEFAULTS.nightConfess, () => {
      this.transitionTo("night_resolve");
    });
  }

  private handleNightResolvePhase(): void {
    this.addLog("结算夜间行动...");
    this.state.isNightKillResolved = false;

    const targetId = this.witchKillTargetId;
    const target = targetId ? this.state.players.get(targetId) : undefined;

    if (!target || !target.isAlive) {
      this.addLog("夜间目标已死亡或无效");
      this.finishNightResolve();
      return;
    }

    // Check protection
    const isProtected = this.constableProtectTargetId === targetId;
    const hasConfessed = this.confessedPlayerIds.has(targetId);
    const hasAsylum = target.hasAsylum;

    if (isProtected) {
      this.addLog(`${target.name} 受到警长的保护`);
      this.broadcast("sound_effect", { sound: "card_flip" });
    } else if (hasConfessed) {
      this.addLog(`${target.name} 认罪并渡过夜晚`);
    } else if (hasAsylum) {
      this.addLog(`${target.name} 受到庇护的保护`);
    } else {
      // Player dies
      this.killPlayer(targetId, "夜间被女巫杀害");

      // Check Matchmaker chain
      if (target.hasMatchmaker) {
        const partnerId = target.matchmakerPartnerId;
        const partner = partnerId ? this.state.players.get(partnerId) : undefined;
        if (partner && partner.isAlive && partner.hasMatchmaker) {
          const partnerCharName = partner.characterName as CharacterName;
          if (!isImmuneToMatchmaker(partnerCharName)) {
            this.killPlayer(partnerId, "红线效果");
          } else {
            this.addLog(`${partner.name} 免疫红线效果（玛丽-沃伦）`);
          }
        }
      }
    }

    this.state.isNightKillResolved = true;

    this.startTimer(TIMER_DEFAULTS.nightResolve, () => {
      this.finishNightResolve();
    });
  }

  private finishNightResolve(): void {
    // Check win conditions
    const winResult = this.checkWin();
    if (winResult.gameOver) {
      this.handleGameOver(winResult);
      return;
    }

    // Remove blue cards from dead players and discard
    for (const [playerId, cards] of this.frontCards) {
      const player = this.state.players.get(playerId);
      if (player && !player.isAlive) {
        this.deck.discard(cards);
        this.frontCards.set(playerId, []);
      }
    }

    // Rebuild before dealing. Event cards are held out while hands are dealt
    // so Night and Conspiracy cannot enter a player's hand.
    this.deck.prepareForNewDayHands();

    // Deal new hands
    const alivePlayers = this.getAlivePlayers();
    const newHands = this.deck.dealNewHands(alivePlayers);

    for (const player of alivePlayers) {
      player.handCards.clear();
      const hand = newHands.get(player.id) ?? [];
      for (const card of hand) {
        player.handCards.push(card);
      }
      this.syncHandCount(player);
    }

    this.deck.finalizeInitialDeck();

    this.state.deckRemaining = this.deck.getDeckSize();
    this.state.round++;

    // Check two-player endgame: remove all blue cards
    if (alivePlayers.length === 2) {
      this.handleTwoPlayerEndgame();
    }

    // Advance turn to next player
    this.advancePlayerIndex();
    this.transitionTo("day_turn");
  }

  private handleGameOver(result: WinCheckResult): void {
    if (!result.winner) return;

    this.addLog(`游戏结束 -- ${result.winner}获胜！`);
    this.broadcast("game_over", {
      winner: result.winner,
      reveals: this.buildPlayerReveals(),
    });
    this.broadcast("sound_effect", { sound: "victory" });
    this.state.gamePhase = "game_over";
    this.clearTimer();
  }

  // -- Player Actions --

  handlePlayCards(playerId: string, cards: CardType[], targetId: string, secondaryTargetId?: string): boolean {
    if (this.state.gamePhase !== "day_turn") return false;
    if (this.state.currentPlayerId !== playerId) return false;
    if (this.state.isPaused) return false;

    const player = this.state.players.get(playerId);
    const target = this.state.players.get(targetId);
    if (!player || !target || !player.isAlive || !target.isAlive) return false;

    // Salem First Law: cannot play cards on yourself
    if (playerId === targetId) return false;

    if (!this.canPlayCards(player, cards, targetId, secondaryTargetId)) return false;

    const handAfterPlay = Array.from(player.handCards) as CardType[];
    for (const card of cards) {
      const idx = handAfterPlay.indexOf(card);
      if (idx === -1) return false;
      handAfterPlay.splice(idx, 1);
    }

    player.handCards.clear();
    handAfterPlay.forEach((card) => player.handCards.push(card));
    this.syncHandCount(player);

    // Process each card only after the full action is known to be legal.
    for (const card of cards) {
      this.processCard(playerId, card, targetId, secondaryTargetId);
    }

    this.hasPlayedCard = true;
    this.state.currentTurnCanEnd = true;
    this.broadcast("sound_effect", { sound: "card_play" });

    // Check if tryal was triggered (handled inside processCard via triggerTryal)
    const currentPhase: string = this.state.gamePhase;
    if (currentPhase === "tryal") {
      return true;
    }

    // Check win conditions after card play
    const winResult = this.checkWin();
    if (winResult.gameOver) {
      this.handleGameOver(winResult);
      return true;
    }

    if (player.handCards.length === 0) {
      this.addLog(`${player.name} 没有卡牌了，结束回合`);
      this.endCurrentDayTurn();
    } else {
      this.addLog(`${player.name} 可以继续出牌或结束回合`);
    }

    return true;
  }

  handleEndTurn(playerId: string): boolean {
    if (this.state.gamePhase !== "day_turn") return false;
    if (this.state.currentPlayerId !== playerId) return false;
    if (this.state.isPaused) return false;
    if (!this.hasPlayedCard) return false;

    const player = this.state.players.get(playerId);
    if (player) {
      this.addLog(`${player.name} 结束了回合`);
    }
    this.endCurrentDayTurn();
    return true;
  }

  handleDrawCards(playerId: string): boolean {
    if (this.state.gamePhase !== "day_turn") return false;
    if (this.state.currentPlayerId !== playerId) return false;
    if (this.state.isPaused) return false;
    if (this.hasPlayedCard) return false; // Already played cards, cannot draw

    const player = this.state.players.get(playerId);
    if (!player || !player.isAlive) return false;

    const alivePlayers = this.getAlivePlayers();
    const twoPlayerMode = alivePlayers.length === 2;
    let drawnCount = 0;

    for (let i = 0; i < DRAW_COUNT; i++) {
      let card = this.drawNextCardForTurn(twoPlayerMode);
      if (card === null) break;

      drawnCount++;

      if (card === "conspiracy") {
        this.state.deckRemaining = this.deck.getDeckSize();
        this.broadcast("sound_effect", { sound: "card_draw" });
        this.addLog(`${player.name} 抽到了阴谋卡！`);
        this.deck.discard(["conspiracy"]);
        this.state.currentTurnCanEnd = false;
        this.transitionTo("conspiracy");
        return true;
      }

      if (card === "night") {
        this.state.deckRemaining = this.deck.getDeckSize();
        this.broadcast("sound_effect", { sound: "card_draw" });
        this.addLog(`${player.name} 抽到了黑夜卡！`);
        this.deck.discard(["night"]);
        this.state.currentTurnCanEnd = false;
        this.transitionTo("night_witch");
        return true;
      }

      player.handCards.push(card);
      this.syncHandCount(player);
    }

    this.state.deckRemaining = this.deck.getDeckSize();
    this.broadcast("sound_effect", { sound: "card_draw" });
    this.addLog(`${player.name} 抽了${drawnCount}张卡牌`);

    // Normal draw: advance turn
    this.endCurrentDayTurn();
    return true;
  }

  handleWitchPlaceBlackCat(playerId: string, targetId: string): boolean {
    if (this.state.gamePhase !== "dawn") return false;
    if (this.state.isPaused) return false;

    const player = this.state.players.get(playerId);
    if (!player || !player.hasBeenWitch) return false;
    if (this.dawnBlackCatPlacedBy.has(playerId)) return false;

    // Black Cat can be placed on self during dawn (exception to Salem First Law)
    const target = this.state.players.get(targetId);
    if (!target || !target.isAlive) return false;

    this.placeBlackCat(targetId);
    this.dawnBlackCatPlacedBy.add(playerId);

    const aliveWitches = this.getAlivePlayers().filter((p) => p.hasBeenWitch);
    const allWitchesPlaced = aliveWitches.every((witch) => this.dawnBlackCatPlacedBy.has(witch.id));
    if (allWitchesPlaced) {
      this.clearTimer();
      this.transitionTo("day_turn");
    }

    return true;
  }

  handleWitchKill(playerId: string, targetId: string): boolean {
    if (this.state.gamePhase !== "night_witch") return false;
    if (this.state.isPaused) return false;

    const player = this.state.players.get(playerId);
    if (!player || !player.hasBeenWitch || !player.isAlive) return false;

    const target = this.state.players.get(targetId);
    if (!target || !target.isAlive) return false;

    // Backward-compatible: vote + immediate confirm
    this.witchVotes.set(playerId, targetId);
    this.witchConfirmed.add(playerId);
    this.broadcastWitchVoteState();

    const aliveWitches = this.getAlivePlayers().filter((p) => p.hasBeenWitch);
    const allConfirmed = aliveWitches.every((w) => this.witchConfirmed.has(w.id));

    if (allConfirmed) {
      this.resolveWitchVotes();
    }

    return true;
  }

  handleWitchVote(playerId: string, targetId: string): boolean {
    if (this.state.gamePhase !== "night_witch") return false;
    if (this.state.isPaused) return false;

    const player = this.state.players.get(playerId);
    if (!player || !player.hasBeenWitch || !player.isAlive) return false;
    if (this.witchConfirmed.has(playerId)) return false;

    const target = this.state.players.get(targetId);
    if (!target || !target.isAlive) return false;

    this.witchVotes.set(playerId, targetId);
    this.broadcastWitchVoteState();
    return true;
  }

  handleWitchConfirm(playerId: string): boolean {
    if (this.state.gamePhase !== "night_witch") return false;
    if (this.state.isPaused) return false;

    const player = this.state.players.get(playerId);
    if (!player || !player.hasBeenWitch || !player.isAlive) return false;
    if (this.witchConfirmed.has(playerId)) return false;
    if (!this.witchVotes.has(playerId)) return false;

    this.witchConfirmed.add(playerId);
    this.broadcastWitchVoteState();

    const aliveWitches = this.getAlivePlayers().filter((p) => p.hasBeenWitch);
    const allConfirmed = aliveWitches.every((w) => this.witchConfirmed.has(w.id));

    if (allConfirmed) {
      this.resolveWitchVotes();
    }

    return true;
  }

  private resolveWitchVotes(): void {
    const voteCounts = new Map<string, number>();
    for (const [, target] of this.witchVotes) {
      voteCounts.set(target, (voteCounts.get(target) ?? 0) + 1);
    }

    let maxVotes = 0;
    let chosenTarget = "";
    for (const [target, count] of voteCounts) {
      if (count > maxVotes) {
        maxVotes = count;
        chosenTarget = target;
      }
    }

    this.witchKillTargetId = chosenTarget;
    this.addLog("女巫已选择击杀目标");

    this.clearTimer();
    this.transitionTo("night_constable");
  }

  private broadcastWitchVoteState(): void {
    const aliveWitches = this.getAlivePlayers().filter((p) => p.hasBeenWitch);
    const witchPlayerIds = aliveWitches.map((w) => w.id);

    const votes: Record<string, string> = {};
    for (const [witchId, targetId] of this.witchVotes) {
      votes[witchId] = targetId;
    }

    const confirmed = Array.from(this.witchConfirmed);

    const voteCounts: Record<string, number> = {};
    for (const targetId of this.witchVotes.values()) {
      voteCounts[targetId] = (voteCounts[targetId] ?? 0) + 1;
    }

    for (const witch of aliveWitches) {
      this.sendToPlayer(witch.id, "witch_vote_update", {
        votes,
        confirmed,
        voteCounts,
        witchPlayerIds,
      });
    }
  }

  handleConstableProtect(playerId: string, targetId: string): boolean {
    if (this.state.gamePhase !== "night_constable") return false;
    if (this.state.isPaused) return false;

    const player = this.state.players.get(playerId);
    if (!player || !player.isConstable || !player.isAlive) return false;

    // Cannot protect self
    if (playerId === targetId) return false;

    const target = this.state.players.get(targetId);
    if (!target || !target.isAlive) return false;

    this.constableProtectTargetId = targetId;
    this.addLog("警长已放置保护");

    // Advance immediately
    this.clearTimer();
    this.transitionTo("night_confess");
    return true;
  }

  handleConfess(playerId: string, cardIndex: number): boolean {
    if (this.state.gamePhase !== "night_confess") return false;
    if (this.state.isPaused) return false;

    const player = this.state.players.get(playerId);
    if (!player || !player.isAlive) return false;

    // Already confessed
    if (this.confessedPlayerIds.has(playerId)) return false;

    const tryalCards = this.tryalCardMap.get(playerId);
    if (!tryalCards || cardIndex < 0 || cardIndex >= tryalCards.length) return false;

    const card = tryalCards[cardIndex];
    if (card.faceUp) return false; // Already face up

    // Flip the card
    card.faceUp = true;
    this.confessedPlayerIds.add(playerId);

    player.tryalCardFaceUp++;
    this.syncTryalCards(playerId);

    this.addLog(`${player.name} 认罪并翻开一张审判卡`);

    this.broadcast("card_revealed", {
      playerId,
      cardType: card.type,
      cardIndex,
    });

    // Check if all cards face up => death
    if (shouldPlayerDie(tryalCards)) {
      this.killPlayer(playerId, "认罪导致所有审判卡被翻开");
    }

    // Check win conditions
    const winResult = this.checkWin();
    if (winResult.gameOver) {
      this.handleGameOver(winResult);
    }

    return true;
  }

  handleConspiracyPass(playerId: string, cardIndex: number): boolean {
    if (this.state.gamePhase !== "conspiracy") return false;
    if (this.state.isPaused) return false;

    const player = this.state.players.get(playerId);
    if (!player || !player.isAlive) return false;

    const leftPlayerId = this.getLeftAlivePlayerId(playerId);
    if (!leftPlayerId) return false;

    const leftTryalCards = this.tryalCardMap.get(leftPlayerId);
    if (!leftTryalCards || cardIndex < 0 || cardIndex >= leftTryalCards.length) return false;

    const card = leftTryalCards[cardIndex];
    if (card.faceUp) return false; // Must take a face-down card from the left player.

    this.conspiracyChoices.set(playerId, cardIndex);

    // Check if all alive players have chosen
    const alivePlayers = this.getAlivePlayers();
    const allChosen = alivePlayers.every((p) => this.conspiracyChoices.has(p.id));

    if (allChosen) {
      this.resolveConspiracy();
    }

    return true;
  }

  handleChooseTryalCard(playerId: string, targetId: string, cardIndex: number): boolean {
    if (this.state.gamePhase !== "tryal") return false;
    if (this.state.isPaused) return false;

    // Only the player who triggered the tryal can choose the pending target's card.
    if (this.state.tryalChooserId !== playerId) return false;
    if (this.state.tryalTargetId !== targetId) return false;

    const target = this.state.players.get(targetId);
    if (!target || !target.isAlive) return false;

    const tryalCards = this.tryalCardMap.get(targetId);
    if (!tryalCards || cardIndex < 0 || cardIndex >= tryalCards.length) return false;

    const card = tryalCards[cardIndex];
    if (card.faceUp) return false; // Already face up

    // Flip the card
    card.faceUp = true;
    target.tryalCardFaceUp++;
    this.syncTryalCards(targetId);

    const tryalTypeCn = card.type === "witch" ? "女巫" : card.type === "constable" ? "警长" : "村民";
    this.addLog(`${target.name}的一张审判卡被翻开：${tryalTypeCn}`);

    this.broadcast("card_revealed", {
      playerId: targetId,
      cardType: card.type,
      cardIndex,
    });

    this.broadcast("sound_effect", { sound: "card_flip" });

    // Clear accusation cards from target
    const front = this.frontCards.get(targetId) ?? [];
    const accusationCards = front.filter(
      (c) => c === "accusation" || c === "evidence" || c === "witness"
    );
    this.deck.discard(accusationCards);
    this.frontCards.set(
      targetId,
      front.filter((c) => c !== "accusation" && c !== "evidence" && c !== "witness")
    );
    target.accusationPoints = 0;

    // Check if constable card revealed -- constable role is lost
    if (card.type === "constable") {
      const constableOwner = this.getAlivePlayers().find(
        (p) => p.id === targetId && p.isConstable
      );
      if (constableOwner) {
        constableOwner.isConstable = false;
        this.addLog(`${target.name} 是警长 -- 该角色现已空缺`);
        this.sendRoleInfo(targetId);
      }
    }

    // Check if player dies (all tryal cards face up)
    if (shouldPlayerDie(tryalCards)) {
      this.killPlayer(targetId, "所有审判卡被翻开");
    }

    // Check win conditions
    const winResult = this.checkWin();
    if (winResult.gameOver) {
      this.handleGameOver(winResult);
      return true;
    }

    this.state.tryalTargetId = "";
    this.state.tryalChooserId = "";

    // Return to the same day turn. The accuser may continue playing cards or end.
    this.transitionTo("day_turn", false);
    return true;
  }

  handleUseCharacterSkill(
    playerId: string,
    payload: {
      cardCount?: number;
      cardIndexes?: number[];
      deckOrder?: CardType[];
      targetId?: string;
    } = {}
  ): boolean {
    if (this.state.isPaused) return false;

    const player = this.state.players.get(playerId);
    if (!player || !player.isAlive) return false;

    const characterName = player.characterName as CharacterName;

    if (canDrawFromDiscard(characterName, player.samuelParrisUsesRemaining)) {
      if (this.state.gamePhase !== "day_turn") return false;
      if (this.state.currentPlayerId !== playerId) return false;
      if (this.hasPlayedCard) return false;

      const count = Math.max(1, Math.min(2, payload.cardCount ?? 2));
      const drawn = this.deck.drawFromDiscard(count);
      if (drawn.length === 0) {
        this.sendToPlayer(playerId, "character_skill_result", {
          skill: "samuel_parris",
          message: "弃牌堆为空",
        });
        return false;
      }

      for (const card of drawn) {
        player.handCards.push(card);
      }
      this.syncHandCount(player);
      player.samuelParrisUsesRemaining--;
      player.samuelParrisUsesRemainingPublic = player.samuelParrisUsesRemaining;
      this.state.deckRemaining = this.deck.getDeckSize();
      this.hasPlayedCard = true;
      this.addLog(`${player.name} 使用塞缪尔-帕里斯从弃牌堆抽取${drawn.length}张卡牌`);
      this.sendToPlayer(playerId, "character_skill_result", {
        skill: "samuel_parris",
        availableCards: drawn,
        message: "已从弃牌堆抽取",
      });
      this.endCurrentDayTurn();
      return true;
    }

    if (canRearrangeDeck(characterName, player.titubaUsed)) {
      if (this.state.gamePhase !== "day_turn") return false;
      if (this.state.currentPlayerId !== playerId) return false;

      const currentDeck = this.deck.getDeck();
      if (!payload.deckOrder) {
        this.sendToPlayer(playerId, "character_skill_result", {
          skill: "tituba",
          deck: currentDeck,
          message: "请选择新的牌堆顺序",
        });
        return true;
      }

      if (!sameCardMultiset(currentDeck, payload.deckOrder)) return false;

      this.deck.setDeck(payload.deckOrder);
      player.titubaUsed = true;
      player.titubaUsedPublic = true;
      this.state.deckRemaining = this.deck.getDeckSize();
      this.addLog(`${player.name} 使用提图芭查看并重新排列牌堆`);
      this.sendToPlayer(playerId, "character_skill_result", {
        skill: "tituba",
        message: "牌堆顺序已更新",
      });
      return true;
    }

    if (canLootDeadPlayer(characterName)) {
      const targetId = payload.targetId;
      if (!targetId) {
        this.sendToPlayer(playerId, "character_skill_result", {
          skill: "john_proctor",
          message: "请选择一名已死亡玩家查看",
        });
        return true;
      }

      const deadHand = this.deadPlayerHand.get(targetId);
      const target = this.state.players.get(targetId);
      if (!target || target.isAlive || !deadHand || deadHand.length === 0) return false;

      const requestedIndexes = payload.cardIndexes?.length
        ? payload.cardIndexes
        : [0];
      const uniqueIndexes = Array.from(new Set(requestedIndexes))
        .filter((index) => index >= 0 && index < deadHand.length)
        .sort((a, b) => b - a);
      if (uniqueIndexes.length === 0) return false;

      const looted: CardType[] = [];
      for (const index of uniqueIndexes) {
        const [card] = deadHand.splice(index, 1);
        if (card) {
          looted.push(card);
          player.handCards.push(card);
        }
      }
      this.syncHandCount(player);
      if (deadHand.length === 0) {
        this.deadPlayerHand.delete(targetId);
      }

      this.addLog(`${player.name} 使用约翰-普罗克特从${target.name}处取得${looted.length}张卡牌`);
      this.sendToPlayer(playerId, "character_skill_result", {
        skill: "john_proctor",
        availableCards: looted,
        targetId,
        message: "搜刮了死者的手牌",
      });
      return true;
    }

    this.addLog(`${player.name} 的角色技能为被动效果`);
    this.sendToPlayer(playerId, "character_skill_result", {
      skill: characterName,
      message: "该角色能力为被动技能或已由规则引擎自动结算",
    });
    return true;
  }

  setTopDeckCardForTest(card: CardType): boolean {
    this.deck.putOnTop(card);
    this.state.deckRemaining = this.deck.getDeckSize();
    this.addLog(`测试设置：${card}移到牌堆顶部`);
    return true;
  }

  setPlayerHandForTest(playerId: string, cards: CardType[]): boolean {
    const player = this.state.players.get(playerId);
    if (!player) return false;

    player.handCards.clear();
    for (const card of cards) {
      player.handCards.push(card);
    }
    this.syncHandCount(player);
    this.addLog(`测试设置：${player.name}的手牌已设置`);
    return true;
  }

  // -- Card Processing --

  private processCard(
    playerId: string,
    card: CardType,
    targetId: string,
    secondaryTargetId?: string
  ): void {
    const player = this.state.players.get(playerId);
    const target = this.state.players.get(targetId);
    if (!player || !target) return;

    const def = CARD_DEFINITIONS[card];

    switch (card) {
      case "accusation":
      case "evidence":
      case "witness": {
        let value = def.accusationValue ?? 0;

        // Cotton Mather: Evidence worth 4
        if (card === "evidence" && player.characterName === "cotton_mather") {
          value = getEvidenceValue(player.characterName as CharacterName);
        }

        // Will Griggs: Alibi as Witness against Piety
        // (handled in alibi case)

        // Add to target's front cards
        const front = this.frontCards.get(targetId) ?? [];
        front.push(card);
        this.frontCards.set(targetId, front);

        target.accusationPoints += value;

        this.addLog(
          `${player.name} 对${target.name}打出${def.nameCn}（${value}点）[累计：${target.accusationPoints}]`
        );

        // Check accusation threshold
        const charName = target.characterName as CharacterName;
        const threshold = getAccusationThreshold(charName, target.hasPiety);

        // Thomas Danforth early trigger at 6 pts
        if (player.characterName === "thomas_danforth") {
          const earlyThreshold = getDanforthEarlyThreshold(target.hasPiety);
          if (target.accusationPoints >= earlyThreshold && target.accusationPoints < threshold) {
            this.addLog(`托马斯-丹福斯在${earlyThreshold}点时触发提前审判！`);
            this.triggerTryal(targetId);
            return;
          }
        }

        if (target.accusationPoints >= threshold) {
          this.addLog(`${target.name}已达到${threshold}点指控 -- 审判！`);
          this.triggerTryal(targetId);
        }
        break;
      }

      case "alibi": {
        // Will Griggs: can use Alibi as 7-point Witness against Piety holders
        if (canUseAlibiAsWitness(player.characterName as CharacterName, target.hasPiety)) {
          const front = this.frontCards.get(targetId) ?? [];
          front.push("witness");
          this.frontCards.set(targetId, front);
          target.accusationPoints += 7;

          this.addLog(
            `${player.name}（威尔-格里格斯）将不在场证明作为7点证人卡对${target.name}使用！`
          );

          const charName = target.characterName as CharacterName;
          const threshold = getAccusationThreshold(charName, target.hasPiety);
          if (target.accusationPoints >= threshold) {
            this.triggerTryal(targetId);
          }
        } else {
          // Normal Alibi: remove all accusation cards
          const front = this.frontCards.get(targetId) ?? [];
          const accusationCards = front.filter(
            (c) => c === "accusation" || c === "evidence" || c === "witness"
          );
          this.deck.discard(accusationCards);
          this.frontCards.set(
            targetId,
            front.filter((c) => c !== "accusation" && c !== "evidence" && c !== "witness")
          );
          target.accusationPoints = 0;

          this.addLog(`${player.name} 对${target.name}打出不在场证明 -- 所有指控已移除`);
        }

        this.deck.discard([card]);
        break;
      }

      case "stocks": {
        target.hasStocks = true;
        target.stocksCount = (target.stocksCount || 0) + 1;
        const front = this.frontCards.get(targetId) ?? [];
        front.push(card);
        this.frontCards.set(targetId, front);

        this.addLog(`${player.name} 将${target.name}关入枷锁`);
        break;
      }

      case "robbery": {
        // Must involve two other players, not self
        if (!secondaryTargetId) return;
        if (secondaryTargetId === playerId || targetId === playerId) return;

        const secondaryTarget = this.state.players.get(secondaryTargetId);
        if (!secondaryTarget || !secondaryTarget.isAlive) return;

        // Take random card from target, give to secondary
        if (target.handCards.length > 0) {
          const randomIdx = Math.floor(Math.random() * target.handCards.length);
          const stolen = target.handCards[randomIdx];
          target.handCards.splice(randomIdx, 1);
          secondaryTarget.handCards.push(stolen);
          this.syncHandCount(target);
          this.syncHandCount(secondaryTarget);

          this.addLog(
            `${player.name} 使用抢劫：从${target.name}处拿取一张卡牌并交给${secondaryTarget.name}`
          );
        }

        this.deck.discard([card]);
        break;
      }

      case "scapegoat": {
        // Move all front cards from target to secondary target
        if (!secondaryTargetId) return;
        if (secondaryTargetId === playerId || targetId === playerId) return;

        const secondaryTarget = this.state.players.get(secondaryTargetId);
        if (!secondaryTarget || !secondaryTarget.isAlive) return;

        const sourceFront = this.frontCards.get(targetId) ?? [];
        const destFront = this.frontCards.get(secondaryTargetId) ?? [];

        // Transfer all cards
        destFront.push(...sourceFront);
        this.frontCards.set(targetId, []);
        this.frontCards.set(secondaryTargetId, destFront);

        // Transfer statuses
        this.transferFrontCardStatuses(targetId, secondaryTargetId, sourceFront);

        this.addLog(
          `${player.name} 使用替罪羊：将${target.name}面前的所有卡牌转移给${secondaryTarget.name}`
        );

        this.deck.discard([card]);
        break;
      }

      case "curse": {
        // Remove blue cards from target
        const front = this.frontCards.get(targetId) ?? [];
        const blueCards = front.filter(
          (c) => c === "piety" || c === "asylum" || c === "matchmaker" || c === "black_cat"
        );
        this.deck.discard(blueCards);
        this.frontCards.set(
          targetId,
          front.filter(
            (c) => c !== "piety" && c !== "asylum" && c !== "matchmaker" && c !== "black_cat"
          )
        );

        // Reset blue statuses
        target.hasPiety = false;
        target.hasAsylum = false;
        if (target.hasBlackCat) {
          target.hasBlackCat = false;
          if (this.state.blackCatOwnerId === targetId) {
            this.state.blackCatOwnerId = "";
          }
        }
        if (target.hasMatchmaker) {
          target.hasMatchmaker = false;
          // Remove partner link too
          const partnerIdx = this.matchmakerHolders.indexOf(targetId);
          if (partnerIdx !== -1) {
            this.matchmakerHolders.splice(partnerIdx, 1);
          }
          target.matchmakerPartnerId = "";
        }

        this.addLog(`${player.name} 对${target.name}使用诅咒 -- 蓝色卡牌已移除`);
        this.deck.discard([card]);
        break;
      }

      case "piety": {
        target.hasPiety = true;
        const front = this.frontCards.get(targetId) ?? [];
        front.push(card);
        this.frontCards.set(targetId, front);

        this.addLog(`${player.name} 给予${target.name}虔诚`);
        break;
      }

      case "asylum": {
        target.hasAsylum = true;
        const front = this.frontCards.get(targetId) ?? [];
        front.push(card);
        this.frontCards.set(targetId, front);

        this.addLog(`${player.name} 给予${target.name}庇护`);
        break;
      }

      case "matchmaker": {
        target.hasMatchmaker = true;
        const front = this.frontCards.get(targetId) ?? [];
        front.push(card);
        this.frontCards.set(targetId, front);

        this.matchmakerHolders.push(targetId);

        // If two matchmaker holders, link them
        if (this.matchmakerHolders.length === 2) {
          const [first, second] = this.matchmakerHolders;
          if (first === second) {
            // Both on same player: discard both
            const f = this.frontCards.get(first) ?? [];
            const matchCards = f.filter((c) => c === "matchmaker");
            this.deck.discard(matchCards);
            this.frontCards.set(first, f.filter((c) => c !== "matchmaker"));
            const firstPlayer = this.state.players.get(first);
            if (firstPlayer) {
              firstPlayer.hasMatchmaker = false;
            }
            this.matchmakerHolders = [];
            this.addLog("两张红线卡都在同一玩家身上 -- 已弃掉");
          } else {
            const firstPlayer = this.state.players.get(first);
            const secondPlayer = this.state.players.get(second);
            if (firstPlayer) firstPlayer.matchmakerPartnerId = second;
            if (secondPlayer) secondPlayer.matchmakerPartnerId = first;
            this.addLog(`${firstPlayer?.name}和${secondPlayer?.name}现已通过红线卡绑定`);
          }
        }
        break;
      }

      default:
        this.deck.discard([card]);
        break;
    }
  }

  private canPlayCards(
    player: Player,
    cards: CardType[],
    targetId: string,
    secondaryTargetId?: string
  ): boolean {
    const available = new Map<CardType, number>();
    for (const handCard of player.handCards) {
      const card = handCard as CardType;
      available.set(card, (available.get(card) ?? 0) + 1);
    }

    for (const card of cards) {
      const count = available.get(card) ?? 0;
      if (count <= 0) return false;
      available.set(card, count - 1);

      if ((card === "robbery" || card === "scapegoat") && !this.canUseTwoTargetCard(player.id, targetId, secondaryTargetId)) {
        return false;
      }
    }

    return true;
  }

  private canUseTwoTargetCard(playerId: string, targetId: string, secondaryTargetId?: string): boolean {
    if (!secondaryTargetId) return false;
    if (secondaryTargetId === playerId || targetId === playerId) return false;
    if (secondaryTargetId === targetId) return false;

    const secondaryTarget = this.state.players.get(secondaryTargetId);
    return Boolean(secondaryTarget?.isAlive);
  }

  private triggerTryal(targetId: string): void {
    this.clearTimer();
    // Store the tryal target so the accuser can choose which card to flip.
    // currentPlayerId remains the accuser during tryal.
    this.state.tryalTargetId = targetId;
    this.state.tryalChooserId = this.state.currentPlayerId;
    this.broadcast("phase_change", {
      phase: "tryal",
      data: { targetId, chooserId: this.state.tryalChooserId },
    });
    this.state.gamePhase = "tryal";

    this.startTimer(TIMER_DEFAULTS.tryal, () => {
      // Auto-flip first face-down card
      const tryalCards = this.tryalCardMap.get(targetId);
      if (tryalCards) {
        const firstFaceDown = tryalCards.findIndex((c) => !c.faceUp);
        if (firstFaceDown !== -1) {
          this.handleChooseTryalCard(
            this.state.tryalChooserId,
            targetId,
            firstFaceDown
          );
        }
      }
    });
  }

  // -- Conspiracy Resolution --

  private resolveConspiracy(): void {
    const alivePlayers = this.getAlivePlayers();
    const aliveInOrder = this.getAlivePlayerIdsInOrder();

    if (aliveInOrder.length < 2) {
      this.endCurrentDayTurn();
      return;
    }

    // For players who did not choose, auto-select first face-down card
    for (const player of alivePlayers) {
      if (!this.conspiracyChoices.has(player.id)) {
        const leftPlayerId = this.getLeftAlivePlayerId(player.id);
        const cards = leftPlayerId ? this.tryalCardMap.get(leftPlayerId) ?? [] : [];
        const firstFaceDown = cards.findIndex((c) => !c.faceUp);
        if (firstFaceDown !== -1) {
          this.conspiracyChoices.set(player.id, firstFaceDown);
        }
      }
    }

    const claims = aliveInOrder
      .map((receiverId) => ({
        receiverId,
        sourceId: this.getLeftAlivePlayerId(receiverId),
        cardIndex: this.conspiracyChoices.get(receiverId) ?? 0,
      }))
      .filter((claim): claim is { receiverId: string; sourceId: string; cardIndex: number } =>
        Boolean(claim.sourceId)
      )
      .sort((a, b) => b.cardIndex - a.cardIndex);

    const claimedCards: Array<{ receiverId: string; card: TryalCard }> = [];

    for (const claim of claims) {
      const cards = this.tryalCardMap.get(claim.sourceId) ?? [];
      if (claim.cardIndex >= 0 && claim.cardIndex < cards.length && !cards[claim.cardIndex].faceUp) {
        const removed = cards.splice(claim.cardIndex, 1)[0];
        claimedCards.push({ receiverId: claim.receiverId, card: removed });
      } else {
        const fallbackIndex = cards.findIndex((card) => !card.faceUp);
        if (fallbackIndex !== -1) {
          const removed = cards.splice(fallbackIndex, 1)[0];
          claimedCards.push({ receiverId: claim.receiverId, card: removed });
        }
      }
    }

    for (const { receiverId, card } of claimedCards) {
      const receiverCards = this.tryalCardMap.get(receiverId) ?? [];
      receiverCards.push({ ...card, faceUp: false });
      this.tryalCardMap.set(receiverId, receiverCards);
    }

    for (const playerId of aliveInOrder) {
      this.refreshPlayerRoles(playerId);
    }

    this.addLog("阴谋已结算 -- 审判卡已交换");

    // Check win conditions
    const winResult = this.checkWin();
    if (winResult.gameOver) {
      this.handleGameOver(winResult);
      return;
    }

    // Drawing a black event card ends the draw action and passes the turn.
    this.endCurrentDayTurn();
  }

  // -- Utility Methods --

  private placeBlackCat(targetId: string): void {
    const target = this.state.players.get(targetId);
    if (!target) return;

    // Remove from previous owner
    if (this.state.blackCatOwnerId) {
      const prev = this.state.players.get(this.state.blackCatOwnerId);
      if (prev) {
        prev.hasBlackCat = false;
        const front = this.frontCards.get(this.state.blackCatOwnerId) ?? [];
        const idx = front.indexOf("black_cat");
        if (idx !== -1) front.splice(idx, 1);
      }
    }

    target.hasBlackCat = true;
    this.state.blackCatOwnerId = targetId;
    const front = this.frontCards.get(targetId) ?? [];
    front.push("black_cat");
    this.frontCards.set(targetId, front);

    // Black cat owner starts the game
    const ownerIndex = this.playerOrder.indexOf(targetId);
    if (ownerIndex !== -1) {
      this.currentPlayerIndex = ownerIndex;
    }

    this.addLog(`黑猫已放置在${target.name}身上`);
  }

  private killPlayer(playerId: string, reason: string): void {
    const player = this.state.players.get(playerId);
    if (!player || !player.isAlive) return;

    player.isAlive = false;
    this.addLog(`${player.name} 死亡 -- ${reason}`);

    this.broadcast("player_killed", {
      playerId,
      playerName: player.name,
      reason,
    });
    this.broadcast("sound_effect", { sound: "death" });

    // Reveal all tryal cards
    const tryalCards = this.tryalCardMap.get(playerId) ?? [];
    for (let i = 0; i < tryalCards.length; i++) {
      const card = tryalCards[i];
      if (!card.faceUp) {
        card.faceUp = true;
        this.broadcast("card_revealed", {
          playerId,
          cardType: card.type,
          cardIndex: i,
        });
      }
    }
    player.tryalCardFaceUp = tryalCards.length;
    this.syncTryalCards(playerId);

    const johnProctor = this.getAlivePlayers().find(
      (p) => p.id !== playerId && canLootDeadPlayer(p.characterName as CharacterName)
    );

    if (johnProctor && player.handCards.length > 0) {
      const handCopy: CardType[] = [];
      for (let i = 0; i < player.handCards.length; i++) {
        handCopy.push(player.handCards[i] as CardType);
      }
      this.deadPlayerHand.set(playerId, handCopy);
      this.sendToPlayer(johnProctor.id, "character_skill_result", {
        skill: "john_proctor",
        targetId: playerId,
        availableCards: handCopy,
        message: `${player.name}'s hand is available to inspect`,
      });
    }

    // Discard hand and front cards
    if (!johnProctor) {
      const hand: CardType[] = [];
      while (player.handCards.length > 0) {
        const card = player.handCards.pop();
        if (card) hand.push(card as CardType);
      }
      this.deck.discard(hand);
    } else {
      player.handCards.clear();
    }
    this.syncHandCount(player);

    const front = this.frontCards.get(playerId) ?? [];
    this.deck.discard(front);
    this.frontCards.set(playerId, []);

    // Reset statuses
    player.accusationPoints = 0;
    player.hasStocks = false;
    player.hasAsylum = false;
    player.hasPiety = false;
    player.hasBlackCat = false;
    player.hasMatchmaker = false;

    if (this.state.blackCatOwnerId === playerId) {
      this.state.blackCatOwnerId = "";
    }

    // Remove from matchmaker
    const mmIdx = this.matchmakerHolders.indexOf(playerId);
    if (mmIdx !== -1) {
      this.matchmakerHolders.splice(mmIdx, 1);
    }

  }

  private transferFrontCardStatuses(
    fromId: string,
    toId: string,
    cards: CardType[]
  ): void {
    const from = this.state.players.get(fromId);
    const to = this.state.players.get(toId);
    if (!from || !to) return;

    // Count accusation points
    let accusationTransfer = 0;
    for (const card of cards) {
      const def = CARD_DEFINITIONS[card];
      if (def.accusationValue) {
        accusationTransfer += def.accusationValue;
      }
    }
    from.accusationPoints -= accusationTransfer;
    to.accusationPoints += accusationTransfer;

    if (cards.includes("piety")) {
      from.hasPiety = false;
      to.hasPiety = true;
    }
    if (cards.includes("asylum")) {
      from.hasAsylum = false;
      to.hasAsylum = true;
    }
    if (cards.includes("stocks")) {
      from.hasStocks = false;
      from.stocksCount = 0;
      to.hasStocks = true;
      to.stocksCount = (to.stocksCount || 0) + 1;
    }
    if (cards.includes("black_cat")) {
      from.hasBlackCat = false;
      to.hasBlackCat = true;
      this.state.blackCatOwnerId = toId;
    }
    if (cards.includes("matchmaker")) {
      from.hasMatchmaker = false;
      to.hasMatchmaker = true;

      // Update matchmaker holder list
      const idx = this.matchmakerHolders.indexOf(fromId);
      if (idx !== -1) {
        this.matchmakerHolders[idx] = toId;
      }

      // Update partner links
      if (from.matchmakerPartnerId) {
        const partner = this.state.players.get(from.matchmakerPartnerId);
        if (partner) {
          partner.matchmakerPartnerId = toId;
        }
        to.matchmakerPartnerId = from.matchmakerPartnerId;
        from.matchmakerPartnerId = "";
      }
    }
  }

  private handleTwoPlayerEndgame(): void {
    // Remove all blue cards from front of alive players
    for (const player of this.getAlivePlayers()) {
      const front = this.frontCards.get(player.id) ?? [];
      const blueCards = front.filter(
        (c) => c === "piety" || c === "asylum" || c === "matchmaker" || c === "black_cat"
      );
      this.deck.discard(blueCards);
      this.frontCards.set(
        player.id,
        front.filter(
          (c) => c !== "piety" && c !== "asylum" && c !== "matchmaker" && c !== "black_cat"
        )
      );

      player.hasPiety = false;
      player.hasAsylum = false;
      player.hasMatchmaker = false;
      player.hasBlackCat = false;
    }

    this.state.blackCatOwnerId = "";
    this.matchmakerHolders = [];
    this.addLog("仅剩两名玩家 -- 所有蓝色卡牌已移除");
  }

  private syncTryalCards(playerId: string): void {
    const player = this.state.players.get(playerId);
    if (!player) return;

    const cards = this.tryalCardMap.get(playerId) ?? [];
    player.tryalCards.clear();
    player.publicTryalCards.clear();
    for (const card of cards) {
      player.tryalCards.push(serializeTryalCard(card));
      player.publicTryalCards.push(serializePublicTryalCard(card));
    }
    player.tryalCardCount = cards.length;
    player.tryalCardFaceUp = cards.filter((c) => c.faceUp).length;
  }

  private refreshPlayerRoles(playerId: string): void {
    const player = this.state.players.get(playerId);
    if (!player) return;

    const cards = this.tryalCardMap.get(playerId) ?? [];
    player.isWitch = cards.some((card) => card.type === "witch");
    if (player.isWitch) {
      player.hasBeenWitch = true;
    }
    player.isConstable = cards.some((card) => card.type === "constable" && !card.faceUp);
    player.tryalCardCount = cards.length;
    this.syncTryalCards(playerId);
    this.sendRoleInfo(playerId);
  }

  private sendRoleInfo(playerId: string): void {
    const player = this.state.players.get(playerId);
    if (!player) return;

    const witchPartners = this.getAlivePlayers()
      .filter((other) => other.id !== playerId && other.hasBeenWitch)
      .map((other) => other.id);

    this.sendToPlayer(playerId, "your_role", {
      isWitch: player.hasBeenWitch,
      isConstable: player.isConstable,
      witchPartners: player.hasBeenWitch ? witchPartners : [],
    });
  }

  private syncHandCount(player: Player): void {
    player.handCardCount = player.handCards.length;
  }

  private endCurrentDayTurn(): void {
    this.hasPlayedCard = false;
    this.state.currentTurnCanEnd = false;
    this.advancePlayerIndex();
    this.transitionTo("day_turn");
  }

  private drawNextCardForTurn(twoPlayerMode: boolean): CardType | null {
    let card = this.deck.drawTop();

    if (twoPlayerMode) {
      while (card !== null && isBlueCard(card)) {
        this.deck.discard([card]);
        card = this.deck.drawTop();
      }
    }

    return card;
  }

  private getAlivePlayerIdsInOrder(): string[] {
    return this.playerOrder.filter((id) => {
      const player = this.state.players.get(id);
      return Boolean(player?.isAlive);
    });
  }

  private getLeftAlivePlayerId(playerId: string): string | null {
    const aliveInOrder = this.getAlivePlayerIdsInOrder();
    const index = aliveInOrder.indexOf(playerId);
    if (index < 0 || aliveInOrder.length <= 1) return null;
    return aliveInOrder[(index - 1 + aliveInOrder.length) % aliveInOrder.length];
  }

  private advancePlayerIndex(): void {
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.playerOrder.length;
  }

  private checkWin(): WinCheckResult {
    return checkWinConditions(
      this.state.players as unknown as Map<string, Player>,
      this.tryalCardMap
    );
  }

  private buildPlayerReveals() {
    return this.getAllPlayers().map((player) => ({
      playerId: player.id,
      name: player.name,
      isWitch: player.hasBeenWitch,
      isConstable: player.isConstable,
      character: player.characterName,
    }));
  }

  getAlivePlayers(): Player[] {
    const result: Player[] = [];
    this.state.players.forEach((player) => {
      if (player.isAlive) {
        result.push(player);
      }
    });
    return result;
  }

  getAllPlayers(): Player[] {
    const result: Player[] = [];
    this.state.players.forEach((player) => {
      result.push(player);
    });
    return result;
  }

  // -- Timer Management --

  private startTimer(seconds: number, onExpire: () => void): void {
    this.clearTimer();
    this.state.timer = seconds;
    this.timerEndCallback = onExpire;

    this.timerInterval = setInterval(() => {
      if (this.state.isPaused) return;

      this.state.timer--;
      if (this.state.timer <= 0) {
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
        if (this.timerEndCallback) {
          const callback = this.timerEndCallback;
          this.timerEndCallback = null;
          callback();
        }
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.timerEndCallback = null;
  }

  // -- Coordinator Controls --

  pauseGame(coordinatorId: string): boolean {
    if (this.state.coordinatorId !== coordinatorId) return false;
    if (this.state.isPaused) return false;

    this.state.isPaused = true;
    this.timerPausedRemaining = this.state.timer;
    this.broadcast("paused", { by: coordinatorId });
    this.addLog("协调员已暂停游戏");
    return true;
  }

  resumeGame(coordinatorId: string): boolean {
    if (this.state.coordinatorId !== coordinatorId) return false;
    if (!this.state.isPaused) return false;

    this.state.isPaused = false;
    this.broadcast("resumed", { by: coordinatorId });
    this.addLog("协调员已恢复游戏");
    return true;
  }

  extendTime(coordinatorId: string, seconds: number): boolean {
    if (this.state.coordinatorId !== coordinatorId) return false;
    if (seconds !== 30 && seconds !== 60) return false;

    this.state.timer += seconds;
    this.broadcast("timer_extended", { seconds });
    this.addLog(`计时器延长${seconds}秒`);
    return true;
  }

  skipPhase(coordinatorId: string): boolean {
    if (this.state.coordinatorId !== coordinatorId) return false;

    // Trigger the timer callback immediately
    const callback = this.timerEndCallback;
    this.clearTimer();
    if (callback) {
      this.timerEndCallback = null;
      callback();
    } else {
      // Force advance to next logical phase
      this.forceNextPhase();
    }
    return true;
  }

  endTimer(coordinatorId: string): boolean {
    if (this.state.coordinatorId !== coordinatorId) return false;

    this.state.timer = 0;
    // Timer interval will catch this and trigger callback
    return true;
  }

  private forceNextPhase(): void {
    const phase = this.state.gamePhase as GamePhase;
    switch (phase) {
      case "dawn":
        this.transitionTo("day_turn");
        break;
      case "day_turn":
        this.advancePlayerIndex();
        this.transitionTo("day_turn");
        break;
      case "tryal":
        this.state.tryalTargetId = "";
        this.state.tryalChooserId = "";
        this.advancePlayerIndex();
        this.transitionTo("day_turn");
        break;
      case "conspiracy":
        this.resolveConspiracy();
        break;
      case "night_witch":
        this.transitionTo("night_constable");
        break;
      case "night_constable":
        this.transitionTo("night_confess");
        break;
      case "night_confess":
        this.transitionTo("night_resolve");
        break;
      case "night_resolve":
        this.finishNightResolve();
        break;
      default:
        break;
    }
  }

  // -- Logging --

  private addLog(message: string): void {
    this.state.gameLog.push(message);
    this.broadcast("log", { message });
  }

  // -- Cleanup --

  dispose(): void {
    this.clearTimer();
  }
}

function serializeTryalCard(card: TryalCard): string {
  return JSON.stringify({ type: card.type, faceUp: card.faceUp });
}

function serializePublicTryalCard(card: TryalCard): string {
  if (!card.faceUp) {
    return JSON.stringify({ faceUp: false });
  }
  return JSON.stringify({ type: card.type, faceUp: true });
}

function isBlueCard(card: CardType): boolean {
  return card === "piety" || card === "asylum" || card === "matchmaker" || card === "black_cat";
}

function sameCardMultiset(left: CardType[], right: CardType[]): boolean {
  if (left.length !== right.length) return false;

  const counts = new Map<CardType, number>();
  for (const card of left) {
    counts.set(card, (counts.get(card) ?? 0) + 1);
  }
  for (const card of right) {
    const count = counts.get(card) ?? 0;
    if (count <= 0) return false;
    counts.set(card, count - 1);
  }
  return true;
}
