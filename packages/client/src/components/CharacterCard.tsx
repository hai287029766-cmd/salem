import { CHARACTER_DEFINITIONS } from "@salem/shared";
import type { CharacterName } from "@salem/shared";
import { Sparkles } from "lucide-react";

interface CharacterCardProps {
  characterName: string;
  ability: string;
  testId?: string;
  onUseSkill?: () => void;
  skillDisabled?: boolean;
  skillLabel?: string;
}

export default function CharacterCard({
  characterName,
  ability,
  testId,
  onUseSkill,
  skillDisabled = false,
  skillLabel = "使用技能",
}: CharacterCardProps) {
  if (!characterName) return null;

  const name = characterName as CharacterName;
  const definition = CHARACTER_DEFINITIONS.find((item) => item.name === name);

  return (
    <div
      data-testid={testId}
      className="rounded-card border border-salem-accent-gold/20 bg-salem-bg-card-dark/80 p-3 shadow-card"
    >
      <p className="font-heading text-sm text-salem-accent-gold">
        {definition?.nameCn || characterName}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-salem-text-ink">
        {ability || definition?.ability || ""}
      </p>
      {onUseSkill && (
        <button
          type="button"
          data-testid="game-role-skill-button"
          className="btn-secondary mt-2 w-full gap-1 py-1.5 text-xs"
          onClick={onUseSkill}
          disabled={skillDisabled}
        >
          <Sparkles size={14} />
          {skillLabel}
        </button>
      )}
    </div>
  );
}
