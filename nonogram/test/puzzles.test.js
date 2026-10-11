// 配る問題(puzzles.json)を1問ずつ確かめる:
// 数字が答えの絵と一致し、最初から見せるマスが答えと一致し、推論だけで最後まで埋まる(=答えが1つ)。
// さらに生成器とは別の探索で、答えが本当に1つだけかを数え直す
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { makeClues, analyze, findSolutions } = require('../gen.js');

const { puzzles } = JSON.parse(fs.readFileSync(path.join(__dirname, '../puzzles.json'), 'utf8'));

test('問題が1つ以上あり、キーが重複していない', () => {
  assert.ok(puzzles.length > 0);
  assert.strictEqual(new Set(puzzles.map(p => p.key || p.text)).size, puzzles.length);
});

for (const p of puzzles) {
  test(`No.${p.id} ${p.key || p.text}`, () => {
    const sol = Array.from(p.sol, Number);
    assert.strictEqual(sol.length, p.R * p.C);
    const { rc, cc } = makeClues(sol, p.R, p.C);
    assert.deepStrictEqual(rc, p.rc, '横の数字が答えと合わない');
    assert.deepStrictEqual(cc, p.cc, '縦の数字が答えと合わない');
    for (const k in p.givens) assert.strictEqual(p.givens[k], sol[+k], '見せるマスが答えと合わない');
    const a = analyze(p.rc, p.cc, p.R, p.C, p.givens, Date.now() + 20000);
    assert.ok(a.level, '推論だけでは埋まらない');
    assert.deepStrictEqual(Array.from(a.grid), sol, '推論で埋めた結果が答えと違う');
    if (!Object.keys(p.givens).length) assert.strictEqual(a.level, p.solve || p.level, '難しさの表示が実際と違う');
    const start = new Int8Array(p.R * p.C).fill(-1);
    for (const k in p.givens) start[+k] = p.givens[k];
    const f = findSolutions(p.rc, p.cc, p.R, p.C, start, 2, Date.now() + 20000);
    assert.ok(!f.timedOut, '数え直しが時間切れ');
    assert.strictEqual(f.sols.length, 1, '答えが1つではない');
  });
}
