import { useMemo, useRef, useState } from 'react';
import { won } from '../api';
import { Results } from '../components/Results';
import { Game } from '../pages/Room';
import { addPlayer, applyAction, boardInfo, createGame, startGame, toPublic } from '../../../server/src/game/engine';
import type { GameState as FullState } from '../../../server/src/game/types';
import type { Action, Board, GameState } from '../types';
import { clearGame, loadGame, loadLeaderboard, recordResults, saveGame } from './storage';

const RULES = [
  { icon: '🎡', title: '룰렛을 돌려요', text: '1~10 중 나온 숫자만큼 말을 움직여요.' },
  { icon: '🔀', title: '인생을 선택해요', text: '대학 진학 vs 바로 취업, 안정의 길 vs 모험의 길.' },
  { icon: '💰', title: '돈을 모아요', text: '월급날은 지나가기만 해도 월급을 받아요.' },
  { icon: '❗', title: '꼭 멈추는 칸', text: '취업 · 결혼 · 내 집 마련 · 은퇴 칸에서는 반드시 멈춰요.' },
  { icon: '🏦', title: '대출도 전략', text: '돈이 모자라면 자동으로 대출(5,000만원)! 은퇴 때 6,000만원씩 갚아요.' },
  { icon: '🏆', title: '은퇴하면 정산', text: '현금 + 집 + 인생 카드 + 자녀 보너스 − 대출. 가장 부자가 승리!' },
];

const board = boardInfo() as unknown as Board;
const snapshot = (s: FullState) => toPublic(structuredClone(s)) as unknown as GameState;

export function LocalApp() {
  const full = useRef<FullState | null>(null);
  const [view, setView] = useState<GameState | null>(null);
  const [names, setNames] = useState(['', '']);
  const [error, setError] = useState<string | null>(null);
  const [saved] = useState(() => loadGame<FullState>());
  const [leaders, setLeaders] = useState(loadLeaderboard);

  const mine = useMemo(() => Object.fromEntries((view?.players ?? []).map((p) => [p.id, p.id])), [view?.players]);

  function begin(state: FullState) {
    full.current = state;
    setView(snapshot(state));
  }

  function start() {
    setError(null);
    const list = names.map((n) => n.trim()).filter(Boolean);
    try {
      if (list.length < 1) throw new Error('이름을 한 명 이상 입력해 주세요.');
      const { state } = createGame('LOCAL', list[0]);
      list.slice(1).forEach((n) => addPlayer(state, n));
      startGame(state, state.hostId);
      saveGame(state);
      begin(state);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function perform(playerId: string, action: Action): Promise<GameState> {
    const state = full.current!;
    const wasPlaying = state.phase === 'playing';
    applyAction(state, playerId, action as never);
    state.version += 1;
    if (wasPlaying && state.phase === 'finished' && state.results) {
      recordResults(state.results);
      setLeaders(loadLeaderboard());
      clearGame();
    } else {
      saveGame(state);
    }
    return snapshot(state);
  }

  function home() {
    full.current = null;
    setView(null);
    setLeaders(loadLeaderboard());
  }

  if (view?.phase === 'finished' && view.results) {
    return (
      <div className="page">
        <LocalTopBar onHome={home} />
        <Results results={view.results} onHome={home} />
      </div>
    );
  }

  if (view) {
    return (
      <Game
        state={view}
        board={board}
        mine={mine}
        local
        accept={setView}
        perform={perform}
        topBar={<LocalTopBar onHome={home} round={view.round} />}
      />
    );
  }

  return (
    <div className="home">
      <header className="hero">
        <div className="hero-art" aria-hidden>
          <span>🎓</span><span>💼</span><span>💍</span><span>🏠</span><span>👶</span><span>🌴</span>
        </div>
        <p className="eyebrow">THE GAME OF LIFE</p>
        <h1 className="display hero-title">
          인생<span>게임</span>
        </h1>
        <p className="hero-sub">한 화면에 모여 번갈아 룰렛을 돌려요. 누가 가장 멋진 인생을 사는지 겨뤄 보세요.</p>
      </header>

      <section className="entry">
        <div className="panel entry-card">
          <div className="field">
            <span>플레이어 (1~6명)</span>
            {names.map((n, i) => (
              <input
                key={i}
                id={`player-${i}`}
                value={n}
                maxLength={12}
                placeholder={`플레이어 ${i + 1} 이름`}
                onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))}
              />
            ))}
          </div>
          {names.length < 6 && (
            <button className="btn btn--secondary" onClick={() => setNames([...names, ''])}>
              + 플레이어 추가
            </button>
          )}
          <button className="btn btn--primary btn--lg" disabled={!names.some((n) => n.trim())} onClick={start}>
            🎲 게임 시작하기
          </button>
          {saved && saved.phase === 'playing' && (
            <button className="btn" onClick={() => begin(saved)}>
              ▶ 이어서 하기 ({saved.players.map((p) => p.name).join(', ')})
            </button>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      </section>

      <section className="rules">
        <h2 className="section-title">게임 방법</h2>
        <div className="rule-grid">
          {RULES.map((r) => (
            <div key={r.title} className="rule">
              <div className="rule-icon">{r.icon}</div>
              <h3>{r.title}</h3>
              <p>{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="leaders">
        <h2 className="section-title">명예의 전당</h2>
        <div className="panel">
          {leaders.length === 0 ? (
            <p className="muted center">아직 기록이 없어요. 이 브라우저에서 끝낸 게임이 여기에 쌓여요.</p>
          ) : (
            <ol className="leader-list">
              {leaders.map((r, i) => (
                <li key={`${r.finishedAt}-${r.playerName}-${i}`}>
                  <span className="leader-rank">{i + 1}</span>
                  <span className="leader-name">
                    {r.playerName}
                    {r.career && <small>{r.career}</small>}
                  </span>
                  <span className="leader-score">{won(r.finalScore)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}

function LocalTopBar({ onHome, round }: { onHome: () => void; round?: number }) {
  return (
    <header className="topbar">
      <span className="logo">🎲 인생<span>게임</span></span>
      <div className="topbar-right">
        {round !== undefined && <span className="chip">{round}라운드</span>}
        <button className="chip chip--code" onClick={onHome}>처음으로</button>
      </div>
    </header>
  );
}
