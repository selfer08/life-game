import type { Tile } from '../types';

export function tileStyle(tile: Tile): { color: string; icon: string } {
  switch (tile.type) {
    case 'start': return { color: 'var(--t-start)', icon: '🏁' };
    case 'retire': return { color: 'var(--t-start)', icon: '🌴' };
    case 'payday': return { color: 'var(--t-payday)', icon: '💰' };
    case 'money': return (tile.amount ?? 0) >= 0 ? { color: 'var(--t-gain)', icon: '📈' } : { color: 'var(--t-loss)', icon: '💸' };
    case 'life': return { color: 'var(--t-life)', icon: '🎁' };
    case 'loan': return { color: 'var(--t-loss)', icon: '🏦' };
    case 'career': return { color: 'var(--t-career)', icon: tile.degree ? '🎓' : '💼' };
    case 'marry': return { color: 'var(--t-marry)', icon: '💍' };
    case 'baby': return { color: 'var(--t-baby)', icon: '👶' };
    case 'house': return { color: 'var(--t-house)', icon: '🏠' };
    case 'tax': return { color: 'var(--t-tax)', icon: '🧾' };
    case 'gamble': return { color: 'var(--t-gamble)', icon: '🎲' };
    case 'branch': return { color: 'var(--t-branch)', icon: '🔀' };
  }
}

export const TILE_LEGEND: { icon: string; label: string; color: string }[] = [
  { icon: '💰', label: '월급날', color: 'var(--t-payday)' },
  { icon: '📈', label: '수입', color: 'var(--t-gain)' },
  { icon: '💸', label: '지출', color: 'var(--t-loss)' },
  { icon: '🎁', label: '인생 카드', color: 'var(--t-life)' },
  { icon: '💼', label: '직업', color: 'var(--t-career)' },
  { icon: '💍', label: '결혼', color: 'var(--t-marry)' },
  { icon: '👶', label: '아이', color: 'var(--t-baby)' },
  { icon: '🏠', label: '집', color: 'var(--t-house)' },
  { icon: '🧾', label: '세금', color: 'var(--t-tax)' },
  { icon: '🎲', label: '투자', color: 'var(--t-gamble)' },
];
