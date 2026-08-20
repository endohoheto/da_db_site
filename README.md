# da_db_site

浅倉大介クレジットデータベースの入口ページ。

**データは一切含みません** — HTML2枚と画像のみ。

- `index.html` — 入口。OGPタグ、構造化データ、アプリへのリンク
- `404.html` — 存在しないパスに出るページ(`noindex`)
- `sitemap.xml` — Search Console に登録する用
- `og-card.png` — 共有時のカード画像 (1200x630)
- `favicon.png` ほか — アイコン

画像は `da_db` 側の `site/make-icons.py` / `site/make-og-card.py` で生成しています。

## 検索に出すために

**アプリの中身は検索エンジンから見えません。** Apps Script の `/exec` は
サンドボックス化された iframe を返すので、クローラが辿り着けるのはこの1枚だけです。
だから**このページ自身に、何が入っているかを文章と数字で書いてあります**。
中身が増えたら `index.html` の件数表と JSON-LD の説明文も一緒に直してください
(`docs/STATUS.md` の件数が出所)。

- **robots.txt は置いていません。** クローラが読むのはドメイン直下
  (`endohoheto.github.io/robots.txt`)だけで、それは別リポジトリです。
  ここに置いても `/da_db_site/robots.txt` になり、読まれません
- サイトマップは**どこに置いてもよいが、場所を伝えないと読まれない**ので、
  [Search Console](https://search.google.com/search-console) に
  `https://endohoheto.github.io/da_db_site/sitemap.xml` を登録してください
- 登録後、URL検査で「インデックス登録をリクエスト」を1度押すと早いです
