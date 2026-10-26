import { randomUUID } from 'node:crypto';
import { BOARD, START_TILE_ID, tileAt } from './board.js';
import {
  CAREERS,
  CHILD_BONUS,
  HOUSES,
  LIFE_CARD_VALUES,
  LOAN_REPAY,
  LOAN_UNIT,
  MAX_PLAYERS,
  PLAYER_COLORS,
  RETIRE_BONUS,
  SPIN_MAX,
  STARTING_CASH,
  WEDDING_GIFT,
} from './data.js';
import type { Action, GameState, LogEntry, Player, ResultRow, Tile } from './types.js';

export type Rng = () => number;

export class GameError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const won = (n: number) => `${Math.abs(n).toLocaleString('ko-KR')}만원`;

function pick<T>(items: T[], count: number, rng: Rng): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

export const spin = (rng: Rng) => 1 + Math.floor(rng() * SPIN_MAX);

function log(state: GameState, playerId: string | null, text: string, tone: LogEntry['tone'] = 'neutral') {
  state.logSeq += 1;
  state.log.push({ id: state.logSeq, playerId, text, tone, at: Date.now() });
  if (state.log.length > 80) state.log.splice(0, state.log.length - 80);
}

function newPlayer(name: string, color: string): Player {
  return {
    id: randomUUID(),
    token: randomUUID(),
    name,
    color,
    position: START_TILE_ID,
    cash: STARTING_CASH,
    loans: 0,
    career: null,
    degree: false,
    married: false,
    children: 0,
    house: null,
    lifeCards: [],
    retired: false,
    retireOrder: null,
  };
}

function cleanName(name: unknown): string {
  const n = typeof name === 'string' ? name.trim().slice(0, 12) : '';
  if (!n) throw new GameError('이름을 입력해 주세요.');
  return n;
}

// ── 로비 ───────────────────────────────────────────

export function createGame(code: string, hostName: string): { state: GameState; player: Player } {
  const player = newPlayer(cleanName(hostName), PLAYER_COLORS[0]);
  const state: GameState = {
    code,
    phase: 'lobby',
    hostId: player.id,
    players: [player],
    turn: 0,
    round: 1,
    pending: null,
    lastMove: null,
    log: [],
    logSeq: 0,
    results: null,
    version: 0,
    createdAt: Date.now(),
  };
  log(state, player.id, `${player.name}님이 방을 만들었어요.`);
  return { state, player };
}

export function addPlayer(state: GameState, name: string): Player {
  if (state.phase !== 'lobby') throw new GameError('이미 시작된 게임이에요.');
  if (state.players.length >= MAX_PLAYERS) throw new GameError(`최대 ${MAX_PLAYERS}명까지 참가할 수 있어요.`);
  const n = cleanName(name);
  if (state.players.some((p) => p.name === n)) throw new GameError('이미 사용 중인 이름이에요.');
  const used = new Set(state.players.map((p) => p.color));
  const color = PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[0];
  const player = newPlayer(n, color);
  state.players.push(player);
  log(state, player.id, `${player.name}님이 참가했어요.`);
  return player;
}

export function startGame(state: GameState, playerId: string) {
  if (state.phase !== 'lobby') throw new GameError('이미 시작된 게임이에요.');
  if (playerId !== state.hostId) throw new GameError('방장만 게임을 시작할 수 있어요.', 403);
  state.phase = 'playing';
  state.turn = 0;
  log(state, null, `게임 시작! ${state.players[0].name}님부터 시작해요.`);
}

// ── 돈 처리 ─────────────────────────────────────────

function gain(player: Player, amount: number) {
  player.cash += amount;
}

/** 현금이 부족하면 자동으로 은행 대출을 받는다. */
function pay(state: GameState, player: Player, amount: number) {
  player.cash -= amount;
  let taken = 0;
  while (player.cash < 0) {
    player.cash += LOAN_UNIT;
    player.loans += 1;
    taken += 1;
  }
  if (taken) log(state, player.id, `${player.name}님이 현금이 부족해 대출 ${taken}건을 받았어요.`, 'bad');
}

// ── 이동 & 칸 효과 ──────────────────────────────────

/** 멈추지 않고 지나가기만 해도 발동하는 효과 */
function passEffect(state: GameState, player: Player, tile: Tile) {
  if (tile.type === 'payday') paydayEffect(state, player, '지나가며 ');
  if (tile.type === 'loan') loanEffect(state, player, tile);
}

function paydayEffect(state: GameState, player: Player, prefix = '') {
  if (!player.career) return;
  gain(player, player.career.salary);
  log(state, player.id, `${player.name}님 ${prefix}월급 +${won(player.career.salary)}`, 'good');
}

function loanEffect(state: GameState, player: Player, tile: Tile) {
  const n = tile.amount ?? 1;
  player.loans += n;
  player.degree = true;
  log(state, player.id, `${player.name}님이 학자금 대출 ${n}건을 받았어요.`, 'bad');
}

function landEffect(state: GameState, player: Player, tile: Tile, rng: Rng) {
  switch (tile.type) {
    case 'payday':
      paydayEffect(state, player);
      break;
    case 'loan':
      loanEffect(state, player, tile);
      break;
    case 'money': {
      const amt = tile.amount ?? 0;
      if (amt >= 0) gain(player, amt);
      else pay(state, player, -amt);
      log(state, player.id, `${player.name}님 [${tile.label}] ${amt >= 0 ? '+' : '-'}${won(amt)}`, amt >= 0 ? 'good' : 'bad');
      break;
    }
    case 'life': {
      const value = LIFE_CARD_VALUES[Math.floor(rng() * LIFE_CARD_VALUES.length)];
      player.lifeCards.push(value);
      log(state, player.id, `${player.name}님 [${tile.label}] 인생 카드 1장 획득!`, 'good');
      break;
    }
    case 'tax': {
      const amt = player.career ? Math.round((player.career.salary * 0.3) / 100) * 100 : 0;
      if (amt) pay(state, player, amt);
      log(state, player.id, amt ? `${player.name}님 세금 -${won(amt)}` : `${player.name}님은 소득이 없어 세금이 없어요.`, amt ? 'bad' : 'neutral');
      break;
    }
    case 'baby': {
      const n = tile.amount ?? 1;
      player.children += n;
      log(state, player.id, `${player.name}님 가족에 아이 ${n}명이 생겼어요! 👶`, 'good');
      break;
    }
    case 'gamble': {
      const amt = tile.amount ?? 0;
      const roll = spin(rng);
      if (roll >= 6) {
        gain(player, amt);
        log(state, player.id, `${player.name}님 [${tile.label}] ${roll}! 대박 +${won(amt)} 🎉`, 'good');
      } else {
        pay(state, player, amt / 2);
        log(state, player.id, `${player.name}님 [${tile.label}] ${roll}... 손실 -${won(amt / 2)}`, 'bad');
      }
      break;
    }
    case 'marry': {
      player.married = true;
      let total = 0;
      for (const other of state.players) {
        if (other.id === player.id || other.retired) continue;
        pay(state, other, WEDDING_GIFT);
        total += WEDDING_GIFT;
      }
      gain(player, total);
      log(state, player.id, `💍 ${player.name}님 결혼! 축의금 +${won(total)}`, 'good');
      break;
    }
    case 'career': {
      const pool = tile.degree && player.degree ? CAREERS : CAREERS.filter((c) => !c.degree);
      state.pending = { type: 'chooseCareer', playerId: player.id, options: pick(pool, 3, rng) };
      log(state, player.id, `${player.name}님이 직업을 고르고 있어요.`);
      break;
    }
    case 'house': {
      if (player.house) {
        log(state, player.id, `${player.name}님은 이미 집이 있어요.`);
        break;
      }
      state.pending = { type: 'buyHouse', playerId: player.id, options: pick(HOUSES, 3, rng) };
      break;
    }
    case 'retire': {
      const order = state.players.filter((p) => p.retired).length;
      player.retired = true;
      player.retireOrder = order + 1;
      const bonus = RETIRE_BONUS[order] ?? 0;
      if (bonus) gain(player, bonus);
      log(state, player.id, `🌴 ${player.name}님 ${order + 1}번째로 은퇴!${bonus ? ` 보너스 +${won(bonus)}` : ''}`, 'good');
      break;
    }
    case 'start':
    case 'branch':
      break;
  }
}

function advance(state: GameState, player: Player, steps: number, rng: Rng, forcedNext?: number) {
  let remaining = steps;
  let forced = forcedNext;
  while (remaining > 0) {
    const cur = tileAt(player.position);
    if (!cur.next.length) break;
    let nextId: number;
    if (forced !== undefined) {
      nextId = forced;
      forced = undefined;
    } else if (cur.next.length > 1) {
      state.pending = {
        type: 'choosePath',
        playerId: player.id,
        stepsLeft: remaining,
        options: cur.next.map((id) => ({ tileId: id, label: tileAt(id).pathLabel ?? tileAt(id).label, desc: tileAt(id).pathDesc ?? '' })),
      };
      return;
    } else {
      nextId = cur.next[0];
    }
    player.position = nextId;
    remaining -= 1;
    state.lastMove!.path.push(nextId);
    const tile = tileAt(nextId);
    if (tile.stop) break;
    if (remaining > 0) passEffect(state, player, tile);
  }
  landEffect(state, player, tileAt(player.position), rng);
  if (!state.pending) endTurn(state);
}

function endTurn(state: GameState) {
  state.pending = null;
  if (state.players.every((p) => p.retired)) {
    finish(state);
    return;
  }
  const n = state.players.length;
  let next = state.turn;
  do {
    next = (next + 1) % n;
    if (next === 0) state.round += 1;
  } while (state.players[next].retired);
  state.turn = next;
}

export function scorePlayer(p: Player): Omit<ResultRow, 'rank'> {
  const houseValue = p.house?.sellValue ?? 0;
  const lifeCardsValue = p.lifeCards.reduce((a, b) => a + b, 0);
  const childrenBonus = p.children * CHILD_BONUS;
  const loanDebt = p.loans * LOAN_REPAY;
  return {
    playerId: p.id,
    name: p.name,
    color: p.color,
    career: p.career?.name ?? null,
    cash: p.cash,
    houseValue,
    lifeCardsValue,
    childrenBonus,
    loanDebt,
    total: p.cash + houseValue + lifeCardsValue + childrenBonus - loanDebt,
  };
}

function finish(state: GameState) {
  const rows = state.players.map(scorePlayer).sort((a, b) => b.total - a.total);
  state.results = rows.map((r, i) => ({ ...r, rank: i + 1 }));
  state.phase = 'finished';
  log(state, null, `🏆 게임 종료! 우승은 ${rows[0].name}님 (${won(rows[0].total)})`, 'good');
}

// ── 액션 ────────────────────────────────────────────

export function applyAction(state: GameState, playerId: string, action: Action, rng: Rng = Math.random) {
  if (state.phase !== 'playing') throw new GameError('진행 중인 게임이 아니에요.');
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new GameError('플레이어를 찾을 수 없어요.', 404);

  if (action.type === 'repayLoan') {
    if (player.loans <= 0) throw new GameError('갚을 대출이 없어요.');
    if (player.cash < LOAN_REPAY) throw new GameError(`대출 상환에는 ${won(LOAN_REPAY)}이 필요해요.`);
    player.cash -= LOAN_REPAY;
    player.loans -= 1;
    log(state, player.id, `${player.name}님이 대출 1건을 갚았어요. (-${won(LOAN_REPAY)})`);
    return;
  }

  if (state.players[state.turn].id !== playerId) throw new GameError('내 차례가 아니에요.', 403);
  const pending = state.pending;

  switch (action.type) {
    case 'spin': {
      if (pending) throw new GameError('먼저 선택을 완료해 주세요.');
      const value = spin(rng);
      state.lastMove = { seq: (state.lastMove?.seq ?? 0) + 1, playerId, spin: value, from: player.position, path: [], logId: state.logSeq + 1 };
      log(state, player.id, `${player.name}님이 룰렛을 돌려 ${value}이(가) 나왔어요.`);
      advance(state, player, value, rng);
      return;
    }
    case 'choosePath': {
      if (pending?.type !== 'choosePath') throw new GameError('지금은 길을 고를 수 없어요.');
      const opt = pending.options.find((o) => o.tileId === action.tileId);
      if (!opt) throw new GameError('잘못된 선택이에요.');
      state.pending = null;
      state.lastMove = { seq: (state.lastMove?.seq ?? 0) + 1, playerId, spin: null, from: player.position, path: [], logId: state.logSeq + 1 };
      log(state, player.id, `${player.name}님이 '${opt.label}'을(를) 선택했어요.`);
      advance(state, player, pending.stepsLeft, rng, opt.tileId);
      return;
    }
    case 'chooseCareer': {
      if (pending?.type !== 'chooseCareer') throw new GameError('지금은 직업을 고를 수 없어요.');
      const career = pending.options.find((c) => c.id === action.careerId);
      if (!career) throw new GameError('잘못된 선택이에요.');
      player.career = career;
      log(state, player.id, `${player.name}님은 이제 ${career.emoji} ${career.name}! (연봉 ${won(career.salary)})`, 'good');
      endTurn(state);
      return;
    }
    case 'buyHouse': {
      if (pending?.type !== 'buyHouse') throw new GameError('지금은 집을 살 수 없어요.');
      if (action.houseId === null) {
        log(state, player.id, `${player.name}님은 집을 사지 않기로 했어요.`);
      } else {
        const house = pending.options.find((h) => h.id === action.houseId);
        if (!house) throw new GameError('잘못된 선택이에요.');
        pay(state, player, house.price);
        player.house = house;
        log(state, player.id, `🏠 ${player.name}님이 ${house.name}을(를) ${won(house.price)}에 샀어요!`, 'good');
      }
      endTurn(state);
      return;
    }
    default:
      throw new GameError('알 수 없는 액션이에요.');
  }
}

// ── 클라이언트로 보낼 공개 상태 ───────────────────────

export function toPublic(state: GameState) {
  const finished = state.phase === 'finished';
  return {
    ...state,
    players: state.players.map(({ token: _t, lifeCards, ...p }) => ({
      ...p,
      lifeCardCount: lifeCards.length,
      lifeCards: finished ? lifeCards : null,
    })),
  };
}

export const boardInfo = () => ({ tiles: BOARD, cols: 12, rows: 12, spinMax: SPIN_MAX, loanUnit: LOAN_UNIT, loanRepay: LOAN_REPAY });
