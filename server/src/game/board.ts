import type { Tile, TileType } from './types.js';

/**
 * 보드는 12 x 12 격자 위에 놓인 칸들의 그래프다.
 * x, y 는 격자 좌표이고 next 는 이어지는 칸들의 id 목록 (2개 이상이면 갈림길).
 */
type Spec = Omit<Tile, 'id' | 'next' | 'x' | 'y'>;

const tiles: Tile[] = [];

function add(x: number, y: number, type: TileType, label: string, desc: string, extra: Partial<Spec> = {}): number {
  const id = tiles.length;
  tiles.push({ id, type, label, desc, next: [], x, y, ...extra });
  return id;
}

function chain(ids: number[]) {
  for (let i = 0; i < ids.length - 1; i++) tiles[ids[i]].next.push(ids[i + 1]);
}

const money = (amount: number, label: string, desc: string) => ({ type: 'money' as const, label, desc, amount });
const life = (label: string, desc: string) => ({ type: 'life' as const, label, desc });
const payday = () => ({ type: 'payday' as const, label: '월급날', desc: '연봉만큼 월급을 받아요. 지나가기만 해도 받아요!' });
const tax = () => ({ type: 'tax' as const, label: '세금', desc: '연봉의 30%를 세금으로 내요.' });
const baby = (amount: number, label: string) => ({
  type: 'baby' as const,
  label,
  desc: `아이 ${amount}명이 태어나요! 은퇴 시 아이 1명당 보너스.`,
  amount,
});
const gamble = (amount: number, label: string) => ({
  type: 'gamble' as const,
  label,
  desc: `한 번 더 돌려서 6 이상이면 +${amount.toLocaleString()}만원, 5 이하면 -${(amount / 2).toLocaleString()}만원`,
  amount,
});

type Row = { type: TileType; label: string; desc: string; amount?: number };

function row(y: number, xs: number[], specs: Row[]): number[] {
  return specs.map((s, i) => add(xs[i], y, s.type, s.label, s.desc, { amount: s.amount }));
}

const range = (a: number, b: number) => {
  const out: number[] = [];
  const step = a <= b ? 1 : -1;
  for (let v = a; v !== b + step; v += step) out.push(v);
  return out;
};

// ── 출발 & 첫 번째 갈림길 ─────────────────────────────
const start = add(0, 1, 'start', '출발', '인생의 시작! 대학에 갈지, 바로 취업할지 골라요.');

const college = [
  add(1, 0, 'loan', '학자금 대출', '대학 등록금으로 대출 2건이 생겨요. (지나가도 적용)', {
    amount: 2,
    pathLabel: '🎓 대학 진학',
    pathDesc: '학자금 대출 2건을 지지만, 졸업하면 고연봉 학위 직업을 고를 수 있어요.',
  }),
  add(2, 0, 'money', '전공 서적', '전공 서적을 사요.', { amount: -500 }),
  add(3, 0, 'life', 'MT의 추억', '평생 친구를 만났어요! 인생 카드 1장.'),
  add(4, 0, 'money', '장학금', '성적 장학금을 받아요!', { amount: 1500 }),
  add(5, 0, 'career', '졸업 & 취업', '학위가 필요한 직업을 포함해 직업을 골라요.', { degree: true, stop: true }),
];

const career = [
  add(1, 2, 'career', '첫 취업', '바로 사회로! 직업을 골라요.', {
    degree: false,
    stop: true,
    pathLabel: '💼 바로 취업',
    pathDesc: '빚 없이 바로 돈을 벌기 시작해요. 대신 학위 직업은 고를 수 없어요.',
  }),
  add(2, 2, payday().type, payday().label, payday().desc),
  add(3, 2, 'money', '입사 회식', '신입 환영 회식비를 내요.', { amount: -300 }),
  add(4, 2, 'life', '동기 사랑', '든든한 입사 동기들! 인생 카드 1장.'),
  add(5, 2, payday().type, payday().label, payday().desc),
];

tiles[start].next.push(college[0], career[0]);
chain(college);
chain(career);

// ── 합류 후 청년기 ──────────────────────────────────
const youth = row(1, range(6, 11), [
  payday(),
  money(-800, '첫 차 구입', '중고차를 샀어요.'),
  life('해외여행', '첫 해외여행! 인생 카드 1장.'),
  money(1500, '성과급', '열심히 일한 보람이 있어요.'),
  payday(),
  money(-500, '연애 데이트', '데이트 비용이 들어요.'),
]);
tiles[college[college.length - 1]].next.push(youth[0]);
tiles[career[career.length - 1]].next.push(youth[0]);
chain(youth);

const wedding = add(11, 2, 'marry', '결혼', '결혼해요! 다른 플레이어들이 축의금을 보내줘요.', { stop: true });

const family = row(3, range(11, 0), [
  life('신혼여행', '평생 기억에 남을 신혼여행. 인생 카드 1장.'),
  payday(),
  money(-1000, '신혼 가구', '신혼집 가구를 장만해요.'),
  baby(1, '첫 아이'),
  tax(),
  life('반려견 입양', '새 가족이 생겼어요. 인생 카드 1장.'),
  payday(),
  { type: 'house', label: '내 집 마련', desc: '집을 살 수 있어요. 은퇴할 때 더 비싸게 팔려요!' },
  money(-800, '이사 비용', '이삿짐 센터를 불렀어요.'),
  baby(2, '쌍둥이!'),
  money(2000, '부업 성공', '주말 부업이 대박났어요.'),
  payday(),
]);
tiles[family[7]].stop = true; // 내 집 마련은 반드시 멈춤

const photo = add(0, 4, 'life', '가족 사진', '온 가족이 사진관에서 찰칵. 인생 카드 1장.');

const midlife = row(5, range(0, 11), [
  money(-1500, '자동차 수리', '차가 고장났어요.'),
  payday(),
  life('마라톤 완주', '42.195km 완주! 인생 카드 1장.'),
  money(-3000, '자녀 학원비', '아이들 학원비가 만만치 않아요.'),
  baby(1, '막내 탄생'),
  payday(),
  money(3000, '승진 보너스', '드디어 승진!'),
  tax(),
  life('봉사활동', '나눔의 기쁨. 인생 카드 1장.'),
  money(-2000, '집 리모델링', '낡은 집을 고쳐요.'),
  payday(),
  life('가족 여행', '온 가족 제주도 여행! 인생 카드 1장.'),
]);

const prize = add(11, 6, 'money', '경품 당첨', '마트 경품 행사에 당첨됐어요!', { amount: 1000 });

const mature = row(7, range(11, 0), [
  payday(),
  money(-2500, '자녀 등록금', '아이가 대학에 갔어요.'),
  life('책 출간', '내 이름으로 된 책이 나왔어요. 인생 카드 1장.'),
  tax(),
  money(2000, '투자 수익', '꾸준히 모은 펀드가 올랐어요.'),
  payday(),
  life('자녀 결혼식', '아이가 결혼해요. 인생 카드 1장.'),
  money(-1500, '건강검진', '건강이 최고! 치료비를 내요.'),
  life('손주 탄생', '할머니/할아버지가 됐어요. 인생 카드 1장.'),
  payday(),
  money(-1000, '명절 용돈', '조카들 용돈을 줘요.'),
  life('버킷리스트', '버킷리스트 달성! 인생 카드 1장.'),
]);

// ── 두 번째 갈림길: 인생 2막 ─────────────────────────
const fork = add(0, 8, 'branch', '인생 2막', '안정적인 길과 모험의 길 중 하나를 골라요.');

const safe = row(9, range(1, 6), [
  money(1000, '적금 만기', '차곡차곡 모은 적금이 만기됐어요.'),
  life('텃밭 가꾸기', '직접 키운 채소! 인생 카드 1장.'),
  payday(),
  money(-500, '취미 생활', '새 취미를 시작했어요.'),
  life('여유로운 산책', '느긋한 오후. 인생 카드 1장.'),
  payday(),
]);
tiles[safe[0]].pathLabel = '🌿 안정의 길';
tiles[safe[0]].pathDesc = '큰 위험 없이 차분하게 노후를 준비해요.';

const risky = row(11, range(1, 6), [
  gamble(6000, '주식 투자'),
  gamble(8000, '창업 도전'),
  life('세계 일주', '세계 일주를 떠났어요! 인생 카드 1장.'),
  gamble(10000, '코인 투자'),
  payday(),
  gamble(6000, '부동산 투자'),
]);
tiles[risky[0]].pathLabel = '🎲 모험의 길';
tiles[risky[0]].pathDesc = '한 번 더 돌려 대박 혹은 쪽박! 투자 칸이 가득해요.';

const finale = row(10, range(7, 10), [
  payday(),
  money(-1000, '은퇴 기념 여행', '수고한 나에게 주는 선물.'),
  life('인생 회고록', '돌아보니 멋진 인생이었어요. 인생 카드 1장.'),
  payday(),
]);

const retire = add(11, 10, 'retire', '은퇴', '은퇴! 먼저 도착할수록 보너스가 커요.', { stop: true });

chain([youth[youth.length - 1], wedding, ...family, photo, ...midlife, prize, ...mature, fork]);
tiles[fork].next.push(safe[0], risky[0]);
chain(safe);
chain(risky);
tiles[safe[safe.length - 1]].next.push(finale[0]);
tiles[risky[risky.length - 1]].next.push(finale[0]);
chain([...finale, retire]);

export const BOARD: readonly Tile[] = tiles;
export const START_TILE_ID = start;
export const BOARD_SIZE = { cols: 12, rows: 12 };

export function tileAt(id: number): Tile {
  const t = BOARD[id];
  if (!t) throw new Error(`Unknown tile ${id}`);
  return t;
}
