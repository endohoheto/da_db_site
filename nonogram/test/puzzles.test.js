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

// 公開した問題は変えない。遊びかけの盤面は key ごとにマスで預かっているので、形が変わると途中経過が壊れる。
// 台帳(data/published.json)にある問題が、同じ番号・大きさ・答え・見せるマスのまま残っているかを見る。
// 指紋の作り方は tools/build-puzzles.mjs の fingerprint と同じ
test('公開済みの問題が消えたり変わったりしていない', () => {
  const ledger = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/published.json'), 'utf8'));
  const hash = (t) => { let h = 2166136261; for (const ch of t) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const fp = (p) => `${p.id}|${p.R}x${p.C}|${hash(p.sol).toString(36)}|${hash(JSON.stringify(p.givens || {})).toString(36)}`;
  const byKey = new Map(puzzles.map(p => [p.key || p.text, p]));
  for (const [key, want] of Object.entries(ledger)) {
    const p = byKey.get(key);
    assert.ok(p, `公開済みの「${key}」が消えている`);
    assert.strictEqual(fp(p), want, `公開済みの「${key}」が変わっている`);
  }
  assert.deepStrictEqual(puzzles.map(p => p.id), puzzles.map((_, i) => i + 1), 'id が 1 から順に並んでいない');
});
