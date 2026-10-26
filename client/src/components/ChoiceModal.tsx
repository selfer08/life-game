import { won } from '../api';
import type { Action, Pending, Player } from '../types';

interface Props {
  pending: Pending;
  player: Player;
  onAct: (a: Action) => void;
  disabled: boolean;
}

export function ChoiceModal({ pending, player, onAct, disabled }: Props) {
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true">
        {pending.type === 'choosePath' && (
          <>
            <p className="modal-kicker">{player.name}님, 갈림길이에요!</p>
            <h2>어느 길로 갈까요?</h2>
            <p className="modal-sub">남은 이동 {pending.stepsLeft}칸</p>
            <div className="choices">
              {pending.options.map((o) => (
                <button key={o.tileId} className="choice" disabled={disabled} onClick={() => onAct({ type: 'choosePath', tileId: o.tileId })}>
                  <span className="choice-title">{o.label}</span>
                  <span className="choice-desc">{o.desc}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {pending.type === 'chooseCareer' && (
          <>
            <p className="modal-kicker">{player.name}님의 커리어</p>
            <h2>직업을 골라 주세요</h2>
            <p className="modal-sub">월급날마다 연봉만큼 받아요.</p>
            <div className="choices">
              {pending.options.map((c) => (
                <button key={c.id} className="choice choice--card" disabled={disabled} onClick={() => onAct({ type: 'chooseCareer', careerId: c.id })}>
                  <span className="choice-emoji">{c.emoji}</span>
                  <span className="choice-title">{c.name}</span>
                  <span className="choice-money">연봉 {won(c.salary)}</span>
                  {c.degree && <span className="chip">🎓 학위 필요</span>}
                </button>
              ))}
            </div>
          </>
        )}

        {pending.type === 'buyHouse' && (
          <>
            <p className="modal-kicker">{player.name}님, 내 집 마련의 기회!</p>
            <h2>집을 살까요?</h2>
            <p className="modal-sub">현금 {won(player.cash)} · 부족하면 자동으로 대출을 받아요.</p>
            <div className="choices">
              {pending.options.map((h) => (
                <button key={h.id} className="choice choice--card" disabled={disabled} onClick={() => onAct({ type: 'buyHouse', houseId: h.id })}>
                  <span className="choice-emoji">{h.emoji}</span>
                  <span className="choice-title">{h.name}</span>
                  <span className="choice-money">{won(h.price)}</span>
                  <span className="choice-desc">은퇴 시 {won(h.sellValue)}에 판매</span>
                </button>
              ))}
            </div>
            <button className="btn btn--ghost" disabled={disabled} onClick={() => onAct({ type: 'buyHouse', houseId: null })}>
              이번엔 사지 않을래요
            </button>
          </>
        )}
      </div>
    </div>
  );
}
