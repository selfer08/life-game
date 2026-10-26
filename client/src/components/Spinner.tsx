import { useEffect, useRef, useState } from 'react';
import { SPIN_MS } from '../hooks/useMoveAnimation';

const COLORS = ['#FF6B5B', '#FFC845', '#2BB3A3', '#7B61FF', '#3E8BFF', '#FF7AA8', '#3DBE7A', '#FF9F43', '#5C6BC0', '#26C6DA'];

interface Props {
  max: number;
  value: number | null;
  spinKey: number;
}

export function Spinner({ max, value, spinKey }: Props) {
  const seg = 360 / max;
  const [rotation, setRotation] = useState(() => (value ? -((value - 1) * seg + seg / 2) : 0));
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!value) return;
    setRotation((cur) => {
      const target = -((value - 1) * seg + seg / 2);
      const base = cur - (((cur % 360) + 360) % 360);
      return base - 360 * 5 + ((target % 360) + 360) % 360 - 360;
    });
  }, [spinKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const r = 90;
  return (
    <div className="spinner">
      <svg viewBox="-100 -112 200 212" aria-label={value ? `룰렛 결과 ${value}` : '룰렛'}>
        <g style={{ transform: `rotate(${rotation}deg)`, transition: `transform ${SPIN_MS}ms cubic-bezier(.17,.67,.2,1)` }}>
          <circle r={r + 6} fill="var(--ink)" />
          {Array.from({ length: max }, (_, i) => {
            const a0 = ((i * seg - 90) * Math.PI) / 180;
            const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
            const mid = (((i + 0.5) * seg - 90) * Math.PI) / 180;
            return (
              <g key={i}>
                <path
                  d={`M0 0 L${r * Math.cos(a0)} ${r * Math.sin(a0)} A${r} ${r} 0 0 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`}
                  fill={COLORS[i % COLORS.length]}
                  stroke="#fff"
                  strokeWidth="2"
                />
                <text
                  x={64 * Math.cos(mid)}
                  y={64 * Math.sin(mid) + 7}
                  textAnchor="middle"
                  className="spinner-num"
                  transform={`rotate(${(i + 0.5) * seg}, ${64 * Math.cos(mid)}, ${64 * Math.sin(mid)})`}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
          <circle r="18" fill="#fff" stroke="var(--ink)" strokeWidth="4" />
        </g>
        <path d="M-11 -108 L11 -108 L0 -84 Z" fill="var(--ink)" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
