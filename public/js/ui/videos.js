// Resultado da busca: quem postou, o texto e, para cada vídeo, a prévia e os links de baixar.
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

// Um botão de baixar por resolução.
function link(tweet, indice, variante) {
  const nome = nomeDe(tweet, indice, variante);
  const a = document.createElement('a');
  a.className = 'botao';
  a.href = api.baixar(variante.url, nome);
  a.download = nome;
  a.textContent = `download .mp4 · ${resolucao(variante)}${mbps(variante)}`;
  return a;
}

export function iniciarVideos({ secao, autor, texto, lista, modelo }) {
  function item(tweet, video, indice) {
    const li = modelo.content.firstElementChild.cloneNode(true);
    const menor = video.variantes.at(-1);

    // A prévia toca a menor variante; ela e o download passam pelo servidor.
    const player = li.querySelector('video');
    if (video.capa) player.poster = video.capa;
    player.src = api.ver(menor.url);
    if (video.tipo === 'gif') Object.assign(player, { loop: true, muted: true });

    const numero = tweet.videos.length > 1 ? `${indice + 1} of ${tweet.videos.length} · ` : '';
    li.querySelector('.video-titulo').textContent = `${numero}${video.tipo}${duracao(video.duracao)}`;

    // As variantes já vêm da melhor para a pior: a melhor é o primeiro botão.
    li.querySelector('.variantes').replaceChildren(...video.variantes.map((v) => link(tweet, indice, v)));
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
