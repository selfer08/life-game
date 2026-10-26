import { randomInt } from 'node:crypto';
import type { Response } from 'express';
import type { GameRepository } from './db/repository.js';
import { addPlayer, applyAction, createGame, GameError, startGame, toPublic } from './game/engine.js';
import type { Action, GameState } from './game/types.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 5 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');

/**
 * 방 단위로 액션을 직렬화하고, 저장 후 SSE 구독자에게 상태를 브로드캐스트한다.
 * (단일 서버 인스턴스 기준. 여러 대로 확장하려면 Redis pub/sub 등으로 교체)
 */
export class GameService {
  private locks = new Map<string, Promise<unknown>>();
  private subscribers = new Map<string, Set<Response>>();

  constructor(private repo: GameRepository) {}

  private withLock<T>(code: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(code) ?? Promise.resolve();
    const run = prev.then(fn, fn);
    const tail = run.catch(() => {});
    this.locks.set(code, tail);
    tail.then(() => {
      if (this.locks.get(code) === tail) this.locks.delete(code);
    });
    return run;
  }

  private async load(code: string): Promise<GameState> {
    const state = await this.repo.get(code.toUpperCase());
    if (!state) throw new GameError('방을 찾을 수 없어요. 코드를 확인해 주세요.', 404);
    return state;
  }

  private async mutate<T>(code: string, fn: (state: GameState) => T): Promise<{ state: GameState; result: T }> {
    return this.withLock(code.toUpperCase(), async () => {
      const state = await this.load(code);
      const before = state.version;
      const wasFinished = state.phase === 'finished';
      const result = fn(state);
      state.version += 1;
      if (!(await this.repo.save(state, before))) throw new GameError('다른 요청과 충돌했어요. 다시 시도해 주세요.', 409);
      if (!wasFinished && state.phase === 'finished' && state.results) {
        await this.repo.saveResults(state.code, state.results);
      }
      this.broadcast(state);
      return { state, result };
    });
  }

  private authenticate(state: GameState, token: string | undefined) {
    const player = state.players.find((p) => p.token === token);
    if (!player) throw new GameError('플레이어 인증에 실패했어요.', 401);
    return player;
  }

  async create(name: string) {
    for (let i = 0; i < 5; i++) {
      const code = makeCode();
      if (await this.repo.get(code)) continue;
      const { state, player } = createGame(code, name);
      await this.repo.create(state);
      return { code, playerId: player.id, token: player.token };
    }
    throw new GameError('방 코드 생성에 실패했어요.', 500);
  }

  async join(code: string, name: string) {
    const { state, result: player } = await this.mutate(code, (s) => addPlayer(s, name));
    return { code: state.code, playerId: player.id, token: player.token };
  }

  async start(code: string, token: string | undefined) {
    const { state } = await this.mutate(code, (s) => startGame(s, this.authenticate(s, token).id));
    return toPublic(state);
  }

  async act(code: string, token: string | undefined, action: Action) {
    const { state } = await this.mutate(code, (s) => applyAction(s, this.authenticate(s, token).id, action));
    return toPublic(state);
  }

  async get(code: string) {
    return toPublic(await this.load(code));
  }

  leaderboard(limit = 20) {
    return this.repo.leaderboard(limit);
  }

  async subscribe(code: string, res: Response) {
    const state = await this.load(code);
    const key = state.code;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`data: ${JSON.stringify(toPublic(state))}\n\n`);
    let set = this.subscribers.get(key);
    if (!set) this.subscribers.set(key, (set = new Set()));
    set.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
    res.on('close', () => {
      clearInterval(ping);
      set!.delete(res);
      if (!set!.size) this.subscribers.delete(key);
    });
  }

  private broadcast(state: GameState) {
    const set = this.subscribers.get(state.code);
    if (!set) return;
    const msg = `data: ${JSON.stringify(toPublic(state))}\n\n`;
    for (const res of set) res.write(msg);
  }
}
