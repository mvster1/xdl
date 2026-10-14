// Alterna o tema: auto (segue o sistema) -> claro -> escuro.
// A escolha não é guardada: recarregou, volta para o auto.
const TEMAS = ['', 'light', 'dark'];
const ROTULOS = { '': 'auto', light: 'light', dark: 'dark' };

export function iniciarTema(botao) {
  let tema = '';

  const aplicar = () => {
    document.documentElement.style.colorScheme = tema;
    botao.textContent = `theme: ${ROTULOS[tema]}`;
  };

  botao.addEventListener('click', () => {
    tema = TEMAS[(TEMAS.indexOf(tema) + 1) % TEMAS.length];
    aplicar();
  });

  aplicar();
}
