# Eventos sazonais

Cada evento fica em uma pasta própria. O Halloween, primeiro visual sazonal do
Blû, reúne em `halloween/` seu CSS, JavaScript, testes, ícones e cursores.
As integrações antigas com a redefinição de preferências e o pop-out ficam em
`halloween/halloween-app.js`, carregado junto ao evento.
`vice-city/` contém o estudo de cores para novembro e uma intro opcional.
Digite ↑ ↑ ↓ ↓ ← → ← → B A fora dos campos de texto para ativar ou desativar
o tema nesta página. A intro começa antes da troca de tema, que ocorre 500 ms
depois. Ela traça o logo de `assets/icons/blu.svg`, preenche as cores em 7
segundos e pode ser pulada por clique ou tecla. O Halloween tem
prioridade se as duas classes estiverem presentes. `vice-city/icons/blu-vice-city.svg`
é o favicon e o logo da janela Sobre enquanto o tema está ativo. A intro toca
`vice-city/sounds/ViceCity.ogg` quando o navegador permite áudio; pulá-la
fecha a tela imediatamente e reduz o som por 250 ms.
Ao desativar o tema, o logo original aparece sobre o azul do Blû por 2 segundos.
O What's New oferece um atalho para pesquisar `#BlûViceCity19`. Essa busca
mostra dez espaços com parte da sequência; cada tecla correta revela e acende
um espaço. Um erro
aparece em vermelho e reinicia a pista após 2 segundos.
Em telas de toque, os dez símbolos já aparecem e devem ser tocados na ordem.
Ao completar a sequência, a busca é limpa na ativação e na desativação do tema.
O estado do tema fica em `blu:settings["vice-city"]` (`on` ou `off`) e é
restaurado após recarregar a página, sem repetir a intro. A preferência antiga
`halloweenVisual` é removida quando a temporada de Halloween não está disponível.
O cursor temático aparece ao fim da intro ou quando ela é pulada. Após cinco
minutos sem interação com o Blû, o logo VI substitui a seta até o próximo clique.
Ele pode reaparecer após dois minutos de inatividade. Sair do tema remove o
cursor; recarregar a página reinicia o prazo da primeira aparição.

Ao adicionar outro evento, carregue os arquivos necessários no `index.html` e
no `js/loader.js`. Se ele precisar funcionar no PWA sem rede, inclua seus
arquivos no `APP_SHELL` de `js/service-worker.js` e atualize a versão do cache.

Os caminhos em CSS são relativos ao próprio arquivo CSS. Referências criadas
por JavaScript usam caminhos a partir da raiz do site.
