// server/Code.gs(ID・パスワードで途中経過を預かる口)の動きを確かめる
import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { loadServer } from '../scripts/gas-mock.mjs';

const key = (s) => crypto.createHash('sha256').update(s).digest('hex');

test('登録・ログイン・預ける・取り出す', () => {
  const s = loadServer();
  const k = key('nonogram:taro:secret1');
  assert.deepStrictEqual(s.post({ op: 'register', id: 'taro', key: k }).ok, true);
  assert.strictEqual(s.post({ op: 'register', id: 'taro', key: k }).error, 'taken');
  assert.strictEqual(s.post({ op: 'login', id: 'taro', key: k }).ok, true);
  assert.strictEqual(s.post({ op: 'login', id: 'taro', key: key('x') }).error, 'wrong');
  assert.strictEqual(s.post({ op: 'login', id: 'hanako', key: k }).error, 'wrong');
  const data = 'NONO1z:' + 'A'.repeat(100000);       // 1セルに入らない長さも預けられる
  assert.strictEqual(s.post({ op: 'save', id: 'taro', key: k, data }).ok, true);
  assert.strictEqual(s.post({ op: 'load', id: 'taro', key: k }).data, data);
  assert.strictEqual(s.post({ op: 'save', id: 'taro', key: k, data: 'short' }).ok, true);
  assert.strictEqual(s.post({ op: 'load', id: 'taro', key: k }).data, 'short', '短くした後に古い残りが混ざらない');
});

test('シートにパスワードやそのハッシュが残らない', () => {
  const s = loadServer();
  const k = key('nonogram:taro:secret1');
  s.post({ op: 'register', id: 'taro', key: k });
  const dump = JSON.stringify(s.sheets.users.rows);
  assert.ok(!dump.includes('secret1'));
  assert.ok(!dump.includes(k), '端末から送られたハッシュもそのまま残さない');
});

test('おかしな入力をはじく', () => {
  const s = loadServer();
  assert.strictEqual(s.post({ op: 'register', id: 'ab', key: key('a') }).error, 'bad_id');
  assert.strictEqual(s.post({ op: 'register', id: 'taro', key: 'short' }).error, 'bad_key');
  assert.strictEqual(s.postRaw('not json').error, 'bad_request');
  const k = key('k');
  s.post({ op: 'register', id: 'taro', key: k });
  assert.strictEqual(s.post({ op: 'save', id: 'taro', key: k, data: 'x'.repeat(900001) }).error, 'too_big');
});

test('まちがいが続くと受け付けない', () => {
  const s = loadServer();
  s.post({ op: 'register', id: 'taro', key: key('right') });
  for (let i = 0; i < 10; i++) s.post({ op: 'login', id: 'taro', key: key('bad' + i) });
  assert.strictEqual(s.post({ op: 'login', id: 'taro', key: key('right') }).error, 'too_many');
});
