import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, Flame, HelpCircle, ScrollText, Shield, Users, X } from "lucide-react";
import { useColyseus } from "../hooks/useColyseus";
import { useGameState } from "../hooks/useGameState";
import { useVoiceConnection } from "../hooks/useVoiceConnection";
import { useSound } from "../hooks/useSound";
import type { Room } from "colyseus.js";
import { CHARACTER_DEFINITIONS } from "@salem/shared";
import type { CardType, CharacterName } from "@salem/shared";
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
type ToastItem = { id: number; message: string };

const PHASE_LABELS: Record<string, { name: string; sub: string }> = {
  lobby: { name: "大厅", sub: "等待中" },
  dealing: { name: "发牌", sub: "洗牌中" },
  dawn: { name: "黎明", sub: "放置黑猫" },
  day_turn: { name: "白天", sub: "进行操作" },
  tryal: { name: "审判", sub: "揭露身份" },
  conspiracy: { name: "阴谋", sub: "传递身份牌" },
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
  const [activeTab, setActiveTab] = useState<TabId>("game");
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [primaryTargetId, setPrimaryTargetId] = useState<string | null>(null);
  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [roleRevealDismissed, setRoleRevealDismissed] = useState(false);
  const toastIdRef = useRef(0);
  const selectedCardIndexesRef = useRef<number[]>([]);

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
  const isMyDayTurn = isMyTurn && phase === "day_turn";
  const isNightPhase = phase === "night_witch" || phase === "night_constable" || phase === "night_confess" || phase === "night_resolve";
  const canEndTurn = isMyDayTurn && Boolean(state?.currentTurnCanEnd);
  const currentPlayerName = players.find((p) => p.id === state?.currentPlayerId)?.name ?? "";
  const voiceVisible = voiceConnected || voiceStatus === "connecting";
  const activeToast = toastQueue[0] ?? null;

  const pushToast = useCallback((message: string) => {
    setToastQueue((prev) => [...prev, { id: toastIdRef.current++, message }]);
  }, []);

  const dismissToast = useCallback(() => {
    setToastQueue((prev) => prev.slice(1));
  }, []);

  const dismissRoleReveal = useCallback(() => {
    setRoleRevealDismissed(true);
  }, []);

  useEffect(() => {
    if (lastEvent?.type === "sound_effect" && lastEvent.sound) {
      play(lastEvent.sound);
    }
    if (lastEvent?.type === "constable_auto_protect") {
      pushToast(`超时，已随机保护 ${lastEvent.targetName}`);
    }
    if (lastEvent?.type === "draw_result") {
      pushToast(`抽到 ${lastEvent.count} 张牌`);
    }
    if (lastEvent?.type === "role_changed") {
      pushToast(lastEvent.message);
    }
    if (lastEvent?.type === "protection_result") {
      pushToast(lastEvent.saved ? `你的保护拯救了 ${lastEvent.targetName}` : `已保护 ${lastEvent.targetName}`);
    }
    if (lastEvent?.type === "player_notice") {
      pushToast(lastEvent.message);
    }
    if (lastEvent?.type === "player_killed") {
      pushToast(`${lastEvent.playerName} 死亡：${lastEvent.reason}`);
    }
    if (lastEvent?.type === "character_skill_result" && lastEvent.message) {
      pushToast(lastEvent.message);
    }
    if (lastEvent?.type === "action_rejected") {
      pushToast(lastEvent.message);
    }
  }, [lastEvent, play, pushToast]);

  // Auto-expand current turn player
  useEffect(() => {
    if (state?.currentPlayerId) {
      setExpandedPlayerId(state.currentPlayerId);
    }
  }, [state?.currentPlayerId, phase]);

  useEffect(() => { setConspiracySubmitted(false); setShowConfess(false); }, [phase, state?.round]);
  useEffect(() => { setRoleRevealDismissed(false); }, [state?.roomCode]);
  useEffect(() => {
    setActionMode("idle");
    selectedCardIndexesRef.current = [];
    setSelectedCards([]);
    setSelectedCardIndexes([]);
    setPrimaryTargetId(null);
  }, [state?.currentPlayerId, phase]);

  const handleTogglePlayer = useCallback((playerId: string) => {
    setExpandedPlayerId((prev) => (prev === playerId ? null : playerId));
  }, []);

  const handleSelectCard = useCallback((card: CardType, index: number) => {
    const removing = selectedCardIndexesRef.current.includes(index);
    const nextIndexes = removing
      ? selectedCardIndexesRef.current.filter((i) => i !== index)
      : [...selectedCardIndexesRef.current, index];
    const handCards = myPlayer?.handCards ?? [];
    const nextCards = nextIndexes
      .map((i) => handCards[i])
      .filter((item): item is CardType => Boolean(item));

    selectedCardIndexesRef.current = nextIndexes;
    setSelectedCardIndexes(nextIndexes);
    setSelectedCards(nextCards);

    if (removing && (card === "robbery" || card === "scapegoat")) {
      setPrimaryTargetId(null);
    }
    setActionMode(nextIndexes.length > 0 ? "select_target" : "play_card");
  }, [myPlayer?.handCards]);

  const needsTwoTargets = selectedCards.some(
    (c) => c === "robbery" || c === "scapegoat"
  );

  const handleTargetPlayer = useCallback((targetId: string) => {
    const handCards = myPlayer?.handCards ?? [];
    const cardsToPlay = selectedCardIndexesRef.current
      .map((index) => handCards[index])
      .filter((item): item is CardType => Boolean(item));
    if (actionMode !== "select_target" || cardsToPlay.length === 0) return;

    const cardsNeedTwoTargets = cardsToPlay.some(
      (c) => c === "robbery" || c === "scapegoat"
    );

    if (cardsNeedTwoTargets && !primaryTargetId) {
      setPrimaryTargetId(targetId);
      return;
    }

    sendMessage({
      type: "play_cards",
      cards: cardsToPlay,
      targetId: primaryTargetId || targetId,
      secondaryTargetId: primaryTargetId ? targetId : undefined,
    });
    selectedCardIndexesRef.current = [];
    setSelectedCards([]);
    setSelectedCardIndexes([]);
    setPrimaryTargetId(null);
    setActionMode("play_card");
  }, [actionMode, myPlayer?.handCards, primaryTargetId, sendMessage]);

  const handleDrawCards = useCallback(() => {
    if (phase !== "day_turn") return;
    sendMessage({ type: "draw_cards" });
    setActionMode("idle");
    selectedCardIndexesRef.current = [];
    setSelectedCards([]);
    setSelectedCardIndexes([]);
  }, [phase, sendMessage]);

  const handlePlayMode = useCallback(() => {
    if (phase !== "day_turn") return;
    setActionMode("play_card");
  }, [phase]);

  const handleCancelPlayMode = useCallback(() => {
    setActionMode("idle");
    selectedCardIndexesRef.current = [];
    setSelectedCards([]);
    setSelectedCardIndexes([]);
    setPrimaryTargetId(null);
  }, []);

  const handleEndTurn = useCallback(() => {
    if (phase !== "day_turn") return;
    sendMessage({ type: "end_turn" });
    setActionMode("idle");
    selectedCardIndexesRef.current = [];
    setSelectedCards([]);
    setSelectedCardIndexes([]);
  }, [phase, sendMessage]);

  const handleUseCharacterSkill = useCallback(() => {
    if (!myPlayer?.characterName) return;
    if (myPlayer.characterName === "samuel_parris") {
      sendMessage({ type: "use_character_skill", cardCount: 2 });
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
  }, [sendMessage]);

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
  }, [sendMessage]);

  const handleConspiracyPass = useCallback((cardIndex: number) => {
    sendMessage({ type: "conspiracy_pass", cardIndex });
    setConspiracySubmitted(true);
  }, [sendMessage]);

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
        <button
          type="button"
          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-button text-salem-text-ink hover:text-salem-accent-gold hover:bg-salem-accent-gold/10"
          onClick={() => setShowRules(true)}
          aria-label="查看规则"
        >
          <HelpCircle size={18} />
        </button>
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
      <div className="flex-1 overflow-y-auto pb-[calc(11rem+env(safe-area-inset-bottom,0px))]">
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
          disabled={!isMyDayTurn || actionMode === "idle"}
          isPlayMode={actionMode !== "idle"}
          characterName={myPlayer.characterName}
          characterLabel={getSkillTooltip(myPlayer.characterName)}
          onUseSkill={handleUseCharacterSkill}
          skillDisabled={!isMyDayTurn && myPlayer.characterName !== "john_proctor"}
          skillLabel={getSkillButtonLabel(myPlayer.characterName)}
        />
      )}

      {/* === Action bar (always visible during game) === */}
      <ActionPanel
        isMyTurn={isMyDayTurn}
        actionMode={actionMode}
        onPlayMode={handlePlayMode}
        onDrawCards={handleDrawCards}
        onCancelPlayMode={handleCancelPlayMode}
        onEndTurn={handleEndTurn}
        canEndTurn={canEndTurn}
        round={state.round}
        currentPlayerName={currentPlayerName}
      />

      {/* === Bottom tab navigation === */}
      <BottomTabs activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Voice panel (floating) */}
      {voiceVisible && (
        <VoicePanel
          micEnabled={micEnabled}
          connected={voiceConnected}
          status={voiceStatus}
          onToggleMic={toggleMic}
        />
      )}

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
          message="翻开一张身份牌来渡过本轮。此操作无法撤销。"
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

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {roleInfo && myPlayer && phase !== "lobby" && phase !== "game_over" && !roleRevealDismissed && (
        <RoleRevealOverlay
          roleInfo={roleInfo}
          characterName={myPlayer.characterName}
          characterLabel={getCharacterLabel(myPlayer.characterName)}
          characterAbility={myPlayer.characterAbility}
          onClose={dismissRoleReveal}
        />
      )}

      <PhaseTransition phase={phase} />

      {activeToast && (
        <Toast key={activeToast.id} message={activeToast.message} duration={4000} onDismiss={dismissToast} />
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

function RulesModal({ onClose }: { onClose: () => void }) {
  const sections = [
    {
      title: "白天",
      body: "轮到你时，选择出牌攻击或支援其他玩家；也可以抽牌，抽牌会直接结束本回合。指控达到门槛后进入审判。",
    },
    {
      title: "身份牌",
      body: "每人持有若干隐藏身份牌。女巫阵营需要隐藏身份，镇民阵营需要通过审判翻出女巫。",
    },
    {
      title: "夜间",
      body: "女巫投票选择击杀目标，警长选择保护一名其他玩家。认罪可翻开一张身份牌换取本轮免死。",
    },
    {
      title: "胜利",
      body: "所有女巫身份被揭露时镇民获胜；女巫人数达到或超过镇民阵营存活人数时女巫获胜。",
    },
  ];

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-[390px] rounded-card border border-salem-accent-gold/25 bg-salem-bg-secondary p-4 shadow-card">
        <button
          type="button"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-button text-salem-text-ink hover:bg-salem-accent-gold/10 hover:text-salem-accent-gold"
          onClick={onClose}
          aria-label="关闭规则"
        >
          <X size={18} />
        </button>
        <h2 className="font-heading text-xl text-salem-accent-gold">游戏规则</h2>
        <div className="mt-4 space-y-3">
          {sections.map((section) => (
            <section key={section.title} className="rounded-card border border-salem-accent-gold/12 bg-black/18 p-3">
              <h3 className="font-heading text-sm text-salem-text-bright">{section.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-salem-text-secondary">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoleRevealOverlay({
  roleInfo,
  characterName,
  characterLabel,
  characterAbility,
  onClose,
}: {
  roleInfo: { isWitch: boolean; isConstable: boolean };
  characterName: string;
  characterLabel: string;
  characterAbility: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 9000);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  const identityLabel = roleInfo.isWitch ? "女巫" : "镇民";
  const identityIcon = roleInfo.isWitch
    ? <Flame size={28} className="text-[#c090e0]" />
    : <Users size={28} className="text-salem-townfolk" />;
  const objective = roleInfo.isWitch
    ? "隐藏女巫身份，在夜间协同行动，消灭非女巫玩家。"
    : "白天通过指控与审判，翻出所有女巫身份牌。";

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/75 px-5 backdrop-blur-sm">
      <div className="w-full max-w-[360px] rounded-card border border-salem-accent-gold/30 bg-salem-bg-secondary p-5 text-center shadow-card">
        <p className="font-heading text-xs uppercase tracking-[0.22em] text-salem-text-ink">你的身份</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-salem-accent-gold/25 bg-black/25">
            {identityIcon}
          </span>
          <div className="text-left">
            <h2 className="font-heading text-2xl text-salem-text-bright">{identityLabel}</h2>
            {roleInfo.isConstable && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#80b8e0]">
                <Shield size={13} />
                同时持有警长身份牌
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-card border border-salem-accent-gold/15 bg-black/20 p-3 text-left">
          <p className="font-heading text-sm text-salem-accent-gold">{characterLabel || characterName}</p>
          <p className="mt-1 text-xs leading-relaxed text-salem-text-secondary">
            {characterAbility || "该角色能力由规则引擎自动结算。"}
          </p>
        </div>

        <div className="mt-3 rounded-card border border-salem-accent-gold/12 bg-black/18 p-3 text-left">
          <p className="font-heading text-xs text-salem-text-bright">本局目标</p>
          <p className="mt-1 text-xs leading-relaxed text-salem-text-secondary">{objective}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-salem-text-ink">
            每名玩家持有多张隐藏身份牌；身份牌全部翻开时，该玩家死亡。
          </p>
        </div>

        <button className="btn-primary mt-5 w-full" onClick={onClose}>
          进入游戏
        </button>
      </div>
    </div>
  );
}

function getCharacterLabel(characterName: string): string {
  const definition = CHARACTER_DEFINITIONS.find((item) => item.name === (characterName as CharacterName));
  return definition?.nameCn ?? characterName;
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
