import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../types';

export const SPIN_MS = 1700;
const STEP_MS = 260;

/**
 * 서버 상태는 이동이 끝난 결과만 담고 있으므로, lastMove 를 보고
 * 룰렛 회전 → 말 한 칸씩 이동 연출을 재생한다.
 */
export function useMoveAnimation(state: GameState | null) {
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [spinValue, setSpinValue] = useState<number | null>(null);
  const [spinKey, setSpinKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const seenSeq = useRef<number | null>(null);

  useEffect(() => {
    const move = state?.lastMove;
    if (!state || !move) return;
    if (seenSeq.current === null) {
      // 처음 로드할 때는 이미 지난 이동이므로 재생하지 않는다
      seenSeq.current = move.seq;
      if (move.spin) setSpinValue(move.spin);
      return;
    }
    if (move.seq <= seenSeq.current) return;
    seenSeq.current = move.seq;

    const timers: number[] = [];
    const player = state.players.find((p) => p.id === move.playerId);
    if (!player) return;
    const startPos = move.from;
    setBusy(true);
    setOverrides({ [player.id]: startPos });

    let delay = 0;
    if (move.spin !== null) {
      setSpinValue(move.spin);
      setSpinKey((k) => k + 1);
      delay = SPIN_MS + 200;
    }
    move.path.forEach((tileId, i) => {
      timers.push(window.setTimeout(() => setOverrides({ [player.id]: tileId }), delay + i * STEP_MS));
    });
    timers.push(
      window.setTimeout(() => {
        setOverrides({});
        setBusy(false);
      }, delay + move.path.length * STEP_MS + 150),
    );
    return () => {
      timers.forEach(clearTimeout);
      setOverrides({});
      setBusy(false);
    };
  }, [state?.lastMove?.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  return { overrides, spinValue, spinKey, busy };
}
