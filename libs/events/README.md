# Eventos sazonais

Cada evento fica em uma pasta própria. O Halloween, primeiro visual sazonal do
Blû, reúne em `halloween/` seu CSS, JavaScript, testes, ícones e cursores.

Ao adicionar outro evento, carregue os arquivos necessários no `index.html` e
no `js/loader.js`. Se ele precisar funcionar no PWA sem rede, inclua seus
arquivos no `APP_SHELL` de `js/service-worker.js` e atualize a versão do cache.

Os caminhos em CSS são relativos ao próprio arquivo CSS. Referências criadas
por JavaScript usam caminhos a partir da raiz do site.
