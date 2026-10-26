import type { Action, Board, GameState, LeaderboardRow } from './types';

async function request<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init.token) headers['x-player-token'] = init.token;
  const res = await fetch(`/api${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `요청 실패 (${res.status})`);
  return body as T;
}

type Joined = { code: string; playerId: string; token: string };

export const api = {
  board: () => request<Board>('/board'),
  leaderboard: () => request<LeaderboardRow[]>('/leaderboard'),
  health: () => request<{ ok: boolean; db: string }>('/health'),
  createRoom: (name: string) => request<Joined>('/rooms', { method: 'POST', body: JSON.stringify({ name }) }),
  joinRoom: (code: string, name: string) =>
    request<Joined>(`/rooms/${code}/players`, { method: 'POST', body: JSON.stringify({ name }) }),
  getRoom: (code: string) => request<GameState>(`/rooms/${code}`),
  start: (code: string, token: string) => request<GameState>(`/rooms/${code}/start`, { method: 'POST', token }),
  act: (code: string, token: string, action: Action) =>
    request<GameState>(`/rooms/${code}/actions`, { method: 'POST', token, body: JSON.stringify(action) }),
};

/** 이 브라우저가 조종하는 플레이어들의 토큰 (한 브라우저에서 여러 명 플레이 가능) */
export const tokens = {
  key: (code: string) => `life-game:tokens:${code.toUpperCase()}`,
  all(code: string): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(this.key(code)) ?? '{}');
    } catch {
      return {};
    }
  },
  add(code: string, playerId: string, token: string) {
    const all = this.all(code);
    all[playerId] = token;
    try {
      localStorage.setItem(this.key(code), JSON.stringify(all));
    } catch {
      /* 저장 불가 환경에서는 이번 세션 동안만 유지 */
    }
  },
};

export const won = (n: number) => {
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(n);
  if (v >= 10000) {
    const eok = Math.floor(v / 10000);
    const man = v % 10000;
    return `${sign}${eok}억${man ? ` ${man.toLocaleString('ko-KR')}만` : ''}원`;
  }
  return `${sign}${v.toLocaleString('ko-KR')}만원`;
};
