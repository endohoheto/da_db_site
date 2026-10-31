#!/usr/bin/env node
// live/data.json(da_db の `npm run livepages` が書く)から、ツアーごとの静的ページを作る。
//
// アプリの中身は Apps Script の iframe の中にあって、クローラには1文字も読めない。
// 「ツアー名 セットリスト」で探す人に届くのは、こうして外に置いたページだけ。
//
// 作るもの:
//   live/index.html           ツアーの一覧(名義ごと)
//   live/<id>/index.html      ツアー1本 = セットリストと公演日程
//   sitemap.xml の live 区間   <!-- live:begin --> から <!-- live:end --> までを丸ごと書き直す
//
// <id> は公演名の正規化キーのハッシュ。日程が増えても変わらないので URL は動かない。
// lastmod は中身が変わったページだけ今日の日付になる(全部を毎回新しくすると、
// クローラが日付を信用しなくなる)。
//   node tools/build-live.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const LIVE = path.join(ROOT, 'live');
const BASE = 'https://endohoheto.github.io/da_db_site/';
const APP = 'https://script.google.com/macros/s/AKfycbxd7Sk2duwKqOzwJvf5YxOzUI22cJF6vX52QFKwod-UuklJ03O-u237XsqDAl1t6FmGsw/exec';
const SITE = '浅倉大介 クレジットデータベース';
const GA_ID = 'G-1YQ80GQ5Z1';

const data = JSON.parse(fs.readFileSync(path.join(LIVE, 'data.json'), 'utf8'));
// A tour with no set at all would be a page of dates and venues and nothing else: thin
// content that search engines discount, and it drags the rest of the site down with it.
const tours = data.tours.filter((t) => t.sets.length && t.shows.length);
const idOf = (t) => crypto.createHash('sha1').update(t.key).digest('hex').slice(0, 10);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// inside <script type="application/ld+json">, a title containing </script> would end the block
const ld = (o) => JSON.stringify(o, null, 1).replace(/</g, '\\u003c');
const WD = ['日', '月', '火', '水', '木', '金', '土'];
const ymd = (d) => { const m = /^(\d{4})\D(\d{1,2})\D(\d{1,2})/.exec(d || ''); return m ? [+m[1], +m[2], +m[3]] : null; };
const fmtDate = (d) => {
  const p = ymd(d);
  if (!p) return esc(d || '日付不明');
  const w = WD[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()];
  return `${p[0]}.${p[1]}.${p[2]} <span class="wd">(${w})</span>`;
};
const fmtMonth = (d) => { const p = ymd(d); return p ? `${p[0]}年${p[1]}月` : ''; };
const span = (t) => {
  const ds = t.shows.map((s) => s.d).filter((d) => ymd(d)).sort();
  if (!ds.length) return '';
  const a = ymd(ds[0]), b = ymd(ds[ds.length - 1]);
  if (a[0] === b[0]) return a[1] === b[1] ? fmtMonth(ds[0]) : `${a[0]}年${a[1]}月〜${b[1]}月`;
  return `${fmtMonth(ds[0])}〜${fmtMonth(ds[ds.length - 1])}`;
};
const firstDate = (t) => t.shows.map((s) => s.d).filter((d) => ymd(d)).sort()[0] || '';
// letters for the sets in the order the tour first played them; the sheet's own pattern
// letters are not exported (a bare 「SET A」 tells a reader nothing anyway)
const setLabel = (t, i) => (t.sets.length > 1 ? `セットリスト ${String.fromCharCode(65 + i)}` : 'セットリスト');

const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());

const CSS = `
:root { --bg:#05070d; --card:#0a0f1a; --cyan:#00fff2; --purple:#b07cff; --amber:#ffc46b;
  --pink:#ff7ab8; --text:#d6f7f5; --dim:#63808c; --border:rgba(0,255,242,0.18); }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--text);
  font-family:"Share Tech Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  padding:28px 16px 40px;
  background-image:linear-gradient(rgba(0,255,242,0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,255,242,0.045) 1px, transparent 1px);
  background-size:42px 42px; }
main { max-width:760px; margin:0 auto; }
a { color:var(--cyan); }
nav.crumb { font-size:11px; letter-spacing:1.5px; color:var(--dim); }
nav.crumb a { text-decoration:none; }
header.top { margin:16px 0 22px; border:1px solid var(--purple); border-radius:6px; padding:22px;
  background:linear-gradient(135deg, rgba(176,124,255,0.10), rgba(0,255,242,0.04)); }
.kind { font-size:10.5px; letter-spacing:3px; color:var(--purple); }
h1 { margin:8px 0 6px; font-size:clamp(18px, 4.6vw, 24px); color:var(--cyan); font-weight:normal;
  letter-spacing:1px; line-height:1.4; word-break:break-word; }
.lead { color:var(--dim); font-size:12.5px; line-height:1.9; margin:0; }
.lead b { color:var(--text); font-weight:normal; }
section { border:1px solid var(--border); border-radius:6px; background:var(--card);
  padding:18px 16px 12px; margin:0 0 18px; }
h2 { margin:0 0 4px; font-size:13px; letter-spacing:2px; color:var(--purple); font-weight:normal; }
h3 { margin:18px 0 6px; font-size:12px; letter-spacing:2px; color:var(--amber); font-weight:normal; }
.sn { font-size:11px; color:var(--dim); line-height:1.8; margin:0 0 8px; }
ol.set { margin:0; padding:0; list-style:none; font-size:13px; line-height:1.6; }
ol.set li { display:flex; gap:10px; padding:5px 0; border-bottom:1px solid rgba(0,255,242,0.08); }
ol.set .no { flex:0 0 2.2em; color:var(--dim); font-size:11px; padding-top:2px; }
ol.set .t { word-break:break-word; }
.tag { margin-left:6px; border:1px solid var(--dim); color:var(--dim); border-radius:2px;
  padding:0 4px; font-size:9.5px; letter-spacing:1px; white-space:nowrap; }
.tag.en { border-color:var(--amber); color:var(--amber); }
.tw { overflow-x:auto; }
table { width:100%; border-collapse:collapse; font-size:12.5px; }
th, td { padding:6px 6px; border-bottom:1px solid rgba(0,255,242,0.08); text-align:left;
  vertical-align:top; font-weight:normal; }
thead th { color:var(--dim); font-size:10.5px; letter-spacing:1.5px; border-bottom:1px solid var(--border); }
td.d { white-space:nowrap; color:var(--cyan); }
.wd { color:var(--dim); font-size:11px; }
td.v { word-break:break-word; }
td.s { white-space:nowrap; color:var(--dim); font-size:11.5px; }
.add { color:var(--pink); font-size:10.5px; margin-left:4px; }
ul.tours { margin:0; padding:0; list-style:none; }
ul.tours li { padding:7px 0; border-bottom:1px solid rgba(0,255,242,0.08); font-size:13px; line-height:1.5; }
ul.tours a { text-decoration:none; word-break:break-word; }
ul.tours .m { display:block; color:var(--dim); font-size:11px; }
nav.toc { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 18px; }
nav.toc a { border:1px solid var(--border); border-radius:3px; padding:6px 9px; font-size:11px;
  text-decoration:none; color:var(--dim); }
a.app { display:inline-block; margin:4px 0 8px; border:1px solid var(--cyan); border-radius:3px;
  padding:9px 14px; font-size:12px; letter-spacing:1px; text-decoration:none; }
footer { margin-top:26px; color:var(--dim); font-size:11px; line-height:1.9; }
`;

// Same id as the front page, so a visitor who lands here from a search and goes on to the
// front door or the app is one session, and the landing page shows up as the entrance.
const GA = `<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  (function () {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_ID}';
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  })();
</script>`;

const page = ({ url, title, description, ogTitle, crumbs, body, rel }) => `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${BASE}og-card.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Asakura Daisuke Credit Database">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
${ld({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebPage', '@id': url + '#webpage', url, name: ogTitle, inLanguage: 'ja',
      isPartOf: { '@id': BASE + '#website' }, breadcrumb: { '@id': url + '#breadcrumb' } },
    { '@type': 'BreadcrumbList', '@id': url + '#breadcrumb',
      itemListElement: crumbs.map((c, i) => Object.assign({ '@type': 'ListItem', position: i + 1, name: c[0] }, c[1] ? { item: c[1] } : {})) },
  ],
})}
</script>
<link rel="icon" type="image/png" sizes="256x256" href="${rel}favicon.png">
<link rel="icon" type="image/png" sizes="32x32" href="${rel}icon-32.png">
<link rel="apple-touch-icon" href="${rel}icon-180.png">
<meta name="theme-color" content="#05070d">
<style>${CSS}</style>
${GA}
</head>
<body>
<main>
<nav class="crumb">${crumbs.map((c) => (c[1] ? `<a href="${c[1]}">${esc(c[0])}</a>` : esc(c[0]))).join(' › ')}</nav>
${body}
<footer>
  <a href="${APP}">${esc(SITE)}を開く ▸</a><br>
  セットリストはデータベースの記録から自動で書き出しています。誤りにお気づきの際はご連絡ください。<br>
  アクセス状況の把握に Google アナリティクスを使用しています。
</footer>
</main>
</body>
</html>
`;

function tourPage(t) {
  const id = idOf(t);
  const url = `${BASE}live/${id}/`;
  const nShows = t.shows.length;
  const used = t.sets.map(() => []);
  t.shows.forEach((s) => { if (s.s !== undefined) used[s.s].push(s); });
  const first = t.sets[0] || [];
  const opener = first.length ? `1曲目「${first[0].t}」ほか全${first.length}曲` : '';
  const sp = span(t);
  const description = `${t.artist ? t.artist + 'のライブ' : 'ライブ'}「${t.name}」(${sp ? sp + '・' : ''}全${nShows}公演)のセットリスト。` +
    `${opener ? opener + '。' : ''}会場と日程の一覧つき。`;

  const sets = t.sets.map((set, i) => {
    const dates = used[i];
    const note = t.sets.length > 1
      ? `<p class="sn">${dates.length}公演: ${dates.slice(0, 6).map((s) => fmtDate(s.d)).join('、')}${dates.length > 6 ? ` ほか${dates.length - 6}公演` : ''}</p>`
      : `<p class="sn">全${dates.length}公演で同じ曲順として記録されています。</p>`;
    return `<h3 id="set-${i + 1}">${esc(setLabel(t, i))}<span class="sn"> — ${set.length}曲</span></h3>
${note}
<ol class="set">
${set.map((s) => `<li><span class="no">${esc(s.n)}</span><span class="t">${esc(s.t)}${s.e ? '<span class="tag en">ENCORE</span>' : ''}${s.c ? '<span class="tag">COVER</span>' : ''}</span></li>`).join('\n')}
</ol>`;
  }).join('\n');

  const rows = t.shows.map((s) => {
    const what = s.w ? esc(s.w)
      : s.s !== undefined ? (t.sets.length > 1 ? `<a href="#set-${s.s + 1}">${String.fromCharCode(65 + s.s)}</a>` : '○')
      : '未登録';
    return `<tr><td class="d">${fmtDate(s.d)}</td><td class="v">${esc(s.v || '')}${s.add ? '<span class="add">追加公演</span>' : ''}</td><td class="s">${what}</td></tr>`;
  }).join('\n');

  const body = `<header class="top">
  <div class="kind">LIVE / SETLIST</div>
  <h1>${esc(t.name)}</h1>
  <p class="lead">${t.artist ? `<b>${esc(t.artist)}</b> · ` : ''}${esc(sp)}${sp ? ' · ' : ''}全${nShows}公演${t.sets.length > 1 ? ` · セットリスト${t.sets.length}種類` : ''}</p>
</header>
<section>
<h2>SETLIST<span class="sn"> セットリスト</span></h2>
${sets}
</section>
<section>
<h2>SCHEDULE<span class="sn"> 公演日程</span></h2>
<div class="tw"><table>
<thead><tr><th>日付</th><th>会場</th><th>セトリ</th></tr></thead>
<tbody>
${rows}
</tbody>
</table></div>
</section>
<p class="sn">バンド編成(サポートメンバー)やパンフレットのクレジットは、データベース本体の LIVE 画面で見られます。</p>
<a class="app" href="${APP}">データベースで開く ▸</a>`;

  return {
    id, url,
    html: page({
      url, rel: '../../', body, description,
      title: `${t.name} セットリスト・公演日程｜${SITE}`,
      ogTitle: `${t.name} セットリスト`,
      crumbs: [[SITE, BASE], ['ライブ・セットリスト', BASE + 'live/'], [t.name, '']],
    }),
  };
}

function indexPage(list) {
  const url = `${BASE}live/`;
  const byArtist = {};
  list.forEach((t) => { (byArtist[t.artist || 'その他'] = byArtist[t.artist || 'その他'] || []).push(t); });
  // most tours first: that is roughly who the database is about
  const artists = Object.keys(byArtist).sort((a, b) => byArtist[b].length - byArtist[a].length || a.localeCompare(b, 'ja'));
  const anchor = (i) => `a${i + 1}`;
  const nShows = list.reduce((n, t) => n + t.shows.length, 0);
  const body = `<header class="top">
  <div class="kind">LIVE / SETLIST</div>
  <h1>ライブ・セットリスト</h1>
  <p class="lead">浅倉大介と、作曲・編曲・演奏で関わったアーティストのライブ記録から、セットリストが分かっているツアー<b>${list.length}本</b>(${nShows}公演)を名義ごとに並べています。</p>
</header>
<nav class="toc">${artists.map((a, i) => `<a href="#${anchor(i)}">${esc(a)} (${byArtist[a].length})</a>`).join('')}</nav>
${artists.map((a, i) => `<section id="${anchor(i)}">
<h2>${esc(a)}</h2>
<ul class="tours">
${byArtist[a].sort((x, y) => firstDate(x).localeCompare(firstDate(y))).map((t) => `<li><a href="${idOf(t)}/">${esc(t.name)}</a><span class="m">${esc(span(t))} · ${t.shows.length}公演</span></li>`).join('\n')}
</ul>
</section>`).join('\n')}`;
  return page({
    url, rel: '../', body,
    title: `ライブ・セットリスト一覧｜${SITE}`,
    ogTitle: 'ライブ・セットリスト一覧',
    description: `浅倉大介と関わりのあるアーティストのライブ${list.length}本・${nShows}公演のセットリストと公演日程を、ツアーごとにまとめた一覧。`,
    crumbs: [[SITE, BASE], ['ライブ・セットリスト', '']],
  });
}

// ---- write ----
const oldSitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const oldLastmod = {};
for (const m of oldSitemap.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) oldLastmod[m[1]] = m[2];
const entries = [];
let changed = 0;
const write = (file, url, html, priority) => {
  const same = fs.existsSync(file) && fs.readFileSync(file, 'utf8') === html;
  if (!same) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, html); changed++; }
  entries.push({ url, lastmod: same && oldLastmod[url] ? oldLastmod[url] : today, priority });
};

write(path.join(LIVE, 'index.html'), `${BASE}live/`, indexPage(tours), '0.8');
const keep = new Set();
const seen = new Map();
tours.forEach((t) => {
  const p = tourPage(t);
  // two tours whose keys hash alike would overwrite each other's page without a word
  if (seen.has(p.id)) throw new Error(`id が重なりました: ${p.id} (${seen.get(p.id)} / ${t.name})`);
  seen.set(p.id, t.name);
  keep.add(p.id);
  write(path.join(LIVE, p.id, 'index.html'), p.url, p.html, '0.6');
});
// a tour that lost its last set (or was renamed) leaves its old page behind otherwise
let removed = 0;
for (const d of fs.readdirSync(LIVE)) {
  if (/^[0-9a-f]{10}$/.test(d) && !keep.has(d)) { fs.rmSync(path.join(LIVE, d), { recursive: true }); removed++; }
}

const block = `<!-- live:begin — written by tools/build-live.js; edit outside this block only -->\n` +
  entries.map((e) => `  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`).join('\n') +
  `\n  <!-- live:end -->`;
const sitemap = /<!-- live:begin[\s\S]*?<!-- live:end -->/.test(oldSitemap)
  ? oldSitemap.replace(/<!-- live:begin[\s\S]*?<!-- live:end -->/, block)
  : oldSitemap.replace('</urlset>', `  ${block}\n</urlset>`);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);

console.log(`live/: ツアー ${tours.length} 本(セトリなしで省いたもの ${data.tours.length - tours.length} 本)` +
  ` / 書き換え ${changed} ページ / 削除 ${removed} ページ`);
