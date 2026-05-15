import { CHARACTER_DEFINITIONS } from "@salem/shared";
import type { CharacterName } from "@salem/shared";
import { CHARACTER_IMAGE_SOURCES } from "../assets/cardAssets";
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
  skillLabel = "发动技能",
}: CharacterCardProps) {
  if (!characterName) return null;

  const name = characterName as CharacterName;
  const definition = CHARACTER_DEFINITIONS.find((item) => item.name === name);
  const imageSrc = CHARACTER_IMAGE_SOURCES[name];

  return (
    <div
      data-testid={testId}
      className="min-w-[160px] max-w-[220px] rounded-card border border-salem-accent-gold/30 bg-salem-bg-secondary/80 p-2 shadow-card"
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={definition?.nameCn || characterName}
          className="mb-2 aspect-[5/3] w-full rounded-card object-cover"
          draggable={false}
        />
      ) : null}
      <p className="font-heading text-sm text-salem-accent-gold">
        {definition?.nameCn || characterName}
      </p>
      <p className="mt-1 text-[10px] leading-snug text-salem-text-secondary">
        {ability || definition?.ability || "暂无角色能力说明"}
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
