// Modelo: acha os vídeos de um tweet e baixa o mp4, tudo do navegador, sem servidor nosso.
// Os dados vêm do fxtwitter e, se ele falhar, do vxtwitter: os dois deixam qualquer site
// chamar (CORS). O mp4 vem do twimg, que também deixa, mas recusa (403) pedido com Referer
// de outro site: por isso os pedidos vão sem ele.
const ESPERA = 10_000;
const VIDEOS = /^https:\/\/video\.twimg\.com\//;

// Aceita o link do tweet (x.com, twitter.com, fxtwitter, vxtwitter, mobile...) ou só o número.
function idDe(texto) {
  const t = texto.trim();
  if (/^\d{1,20}$/.test(t)) return t;
  return t.match(/\/status(?:es)?\/(\d{1,20})/)?.[1] ?? null;
}

async function pedirJson(url) {
  const resposta = await fetch(url, { signal: AbortSignal.timeout(ESPERA), referrerPolicy: 'no-referrer' }).catch(() => null);
  if (!resposta?.ok) return null;
  return resposta.json().catch(() => null);
}

// Só os mp4, do maior para o menor. A resolução vem no caminho (…/1280x720/…); o gif tem
// uma variante só, sem ela no caminho, e aí vale o tamanho original da mídia.
function variantes(lista, largura, altura) {
  return lista
    .filter((v) => (v.content_type ?? 'video/mp4') === 'video/mp4' && VIDEOS.test(v.url))
    .map((v) => {
      const [, l, a] = v.url.match(/\/(\d+)x(\d+)\//) ?? [, largura, altura];
      return { url: v.url, largura: Number(l) || null, altura: Number(a) || null, bitrate: v.bitrate ?? 0 };
    })
    .sort((x, y) => y.bitrate - x.bitrate || (y.largura ?? 0) - (x.largura ?? 0));
}

function doFxtwitter({ tweet: t }) {
  const midias = (x) => x?.media?.videos ?? [];
  // Sem vídeo no tweet, vale o do tweet citado.
  const origem = !midias(t).length && t.quote ? t.quote : t;
  return {
    id: origem.id,
    autor: { nome: origem.author?.name ?? '', usuario: origem.author?.screen_name ?? '' },
    texto: origem.text ?? '',
    videos: midias(origem).map((v) => ({
      tipo: v.type === 'gif' ? 'gif' : 'video',
      capa: v.thumbnail_url ?? null,
      duracao: v.duration || null,
      variantes: variantes(v.variants ?? [{ url: v.url }], v.width, v.height),
    })),
  };
}

// O vxtwitter só dá a melhor resolução de cada vídeo.
function doVxtwitter(t) {
  return {
    id: t.tweetID,
    autor: { nome: t.user_name ?? '', usuario: t.user_screen_name ?? '' },
    texto: t.text ?? '',
    videos: (t.media_extended ?? [])
      .filter((m) => m.type === 'video' || m.type === 'gif')
      .map((m) => ({
        tipo: m.type,
        capa: m.thumbnail_url ?? null,
        duracao: m.duration_millis ? m.duration_millis / 1000 : null,
        variantes: variantes([{ url: m.url }], m.size?.width, m.size?.height),
      })),
  };
}

const temVideo = (r) => r.videos.some((v) => v.variantes.length);

export const api = {
  // { id, autor: { nome, usuario }, texto, videos: [{ tipo, capa, duracao, variantes }] }
  // variantes: [{ url, largura, altura, bitrate }], da melhor para a pior.
  async videos(link) {
    const id = idDe(link);
    if (!id) throw new Error('that does not look like a tweet link');

    const fx = await pedirJson(`https://api.fxtwitter.com/status/${id}`);
    if (fx?.tweet) {
      const r = doFxtwitter(fx);
      if (temVideo(r)) return r;
    }
    const vx = await pedirJson(`https://api.vxtwitter.com/Twitter/status/${id}`);
    if (vx?.tweetID) {
      const r = doVxtwitter(vx);
      if (temVideo(r)) return r;
    }
    if (fx?.tweet || vx?.tweetID) throw new Error('this tweet has no video or gif');
    throw new Error('tweet not found: deleted, private, or twitter did not respond');
  },

  // Baixa o mp4 inteiro e entrega ao navegador como arquivo com o nome dado. O twimg não manda
  // o arquivo como anexo, então ele passa pela memória antes de virar download.
  // aoProgresso(fracao) recebe de 0 a 1, ou null quando o tamanho não é conhecido.
  async baixar(url, nome, aoProgresso) {
    const resposta = await fetch(url, { referrerPolicy: 'no-referrer' }).catch(() => null);
    if (!resposta?.ok) throw new Error('twitter did not deliver the video');

    const total = Number(resposta.headers.get('content-length')) || 0;
    const leitor = resposta.body.getReader();
    const partes = [];
    let recebido = 0;
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      partes.push(value);
      recebido += value.length;
      aoProgresso(total ? recebido / total : null);
    }

    const endereco = URL.createObjectURL(new Blob(partes, { type: 'video/mp4' }));
    const a = Object.assign(document.createElement('a'), { href: endereco, download: nome });
    document.body.append(a);
    a.click();
    a.remove();
    // O navegador precisa de um instante com o endereço vivo para começar a salvar.
    setTimeout(() => URL.revokeObjectURL(endereco), 60_000);
  },
};
