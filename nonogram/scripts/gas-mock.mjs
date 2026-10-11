// server/Code.gs を、Apps Script の代わりの部品で Node 上で動かす(テスト用)。
// スプレッドシートはメモリ上の表、ハッシュは Node の crypto で置き換える
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import vm from 'node:vm';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

export function loadServer() {
  const sheets = {};
  const cache = new Map();
  function makeSheet(name) {
    const rows = [];
    const sh = {
      rows,
      getLastRow: () => rows.length,
      appendRow: (r) => { rows.push(r.slice()); },
      setFrozenRows: () => {},
      deleteRow: (n) => { rows.splice(n - 1, 1); },
      getRange: (r, c, nr = 1, nc = 1) => ({
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => ((rows[r - 1 + i] || [])[c - 1 + j] ?? ''))),
        setValues: (vals) => vals.forEach((row, i) => { const rr = rows[r - 1 + i] || (rows[r - 1 + i] = []); row.forEach((v, j) => { rr[c - 1 + j] = v; }); }),
        setValue: (v) => { const rr = rows[r - 1] || (rows[r - 1] = []); rr[c - 1] = v; },
      }),
    };
    return sh;
  }
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = makeSheet(n)) }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s, 'utf8').digest()).map(b => (b > 127 ? b - 256 : b)),
    },
    // 公開中の puzzles.json の代わりに、手元のものを返す
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 200, getContentText: () => fs.readFileSync(path.join(root, 'puzzles.json'), 'utf8') }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v) }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }) },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'server/Code.gs'), 'utf8'), ctx);
  return {
    sheets,
    post: (obj) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(obj) } }).text),
    postRaw: (text) => JSON.parse(ctx.doPost({ postData: { contents: text } }).text),
  };
}

// ブラウザから呼べる /exec を立てる(本物と同じく、どこからでも呼べるようにする)
export function serveGas(port) {
  const s = loadServer();
  const server = http.createServer((req, res) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (req.method === 'GET') { res.writeHead(200, headers); res.end('{"ok":true}'); return; }
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', () => { res.writeHead(200, headers); res.end(JSON.stringify(s.postRaw(body))); });
  });
  return new Promise(r => server.listen(port, () => r({ server, state: s })));
}
