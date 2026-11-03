# Vice City — checklist de polimento

## Calendário

- [x] Encerrar o Vice City na virada de sexta, 27/11/2026, para sábado, 28/11/2026, às 00h de São Paulo.

## Já feito

- [x] Ativação secreta pelo código Konami e pela pista `#BlûViceCity19`.
- [x] Em telas de toque, os dez símbolos aparecem e podem ser tocados na ordem para alternar o tema.
- [x] Intro de néon com áudio, opção de pular e transição curta de saída.
- [x] Intro e áudio pausam ao ocultar a aba e continuam do mesmo ponto ao voltar.
- [x] Tema salvo em `blu:settings["vice-city"]`; F5 com o tema ativo preserva o visual sem repetir a intro ou a animação.
- [x] Favicon e logo da janela Sobre acompanham o tema.
- [x] Paleta para os visuais Clássico e Novo: gradiente padrão em `vis-other` no Clássico e roxo padrão no Novo.
- [x] Faixa em degradê e brilho suave nas seções em hover ou foco.
- [x] Rosa de destaque mais contido no modo Escuro, inclusive nas ações e no brilho das seções.
- [x] Cursor especial após cinco minutos na primeira vez; dura de 20 a 30 cliques, fica brevemente translúcido a cada dez e pode reaparecer após dois minutos sem interação.
- [x] Cursores do Vice City em 32 × 32 px, como os do Halloween; originais de 128 × 128 px preservados.

## Antes de publicar

- [x] Conferir visualmente Claro/Escuro × Clássico/Novo com botões públicos, privados, `vis-other` padrão e cores personalizadas.
- [ ] Conferir contraste nos estados interativos e títulos longos.
- [ ] Percorrer ativação, pulo, áudio e saída após voltar de outra aba; confirmar que nenhuma transição fica presa.
- [ ] Conferir nos navegadores usados o ponto de clique da seta comum (ponta superior esquerda), da mão neon (ponta do indicador) e do “VI” em inatividade (base do V).
- [ ] Conferir a pista com leitor de tela e navegação por teclado: instruções, progresso e erro precisam ser compreensíveis sem depender só das cores.
- [ ] Implementar o encerramento automático: desativar o Vice City na data acima, impedir nova ativação e tratar uma preferência `on` já salva.
- [ ] Definir se o tema deve funcionar no PWA sem rede. O CSS, o JavaScript, o áudio e as imagens do Vice City não estão no `APP_SHELL` do service worker. A `origin/main` publicada pré-carrega o Halloween; a `main` local, após a reorganização, não o pré-carrega mais.

## Opcional, se ainda couber

- [ ] Experimentar um foco discreto em rosa/ciano na busca durante o tema, sem aumentar o brilho permanente da tela.
- [x] Saída de áudio de 250 ms ao pular a intro; a tela fecha imediatamente.
