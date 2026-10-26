import { won } from '../api';
import type { ResultRow } from '../types';

const MEDALS = ['🥇', '🥈', '🥉'];

export function Results({ results, onHome }: { results: ResultRow[]; onHome: () => void }) {
  const podium = [results[1], results[0], results[2]].filter(Boolean);
  return (
    <div className="results">
      <p className="eyebrow">GAME OVER</p>
      <h1 className="display">인생 성적표</h1>

      <div className="podium">
        {podium.map((r) => (
          <div key={r.playerId} className={`podium-col podium-col--${r.rank}`}>
            <div className="podium-medal">{MEDALS[r.rank - 1]}</div>
            <div className="podium-name">{r.name}</div>
            <div className="podium-total">{won(r.total)}</div>
            <div className="podium-block" style={{ background: r.color }}>{r.rank}</div>
          </div>
        ))}
      </div>

      <div className="table-wrap">
        <table className="score-table">
          <thead>
            <tr>
              <th>순위</th>
              <th>이름</th>
              <th>현금</th>
              <th>집</th>
              <th>인생 카드</th>
              <th>자녀</th>
              <th>대출</th>
              <th>총 자산</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.playerId}>
                <td>{MEDALS[r.rank - 1] ?? r.rank}</td>
                <td>
                  <span className="dot" style={{ background: r.color }} /> {r.name}
                  {r.career && <small> · {r.career}</small>}
                </td>
                <td>{won(r.cash)}</td>
                <td>{r.houseValue ? won(r.houseValue) : '-'}</td>
                <td>{won(r.lifeCardsValue)}</td>
                <td>{won(r.childrenBonus)}</td>
                <td className="neg">{r.loanDebt ? `-${won(r.loanDebt)}` : '-'}</td>
                <td className="total">{won(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn--primary btn--lg" onClick={onHome}>
        새 게임 하러 가기
      </button>
    </div>
  );
}
