// Formulário do link: busca pelo que está no campo.
export function iniciarBusca({ form, campo, mensagem, aoBuscar }) {
  const botoes = [...form.querySelectorAll('button')];

  async function buscar(link) {
    mensagem.textContent = 'searching…';
    for (const b of botoes) b.disabled = true;
    try {
      await aoBuscar(link);
      mensagem.textContent = '';
    } catch (erro) {
      mensagem.textContent = erro.message;
    }
    for (const b of botoes) b.disabled = false;
  }

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    buscar(campo.value.trim());
  });

  // O navegador devolve ao campo o que estava nele quando a página volta (recarregar, voltar):
  // aqui ela sempre começa vazia.
  addEventListener('pageshow', () => form.reset());
}
