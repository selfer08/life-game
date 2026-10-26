import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOARD, START_TILE_ID } from './board.js';
import { addPlayer, applyAction, createGame, startGame } from './engine.js';
import type { GameState } from './types.js';

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** 대기 중인 선택지가 있으면 무작위로 고르고, 없으면 룰렛을 돌린다. */
function playRandom(state: GameState, rng: () => number) {
  let guard = 0;
  while (state.phase === 'playing') {
    if (++guard > 5000) throw new Error('game did not finish');
    const player = state.players[state.turn];
    const p = state.pending;
    if (!p) applyAction(state, player.id, { type: 'spin' }, rng);
    else if (p.type === 'choosePath') applyAction(state, player.id, { type: 'choosePath', tileId: p.options[Math.floor(rng() * p.options.length)].tileId }, rng);
    else if (p.type === 'chooseCareer') applyAction(state, player.id, { type: 'chooseCareer', careerId: p.options[0].id }, rng);
    else applyAction(state, player.id, { type: 'buyHouse', houseId: rng() < 0.7 ? p.options[0].id : null }, rng);
  }
}

test('board graph: every tile reaches retirement', () => {
  const retire = BOARD.find((t) => t.type === 'retire')!;
  for (const t of BOARD) {
    const seen = new Set<number>();
    const stack = [t.id];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(...BOARD[id].next);
    }
    assert.ok(seen.has(retire.id), `tile ${t.id} cannot reach retire`);
  }
  const coords = new Set(BOARD.map((t) => `${t.x},${t.y}`));
  assert.equal(coords.size, BOARD.length, 'tiles must not overlap');
});

test('random games always finish with ranked results', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rng = seeded(seed);
    const { state } = createGame('TEST1', 'A');
    addPlayer(state, 'B');
    addPlayer(state, 'C');
    startGame(state, state.hostId);
    playRandom(state, rng);
    assert.equal(state.phase, 'finished');
    assert.equal(state.results!.length, 3);
    assert.deepEqual(state.results!.map((r) => r.rank), [1, 2, 3]);
    for (const p of state.players) {
      assert.ok(p.retired);
      assert.ok(p.cash >= 0, 'cash never negative (auto loans)');
      assert.ok(p.career, 'everyone gets a career');
    }
  }
});

test('first spin asks to choose college or career path', () => {
  const { state } = createGame('TEST2', 'A');
  startGame(state, state.hostId);
  applyAction(state, state.hostId, { type: 'spin' }, () => 0.5);
  assert.equal(state.pending?.type, 'choosePath');
  assert.equal(state.players[0].position, START_TILE_ID);
});

test('only the current player may act', () => {
  const { state } = createGame('TEST3', 'A');
  const b = addPlayer(state, 'B');
  startGame(state, state.hostId);
  assert.throws(() => applyAction(state, b.id, { type: 'spin' }), /차례/);
});
