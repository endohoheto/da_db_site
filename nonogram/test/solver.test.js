// 行ソルバーを総当たりと突き合わせる。ここが狂うと「答えが1つ」の保証が崩れる
const test = require('node:test');
const assert = require('node:assert');
const { solveLine, lineOk } = require('../gen.js');

function clueOf(bits) {
  const c = []; let run = 0;
  for (const b of bits) { if (b) run++; else if (run) { c.push(run); run = 0; } }
  if (run) c.push(run);
  return c;
}
function brute(line, clue) {
  const n = line.length, f = Array(n).fill(false), e = Array(n).fill(false);
  let any = false;
  for (let m = 0; m < 1 << n; m++) {
    const bits = [];
    let ok = true;
    for (let i = 0; i < n; i++) { const b = (m >> i) & 1; if (line[i] !== -1 && line[i] !== b) { ok = false; break; } bits.push(b); }
    if (!ok || clueOf(bits).join() !== clue.join()) continue;
    any = true;
    for (let i = 0; i < n; i++) (bits[i] ? f : e)[i] = true;
  }
  return any ? f.map((x, i) => (x && !e[i] ? 1 : e[i] && !x ? 0 : -1)) : null;
}

test('行ソルバーが総当たりと一致する(ランダム5万件)', () => {
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  for (let t = 0; t < 50000; t++) {
    const n = 1 + Math.floor(rnd() * 12);
    const sol = Array.from({ length: n }, () => (rnd() < 0.5 ? 1 : 0));
    let clue = clueOf(sol);
    if (rnd() < 0.15) clue = clueOf(Array.from({ length: n }, () => (rnd() < 0.5 ? 1 : 0))); // 矛盾しうる組み合わせも混ぜる
    const line = sol.map(b => (rnd() < 0.4 ? b : -1));
    const out = new Int8Array(n);
    const ok = solveLine(Int8Array.from(line), n, clue, out);
    const exp = brute(line, clue);
    assert.strictEqual(ok, exp !== null, `ok mismatch ${line} / ${clue}`);
    if (ok) assert.deepStrictEqual(Array.from(out), exp, `cells mismatch ${line} / ${clue}`);
  }
});

test('lineOk: 矛盾の検出', () => {
  assert.strictEqual(lineOk([1, 1, 1, -1, -1], [2]), false);
  assert.strictEqual(lineOk([1, 1, 0, -1, -1], [2, 1]), true);
  assert.strictEqual(lineOk([0, 0, 0], []), true);
  assert.strictEqual(lineOk([-1, 1, -1], []), false);
});
