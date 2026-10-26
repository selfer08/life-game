import type { GameState, ResultRow } from '../game/types.js';

export interface LeaderboardRow {
  playerName: string;
  career: string | null;
  finalScore: number;
  rank: number;
  gameCode: string;
  finishedAt: string;
}

export interface GameRepository {
  readonly kind: 'memory' | 'postgres';
  init(): Promise<void>;
  create(state: GameState): Promise<void>;
  get(code: string): Promise<GameState | null>;
  /** expectedVersion 이 DB의 버전과 다르면 false (낙관적 잠금) */
  save(state: GameState, expectedVersion: number): Promise<boolean>;
  saveResults(code: string, results: ResultRow[]): Promise<void>;
  leaderboard(limit: number): Promise<LeaderboardRow[]>;
  close(): Promise<void>;
}
