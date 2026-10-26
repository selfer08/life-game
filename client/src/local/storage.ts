// 저장소를 쓸 수 없는 환경(시크릿 창 등)에서도 게임은 동작해야 하므로 모든 접근을 try/catch 로 감싼다.
import type { LeaderboardRow, ResultRow } from '../types';

const SAVE_KEY = 'life-game:local:save';
const BOARD_KEY = 'life-game:local:leaderboard';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 불가: 이번 세션에서만 유지 */
  }
}

export const saveGame = (state: unknown) => write(SAVE_KEY, state);
export const loadGame = <T,>() => read<T>(SAVE_KEY);
export function clearGame() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* 무시 */
  }
}

export const loadLeaderboard = () => read<LeaderboardRow[]>(BOARD_KEY) ?? [];

export function recordResults(results: ResultRow[]) {
  const finishedAt = new Date().toISOString();
  const rows = [
    ...loadLeaderboard(),
    ...results.map((r) => ({ playerName: r.name, career: r.career, finalScore: r.total, rank: r.rank, gameCode: 'LOCAL', finishedAt })),
  ];
  rows.sort((a, b) => b.finalScore - a.finalScore);
  write(BOARD_KEY, rows.slice(0, 20));
}
