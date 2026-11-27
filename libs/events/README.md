# Eventos sazonais

Cada evento fica em uma pasta própria. O Halloween, primeiro visual sazonal do
Blû, reúne em `halloween/` seu CSS, JavaScript, testes, ícones e cursores.
As integrações antigas com a redefinição de preferências e o pop-out ficam em
`halloween/archieved/halloween-app.js`. O evento não é carregado pelo Blû atual; a regra
de calendário de 2026 e o painel de novidades antigo estão preservados na pasta
do Halloween para uma eventual reativação.
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
restaurado após recarregar a página, sem repetir a intro.
De 16/11 até 28/11/2026 às 16h de Brasília, o rádio experimental aparece
somente se o tema estiver ativo e a primeira faixa em `rd.blu.rwz.app/vice-city/`
estiver acessível. Um clique inicia a playlist em ordem aleatória e 15% de
volume; o painel oferece anterior, reproduzir/pausar, próxima e volume.
Título, artista e álbum vêm das tags ID3 quando o R2 permite sua leitura pelo
navegador; o nome do arquivo substitui um título ausente. Fora do período ou
sem áudio, o rádio não aparece. Para testar antes da abertura em localhost,
use `?radio-preview=1`.
Nesse teste local, a ordem das faixas permanece a original.
As músicas ficam no R2 e não entram no cache do PWA.
O domínio público precisa entregar os MP3 diretamente, sem desafio da Cloudflare;
uma resposta `403` com `Cf-Mitigated: challenge` impede o carregamento no player.
Para exibir as tags ID3, o bucket `radioblu` precisa de uma política CORS para
`GET` com `Range` liberado nas origens `https://blu.rwz.app`,
`http://localhost:5500` e `http://127.0.0.1:5500`. Sem essa política o som
continua funcionando, mas o navegador mostra o nome do arquivo.
O tema Vice City se encerra automaticamente em 28/11/2026 às 17h de Brasília:
a preferência salva é desligada e novas ativações são bloqueadas. Para quem
estiver com o tema aberto nesse horário, a saída começa no próximo clique ou
tecla, permitindo que o navegador reproduza a música. O logo de néon se apaga em
6 segundos. O logo azul do Blû aparece no fim, antes da transição de saída
de 2 segundos. Ao voltar ao Blû normal, `vice-city/sounds/ocarina.ogg` toca
uma vez a 12% do volume e começa uma neve leve por 30 segundos. A neve não é
exibida quando o usuário prefere movimento reduzido. Um toast com o símbolo da
Triforce pergunta “Uma ocarina? O tempo está mudando...”; ele dura até 30 segundos e fecha ao clique.
Para testar a saída antes da data,
abra `/?vice-end=true` e clique em “Iniciar saída com som”; esse clique libera a
reprodução nos navegadores que bloqueiam áudio automático. A prévia funciona
mesmo com o tema desligado e, se ele
estiver ativo, também desliga sua preferência salva.
Para testar o mesmo gatilho do encerramento real sem o botão de prévia, use
`/?vice-end=demo`: a primeira interação com a interface inicia a saída e o som.
Após o encerramento, a rádio e a pista deixam o What's New; buscar
`#BlûViceCity19` mostra apenas “Nenhum resultado… procure em Leonida.” até
30/11/2026 às 23h59, horário de Brasília. A partir de 01/12, a busca volta à
resposta comum. Os dois parâmetros de prévia seguem o mesmo limite para essa
mensagem.
O cursor temático aparece ao fim da intro ou quando ela é pulada. Após cinco
minutos sem interação com o Blû, o logo VI substitui a seta até o próximo clique.
Ele pode reaparecer após dois minutos de inatividade. Sair do tema remove o
cursor; recarregar a página reinicia o prazo da primeira aparição.

Ao adicionar outro evento, carregue os arquivos necessários no `index.html` e
no `js/loader.js`. Se ele precisar funcionar no PWA sem rede, inclua seus
arquivos no `APP_SHELL` de `js/service-worker.js` e atualize a versão do cache.

Os caminhos em CSS são relativos ao próprio arquivo CSS. Referências criadas
por JavaScript usam caminhos a partir da raiz do site.
