// Ponto de entrada: liga o formulário à API e o resultado à tela.
import { api } from './api.js';
import { iniciarBusca } from './ui/busca.js';
import { iniciarTema } from './ui/tema.js';
import { iniciarVideos } from './ui/videos.js';

const el = (id) => document.getElementById(id);

iniciarTema(el('tema'));

// O Safari do iPhone só aplica o :active dos botões se a página escuta toques.
addEventListener('touchstart', () => {}, { passive: true });

const videos = iniciarVideos({
  secao: el('resultado'),
  autor: el('autor'),
  texto: el('texto'),
  lista: el('videos'),
  modelo: el('modelo-video'),
});

iniciarBusca({
  form: el('busca'),
  campo: el('link'),
  mensagem: el('msg'),
  async aoBuscar(link) {
    videos.limpar();
    const tweet = await api.videos(link);
    videos.render(tweet);
  },
});
