// Servidor: entrega a pasta public/ e as rotas da API. Sem dependências, só o node.
//   GET /api/video?url=<link do tweet>        os vídeos do tweet e as resoluções de cada um
//   GET /api/baixar?u=<mp4 do twimg>&nome=…   o mp4, como anexo, para o navegador baixar
//   GET /api/ver?u=<mp4 do twimg>             o mesmo mp4, para tocar na prévia
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { buscarVideos, ehVideoDoTwitter } from './src/twitter.js';

const PORTA = Number(process.env.PORT ?? 8091);
// 0.0.0.0 para o celular na mesma rede alcançar o app; HOST=127.0.0.1 deixa só nesta máquina.
const HOST = process.env.HOST ?? '0.0.0.0';
const PUBLICO = resolve(import.meta.dirname, 'public');
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

function json(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(dados));
}

async function video(res, params) {
  try {
    json(res, 200, await buscarVideos(params.get('url') ?? ''));
  } catch (erro) {
    json(res, erro.status ?? 502, { message: erro.status ? erro.message : 'twitter did not respond' });
  }
}

// Repassa o mp4 do twimg, que recusa o navegador vindo de outro site (403) e não manda CORS.
// Com nome, vai como anexo, para baixar; sem nome, é a prévia do <video>, que pede pedaços
// (Range) para tocar e avançar: o pedido e a resposta parcial passam adiante como vieram.
async function repassar(req, res, params, nome) {
  const url = params.get('u') ?? '';
  if (!ehVideoDoTwitter(url)) return json(res, 400, { message: 'invalid video address' });

  const controle = new AbortController();
  res.on('close', () => controle.abort());
  const range = !nome && req.headers.range;
  const origem = await fetch(url, { signal: controle.signal, headers: range ? { Range: range } : {} }).catch(() => null);
  if (!origem?.ok) return json(res, 502, { message: 'twitter did not deliver the video' });

  const cabecalhos = {
    'Content-Type': 'video/mp4',
    'Cache-Control': 'no-store',
    'Accept-Ranges': 'bytes',
    ...(nome && { 'Content-Disposition': `attachment; filename="${nome}"` }),
  };
  for (const h of ['content-length', 'content-range']) {
    const valor = origem.headers.get(h);
    if (valor) cabecalhos[h] = valor;
  }
  res.writeHead(origem.status, cabecalhos);
  if (req.method === 'HEAD') return res.end();
  // Quem cancela o download ou pula a prévia só fecha a conexão; não é erro do servidor.
  await pipeline(Readable.fromWeb(origem.body), res).catch(() => {});
}

const baixar = (req, res, params) =>
  repassar(req, res, params, (params.get('nome') || 'video.mp4').replace(/[^\w.-]/g, '_'));
const ver = (req, res, params) => repassar(req, res, params, null);

// Arquivos de public/. Nada fica guardado no navegador (no-store): cada carga vem do servidor.
async function estatico(res, caminho) {
  const arquivo = resolve(PUBLICO, '.' + decodeURIComponent(caminho === '/' ? '/index.html' : caminho));
  if (!arquivo.startsWith(PUBLICO + sep)) return json(res, 404, { message: 'not found' });
  const info = await stat(arquivo).catch(() => null);
  if (!info?.isFile()) return json(res, 404, { message: 'not found' });
  res.writeHead(200, {
    'Content-Type': TIPOS[extname(arquivo)] ?? 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': 'no-store',
  });
  createReadStream(arquivo).pipe(res);
}

const servidor = createServer(async (req, res) => {
  const { pathname, searchParams } = new URL(req.url, 'http://localhost');
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { message: 'method not allowed' });
  try {
    if (pathname === '/api/video') return await video(res, searchParams);
    if (pathname === '/api/baixar') return await baixar(req, res, searchParams);
    if (pathname === '/api/ver') return await ver(req, res, searchParams);
    return await estatico(res, pathname);
  } catch (erro) {
    console.error(erro);
    if (!res.headersSent) json(res, 500, { message: 'server error' });
    else res.destroy();
  }
});

servidor.listen(PORTA, HOST, () => {
  console.log(`xdl em http://127.0.0.1:${PORTA}`);
});
