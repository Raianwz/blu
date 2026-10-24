# Blû

Blû é um painel para guardar textos reutilizáveis em seções e botões. Serve para copiar rapidamente respostas, comandos, prompts, links e outros conteúdos frequentes.

**Acesse:** [Blû principal](https://blu.rwz.app)  
  <sup> <sub> [Blû Offline](https://blu.rwz.app/sprinklr/) </sub> </sup>

## O que oferece

- Criação e organização de seções, botões e tags, com busca e ações rápidas.
- Cópia com um clique, histórico para desfazer/refazer e importação/exportação em JSON.
- Temas, visualização compacta e instalação como PWA na versão principal.
- Compartilhamento temporário por link na versão hospedada.

## Versões e dados

O **Blû principal** salva os dados no `localStorage` do navegador e pode funcionar offline após o carregamento dos arquivos pelo PWA. Links compartilhados ficam disponíveis por até três dias.

O **Blû Offline** é desenvolvido na branch [`blu/offline`](https://github.com/Raianwz/blu/tree/blu/offline), com arquivos próprios para uso local. Ele é publicado separadamente em [offline.blu.rwz.app](https://offline.blu.rwz.app). Na Vercel, a rota [blu.rwz.app/sprinklr/](https://blu.rwz.app/sprinklr/) encaminha as requisições para essa publicação sem mudar o endereço no navegador. Isso mantém a origem `blu.rwz.app` e o acesso aos dados já salvos em `blu:offline` nessa origem. O Offline não depende das funções de compartilhamento e pode importar e exportar JSON. Seus recursos extras dependem de conexão quando carregados pela CDN.

As duas versões não sincronizam dados automaticamente. Exporte um JSON para manter um backup ou transferir conteúdo entre navegadores e dispositivos. Limpar os dados do site também apaga o conteúdo salvo localmente.

O backup padrão dos botões pode ser transferido entre as duas versões. Ao importar no Offline, ícones de seção, itens arquivados e campos não reconhecidos são preservados para a próxima exportação padrão, mesmo sem uma interface para usá-los. Editar textos mantém esses campos; trocar um ícone de botão atualiza o ícone escolhido. O Offline informa na importação quais recursos do arquivo têm suporte limitado, incluindo ícones de botão que dependem de conexão. Exportações personalizadas podem omitir campos e não substituem esse backup para transferências entre versões.

## Rodar localmente

Não há etapa de build para o projeto principal. Na raiz do repositório, inicie um servidor HTTP, por exemplo com Python 3:

```bash
python -m http.server 5500
```

Abra [http://localhost:5500](http://localhost:5500) para o Blû principal. A rota `/sprinklr/` depende dos rewrites da Vercel e não funciona nesse servidor estático. Para rodar o Offline localmente, use os arquivos da branch `blu/offline`; os recursos essenciais funcionam sem conexão.

O servidor estático não executa as rotas `api/`. Criar e abrir links compartilhados exige o ambiente de funções da Vercel com Upstash configurado; as demais funções do painel podem ser usadas localmente.

## Organização

- `index.html` e `share.html`: aplicação principal e página de links compartilhados.
- `js/` e `assets/`: código, estilos e recursos da aplicação principal.
- `libs/`: catálogos de ícones e dados de demonstração.
- `vercel.json`: encaminha `/sprinklr/` para a publicação separada do Offline.
- `api/`: funções de compartilhamento; `docs/roadmap.md`: planejamento.

O front-end usa HTML, CSS e JavaScript sem framework. A [ordem de carregamento dos scripts](js/README.md) é intencional.

## Privacidade e licença

A criptografia atual usa uma chave fixa incluída no código. Ela dificulta a leitura casual dos arquivos e compartilhamentos, mas não é adequada para guardar senhas ou outros segredos. A marcação **Privado** é visual e não impede que um botão seja incluído em backups ou compartilhamentos.

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE).
