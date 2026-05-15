interface VoiceIndicatorProps {
  isSpeaking: boolean;
}

export default function VoiceIndicator({ isSpeaking }: VoiceIndicatorProps) {
  if (!isSpeaking) return null;

  return (
    <div className="absolute inset-0 rounded-full animate-speak pointer-events-none" />
  );
}
