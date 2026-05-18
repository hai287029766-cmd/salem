import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, ScrollText, Users } from "lucide-react";
import { useColyseus } from "../hooks/useColyseus";
import { useGameState } from "../hooks/useGameState";
import { useVoiceConnection } from "../hooks/useVoiceConnection";
import { useSound } from "../hooks/useSound";
import type { Room } from "colyseus.js";
import type { CardType } from "@salem/shared";
import PlayerSeat from "../components/PlayerSeat";
import CardHandStrip from "../components/CardHandStrip";
import ActionPanel from "../components/ActionPanel";
import CoordinatorBar from "../components/CoordinatorBar";
import Timer from "../components/Timer";
import GameLog from "../components/GameLog";
import VoicePanel from "../components/VoicePanel";
import NightOverlay from "../components/NightOverlay";
import PauseOverlay from "../components/PauseOverlay";
import ConfirmDialog from "../components/ConfirmDialog";
import TryalOverlay from "../components/TryalOverlay";
import ConspiracyOverlay from "../components/ConspiracyOverlay";
import DawnBlackCatOverlay from "../components/DawnBlackCatOverlay";
import PhaseTransition from "../components/PhaseTransition";
import TitubaSkillOverlay from "../components/TitubaSkillOverlay";
import Toast from "../components/Toast";

type ActionMode = "idle" | "play_card" | "select_target";
type TabId = "game" | "log";

const PHASE_LABELS: Record<string, { name: string; sub: string }> = {
  lobby: { name: "大厅", sub: "等待中" },
  dealing: { name: "发牌", sub: "洗牌中" },
  dawn: { name: "黎明", sub: "放置黑猫" },
  day_turn: { name: "白天", sub: "进行操作" },
  tryal: { name: "审判", sub: "揭露身份" },
  conspiracy: { name: "传染", sub: "传递身份牌" },
  night_witch: { name: "夜间", sub: "女巫行动" },
  night_constable: { name: "夜间", sub: "警长保护" },
  night_confess: { name: "夜间", sub: "认罪或沉默" },
  night_resolve: { name: "夜间", sub: "命运揭晓" },
  game_over: { name: "结束", sub: "游戏结束" },
};

export default function Game() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { room: activeRoom, joinRoom, sendMessage } = useColyseus();
  const [room, setRoom] = useState<Room | null>(activeRoom);
  const { state, myId, roleInfo, logs, gameResult, witchVoteState, lastEvent, nightResolveResult, titubaSkillData, clearTitubaSkillData, constableLastProtected } = useGameState(room);
  const { play } = useSound();

  const [actionMode, setActionMode] = useState<ActionMode>("idle");
  const [selectedCards, setSelectedCards] = useState<CardType[]>([]);
  const [selectedCardIndexes, setSelectedCardIndexes] = useState<number[]>([]);
  const [showConfess, setShowConfess] = useState(false);
  const [showConfessConfirm, setShowConfessConfirm] = useState(false);
  const [selectedConfessIndex, setSelectedConfessIndex] = useState<number>(-1);
  const [conspiracySubmitted, setConspiracySubmitted] = useState(false);
  const [playedThisTurn, setPlayedThisTurn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("game");
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [primaryTargetId, setPrimaryTargetId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeRoom && activeRoom !== room) setRoom(activeRoom);
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
        state: { roomCode, winner: gameResult?.winner, reveals: gameResult?.reveals },
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
    micEnabled, toggleMic, speakingParticipants,
    connected: voiceConnected, voiceStatus,
  } = useVoiceConnection(room, state?.roomCode || roomCode, myPlayer);

  const isMyTurn = state?.currentPlayerId === myId;
  const isCoordinator = state?.coordinatorId === myId;
  const phase = state?.gamePhase ?? "lobby";
  const isNightPhase = phase === "night_witch" || phase === "night_constable" || phase === "night_confess" || phase === "night_resolve";
  const canEndTurn = isMyTurn && Boolean(state?.currentTurnCanEnd || playedThisTurn);

  useEffect(() => {
    if (lastEvent?.type === "sound_effect" && lastEvent.sound) {
      play(lastEvent.sound);
    }
    if ((lastEvent as unknown as { type: string })?.type === "constable_auto_protect") {
      const targetName = (lastEvent as unknown as { targetName: string }).targetName;
      setToastMessage(`超时，已随机保护 ${targetName}`);
    }
  }, [lastEvent, play]);

  // Auto-expand current turn player
  useEffect(() => {
    if (state?.currentPlayerId) {
      setExpandedPlayerId(state.currentPlayerId);
    }
  }, [state?.currentPlayerId, phase]);

  useEffect(() => { setConspiracySubmitted(false); }, [phase, state?.round]);
  useEffect(() => {
    setPlayedThisTurn(false);
    setActionMode("idle");
    setSelectedCards([]);
    setSelectedCardIndexes([]);
    setPrimaryTargetId(null);
  }, [state?.currentPlayerId, phase]);

  const handleTogglePlayer = useCallback((playerId: string) => {
    setExpandedPlayerId((prev) => (prev === playerId ? null : playerId));
  }, []);

  const handleSelectCard = useCallback((card: CardType, index: number) => {
    setSelectedCardIndexes((prevIndexes) => {
      const removing = prevIndexes.includes(index);
      setSelectedCards((prevCards) => {
        if (removing) {
          const next = [...prevCards];
          const at = next.indexOf(card);
          if (at >= 0) next.splice(at, 1);
          return next;
        }
        return [...prevCards, card];
      });
      if (removing && (card === "robbery" || card === "scapegoat")) {
        setPrimaryTargetId(null);
      }
      return removing ? prevIndexes.filter((i) => i !== index) : [...prevIndexes, index];
    });
    setActionMode("select_target");
  }, []);

  const needsTwoTargets = selectedCards.some(
    (c) => c === "robbery" || c === "scapegoat"
  );

  const handleTargetPlayer = useCallback((targetId: string) => {
    if (actionMode !== "select_target" || selectedCards.length === 0) return;

    if (needsTwoTargets && !primaryTargetId) {
      setPrimaryTargetId(targetId);
      return;
    }

    sendMessage({
      type: "play_cards",
      cards: selectedCards,
      targetId: primaryTargetId || targetId,
      secondaryTargetId: primaryTargetId ? targetId : undefined,
    });
    play("card_play");
    setSelectedCards([]);
    setSelectedCardIndexes([]);
    setPrimaryTargetId(null);
    setPlayedThisTurn(true);
    setActionMode("play_card");
  }, [actionMode, selectedCards, needsTwoTargets, primaryTargetId, sendMessage, play]);

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
    setPrimaryTargetId(null);
  }, []);

  const handleEndTurn = useCallback(() => {
    if (canEndTurn) sendMessage({ type: "end_turn" });
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
      const dead = players.find((p) => !p.isAlive && p.id !== myId);
      sendMessage({ type: "use_character_skill", targetId: dead?.id, cardIndexes: dead ? [0] : undefined });
      return;
    }
    sendMessage({ type: "use_character_skill" });
  }, [myPlayer?.characterName, myId, players, sendMessage]);

  const handleWitchKill = useCallback((targetId: string) => {
    sendMessage({ type: "witch_kill", targetId });
  }, [sendMessage]);

  const handleWitchVote = useCallback((targetId: string) => {
    sendMessage({ type: "witch_vote", targetId });
  }, [sendMessage]);

  const handleWitchConfirm = useCallback(() => {
    sendMessage({ type: "witch_confirm" });
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

  const handleDeclineConfess = useCallback(() => {
    sendMessage({ type: "decline_confess" });
  }, [sendMessage]);

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
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-salem-bg-dark">
        <p className="text-salem-text-ink font-body">连接中...</p>
      </div>
    );
  }

  const phaseInfo = PHASE_LABELS[phase] ?? { name: phase, sub: "" };

  return (
    <div className="relative z-[1] min-h-screen min-h-[100dvh] flex flex-col max-w-[430px] mx-auto safe-area-top overflow-hidden">
      {/* === Top bar: wax seal + phase + timer === */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-salem-accent-gold/15">
        <WaxSealRound round={state.round} />
        <div data-testid="game-deck-remaining" className="flex items-center gap-1 text-salem-text-ink">
          <BookOpen size={13} className="opacity-60" />
          <span className="text-xs font-heading">{state.deckRemaining}</span>
        </div>
        <div className="text-right">
          <div data-testid="game-phase" className="font-heading text-base text-salem-accent-gold tracking-wide">
            {phaseInfo.name}
          </div>
          <div className="text-[11px] text-salem-text-ink italic">{phaseInfo.sub}</div>
        </div>
        <div>
          <span data-testid="game-round" className="sr-only">{state.round}</span>
          <Timer seconds={state.timer} isPaused={state.isPaused} />
        </div>
      </header>

      {/* Coordinator bar */}
      {isCoordinator && (
        <CoordinatorBar
          isPaused={state.isPaused}
          onPause={() => sendMessage({ type: "coordinator_pause" })}
          onResume={() => sendMessage({ type: "coordinator_resume" })}
          onExtend={(s) => sendMessage({ type: "coordinator_extend_time", seconds: s })}
          onEndTimer={() => sendMessage({ type: "coordinator_end_timer" })}
          onSkipPhase={() => sendMessage({ type: "coordinator_skip_phase" })}
        />
      )}

      {/* === Main content (tab-driven) === */}
      <div className="flex-1 overflow-y-auto pb-40">
        {/* GAME tab — unified players + hand */}
        {activeTab === "game" && (
          <div className="flex flex-col gap-2 px-3 py-3">
            {needsTwoTargets && actionMode === "select_target" && !primaryTargetId && (
              <div className="text-center text-sm text-salem-accent-gold font-heading py-1 bg-salem-accent-gold/10 rounded-card">
                第1步: 选择来源玩家
              </div>
            )}
            {primaryTargetId && (
              <div className="text-center text-sm text-salem-accent-gold font-heading py-1 bg-salem-accent-gold/10 rounded-card">
                第2步: 选择接收目标
              </div>
            )}
            {players.map((player) => (
              <PlayerSeat
                key={player.id}
                player={player}
                isCurrentTurn={player.id === state.currentPlayerId}
                isSelf={player.id === myId}
                isSpeaking={speakingParticipants.has(player.id)}
                selectable={actionMode === "select_target" && player.id !== myId && player.isAlive && player.id !== primaryTargetId}
                onSelect={() => handleTargetPlayer(player.id)}
                expanded={expandedPlayerId === player.id}
                onToggle={() => handleTogglePlayer(player.id)}
                testId={`game-player-seat-${player.seatIndex}`}
              />
            ))}
          </div>
        )}

        {/* LOG tab - always in DOM for state tracking, hidden when inactive */}
        <div className={activeTab === "log" ? "px-3 py-3" : "sr-only"}>
          <GameLog entries={logs.length > 0 ? logs : state.gameLog} />
        </div>
      </div>

      {/* === Compact hand strip (fixed above action bar) === */}
      {myPlayer && activeTab === "game" && (
        <CardHandStrip
          cards={myPlayer.handCards}
          selectedCardIndexes={selectedCardIndexes}
          onSelectCard={handleSelectCard}
          disabled={!isMyTurn || actionMode === "idle"}
          isPlayMode={actionMode !== "idle"}
          characterName={myPlayer.characterName}
          characterLabel={getSkillTooltip(myPlayer.characterName)}
          onUseSkill={handleUseCharacterSkill}
          skillDisabled={!isMyTurn && myPlayer.characterName !== "john_proctor"}
          skillLabel={getSkillButtonLabel(myPlayer.characterName)}
        />
      )}

      {/* === Action bar (always visible during game) === */}
      <ActionPanel
        isMyTurn={isMyTurn}
        actionMode={actionMode}
        onPlayMode={handlePlayMode}
        onDrawCards={handleDrawCards}
        onCancelPlayMode={handleCancelPlayMode}
        onEndTurn={handleEndTurn}
        canEndTurn={canEndTurn}
        round={state.round}
      />

      {/* === Bottom tab navigation === */}
      <BottomTabs activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Voice panel (floating) */}
      <VoicePanel
        micEnabled={micEnabled}
        connected={voiceConnected}
        status={voiceStatus}
        onToggleMic={toggleMic}
      />

      {/* === Overlays === */}
      {isNightPhase && (
        <NightOverlay
          phase={phase}
          roleInfo={roleInfo}
          players={players}
          myId={myId}
          timer={state.timer}
          onWitchVote={handleWitchVote}
          onWitchConfirm={handleWitchConfirm}
          onWitchKill={handleWitchKill}
          witchVoteState={witchVoteState}
          onConstableProtect={handleConstableProtect}
          onConfess={handleConfess}
          onDeclineConfess={handleDeclineConfess}
          onShowConfess={() => setShowConfess(true)}
          showConfess={showConfess}
          nightResolveResult={nightResolveResult}
          round={state.round}
          constableLastProtected={constableLastProtected}
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

      {phase === "tryal" && (
        <TryalOverlay state={state} myId={myId} onChoose={handleTryalChoice} lastEvent={lastEvent} />
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

      {state.isPaused && (
        <PauseOverlay
          coordinatorName={state.players.get(state.coordinatorId)?.name ?? ""}
          isCoordinator={isCoordinator}
          onResume={() => sendMessage({ type: "coordinator_resume" })}
        />
      )}

      {showConfessConfirm && (
        <ConfirmDialog
          title="确认认罪"
          message="翻开一张审判卡来渡过本轮。此操作无法撤销。"
          confirmText="确认"
          cancelText="取消"
          onConfirm={confirmConfess}
          onCancel={() => { setShowConfessConfirm(false); setSelectedConfessIndex(-1); }}
        />
      )}

      {titubaSkillData && (
        <TitubaSkillOverlay
          deck={titubaSkillData.deck}
          timer={state.timer}
          onConfirm={(newOrder) => {
            sendMessage({ type: "use_character_skill", deckOrder: newOrder });
            clearTitubaSkillData();
          }}
          onCancel={clearTitubaSkillData}
        />
      )}

      <PhaseTransition phase={phase} />

      {toastMessage && (
        <Toast message={toastMessage} duration={4000} onDismiss={() => setToastMessage(null)} />
      )}
    </div>
  );
}

function WaxSealRound({ round }: { round: number }) {
  return (
    <div className="wax-seal">
      <div className="relative z-[2] text-center font-heading leading-tight">
        <span className="block text-lg font-black text-salem-accent-gold" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
          {round}
        </span>
        <span className="block text-[9px] text-salem-accent-gold/80">轮次</span>
      </div>
    </div>
  );
}

function BottomTabs({
  activeTab,
  onChangeTab,
}: {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
}) {
  const tabs: { id: TabId; label: string; icon: typeof Users }[] = [
    { id: "game", label: "玩家", icon: Users },
    { id: "log", label: "日志", icon: ScrollText },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto flex justify-around py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-salem-bg-dark/95 via-salem-bg-dark/90 to-transparent backdrop-blur-sm border-t border-salem-accent-gold/10 z-30">
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={`flex flex-col items-center gap-1 px-3.5 py-1.5 rounded-card transition-all ${
              active ? "bg-salem-accent-gold/10" : ""
            }`}
            onClick={() => onChangeTab(tab.id)}
            aria-label={tab.label}
          >
            <Icon
              size={20}
              className={`transition-all ${
                active
                  ? "text-salem-accent-gold drop-shadow-[0_0_6px_rgba(184,148,63,0.4)]"
                  : "text-salem-text-ink opacity-50"
              }`}
            />
            <span
              className={`text-[9px] font-heading tracking-wider ${
                active ? "text-salem-accent-gold" : "text-salem-text-ink"
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function getSkillButtonLabel(characterName: string): string {
  switch (characterName) {
    case "samuel_parris": return "从弃牌堆抽牌";
    case "tituba": return "查看牌堆";
    case "john_proctor": return "查看死者手牌";
    default: return "技能状态";
  }
}

function getSkillTooltip(characterName: string): string {
  switch (characterName) {
    case "samuel_parris": return "Samuel Parris: 从弃牌堆中抽取2张牌加入手牌";
    case "tituba": return "Tituba: 查看并重新排列牌堆顶部的牌";
    case "john_proctor": return "John Proctor: 查看一名已死亡玩家的手牌";
    default: return "角色技能";
  }
}
