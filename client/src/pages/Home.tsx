import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, tokens, won } from '../api';
import type { LeaderboardRow } from '../types';

const RULES = [
  { icon: '🎡', title: '룰렛을 돌려요', text: '1~10 중 나온 숫자만큼 말을 움직여요.' },
  { icon: '🔀', title: '인생을 선택해요', text: '대학 진학 vs 바로 취업, 안정의 길 vs 모험의 길.' },
  { icon: '💰', title: '돈을 모아요', text: '월급날은 지나가기만 해도 월급을 받아요.' },
  { icon: '❗', title: '꼭 멈추는 칸', text: '취업 · 결혼 · 내 집 마련 · 은퇴 칸에서는 반드시 멈춰요.' },
  { icon: '🏦', title: '대출도 전략', text: `돈이 모자라면 자동으로 대출(5,000만원)! 은퇴 때 6,000만원씩 갚아요.` },
  { icon: '🏆', title: '은퇴하면 정산', text: '현금 + 집 + 인생 카드 + 자녀 보너스 − 대출. 가장 부자가 승리!' },
];

export function Home() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [db, setDb] = useState<string>('');

  useEffect(() => {
    api.leaderboard().then(setBoard).catch(() => {});
    api.health().then((h) => setDb(h.db)).catch(() => {});
  }, []);

  async function run(fn: () => Promise<{ code: string; playerId: string; token: string }>) {
    setError(null);
    setLoading(true);
    try {
      const r = await fn();
      tokens.add(r.code, r.playerId, r.token);
      nav(`/room/${r.code}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
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
        <p className="hero-sub">룰렛 한 번에 바뀌는 인생! 친구들과 함께 누가 가장 멋진 인생을 사는지 겨뤄 보세요.</p>
      </header>

      <section className="entry">
        <div className="panel entry-card">
          <label className="field">
            <span>내 이름</span>
            <input value={name} maxLength={12} placeholder="예: 김인생" onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="entry-actions">
            <button className="btn btn--primary btn--lg" disabled={loading || !name.trim()} onClick={() => run(() => api.createRoom(name))}>
              🎲 새 게임 만들기
            </button>
            <div className="divider"><span>또는 코드로 참가</span></div>
            <div className="join-row">
              <input
                className="code-input"
                value={code}
                maxLength={5}
                placeholder="방 코드"
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              />
              <button className="btn btn--secondary" disabled={loading || !name.trim() || code.length !== 5} onClick={() => run(() => api.joinRoom(code, name))}>
                참가하기
              </button>
            </div>
          </div>
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
          {board.length === 0 ? (
            <p className="muted center">아직 기록이 없어요. 첫 번째 주인공이 되어 보세요!</p>
          ) : (
            <ol className="leader-list">
              {board.map((r, i) => (
                <li key={`${r.gameCode}-${r.playerName}-${i}`}>
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

      <footer className="footer">
        {db && <span className="chip">DB: {db === 'postgres' ? 'PostgreSQL 연결됨' : '메모리 모드'}</span>}
      </footer>
    </div>
  );
}
