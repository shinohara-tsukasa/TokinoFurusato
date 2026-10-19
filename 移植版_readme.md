# 時の故郷 3.11 完全版 HTML5移植版

このソフトは、Pleiades Company 牧尾様の許可を得て、PN.篠原がHTML5化したものです。
Internet Explorer（HTA）とFlash Playerを前提にしていた「時の故郷 3.11 完全版」を、現在のGoogle Chromeで遊べるようにしました。

- GitHub：https://github.com/shinohara-tsukasa/TokinoFurusato
- ダウンロード（ZIP）：https://github.com/shinohara-tsukasa/TokinoFurusato/archive/refs/heads/main.zip
- 原作の説明書：同梱の「原作_readme.txt」
- 作品について（牧尾様のnote）：https://note.com/so_nosg/n/n012993c5690c

## ご利用にあたって

- 再配布禁止
- 改変不可
- 個人利用に限って使用してください。

## 動作環境

- Windows ＋ Google Chrome（Chromeのインストールが必要です）
- Chrome以外のブラウザは非推奨です（動作保証外）。

## 起動のしかた

1. ダウンロードしたZIPを展開します。
2. フォルダの中の「start.bat」をダブルクリックします。
3. Chromeでゲームが開きます。最初に表示される案内の「ゲームスタート」（またはEnterキー）を押すと始まります。

- 起動中は黒いウインドウが開いたままになります。ゲームのタブを閉じると、サーバーとこのウインドウも自動で終了します。
- 8003番のポートを別のソフトが使っていると起動できません。その場合は、start.batの「PORT=8003」を別の番号に変えてください（番号を変えると、セーブデータは別になります）。

## セーブデータ

セーブデータは、Chromeの中（このゲーム用の保存領域）に保存されます。
Chromeの閲覧データの「Cookieと他のサイトデータ」を削除すると、セーブデータも消えます。

## 遊び方

ゲーム中にF1キーを押すと、ヘルプ（操作説明・キーボード操作など）が開きます。

## 不具合の報告

GitHubのIssue、または以下のメールアドレスまでお知らせください。

- Issue：https://github.com/shinohara-tsukasa/TokinoFurusato/issues
- メール：testtyushinoharataioumadoguti26@proton.me

ゲーム中にF2キーを押すと、デバッグログが表示されます。「コピー」でまとめてコピーできるので、報告に添えていただけると助かります。

## 同梱ソフトとライセンス

- Ruffle（https://ruffle.rs/ ）：MIT License / Apache License 2.0
- Caddy（https://caddyserver.com/ ）：Apache License 2.0

詳しくは「THIRD_PARTY_NOTICES.md」をご覧ください。ライセンス文は「licenses」フォルダに同梱しています。

## 著作権

ゲーム本体（シナリオ・画像・音楽・ムービーなど）の著作権は、Pleiades Companyおよび各素材の権利者にあります。詳しくは「原作_readme.txt」をご覧ください。
