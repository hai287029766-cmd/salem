import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface ToastProps {
  message: string;
  duration?: number;
  onDismiss: () => void;
}

export default function Toast({ message, duration = 3000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return createPortal(
    <div
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-[70] max-w-[360px] px-4 py-2.5 rounded-card
        bg-salem-bg-secondary/95 border border-salem-accent-gold/30 backdrop-blur-sm
        shadow-lg transition-all duration-300
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
    >
      <p className="text-sm text-salem-text-primary text-center font-heading">{message}</p>
    </div>,
    document.body,
  );
}
