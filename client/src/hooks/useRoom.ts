import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { GameState } from '../types';

/** SSE 로 방 상태를 실시간 구독한다. 연결이 끊기면 브라우저가 자동 재연결. */
export function useRoom(code: string) {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accept = useCallback((next: GameState) => {
    setState((cur) => (cur && cur.version > next.version ? cur : next));
  }, []);

  useEffect(() => {
    let alive = true;
    api.getRoom(code).then(accept, (e) => alive && setError(e.message));
    const es = new EventSource(`/api/rooms/${code}/events`);
    es.onmessage = (ev) => {
      setError(null);
      accept(JSON.parse(ev.data));
    };
    return () => {
      alive = false;
      es.close();
    };
  }, [code, accept]);

  return { state, error, accept };
}
