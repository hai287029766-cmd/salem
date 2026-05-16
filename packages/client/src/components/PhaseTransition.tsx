import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Shield, Skull, Scale, Users } from "lucide-react";
import type { GamePhase } from "@salem/shared";

interface PhaseConfig {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bgGradient: string;
}

const PHASE_CONFIGS: Partial<Record<GamePhase, PhaseConfig>> = {
  night_witch: {
    title: "黑夜降临",
    subtitle: "女巫正在密谋杀人",
    icon: <Moon size={48} className="text-gray-300" />,
    bgGradient: "linear-gradient(180deg, #0a0e1a 0%, #1a1a2e 50%, #0d1117 100%)",
  },
  night_constable: {
    title: "警长行动",
    subtitle: "选择保护目标",
    icon: <Shield size={48} className="text-[#80b8e0]" />,
    bgGradient: "linear-gradient(180deg, #0a1520 0%, #152535 50%, #0d1117 100%)",
  },
  night_confess: {
    title: "认罪窗口",
    subtitle: "翻开审判卡以渡过夜晚",
    icon: <Skull size={48} className="text-salem-accent-red" />,
    bgGradient: "linear-gradient(180deg, #1a0a0a 0%, #2e1a1a 50%, #170d0d 100%)",
  },
  conspiracy: {
    title: "阴谋开始",
    subtitle: "从旁边的玩家选择一张未公开的身份牌",
    icon: <Users size={48} className="text-[#c090e0]" />,
    bgGradient: "linear-gradient(180deg, #15081a 0%, #2a1535 50%, #0d0817 100%)",
  },
  dawn: {
    title: "黎明到来",
    subtitle: "女巫选择放置黑猫",
    icon: <Moon size={48} className="text-salem-accent-gold" />,
    bgGradient: "linear-gradient(180deg, #1a1508 0%, #2e2515 50%, #17120d 100%)",
  },
  tryal: {
    title: "审判开始",
    subtitle: "揭露身份的时刻",
    icon: <Scale size={48} className="text-salem-accent-gold" />,
    bgGradient: "linear-gradient(180deg, #1a1008 0%, #2e2015 50%, #170d08 100%)",
  },
};

interface PhaseTransitionProps {
  phase: GamePhase;
}

export default function PhaseTransition({ phase }: PhaseTransitionProps) {
  const [visible, setVisible] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<GamePhase | null>(null);

  useEffect(() => {
    if (phase === currentPhase) return;
    setCurrentPhase(phase);

    const config = PHASE_CONFIGS[phase];
    if (!config) return;

    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, [phase, currentPhase]);

  const config = currentPhase ? PHASE_CONFIGS[currentPhase] : null;

  return (
    <AnimatePresence>
      {visible && config && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center pointer-events-none"
          style={{ background: config.bgGradient }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col items-center gap-4"
          >
            {config.icon}
            <h2 className="font-heading text-3xl text-salem-text-bright">
              {config.title}
            </h2>
            <p className="text-sm text-salem-text-primary/70 text-center max-w-[250px]">
              {config.subtitle}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
