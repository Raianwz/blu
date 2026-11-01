# Eventos sazonais

Cada evento fica em uma pasta própria. O Halloween, primeiro visual sazonal do
Blû, reúne em `halloween/` seu CSS, JavaScript, testes, ícones e cursores.
`vice-city/` contém o estudo de cores para novembro e uma intro opcional.
Digite ↑ ↑ ↓ ↓ ← → ← → B A fora dos campos de texto para ativar ou desativar
o tema nesta página. A intro traça o logo de `assets/icons/blu.svg`, preenche
as cores em 7 segundos e pode ser pulada por clique ou tecla. O Halloween tem
prioridade se as duas classes estiverem presentes. `vice-city/blu-vice-city.svg`
é o favicon e o logo da janela Sobre enquanto o tema está ativo. A intro toca
`ViceCity.ogg` quando o navegador permite áudio; pulá-la interrompe o som.

Ao adicionar outro evento, carregue os arquivos necessários no `index.html` e
no `js/loader.js`. Se ele precisar funcionar no PWA sem rede, inclua seus
arquivos no `APP_SHELL` de `js/service-worker.js` e atualize a versão do cache.

Os caminhos em CSS são relativos ao próprio arquivo CSS. Referências criadas
por JavaScript usam caminhos a partir da raiz do site.
