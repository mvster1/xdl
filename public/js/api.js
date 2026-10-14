// Cliente da API do server.js, que serve esta página na mesma origem.

// Erros da API chegam como Error com a mensagem do servidor e .status.
// Falha de rede chega sem .status, com a mensagem "no connection to the server".
async function pedir(caminho) {
  const resposta = await fetch(caminho).catch(() => {
    throw new Error('no connection to the server');
  });
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const erro = new Error(dados?.message ?? `error ${resposta.status}`);
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

export const api = {
  // { id, autor: { nome, usuario }, texto, videos: [{ tipo, capa, duracao, variantes }] }
  // variantes: [{ url, largura, altura, bitrate }], da melhor para a pior.
  videos: (link) => pedir(`/api/video?${new URLSearchParams({ url: link })}`),

  // Endereço que entrega o mp4 como anexo, com o nome dado.
  baixar: (url, nome) => `/api/baixar?${new URLSearchParams({ u: url, nome })}`,

  // Endereço que toca o mp4 na prévia.
  ver: (url) => `/api/ver?${new URLSearchParams({ u: url })}`,
};
