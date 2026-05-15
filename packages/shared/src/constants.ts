import { CardDefinition, CardType, CharacterDefinition } from "./types";

export const COLYSEUS_ROOM_NAME = "salem";

export const CARD_DEFINITIONS: Record<CardType, CardDefinition> = {
  accusation: { type: "accusation", color: "red", nameCn: "指控", nameEn: "Accusation", description: "值1点指控", accusationValue: 1 },
  evidence: { type: "evidence", color: "red", nameCn: "证据", nameEn: "Evidence", description: "值3点指控", accusationValue: 3 },
  witness: { type: "witness", color: "red", nameCn: "证人", nameEn: "Witness", description: "值7点指控", accusationValue: 7 },
  alibi: { type: "alibi", color: "green", nameCn: "不在场证明", nameEn: "Alibi", description: "移除目标玩家面前的所有指控卡" },
  stocks: { type: "stocks", color: "green", nameCn: "枷锁", nameEn: "Stocks", description: "目标玩家跳过下一个回合" },
  robbery: { type: "robbery", color: "green", nameCn: "抢劫", nameEn: "Robbery", description: "从一名玩家处拿取卡牌交给另一名玩家" },
  scapegoat: { type: "scapegoat", color: "green", nameCn: "替罪羊", nameEn: "Scapegoat", description: "将一名玩家面前的所有卡牌转移给另一名玩家" },
  curse: { type: "curse", color: "green", nameCn: "诅咒", nameEn: "Curse", description: "弃掉目标玩家面前的蓝色卡牌" },
  piety: { type: "piety", color: "blue", nameCn: "虔诚", nameEn: "Piety", description: "需要14点指控才能触发审判" },
  asylum: { type: "asylum", color: "blue", nameCn: "庇护", nameEn: "Asylum", description: "免受夜间击杀" },
  matchmaker: { type: "matchmaker", color: "blue", nameCn: "红线", nameEn: "Matchmaker", description: "绑定两名玩家命运，一死俱死" },
  black_cat: { type: "black_cat", color: "blue", nameCn: "黑猫", nameEn: "Black Cat", description: "持有者抽到阴谋卡时可选择翻哪张审判卡" },
  night: { type: "night", color: "black", nameCn: "黑夜", nameEn: "Night", description: "触发夜间阶段" },
  conspiracy: { type: "conspiracy", color: "black", nameCn: "阴谋", nameEn: "Conspiracy", description: "所有人将一张审判卡传给左边的玩家" },
};

export const DECK_COMPOSITION: Record<CardType, number> = {
  accusation: 20,
  evidence: 7,
  witness: 2,
  alibi: 5,
  stocks: 3,
  robbery: 2,
  scapegoat: 2,
  curse: 3,
  piety: 2,
  asylum: 2,
  matchmaker: 2,
  black_cat: 1,
  night: 1,
  conspiracy: 1,
};

export const TRYAL_CARD_DISTRIBUTION: Record<number, { notWitch: number; witch: number; constable: number; perPlayer: number }> = {
  4:  { notWitch: 18, witch: 1, constable: 1, perPlayer: 5 },
  5:  { notWitch: 23, witch: 1, constable: 1, perPlayer: 5 },
  6:  { notWitch: 27, witch: 2, constable: 1, perPlayer: 5 },
  7:  { notWitch: 32, witch: 2, constable: 1, perPlayer: 5 },
  8:  { notWitch: 29, witch: 2, constable: 1, perPlayer: 4 },
  9:  { notWitch: 33, witch: 2, constable: 1, perPlayer: 4 },
  10: { notWitch: 27, witch: 2, constable: 1, perPlayer: 3 },
  11: { notWitch: 30, witch: 2, constable: 1, perPlayer: 3 },
  12: { notWitch: 33, witch: 2, constable: 1, perPlayer: 3 },
};

export const CHARACTER_DEFINITIONS: CharacterDefinition[] = [
  { name: "samuel_parris", nameCn: "塞缪尔-帕里斯", nameEn: "Samuel Parris", ability: "游戏中两次，可以从弃牌堆抽取最多2张卡牌" },
  { name: "thomas_danforth", nameCn: "托马斯-丹福斯", nameEn: "Thomas Danforth", ability: "如果你打出第6点指控，你可以翻开该玩家的一张审判卡" },
  { name: "tituba", nameCn: "提图芭", nameEn: "Tituba", ability: "游戏中一次，在你回合开始时可以查看并重新排列整个牌堆，限时1分钟" },
  { name: "john_proctor", nameCn: "约翰-普罗克特", nameEn: "John Proctor", ability: "当一名玩家死亡时，可以查看该玩家的手牌并挑选" },
  { name: "mary_warren", nameCn: "玛丽-沃伦", nameEn: "Mary Warren", ability: "不受红线效果影响" },
  { name: "george_burroughs", nameCn: "乔治-巴勒斯", nameEn: "George Burroughs", ability: "需要9点指控才能触发审判（而非7点）" },
  { name: "will_griggs", nameCn: "威尔-格里格斯", nameEn: "Will Griggs", ability: "可以将不在场证明当作7点证人卡对拥有虔诚的玩家使用" },
  { name: "cotton_mather", nameCn: "科顿-马瑟", nameEn: "Cotton Mather", ability: "证据卡在你手中时值4点而非3点" },
];

export const ACCUSATION_THRESHOLD = 7;
export const PIETY_THRESHOLD = 14;
export const GEORGE_BURROUGHS_THRESHOLD = 9;

export const TIMER_DEFAULTS = {
  dawn: 10,
  dayTurn: 60,
  nightWitch: 30,
  nightConstable: 15,
  nightConfess: 30,
  tryal: 15,
  conspiracy: 30,
  nightResolve: 5,
};

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 12;
export const ROOM_CODE_LENGTH = 6;
export const RECONNECT_TIMEOUT = 60;
export const HAND_SIZE_INITIAL = 3;
export const DRAW_COUNT = 2;
