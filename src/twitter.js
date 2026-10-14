// Modelo: acha os vídeos de um tweet. Pergunta primeiro ao syndication (o que o embed do
// twitter usa, sem login) e, se ele não tiver o tweet (conteúdo sensível, por exemplo), ao
// fxtwitter. Os dois devolvem as variantes no mesmo formato do twitter.
const ESPERA = 10_000;
const VIDEOS = /^https:\/\/video\.twimg\.com\//;

// Erros que a rota devolve ao navegador com o status dado.
function falha(status, mensagem) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

// Aceita o link do tweet (x.com, twitter.com, fxtwitter, vxtwitter, mobile...) ou só o número.
export function idDe(texto) {
  const t = texto.trim();
  if (/^\d{1,20}$/.test(t)) return t;
  return t.match(/\/status(?:es)?\/(\d{1,20})/)?.[1] ?? null;
}

// Só repassamos vídeos do próprio twitter: a rota de baixar não é um proxy aberto.
export const ehVideoDoTwitter = (url) => VIDEOS.test(url);

async function pedirJson(url) {
  const resposta = await fetch(url, { signal: AbortSignal.timeout(ESPERA) }).catch(() => null);
  if (!resposta?.ok) return null;
  return resposta.json().catch(() => null);
}

// Só os mp4, do maior para o menor. A resolução vem no caminho (…/1280x720/…); o gif tem
// uma variante só, sem ela no caminho, e aí vale o tamanho original da mídia.
function variantes(lista, largura, altura) {
  return lista
    .filter((v) => v.content_type === 'video/mp4' && ehVideoDoTwitter(v.url))
    .map((v) => {
      const [, l, a] = v.url.match(/\/(\d+)x(\d+)\//) ?? [, largura, altura];
      return { url: v.url, largura: Number(l) || null, altura: Number(a) || null, bitrate: v.bitrate ?? 0 };
    })
    .sort((x, y) => y.bitrate - x.bitrate || (y.largura ?? 0) - (x.largura ?? 0));
}

// O token do syndication é derivado do id; qualquer valor com esse formato serve.
const token = (id) => ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');

function doSyndication(j) {
  const midias = (t) => (t?.mediaDetails ?? []).filter((m) => m.type === 'video' || m.type === 'animated_gif');
  // Sem vídeo no tweet, vale o do tweet citado.
  const origem = !midias(j).length && j.quoted_tweet ? j.quoted_tweet : j;
  return {
    id: origem.id_str,
    autor: { nome: origem.user?.name ?? '', usuario: origem.user?.screen_name ?? '' },
    texto: origem.text ?? '',
    videos: midias(origem).map((m) => ({
      tipo: m.type === 'animated_gif' ? 'gif' : 'video',
      capa: m.media_url_https ?? null,
      duracao: m.video_info?.duration_millis ? m.video_info.duration_millis / 1000 : null,
      variantes: variantes(m.video_info?.variants ?? [], m.original_info?.width, m.original_info?.height),
    })),
  };
}

function doFxtwitter({ tweet: t }) {
  const midias = (x) => x?.media?.videos ?? [];
  const origem = !midias(t).length && t.quote ? t.quote : t;
  return {
    id: origem.id,
    autor: { nome: origem.author?.name ?? '', usuario: origem.author?.screen_name ?? '' },
    texto: origem.text ?? '',
    videos: midias(origem).map((v) => ({
      tipo: v.type === 'gif' ? 'gif' : 'video',
      capa: v.thumbnail_url ?? null,
      duracao: v.duration || null,
      variantes: variantes(v.variants ?? [], v.width, v.height),
    })),
  };
}

const temVideo = (r) => r.videos.some((v) => v.variantes.length);

export async function buscarVideos(texto) {
  const id = idDe(texto);
  if (!id) throw falha(400, 'that does not look like a tweet link');

  const s = await pedirJson(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token(id)}`);
  if (s?.__typename === 'Tweet') {
    const r = doSyndication(s);
    if (temVideo(r)) return r;
  }

  const f = await pedirJson(`https://api.fxtwitter.com/status/${id}`);
  if (f?.tweet) {
    const r = doFxtwitter(f);
    if (temVideo(r)) return r;
    throw falha(404, 'this tweet has no video or gif');
  }

  if (s?.__typename === 'Tweet') throw falha(404, 'this tweet has no video or gif');
  throw falha(404, 'tweet not found: deleted, private, or twitter did not respond');
}
