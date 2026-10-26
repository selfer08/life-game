// 서버(server/src/game/types.ts)의 공개 상태와 맞춰 둔 타입
export type TileType =
  | 'start' | 'payday' | 'money' | 'life' | 'loan' | 'career' | 'marry'
  | 'baby' | 'house' | 'tax' | 'gamble' | 'branch' | 'retire';

export interface Tile {
  id: number;
  type: TileType;
  label: string;
  desc: string;
  amount?: number;
  degree?: boolean;
  stop?: boolean;
  pathLabel?: string;
  next: number[];
  x: number;
  y: number;
}

export interface Board {
  tiles: Tile[];
  cols: number;
  rows: number;
  spinMax: number;
  loanUnit: number;
  loanRepay: number;
}

export interface Career { id: string; name: string; emoji: string; salary: number; degree: boolean }
export interface House { id: string; name: string; emoji: string; price: number; sellValue: number }

export interface Player {
  id: string;
  name: string;
  color: string;
  position: number;
  cash: number;
  loans: number;
  career: Career | null;
  degree: boolean;
  married: boolean;
  children: number;
  house: House | null;
  lifeCardCount: number;
  lifeCards: number[] | null;
  retired: boolean;
  retireOrder: number | null;
}

export type Pending =
  | { type: 'choosePath'; playerId: string; stepsLeft: number; options: { tileId: number; label: string; desc: string }[] }
  | { type: 'chooseCareer'; playerId: string; options: Career[] }
  | { type: 'buyHouse'; playerId: string; options: House[] };

export interface LogEntry { id: number; playerId: string | null; text: string; tone: 'good' | 'bad' | 'neutral'; at: number }

export interface ResultRow {
  playerId: string;
  name: string;
  color: string;
  career: string | null;
  rank: number;
  cash: number;
  houseValue: number;
  lifeCardsValue: number;
  childrenBonus: number;
  loanDebt: number;
  total: number;
}

export interface GameState {
  code: string;
  phase: 'lobby' | 'playing' | 'finished';
  hostId: string;
  players: Player[];
  turn: number;
  round: number;
  pending: Pending | null;
  lastMove: { seq: number; playerId: string; spin: number | null; from: number; path: number[]; logId: number } | null;
  log: LogEntry[];
  results: ResultRow[] | null;
  version: number;
}

export interface LeaderboardRow {
  playerName: string;
  career: string | null;
  finalScore: number;
  rank: number;
  gameCode: string;
  finishedAt: string;
}

export type Action =
  | { type: 'spin' }
  | { type: 'choosePath'; tileId: number }
  | { type: 'chooseCareer'; careerId: string }
  | { type: 'buyHouse'; houseId: string | null }
  | { type: 'repayLoan' };
