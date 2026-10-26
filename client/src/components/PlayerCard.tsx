import { won } from '../api';
import type { Player } from '../types';

interface Props {
  player: Player;
  active: boolean;
  mine: boolean;
  loanRepay: number;
  onRepay?: () => void;
}

export function PlayerCard({ player: p, active, mine, loanRepay, onRepay }: Props) {
  return (
    <div className={`pcard${active ? ' pcard--active' : ''}${p.retired ? ' pcard--retired' : ''}`} style={{ '--pc': p.color } as React.CSSProperties}>
      <div className="pcard-head">
        <span className="pcard-dot">{p.name.slice(0, 1)}</span>
        <div className="pcard-name">
          <strong>{p.name}</strong>
          {mine && <span className="chip chip--mine">나</span>}
          {p.retired && <span className="chip">🌴 은퇴 {p.retireOrder}등</span>}
        </div>
        <div className="pcard-cash">{won(p.cash)}</div>
      </div>
      <div className="pcard-stats">
        <span title="직업">{p.career ? `${p.career.emoji} ${p.career.name}` : p.degree ? '🎓 대학생' : '🧑 무직'}</span>
        {p.married && <span title="결혼">💍</span>}
        {p.children > 0 && <span title="아이">👶×{p.children}</span>}
        {p.house && <span title={p.house.name}>{p.house.emoji}</span>}
        <span title="인생 카드">🎁×{p.lifeCardCount}</span>
        {p.loans > 0 && (
          <span className="pcard-loan" title={`대출 ${p.loans}건 (1건당 상환 ${won(loanRepay)})`}>
            🏦 대출 {p.loans}
          </span>
        )}
      </div>
      {mine && p.loans > 0 && !p.retired && onRepay && (
        <button className="btn btn--tiny" onClick={onRepay} disabled={p.cash < loanRepay}>
          대출 1건 상환 ({won(loanRepay)})
        </button>
      )}
    </div>
  );
}
