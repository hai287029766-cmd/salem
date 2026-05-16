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
    bgGradient: "linear-gradient(180deg, rgba(10,14,26,0.85) 0%, rgba(26,26,46,0.85) 50%, rgba(13,17,23,0.85) 100%)",
  },
  night_constable: {
    title: "警长行动",
    subtitle: "选择保护目标",
    icon: <Shield size={48} className="text-[#80b8e0]" />,
    bgGradient: "linear-gradient(180deg, rgba(10,21,32,0.85) 0%, rgba(21,37,53,0.85) 50%, rgba(13,17,23,0.85) 100%)",
  },
  night_confess: {
    title: "认罪窗口",
    subtitle: "翻开审判卡以渡过夜晚",
    icon: <Skull size={48} className="text-salem-accent-red" />,
    bgGradient: "linear-gradient(180deg, rgba(26,10,10,0.85) 0%, rgba(46,26,26,0.85) 50%, rgba(23,13,13,0.85) 100%)",
  },
  conspiracy: {
    title: "阴谋开始",
    subtitle: "从旁边的玩家选择一张未公开的身份牌",
    icon: <Users size={48} className="text-[#c090e0]" />,
    bgGradient: "linear-gradient(180deg, rgba(21,8,26,0.85) 0%, rgba(42,21,53,0.85) 50%, rgba(13,8,23,0.85) 100%)",
  },
  dawn: {
    title: "黎明到来",
    subtitle: "女巫选择放置黑猫",
    icon: <Moon size={48} className="text-salem-accent-gold" />,
    bgGradient: "linear-gradient(180deg, rgba(26,21,8,0.85) 0%, rgba(46,37,21,0.85) 50%, rgba(23,18,13,0.85) 100%)",
  },
  tryal: {
    title: "审判开始",
    subtitle: "揭露身份的时刻",
    icon: <Scale size={48} className="text-salem-accent-gold" />,
    bgGradient: "linear-gradient(180deg, rgba(26,16,8,0.85) 0%, rgba(46,32,21,0.85) 50%, rgba(23,13,8,0.85) 100%)",
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
    const timer = setTimeout(() => setVisible(false), 1500);
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
          transition={{ duration: 0.3 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
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
