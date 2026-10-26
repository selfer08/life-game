export type TileType =
  | 'start'
  | 'payday'
  | 'money'
  | 'life'
  | 'loan'
  | 'career'
  | 'marry'
  | 'baby'
  | 'house'
  | 'tax'
  | 'gamble'
  | 'branch'
  | 'retire';

export interface Tile {
  id: number;
  type: TileType;
  label: string;
  desc: string;
  /** 칸 효과에 쓰이는 값 (금액, 아이 수, 대출 횟수 등). 금액 단위는 만원 */
  amount?: number;
  /** career 칸: 학위 직업 카드 사용 여부 */
  degree?: boolean;
  /** 지나가기만 해도 반드시 멈추는 칸 */
  stop?: boolean;
  /** 갈림길에서 이 칸으로 시작하는 길의 이름/설명 */
  pathLabel?: string;
  pathDesc?: string;
  next: number[];
  x: number;
  y: number;
}

export interface Career {
  id: string;
  name: string;
  emoji: string;
  salary: number;
  degree: boolean;
}

export interface House {
  id: string;
  name: string;
  emoji: string;
  price: number;
  sellValue: number;
}

export interface Player {
  id: string;
  token: string;
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
  lifeCards: number[];
  retired: boolean;
  retireOrder: number | null;
}

export type Pending =
  | {
      type: 'choosePath';
      playerId: string;
      stepsLeft: number;
      options: { tileId: number; label: string; desc: string }[];
    }
  | { type: 'chooseCareer'; playerId: string; options: Career[] }
  | { type: 'buyHouse'; playerId: string; options: House[] };

export interface LastMove {
  seq: number;
  playerId: string;
  /** 새 스핀이면 숫자, 갈림길 선택 후 이어서 이동한 거면 null */
  spin: number | null;
  from: number;
  path: number[];
  /** 이 이동으로 생긴 첫 로그 id */
  logId: number;
}

export interface LogEntry {
  id: number;
  playerId: string | null;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
  at: number;
}

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
  lastMove: LastMove | null;
  log: LogEntry[];
  logSeq: number;
  results: ResultRow[] | null;
  version: number;
  createdAt: number;
}

export type Action =
  | { type: 'spin' }
  | { type: 'choosePath'; tileId: number }
  | { type: 'chooseCareer'; careerId: string }
  | { type: 'buyHouse'; houseId: string | null }
  | { type: 'repayLoan' };
