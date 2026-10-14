# xdl

[🇧🇷 português](#-português) · [🇺🇸 english](#-english)

---

## 🇧🇷 português

baixa vídeos e gifs do twitter/x em .mp4. cola o link, escolhe a resolução, baixa.

**https://mvster1.github.io/xdl/**

roda inteiro no navegador: sem servidor, sem framework, sem build, sem dependências.
os dados do tweet vêm do [fxtwitter](https://github.com/FixTweet/FxTwitter) (ou do
[vxtwitter](https://github.com/dylanpdx/BetterTwitFix), se ele falhar) e o vídeo vem
direto do twitter.

### rodar no pc

    node server.js

abre em http://127.0.0.1:8091. o `index.html` não abre direto do disco: o navegador não
carrega módulos js de `file://`.

### estrutura

    public/          o app, publicado no github pages a cada push na main
      js/api.js      busca o tweet e baixa o mp4
      js/ui/         telas
    server.js        só para rodar no pc

---

## 🇺🇸 english

downloads twitter/x videos and gifs as .mp4. paste the link, pick a resolution, download.

**https://mvster1.github.io/xdl/**

runs entirely in the browser: no server, no framework, no build, no dependencies.
tweet data comes from [fxtwitter](https://github.com/FixTweet/FxTwitter) (or
[vxtwitter](https://github.com/dylanpdx/BetterTwitFix) as a fallback) and the video
comes straight from twitter.

### run locally

    node server.js

opens at http://127.0.0.1:8091. `index.html` won't open straight from disk: browsers
don't load js modules from `file://`.

### layout

    public/          the app, published to github pages on every push to main
      js/api.js      fetches the tweet and downloads the mp4
      js/ui/         views
    server.js        only for running locally
