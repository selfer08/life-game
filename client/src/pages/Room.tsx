import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, tokens } from '../api';
import { BoardView } from '../components/BoardView';
import { ChoiceModal } from '../components/ChoiceModal';
import { PlayerCard } from '../components/PlayerCard';
import { Results } from '../components/Results';
import { Spinner } from '../components/Spinner';
import { TILE_LEGEND } from '../components/tileStyle';
import { useMoveAnimation } from '../hooks/useMoveAnimation';
import { useRoom } from '../hooks/useRoom';
import type { Action, Board, GameState } from '../types';

export function Room() {
  const code = (useParams().code ?? '').toUpperCase();
  const nav = useNavigate();
  const { state, error, accept } = useRoom(code);
  const [board, setBoard] = useState<Board | null>(null);
  const [mine, setMine] = useState(() => tokens.all(code));

  useEffect(() => {
    api.board().then(setBoard).catch(() => {});
  }, []);

  const refreshMine = () => setMine(tokens.all(code));

  if (error && !state)
    return (
      <div className="center-page">
        <div className="panel">
          <h2>😢 {error}</h2>
          <Link className="btn btn--primary" to="/">처음으로</Link>
        </div>
      </div>
    );
  if (!state || !board) return <div className="center-page"><div className="loader">🎲</div></div>;

  if (state.phase === 'lobby') return <Lobby state={state} mine={mine} onJoined={refreshMine} accept={accept} />;
  if (state.phase === 'finished' && state.results)
    return (
      <div className="page">
        <TopBar state={state} />
        <Results results={state.results} onHome={() => nav('/')} />
      </div>
    );
  return <Game state={state} board={board} mine={mine} accept={accept} />;
}

function TopBar({ state }: { state: GameState }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(`${location.origin}/room/${state.code}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <header className="topbar">
      <Link to="/" className="logo">🎲 인생<span>게임</span></Link>
      <div className="topbar-right">
        {state.phase === 'playing' && <span className="chip">{state.round}라운드</span>}
        <button className="chip chip--code" onClick={copy} title="초대 링크 복사">
          방 코드 <b>{state.code}</b> {copied ? '✅' : '🔗'}
        </button>
      </div>
    </header>
  );
}

// ── 대기실 ────────────────────────────────────────────

function Lobby({ state, mine, onJoined, accept }: { state: GameState; mine: Record<string, string>; onJoined: () => void; accept: (s: GameState) => void }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const myIds = Object.keys(mine).filter((id) => state.players.some((p) => p.id === id));
  const hostToken = mine[state.hostId];

  async function join() {
    setErr(null);
    setLoading(true);
    try {
      const r = await api.joinRoom(state.code, name);
      tokens.add(r.code, r.playerId, r.token);
      setName('');
      onJoined();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function start() {
    setErr(null);
    try {
      accept(await api.start(state.code, hostToken));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="page">
      <TopBar state={state} />
      <div className="lobby">
        <div className="panel lobby-card">
          <p className="eyebrow">WAITING ROOM</p>
          <h1 className="display">대기실</h1>
          <p className="muted">친구에게 방 코드를 알려 주세요. 한 화면에서 여럿이 함께 해도 돼요.</p>
          <div className="big-code">{state.code}</div>

          <ul className="lobby-players">
            {state.players.map((p) => (
              <li key={p.id} style={{ '--pc': p.color } as React.CSSProperties}>
                <span className="pcard-dot">{p.name.slice(0, 1)}</span>
                <strong>{p.name}</strong>
                {p.id === state.hostId && <span className="chip">👑 방장</span>}
                {mine[p.id] && <span className="chip chip--mine">이 기기</span>}
              </li>
            ))}
            {Array.from({ length: 6 - state.players.length }, (_, i) => (
              <li key={`empty${i}`} className="empty">빈 자리</li>
            ))}
          </ul>

          {state.players.length < 6 && (
            <div className="join-row">
              <input value={name} maxLength={12} placeholder={myIds.length ? '이 기기에 플레이어 추가' : '내 이름'} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && join()} />
              <button className="btn btn--secondary" disabled={loading || !name.trim()} onClick={join}>
                {myIds.length ? '+ 추가' : '참가하기'}
              </button>
            </div>
          )}
          {err && <p className="error">{err}</p>}

          {hostToken ? (
            <button className="btn btn--primary btn--lg btn--block" onClick={start}>
              게임 시작하기 ({state.players.length}명)
            </button>
          ) : (
            <p className="muted center">방장이 게임을 시작하길 기다리는 중…</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 게임 화면 ─────────────────────────────────────────

function Game({ state, board, mine, accept }: { state: GameState; board: Board; mine: Record<string, string>; accept: (s: GameState) => void }) {
  const { overrides, spinValue, spinKey, busy } = useMoveAnimation(state);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const current = state.players[state.turn];
  const myToken = mine[current.id];
  const pendingMine = state.pending && mine[state.pending.playerId];
  const logRef = useRef<HTMLOListElement>(null);

  const positions = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of state.players) m[p.id] = overrides[p.id] ?? p.position;
    return m;
  }, [state.players, overrides]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.log.length, busy]);

  async function act(action: Action, token = myToken) {
    if (!token) return;
    setErr(null);
    setSending(true);
    try {
      accept(await api.act(state.code, token, action));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  // 애니메이션 중에는 이번 이동으로 생긴 로그를 숨겨 결과 스포일러를 막는다
  const hideFrom = busy && state.lastMove ? state.lastMove.logId : Infinity;
  const visibleLog = state.log.filter((l) => l.id < hideFrom);
  const latest = [...visibleLog].reverse().find((l) => l.tone !== 'neutral');

  return (
    <div className="page page--game">
      <TopBar state={state} />
      <div className="game">
        <section className="board-wrap panel">
          <div className="board-scroll">
            <BoardView board={board} players={state.players} positions={positions} currentId={current.id} />
          </div>
          <div className="legend">
            {TILE_LEGEND.map((l) => (
              <span key={l.label}><i style={{ background: l.color }}>{l.icon}</i>{l.label}</span>
            ))}
            <span><i className="legend-stop">!</i>반드시 멈춤</span>
          </div>
        </section>

        <aside className="side">
          <div className="panel turn-panel" style={{ '--pc': current.color } as React.CSSProperties}>
            <div className="turn-head">
              <span className="pcard-dot">{current.name.slice(0, 1)}</span>
              <div>
                <p className="eyebrow">NOW PLAYING</p>
                <h2>{current.name}님 차례</h2>
              </div>
            </div>
            <Spinner max={board.spinMax} value={spinValue} spinKey={spinKey} />
            {myToken && !state.pending ? (
              <button className="btn btn--primary btn--lg btn--block spin-btn" disabled={busy || sending} onClick={() => act({ type: 'spin' })}>
                {busy ? '이동 중…' : '🎡 룰렛 돌리기'}
              </button>
            ) : (
              <p className="muted center wait-msg">
                {busy ? '이동 중…' : state.pending && !pendingMine ? `${current.name}님이 선택 중이에요…` : !myToken ? `${current.name}님을 기다리는 중…` : ''}
              </p>
            )}
            {latest && !busy && <div className={`news news--${latest.tone}`}>{latest.text}</div>}
            {err && <p className="error">{err}</p>}
          </div>

          <div className="players">
            {state.players.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                active={p.id === current.id}
                mine={!!mine[p.id]}
                loanRepay={board.loanRepay}
                onRepay={() => act({ type: 'repayLoan' }, mine[p.id])}
              />
            ))}
          </div>

          <div className="panel log-panel">
            <h3>📜 인생 기록</h3>
            <ol ref={logRef} className="log">
              {visibleLog.map((l) => (
                <li key={l.id} className={`log--${l.tone}`}>{l.text}</li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      {state.pending && pendingMine && !busy && (
        <ChoiceModal
          pending={state.pending}
          player={state.players.find((p) => p.id === state.pending!.playerId)!}
          disabled={sending}
          onAct={(a) => act(a, mine[state.pending!.playerId])}
        />
      )}
      <span className="sr-only" aria-live="polite">{latest?.text}</span>
    </div>
  );
}
