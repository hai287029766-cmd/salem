import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useColyseus } from "../hooks/useColyseus";
import { useGameState, type PlayerState } from "../hooks/useGameState";
import { useVoiceConnection } from "../hooks/useVoiceConnection";
import { useSound } from "../hooks/useSound";
import type { Room } from "colyseus.js";
import type { CardType, TryalCardType } from "@salem/shared";
import PlayerSeat from "../components/PlayerSeat";
import CardHand from "../components/CardHand";
import ActionPanel from "../components/ActionPanel";
import CoordinatorBar from "../components/CoordinatorBar";
import PhaseBar from "../components/PhaseBar";
import Timer from "../components/Timer";
import GameLog from "../components/GameLog";
import VoicePanel from "../components/VoicePanel";
import NightOverlay from "../components/NightOverlay";
import PauseOverlay from "../components/PauseOverlay";
import ConfirmDialog from "../components/ConfirmDialog";
import CharacterCard from "../components/CharacterCard";

type ActionMode = "idle" | "play_card" | "select_target";

export default function Game() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { room: activeRoom, joinRoom, sendMessage } = useColyseus();
  const [room, setRoom] = useState<Room | null>(activeRoom);
  const { state, myId, roleInfo, logs, gameResult } = useGameState(room);
  const { play } = useSound();

  const [actionMode, setActionMode] = useState<ActionMode>("idle");
  const [selectedCards, setSelectedCards] = useState<CardType[]>([]);
  const [selectedCardIndexes, setSelectedCardIndexes] = useState<number[]>([]);
  const [showConfess, setShowConfess] = useState(false);
  const [showConfessConfirm, setShowConfessConfirm] = useState(false);
  const [selectedConfessIndex, setSelectedConfessIndex] = useState<number>(-1);
  const [conspiracySubmitted, setConspiracySubmitted] = useState(false);
  const [playedThisTurn, setPlayedThisTurn] = useState(false);

  useEffect(() => {
    if (activeRoom && activeRoom !== room) {
      setRoom(activeRoom);
    }
  }, [activeRoom, room]);

  useEffect(() => {
    if (!room && !activeRoom && roomCode) {
      const nickname = sessionStorage.getItem("salem_nickname") || "Player";
      joinRoom(roomCode, nickname)
        .then((r) => setRoom(r))
        .catch(() => navigate("/"));
    }
  }, [room, activeRoom, roomCode, joinRoom, navigate]);

  useEffect(() => {
    if (state?.gamePhase === "game_over") {
      navigate("/result", {
        state: {
          roomCode,
          winner: gameResult?.winner,
          reveals: gameResult?.reveals,
        },
      });
    }
  }, [state?.gamePhase, roomCode, navigate, gameResult]);

  const players = useMemo(() => {
    if (!state) return [];
    return Array.from(state.players.values()).sort((a, b) => a.seatIndex - b.seatIndex);
  }, [state]);

  const myPlayer = useMemo(() => {
    return players.find((p) => p.id === myId) ?? null;
  }, [players, myId]);
  const {
    micEnabled,
    toggleMic,
    speakingParticipants,
    connected: voiceConnected,
    voiceStatus,
  } = useVoiceConnection(room, state?.roomCode || roomCode, myPlayer);

  const isMyTurn = state?.currentPlayerId === myId;
  const isCoordinator = state?.coordinatorId === myId;
  const phase = state?.gamePhase ?? "lobby";

  const isNightPhase = phase === "night_witch" || phase === "night_constable" || phase === "night_confess" || phase === "night_resolve";
  const canEndTurn = isMyTurn && Boolean(state?.currentTurnCanEnd || playedThisTurn);

  useEffect(() => {
    setConspiracySubmitted(false);
  }, [phase, state?.round]);

  useEffect(() => {
    setPlayedThisTurn(false);
    setActionMode("idle");
    setSelectedCards([]);
    setSelectedCardIndexes([]);
  }, [state?.currentPlayerId, phase]);

  const handleSelectCard = useCallback((card: CardType, index: number) => {
    setSelectedCardIndexes((prev) => {
      if (prev.includes(index)) {
        return prev.filter((item) => item !== index);
      }
      return [...prev, index];
    });
    setSelectedCards((prev) => {
      if (selectedCardIndexes.includes(index)) {
        const next = [...prev];
        const removeAt = next.indexOf(card);
        if (removeAt >= 0) next.splice(removeAt, 1);
        return next;
      }
      return [...prev, card];
    });
    setActionMode("select_target");
  }, [selectedCardIndexes]);

  const handleTargetPlayer = useCallback((targetId: string) => {
    if (actionMode === "select_target" && selectedCards.length > 0) {
      sendMessage({ type: "play_cards", cards: selectedCards, targetId });
      play("card_play");
      setSelectedCards([]);
      setSelectedCardIndexes([]);
      setPlayedThisTurn(true);
      setActionMode("play_card");
    }
  }, [actionMode, selectedCards, sendMessage, play]);

  const handleDrawCards = useCallback(() => {
    sendMessage({ type: "draw_cards" });
    play("card_draw");
    setActionMode("idle");
    setSelectedCards([]);
    setSelectedCardIndexes([]);
  }, [sendMessage, play]);

  const handlePlayMode = useCallback(() => {
    setActionMode("play_card");
  }, []);

  const handleCancelPlayMode = useCallback(() => {
    setActionMode("idle");
    setSelectedCards([]);
    setSelectedCardIndexes([]);
  }, []);

  const handleEndTurn = useCallback(() => {
    if (canEndTurn) {
      sendMessage({ type: "end_turn" });
    }
    setActionMode("idle");
    setSelectedCards([]);
    setSelectedCardIndexes([]);
  }, [canEndTurn, sendMessage]);

  const handleUseCharacterSkill = useCallback(() => {
    if (!myPlayer?.characterName) return;

    if (myPlayer.characterName === "samuel_parris") {
      sendMessage({ type: "use_character_skill", cardCount: 2 });
      setPlayedThisTurn(true);
      return;
    }

    if (myPlayer.characterName === "tituba") {
      sendMessage({ type: "use_character_skill" });
      return;
    }

    if (myPlayer.characterName === "john_proctor") {
      const deadPlayer = players.find((player) => !player.isAlive && player.id !== myId);
      sendMessage({
        type: "use_character_skill",
        targetId: deadPlayer?.id,
        cardIndexes: deadPlayer ? [0] : undefined,
      });
      return;
    }

    sendMessage({ type: "use_character_skill" });
  }, [myPlayer?.characterName, myId, players, sendMessage]);

  const handleWitchKill = useCallback((targetId: string) => {
    sendMessage({ type: "witch_kill", targetId });
  }, [sendMessage]);

  const handleWitchPlaceBlackCat = useCallback((targetId: string) => {
    sendMessage({ type: "witch_place_blackcat", targetId });
    play("card_play");
  }, [sendMessage, play]);

  const handleConstableProtect = useCallback((targetId: string) => {
    sendMessage({ type: "constable_protect", targetId });
  }, [sendMessage]);

  const handleConfess = useCallback((cardIndex: number) => {
    setSelectedConfessIndex(cardIndex);
    setShowConfessConfirm(true);
  }, []);

  const confirmConfess = useCallback(() => {
    if (selectedConfessIndex >= 0) {
      sendMessage({ type: "confess", cardIndex: selectedConfessIndex });
      setShowConfessConfirm(false);
      setShowConfess(false);
      setSelectedConfessIndex(-1);
    }
  }, [selectedConfessIndex, sendMessage]);

  const handleTryalChoice = useCallback((targetId: string, cardIndex: number) => {
    sendMessage({ type: "choose_tryal_card", targetId, cardIndex });
    play("card_flip");
  }, [sendMessage, play]);

  const handleConspiracyPass = useCallback((cardIndex: number) => {
    sendMessage({ type: "conspiracy_pass", cardIndex });
    setConspiracySubmitted(true);
    play("card_flip");
  }, [sendMessage, play]);

  if (!state || !myId) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-salem-bg-primary">
        <p className="text-salem-text-secondary">连接中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-salem-bg-primary safe-area-top relative overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-salem-text-secondary/20 bg-salem-bg-secondary/80 backdrop-blur-sm z-20">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-salem-accent-gold font-heading">第{state.round}轮</span>
          <span data-testid="game-round" className="sr-only">{state.round}</span>
          <div data-testid="game-phase">
            <PhaseBar phase={phase} />
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-salem-text-secondary">牌堆:{state.deckRemaining}</span>
          <Timer seconds={state.timer} isPaused={state.isPaused} />
        </div>
      </header>

      {/* Coordinator bar */}
      {isCoordinator && (
        <CoordinatorBar
          isPaused={state.isPaused}
          onPause={() => sendMessage({ type: "coordinator_pause" })}
          onResume={() => sendMessage({ type: "coordinator_resume" })}
          onExtend={(seconds) => sendMessage({ type: "coordinator_extend_time", seconds })}
          onEndTimer={() => sendMessage({ type: "coordinator_end_timer" })}
          onSkipPhase={() => sendMessage({ type: "coordinator_skip_phase" })}
        />
      )}

      {/* Player cards area */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {players.map((player) => (
            <PlayerSeat
              key={player.id}
              player={player}
              isCurrentTurn={player.id === state.currentPlayerId}
              isSelf={player.id === myId}
              isSpeaking={speakingParticipants.has(player.id)}
              selectable={actionMode === "select_target" && player.id !== myId && player.isAlive}
              onSelect={() => handleTargetPlayer(player.id)}
              testId={`game-player-seat-${player.seatIndex}`}
            />
          ))}
        </div>
      </div>

      {/* Game log */}
      <GameLog entries={logs.length > 0 ? logs : state.gameLog} />

      {myPlayer?.characterName && (
        <div className="border-t border-salem-text-secondary/20 bg-salem-bg-primary/80 px-3 py-2">
          <CharacterCard
            characterName={myPlayer.characterName}
            ability={myPlayer.characterAbility}
            testId="game-my-character-card"
            onUseSkill={handleUseCharacterSkill}
            skillDisabled={!isMyTurn && myPlayer.characterName !== "john_proctor"}
            skillLabel={getSkillButtonLabel(myPlayer.characterName)}
          />
        </div>
      )}

      {/* Hand cards */}
      {myPlayer && (
        <CardHand
          cards={myPlayer.handCards}
          selectedCardIndexes={selectedCardIndexes}
          onSelectCard={handleSelectCard}
          disabled={!isMyTurn || actionMode === "idle"}
        />
      )}

      {/* Action panel */}
      <ActionPanel
        isMyTurn={isMyTurn}
        actionMode={actionMode}
        onPlayMode={handlePlayMode}
        onDrawCards={handleDrawCards}
        onCancelPlayMode={handleCancelPlayMode}
        onEndTurn={handleEndTurn}
        canEndTurn={canEndTurn}
      />

      {/* Voice control (floating) */}
      <VoicePanel
        micEnabled={micEnabled}
        connected={voiceConnected}
        status={voiceStatus}
        onToggleMic={toggleMic}
      />

      {/* Night overlay */}
      {isNightPhase && (
        <NightOverlay
          phase={phase}
          roleInfo={roleInfo}
          players={players}
          myId={myId}
          timer={state.timer}
          onWitchKill={handleWitchKill}
          onConstableProtect={handleConstableProtect}
          onConfess={handleConfess}
          onShowConfess={() => setShowConfess(true)}
          showConfess={showConfess}
        />
      )}

      {phase === "dawn" && (
        <DawnBlackCatOverlay
          roleInfo={roleInfo}
          players={players}
          timer={state.timer}
          blackCatOwnerId={state.blackCatOwnerId}
          onChoose={handleWitchPlaceBlackCat}
        />
      )}

      {/* Tryal overlay */}
      {phase === "tryal" && (
        <TryalOverlay
          state={state}
          myId={myId}
          onChoose={handleTryalChoice}
        />
      )}

      {phase === "conspiracy" && (
        <ConspiracyOverlay
          players={players}
          myId={myId}
          timer={state.timer}
          submitted={conspiracySubmitted}
          onChoose={handleConspiracyPass}
        />
      )}

      {/* Pause overlay */}
      {state.isPaused && (
        <PauseOverlay
          coordinatorName={state.players.get(state.coordinatorId)?.name ?? ""}
          isCoordinator={isCoordinator}
          onResume={() => sendMessage({ type: "coordinator_resume" })}
        />
      )}

      {/* Confess confirmation */}
      {showConfessConfirm && (
        <ConfirmDialog
          title="确认认罪"
          message="翻开一张审判卡以换取本轮免死。此操作不可撤销。"
          confirmText="确认"
          cancelText="取消"
          onConfirm={confirmConfess}
          onCancel={() => {
            setShowConfessConfirm(false);
            setSelectedConfessIndex(-1);
          }}
        />
      )}
    </div>
  );
}

interface ParsedTryalCard {
  type: TryalCardType;
  faceUp: boolean;
}

const TRYAL_LABELS: Record<TryalCardType, string> = {
  witch: "女巫",
  not_witch: "非女巫",
  constable: "警长",
};

const TRYAL_CARD_CLASSES: Record<TryalCardType, string> = {
  witch: "border-salem-witch bg-salem-witch/30 text-salem-text-primary",
  not_witch: "border-salem-townfolk bg-salem-townfolk/30 text-salem-text-primary",
  constable: "border-salem-constable bg-salem-constable/30 text-salem-text-primary",
};

function parseTryalCard(value: string | undefined): ParsedTryalCard | null {
  if (!value) return null;
  if (value === "witch" || value === "not_witch" || value === "constable") {
    return { type: value, faceUp: true };
  }

  try {
    const parsed = JSON.parse(value) as Partial<ParsedTryalCard>;
    if (parsed.type === "witch" || parsed.type === "not_witch" || parsed.type === "constable") {
      return {
        type: parsed.type,
        faceUp: parsed.faceUp ?? true,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function getLeftHandAlivePlayer(players: PlayerState[], myId: string): PlayerState | null {
  const alivePlayers = players.filter((player) => player.isAlive).sort((a, b) => a.seatIndex - b.seatIndex);
  const myIndex = alivePlayers.findIndex((player) => player.id === myId);
  if (myIndex < 0 || alivePlayers.length <= 1) return null;
  return alivePlayers[(myIndex - 1 + alivePlayers.length) % alivePlayers.length];
}

function getSkillButtonLabel(characterName: string): string {
  switch (characterName) {
    case "samuel_parris":
      return "从弃牌堆抽牌";
    case "tituba":
      return "查看牌堆";
    case "john_proctor":
      return "查看死者手牌";
    default:
      return "查看技能状态";
  }
}

// Tryal sub-overlay
function TryalOverlay({
  state,
  myId,
  onChoose,
}: {
  state: {
    currentPlayerId: string;
    tryalTargetId: string;
    tryalChooserId: string;
    players: Map<string, PlayerState>;
    timer: number;
  };
  myId: string;
  onChoose: (targetId: string, cardIndex: number) => void;
}) {
  const target = state.players.get(state.tryalTargetId);
  if (!target) return null;

  const canChoose = state.tryalChooserId === myId;
  const cardSlots = Array.from({
    length: Math.max(target.tryalCardCount, target.publicTryalCards.length, target.tryalCards.length),
  }, (_, i) => i);
  const faceUpCount = target.tryalCardFaceUp;

  return (
    <div className="absolute inset-0 z-40 bg-black/80 flex flex-col items-center justify-center px-6">
      <h2 className="font-heading text-2xl text-salem-accent-gold mb-2">审判 {target.name}!</h2>
      <p className="text-salem-text-secondary text-sm mb-6">指控值达到上限</p>
      <p className="text-sm text-salem-text-primary mb-4">选择翻开哪张审判卡:</p>
      <div className="flex gap-3 flex-wrap justify-center">
        {cardSlots.map((i) => {
          const publicCard = parseTryalCard(target.publicTryalCards[i]);
          const isRevealed = Boolean(publicCard) || i < faceUpCount;
          return (
            <button
              key={i}
              data-testid={`tryal-card-${i}`}
              disabled={isRevealed || !canChoose}
              onClick={() => onChoose(state.tryalTargetId, i)}
              className={`w-14 h-20 rounded-card flex items-center justify-center text-lg font-bold transition-all
                ${publicCard
                  ? `${TRYAL_CARD_CLASSES[publicCard.type]} border-2 text-xs`
                  : isRevealed
                  ? "bg-salem-bg-secondary border border-salem-text-secondary/40 text-salem-text-secondary"
                  : "bg-salem-accent-black border-2 border-salem-accent-gold/60 text-salem-accent-gold hover:shadow-glow cursor-pointer"}`}
            >
              {publicCard ? TRYAL_LABELS[publicCard.type] : isRevealed ? "已公开" : "?"}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <Timer seconds={state.timer} isPaused={false} />
      </div>
    </div>
  );
}

function ConspiracyOverlay({
  players,
  myId,
  timer,
  submitted,
  onChoose,
}: {
  players: PlayerState[];
  myId: string;
  timer: number;
  submitted: boolean;
  onChoose: (cardIndex: number) => void;
}) {
  const myPlayer = players.find((player) => player.id === myId);
  const sourcePlayer = getLeftHandAlivePlayer(players, myId);

  if (!myPlayer?.isAlive || !sourcePlayer) {
    return (
      <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 px-6">
        <h2 className="font-heading text-2xl text-salem-accent-gold">阴谋传递</h2>
        <p className="mt-3 text-center text-sm text-salem-text-secondary">等待存活玩家选择身份牌</p>
        <div className="mt-4"><Timer seconds={timer} isPaused={false} /></div>
      </div>
    );
  }

  const cardCount = Math.max(
    sourcePlayer.tryalCardCount,
    sourcePlayer.publicTryalCards.length,
    sourcePlayer.tryalCards.length,
  );
  const cardSlots = Array.from({ length: cardCount }, (_, index) => {
    const publicCard = parseTryalCard(sourcePlayer.publicTryalCards[index]);
    return {
      index,
      publicCard,
      faceUp: Boolean(publicCard) || index < sourcePlayer.tryalCardFaceUp,
    };
  });
  const selectableSlots = cardSlots.filter((card) => !card.faceUp);

  return (
    <div
      data-testid="conspiracy-overlay"
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/85 px-5"
    >
      <h2 className="font-heading text-2xl text-salem-accent-gold">阴谋传递</h2>
      <p className="mt-2 text-center text-sm text-salem-text-primary">
        从左手边玩家 {sourcePlayer.name} 的未公开身份牌中选择一张
      </p>
      <div className="mt-4"><Timer seconds={timer} isPaused={false} /></div>

      {submitted ? (
        <p data-testid="conspiracy-submitted" className="mt-6 text-sm text-salem-text-secondary">
          已选择，等待其他玩家
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {cardSlots.map((card) => (
            <button
              key={card.index}
              data-testid={`conspiracy-card-${card.index}`}
              className={`flex h-24 w-16 items-center justify-center rounded-card border-2 text-sm font-bold transition-all
                ${card.publicCard
                  ? TRYAL_CARD_CLASSES[card.publicCard.type]
                  : card.faceUp
                  ? "border-salem-text-secondary/40 bg-salem-bg-secondary text-salem-text-secondary"
                  : "border-salem-accent-gold/60 bg-salem-accent-black text-salem-accent-gold hover:shadow-glow"}`}
              disabled={card.faceUp}
              onClick={() => onChoose(card.index)}
            >
              {card.publicCard ? TRYAL_LABELS[card.publicCard.type] : card.faceUp ? "已公开" : "?"}
            </button>
          ))}
        </div>
      )}

      {!submitted && selectableSlots.length === 0 && (
        <p className="mt-4 text-center text-xs text-salem-text-secondary">没有可选择的未公开身份牌</p>
      )}
    </div>
  );
}

function DawnBlackCatOverlay({
  roleInfo,
  players,
  timer,
  blackCatOwnerId,
  onChoose,
}: {
  roleInfo: { isWitch: boolean } | null;
  players: PlayerState[];
  timer: number;
  blackCatOwnerId: string;
  onChoose: (targetId: string) => void;
}) {
  const alivePlayers = players.filter((player) => player.isAlive);
  const selectedOwner = players.find((player) => player.id === blackCatOwnerId);

  return (
    <div
      data-testid="dawn-black-cat-overlay"
      className="absolute inset-0 z-40 flex flex-col bg-black/85 px-4 py-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl text-salem-accent-gold">黎明 - 放置黑猫</h2>
          <p className="mt-1 text-sm leading-relaxed text-salem-text-secondary">
            女巫选择一名玩家，黑猫持有者成为第一个行动玩家
          </p>
        </div>
        <Timer seconds={timer} isPaused={false} />
      </div>

      {roleInfo?.isWitch ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {alivePlayers.map((player) => (
            <button
              key={player.id}
              data-testid={`dawn-black-cat-target-${player.seatIndex}`}
              className={`rounded-card border px-4 py-4 text-left transition-all ${
                player.id === blackCatOwnerId
                  ? "border-salem-accent-gold bg-salem-accent-gold/20"
                  : "border-salem-accent-gold/30 bg-salem-bg-secondary/80 hover:border-salem-accent-gold"
              }`}
              onClick={() => onChoose(player.id)}
            >
              <span className="block font-heading text-base text-salem-text-primary">{player.name}</span>
              <span className="mt-1 block text-xs text-salem-text-secondary">
                {player.id === blackCatOwnerId ? "黑猫当前在这里" : "放置黑猫"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-12 rounded-card border border-salem-accent-gold/20 bg-salem-bg-secondary/80 p-5 text-center">
          <p className="font-heading text-lg text-salem-text-primary">所有人闭眼</p>
          <p className="mt-2 text-sm text-salem-text-secondary">
            等待女巫放置黑猫{selectedOwner ? `：${selectedOwner.name}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
