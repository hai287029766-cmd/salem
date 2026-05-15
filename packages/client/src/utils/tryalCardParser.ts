import type { TryalCardType } from "@salem/shared";

export interface ParsedTryalCard {
  type: TryalCardType;
  faceUp: boolean;
}

export const TRYAL_LABELS: Record<TryalCardType, string> = {
  witch: "女巫",
  not_witch: "村民",
  constable: "警长",
};

export const TRYAL_SHORT_LABELS: Record<TryalCardType, string> = {
  witch: "巫",
  not_witch: "民",
  constable: "警",
};

export function parseTryalCard(value: string | undefined): ParsedTryalCard | null {
  if (!value) return null;
  if (value === "witch" || value === "not_witch" || value === "constable") {
    return { type: value, faceUp: true };
  }

  try {
    const parsed = JSON.parse(value) as Partial<ParsedTryalCard>;
    if (parsed.type === "witch" || parsed.type === "not_witch" || parsed.type === "constable") {
      return { type: parsed.type, faceUp: parsed.faceUp ?? true };
    }
  } catch {
    return null;
  }

  return null;
}
