import type { GameState, ResultRow } from '../game/types.js';
import type { GameRepository, LeaderboardRow } from './repository.js';

/** DATABASE_URL 이 없을 때 쓰는 메모리 저장소. 서버를 재시작하면 데이터가 사라진다. */
export class MemoryRepository implements GameRepository {
  readonly kind = 'memory' as const;
  private games = new Map<string, GameState>();
  private results: LeaderboardRow[] = [];

  async init() {}

  async create(state: GameState) {
    if (this.games.has(state.code)) throw new Error('duplicate code');
    this.games.set(state.code, structuredClone(state));
  }

  async get(code: string) {
    const s = this.games.get(code);
    return s ? structuredClone(s) : null;
  }

  async save(state: GameState, expectedVersion: number) {
    const cur = this.games.get(state.code);
    if (!cur || cur.version !== expectedVersion) return false;
    this.games.set(state.code, structuredClone(state));
    return true;
  }

  async saveResults(code: string, results: ResultRow[]) {
    const finishedAt = new Date().toISOString();
    for (const r of results) {
      this.results.push({ playerName: r.name, career: r.career, finalScore: r.total, rank: r.rank, gameCode: code, finishedAt });
    }
  }

  async leaderboard(limit: number) {
    return [...this.results].sort((a, b) => b.finalScore - a.finalScore).slice(0, limit);
  }

  async close() {}
}
