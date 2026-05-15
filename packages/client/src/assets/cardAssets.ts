import type { CardType, CharacterName, TryalCardType } from "@salem/shared";

import accusationImage from "./cards/physical/card-accusation.jpg";
import alibiImage from "./cards/physical/card-alibi.jpg";
import asylumImage from "./cards/physical/card-asylum.jpg";
import blackCatImage from "./cards/physical/card-black-cat.jpg";
import conspiracyImage from "./cards/physical/card-conspiracy.jpg";
import curseImage from "./cards/physical/card-curse.jpg";
import evidenceImage from "./cards/physical/card-evidence.jpg";
import matchmakerImage from "./cards/physical/card-matchmaker.jpg";
import nightImage from "./cards/physical/card-night.jpg";
import pietyImage from "./cards/physical/card-piety.jpg";
import robberyImage from "./cards/physical/card-robbery.jpg";
import scapegoatImage from "./cards/physical/card-scapegoat.jpg";
import stocksImage from "./cards/physical/card-stocks.jpg";
import witnessImage from "./cards/physical/card-witness.jpg";
import constableImage from "./cards/physical/tryal-constable.jpg";
import notWitchImage from "./cards/physical/tryal-not-witch.jpg";
import witchImage from "./cards/physical/tryal-witch.jpg";

export const CARD_IMAGE_SOURCES: Partial<Record<CardType, string>> = {
  accusation: accusationImage,
  alibi: alibiImage,
  asylum: asylumImage,
  black_cat: blackCatImage,
  conspiracy: conspiracyImage,
  curse: curseImage,
  evidence: evidenceImage,
  matchmaker: matchmakerImage,
  night: nightImage,
  piety: pietyImage,
  robbery: robberyImage,
  scapegoat: scapegoatImage,
  stocks: stocksImage,
  witness: witnessImage,
};

export const TRYAL_CARD_IMAGE_SOURCES: Partial<Record<TryalCardType, string>> = {
  constable: constableImage,
  not_witch: notWitchImage,
  witch: witchImage,
};

export const CHARACTER_IMAGE_SOURCES: Partial<Record<CharacterName, string>> = {};
