import { useMemo } from 'react';
import type { Board, Player, Tile } from '../types';
import { tileStyle } from './tileStyle';

const CELL = 88;
const TILE = 72;
const SCENERY = ['🌳', '🌲', '🏫', '🏪', '⛲', '🌷', '🏥', '🌻', '⛪', '🎡'];

interface Props {
  board: Board;
  players: Player[];
  positions: Record<string, number>;
  currentId: string | null;
}

const center = (t: Tile) => ({ cx: t.x * CELL + CELL / 2, cy: t.y * CELL + CELL / 2 });

function splitLabel(label: string): string[] {
  if (label.length <= 5) return [label];
  const space = label.indexOf(' ');
  if (space > 0) return [label.slice(0, space), label.slice(space + 1)];
  return [label.slice(0, 5), label.slice(5)];
}

export function BoardView({ board, players, positions, currentId }: Props) {
  const width = board.cols * CELL;
  const height = board.rows * CELL;

  const scenery = useMemo(() => {
    const used = new Set(board.tiles.map((t) => `${t.x},${t.y}`));
    const out: { x: number; y: number; e: string }[] = [];
    for (let y = 0; y < board.rows; y++)
      for (let x = 0; x < board.cols; x++)
        if (!used.has(`${x},${y}`) && (x * 7 + y * 3) % 3 === 0) out.push({ x, y, e: SCENERY[(x + y * 5) % SCENERY.length] });
    return out;
  }, [board]);

  const byTile = new Map<number, Player[]>();
  for (const p of players) {
    const pos = positions[p.id] ?? p.position;
    byTile.set(pos, [...(byTile.get(pos) ?? []), p]);
  }
  const currentTile = currentId ? positions[currentId] : null;

  return (
    <svg className="board" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="인생게임 보드">
      <defs>
        <pattern id="grass" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.4" fill="var(--grass-dot)" />
          <circle cx="16" cy="14" r="1.1" fill="var(--grass-dot)" />
        </pattern>
        <filter id="tileShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="0" floodColor="rgba(43,45,66,.28)" />
        </filter>
      </defs>
      <rect width={width} height={height} rx="28" fill="var(--grass)" />
      <rect width={width} height={height} rx="28" fill="url(#grass)" />

      {scenery.map((s) => (
        <text key={`${s.x}-${s.y}`} x={s.x * CELL + CELL / 2} y={s.y * CELL + CELL / 2 + 12} fontSize="34" textAnchor="middle" opacity="0.55">
          {s.e}
        </text>
      ))}

      {/* 길 */}
      <g strokeLinecap="round">
        {board.tiles.flatMap((t) =>
          t.next.map((n) => {
            const a = center(t);
            const b = center(board.tiles[n]);
            return <line key={`r${t.id}-${n}`} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} stroke="var(--road)" strokeWidth="30" />;
          }),
        )}
        {board.tiles.flatMap((t) =>
          t.next.map((n) => {
            const a = center(t);
            const b = center(board.tiles[n]);
            return (
              <line key={`d${t.id}-${n}`} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy} stroke="var(--road-line)" strokeWidth="3" strokeDasharray="8 10" />
            );
          }),
        )}
      </g>

      {/* 칸 */}
      {board.tiles.map((t) => {
        const { color, icon } = tileStyle(t);
        const x = t.x * CELL + (CELL - TILE) / 2;
        const y = t.y * CELL + (CELL - TILE) / 2;
        const lines = splitLabel(t.label);
        const isCurrent = t.id === currentTile;
        return (
          <g key={t.id} className={`tile${isCurrent ? ' tile--current' : ''}`}>
            <title>{`${t.label}\n${t.desc}${t.stop ? '\n⛔ 반드시 멈추는 칸' : ''}`}</title>
            {isCurrent && <rect x={x - 6} y={y - 6} width={TILE + 12} height={TILE + 12} rx="20" className="tile-glow" />}
            <rect x={x} y={y} width={TILE} height={TILE} rx="16" fill={color} filter="url(#tileShadow)" />
            {t.stop && <rect x={x + 3} y={y + 3} width={TILE - 6} height={TILE - 6} rx="13" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="5 4" opacity="0.9" />}
            <text x={x + TILE / 2} y={y + (lines.length > 1 ? 30 : 34)} fontSize="24" textAnchor="middle">
              {icon}
            </text>
            {lines.map((l, i) => (
              <text key={i} x={x + TILE / 2} y={y + (lines.length > 1 ? 48 : 56) + i * 13} className="tile-label" textAnchor="middle">
                {l}
              </text>
            ))}
            {t.stop && (
              <g transform={`translate(${x + TILE - 10}, ${y - 4})`}>
                <circle r="10" fill="var(--stop)" stroke="#fff" strokeWidth="2" />
                <text y="4" fontSize="10" textAnchor="middle" fill="#fff" fontWeight="900">
                  !
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* 말 */}
      {players.map((p) => {
        const pos = positions[p.id] ?? p.position;
        const t = board.tiles[pos];
        const group = byTile.get(pos) ?? [p];
        const idx = group.findIndex((g) => g.id === p.id);
        const angle = (idx / group.length) * Math.PI * 2 - Math.PI / 2;
        const spread = group.length > 1 ? 20 : 0;
        const { cx, cy } = center(t);
        const px = cx + Math.cos(angle) * spread;
        const py = cy + Math.sin(angle) * spread - 4;
        const active = p.id === currentId;
        return (
          <g key={p.id} className={`token${active ? ' token--active' : ''}`} style={{ transform: `translate(${px}px, ${py}px)` }}>
            <ellipse cx="0" cy="20" rx="14" ry="4.5" fill="rgba(0,0,0,.3)" />
            <g className="token-body">
              <path d="M-14 16 Q-14 -2 0 -5 Q14 -2 14 16 Z" fill={p.color} stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
              <circle cx="0" cy="-13" r="10.5" fill={p.color} stroke="var(--ink)" strokeWidth="3" />
              <circle cx="-3.5" cy="-16" r="3" fill="#fff" opacity="0.55" />
              <text x="0" y="12" fontSize="11" fontWeight="900" fill="#fff" textAnchor="middle" stroke="var(--ink)" strokeWidth="2.5" paintOrder="stroke">
                {p.name.slice(0, 1)}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
