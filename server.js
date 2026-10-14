// Só para rodar no PC: entrega a pasta public/, como o GitHub Pages faz. O app em si não
// depende de servidor (ver public/js/api.js); abrir o index.html direto do disco não serve
// porque o navegador não carrega módulos js de file://.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const PORTA = Number(process.env.PORT ?? 8091);
// 0.0.0.0 para o celular na mesma rede alcançar o app; HOST=127.0.0.1 deixa só nesta máquina.
const HOST = process.env.HOST ?? '0.0.0.0';
const PUBLICO = resolve(import.meta.dirname, 'public');
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function naoEncontrado(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
}

// Nada fica guardado no navegador (no-store): cada carga vem do disco.
const servidor = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const arquivo = resolve(PUBLICO, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
  if (!arquivo.startsWith(PUBLICO + sep)) return naoEncontrado(res);
  const info = await stat(arquivo).catch(() => null);
  if (!info?.isFile()) return naoEncontrado(res);
  res.writeHead(200, {
    'Content-Type': TIPOS[extname(arquivo)] ?? 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': 'no-store',
  });
  createReadStream(arquivo).pipe(res);
});

servidor.listen(PORTA, HOST, () => {
  console.log(`xdl em http://127.0.0.1:${PORTA}`);
});
