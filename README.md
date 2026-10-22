# Blû

Blû é um painel para guardar textos reutilizáveis em seções e botões. Serve para copiar rapidamente respostas, comandos, prompts, links e outros conteúdos frequentes.

**Acesse:** [blu.rwz.app](https://blu.rwz.app)

## O que oferece

- Criação e organização de seções, botões e tags, com busca e ações rápidas.
- Cópia com um clique, histórico para desfazer/refazer e importação/exportação em JSON.
- Temas, visualização compacta e instalação como PWA na versão principal.
- Compartilhamento temporário por link na versão hospedada.

## Versões e dados

O **Blû principal** salva os dados no `localStorage` do navegador e pode funcionar offline após o carregamento dos arquivos pelo PWA. Links compartilhados ficam disponíveis por até três dias.

O **Blû Offline**, em [`sprinklr/`](sprinklr/), é uma versão independente pensada para distribuição em um HTML único ou com arquivos locais. Usa a chave `blu:offline`, não depende de funções de compartilhamento, e pode importar e exportar JSON. Os ícones opcionais são carregados de uma CDN quando há conexão.

As duas versões não sincronizam dados automaticamente. Exporte um JSON para manter um backup ou transferir conteúdo entre navegadores e dispositivos. Limpar os dados do site também apaga o conteúdo salvo localmente.

## Rodar localmente

Não há etapa de build para o projeto principal. Na raiz do repositório, inicie um servidor HTTP, por exemplo com Python 3:

```bash
python -m http.server 5500
```

Abra [http://localhost:5500](http://localhost:5500) para o Blû principal ou [http://localhost:5500/sprinklr/](http://localhost:5500/sprinklr/) para o Blû Offline. Nesta árvore, o HTML do Offline usa caminhos absolutos `/sprinklr/`, então também deve ser aberto pelo servidor local.

O servidor estático não executa as rotas `api/`. Criar e abrir links compartilhados exige o ambiente de funções da Vercel com Upstash configurado; as demais funções do painel podem ser usadas localmente.

## Organização

- `index.html` e `share.html`: aplicação principal e página de links compartilhados.
- `js/` e `assets/`: código, estilos e recursos da aplicação principal.
- `libs/`: catálogos de ícones e dados de demonstração.
- `sprinklr/`: Blû Offline, mantido de forma independente.
- `api/`: funções de compartilhamento; `docs/roadmap.md`: planejamento.

O front-end usa HTML, CSS e JavaScript sem framework. A [ordem de carregamento dos scripts](js/README.md) é intencional.

## Privacidade e licença

A criptografia atual usa uma chave fixa incluída no código. Ela dificulta a leitura casual dos arquivos e compartilhamentos, mas não é adequada para guardar senhas ou outros segredos. A marcação **Privado** é visual e não impede que um botão seja incluído em backups ou compartilhamentos.

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE).
