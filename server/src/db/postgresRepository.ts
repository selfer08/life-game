import pg from 'pg';
import type { GameState, ResultRow } from '../game/types.js';
import type { GameRepository, LeaderboardRow } from './repository.js';
import { SCHEMA_SQL } from './schema.js';

export class PostgresRepository implements GameRepository {
  readonly kind = 'postgres' as const;
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    // 유휴 연결이 끊겨도 (DB 재시작 등) 서버 프로세스가 죽지 않도록 한다. 풀이 다음 요청 때 재연결함
    this.pool.on('error', (err) => console.error('[db] idle client error:', err.message));
  }

  async init() {
    await this.pool.query(SCHEMA_SQL);
  }

  async create(state: GameState) {
    await this.pool.query('INSERT INTO games (code, phase, state, version) VALUES ($1, $2, $3, $4)', [
      state.code,
      state.phase,
      state,
      state.version,
    ]);
  }

  async get(code: string) {
    const { rows } = await this.pool.query<{ state: GameState }>('SELECT state FROM games WHERE code = $1', [code]);
    return rows[0]?.state ?? null;
  }

  async save(state: GameState, expectedVersion: number) {
    const { rowCount } = await this.pool.query(
      'UPDATE games SET state = $2, phase = $3, version = $4, updated_at = now() WHERE code = $1 AND version = $5',
      [state.code, state, state.phase, state.version, expectedVersion],
    );
    return rowCount === 1;
  }

  async saveResults(code: string, results: ResultRow[]) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const r of results) {
        await client.query(
          'INSERT INTO game_results (game_code, player_name, career, final_score, rank) VALUES ($1, $2, $3, $4, $5)',
          [code, r.name, r.career, r.total, r.rank],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async leaderboard(limit: number): Promise<LeaderboardRow[]> {
    const { rows } = await this.pool.query(
      `SELECT player_name, career, final_score, rank, game_code, finished_at
         FROM game_results ORDER BY final_score DESC, finished_at ASC LIMIT $1`,
      [limit],
    );
    return rows.map((r) => ({
      playerName: r.player_name,
      career: r.career,
      finalScore: Number(r.final_score),
      rank: r.rank,
      gameCode: r.game_code,
      finishedAt: new Date(r.finished_at).toISOString(),
    }));
  }

  async close() {
    await this.pool.end();
  }
}
