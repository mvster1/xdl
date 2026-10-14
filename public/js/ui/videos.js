// Resultado da busca: quem postou, o texto e, para cada vídeo, a prévia e os botões de baixar.
import { api } from '../api.js';

const resolucao = (v) => (v.largura && v.altura ? `${v.largura}×${v.altura}` : 'original');
const mbps = (v) => (v.bitrate ? ` · ${(v.bitrate / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1 })} Mbps` : '');

function duracao(segundos) {
  if (!segundos) return '';
  const s = Math.round(segundos);
  return ` · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// xdl-usuario-id[-n]-720p.mp4: o número do vídeo só entra quando o tweet tem mais de um.
function nomeDe(tweet, indice, variante) {
  const n = tweet.videos.length > 1 ? `-${indice + 1}` : '';
  const altura = variante.altura ? `-${Math.min(variante.altura, variante.largura ?? Infinity)}p` : '';
  return `xdl-${tweet.autor.usuario || 'tweet'}-${tweet.id}${n}${altura}.mp4`;
}

// Um botão de baixar por resolução. Enquanto o mp4 vem, o botão fica travado e mostra quanto
// já chegou; no fim volta ao normal (ou mostra o erro, e volta ao normal no próximo clique).
function botao(tweet, indice, variante) {
  const nome = nomeDe(tweet, indice, variante);
  const rotulo = `download .mp4 · ${resolucao(variante)}${mbps(variante)}`;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'botao';
  b.textContent = rotulo;
  b.addEventListener('click', async () => {
    b.disabled = true;
    b.textContent = 'downloading…';
    try {
      await api.baixar(variante.url, nome, (fracao) => {
        b.textContent = fracao === null ? 'downloading…' : `downloading… ${Math.floor(fracao * 100)}%`;
      });
      b.textContent = rotulo;
    } catch (erro) {
      b.textContent = `${erro.message} · try again`;
    }
    b.disabled = false;
  });
  return b;
}

export function iniciarVideos({ secao, autor, texto, lista, modelo }) {
  function item(tweet, video, indice) {
    const li = modelo.content.firstElementChild.cloneNode(true);
    const menor = video.variantes.at(-1);

    // A prévia toca a menor variante direto do twimg (a página não manda Referer, ver o
    // index.html). Se o navegador mandar mesmo assim e levar 403, ela vem pelo fetch, sem ele.
    const player = li.querySelector('video');
    if (video.capa) player.poster = video.capa;
    player.src = menor.url;
    player.addEventListener('error', async () => {
      const resposta = await fetch(menor.url, { referrerPolicy: 'no-referrer' }).catch(() => null);
      if (resposta?.ok) player.src = URL.createObjectURL(await resposta.blob());
    }, { once: true });
    if (video.tipo === 'gif') Object.assign(player, { loop: true, muted: true });

    const numero = tweet.videos.length > 1 ? `${indice + 1} of ${tweet.videos.length} · ` : '';
    li.querySelector('.video-titulo').textContent = `${numero}${video.tipo}${duracao(video.duracao)}`;

    // As variantes já vêm da melhor para a pior: a melhor é o primeiro botão.
    li.querySelector('.variantes').replaceChildren(...video.variantes.map((v) => botao(tweet, indice, v)));
    return li;
  }

  return {
    render(tweet) {
      autor.textContent = tweet.autor.usuario ? `${tweet.autor.nome} @${tweet.autor.usuario}` : 'tweet';
      // O link curto do próprio vídeo (t.co) no fim do texto não diz nada aqui.
      texto.textContent = tweet.texto.replace(/\s*https:\/\/t\.co\/\w+$/, '');
      texto.hidden = !texto.textContent;
      lista.replaceChildren(...tweet.videos
        .filter((v) => v.variantes.length)
        .map((v, i) => item(tweet, v, i)));
      secao.hidden = false;
    },

    limpar() {
      lista.replaceChildren();
      secao.hidden = true;
    },
  };
}
