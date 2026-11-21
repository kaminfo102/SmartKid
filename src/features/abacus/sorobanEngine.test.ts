import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addValue,
  createEmptySoroban,
  numberToSorobanState,
  planSorobanSteps,
  resetSoroban,
  sorobanStateToNumber,
  subtractValue,
  toggleEarthBead,
  toggleHeavenBead,
} from './sorobanEngine.ts';

test('empty soroban evaluates to 0', () => {
  const s = createEmptySoroban(3);
  assert.equal(sorobanStateToNumber(s), 0);
});

test('numberToSorobanState and sorobanStateToNumber round-trip 0..999', () => {
  for (let n = 0; n <= 999; n++) {
    const state = numberToSorobanState(n, 3);
    assert.equal(sorobanStateToNumber(state), n, `Failed round-trip for ${n}`);
  }
});

test('single digit Soroban bead representation rules', () => {
  const s7 = numberToSorobanState(7, 1);
  assert.equal(s7[0].heavenActive, true);
  assert.equal(s7[0].earthCount, 2);

  const s4 = numberToSorobanState(4, 1);
  assert.equal(s4[0].heavenActive, false);
  assert.equal(s4[0].earthCount, 4);

  const s5 = numberToSorobanState(5, 1);
  assert.equal(s5[0].heavenActive, true);
  assert.equal(s5[0].earthCount, 0);
});

test('toggleEarthBead activates and deactivates adjacent beads authentically', () => {
  let state = createEmptySoroban(2);
  // Click 3rd earth bead (index 2) -> beads 0, 1, 2 move up => value 3
  state = toggleEarthBead(state, 0, 2);
  assert.equal(sorobanStateToNumber(state), 3);

  // Click 2nd earth bead (index 1, currently active) -> beads 1, 2 move down => value 1
  state = toggleEarthBead(state, 0, 1);
  assert.equal(sorobanStateToNumber(state), 1);

  // Toggle heaven bead on tens column -> +50 => 51
  state = toggleHeavenBead(state, 1);
  assert.equal(sorobanStateToNumber(state), 51);
});

test('addValue, subtractValue, and resetSoroban work accurately', () => {
  let state = numberToSorobanState(24, 3);
  state = addValue(state, 35);
  assert.equal(sorobanStateToNumber(state), 59);

  state = subtractValue(state, 17);
  assert.equal(sorobanStateToNumber(state), 42);

  state = resetSoroban(3);
  assert.equal(sorobanStateToNumber(state), 0);
});

test('planSorobanSteps handles 5-complement (+4 from 3 -> 7) and 10-complement (+7 from 6 -> 13)', () => {
  const steps5 = planSorobanSteps(3, 7, 2);
  assert.ok(steps5.length >= 2);
  assert.equal(sorobanStateToNumber(steps5[steps5.length - 1].stateAfter), 7);

  const steps10 = planSorobanSteps(6, 13, 2);
  assert.ok(steps10.length >= 2);
  assert.equal(sorobanStateToNumber(steps10[steps10.length - 1].stateAfter), 13);

  const stepsMulti = planSorobanSteps(28, 65, 3);
  assert.ok(stepsMulti.length >= 2);
  assert.equal(sorobanStateToNumber(stepsMulti[stepsMulti.length - 1].stateAfter), 65);
});
