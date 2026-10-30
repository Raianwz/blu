# Roadmap do Blû

Este documento reúne recursos planejados, polimentos e decisões de produto ainda não concluídas. Ele deve ser atualizado quando uma ideia for implementada, descartada ou reformulada.

## Em desenvolvimento

### Dia das Bruxas / Halloween (Temporário - Sazonal)

Preparar a atualização sazonal junto das novas cores e dos ícones de seção. O tema é temporário; as cores personalizadas e os ícones de seção são recursos permanentes.

Base preparada, disponível somente no ambiente local:

- [x] Separar o tema em arquivos próprios de CSS e JavaScript.
- [x] Manter Halloween e ícones de seção bloqueados em produção por flags de liberação manual.
- [x] Permitir prévia no localhost fora do período sazonal.
- [x] Adicionar “Visual de Halloween: ON/OFF” em Conteúdo, independente do visual Clássico/Novo.
- [x] Preparar aparência clara e escura com detalhes de abóbora e roxo.
- [x] Melhorar leitura dos menus, estados ativos, hover e foco de teclado nos dois temas.
- [x] Manter a preferência local e reaplicá-la ao redefinir preferências ou limpar os dados.

Pendências para o lançamento:

- [x] Trabalhar os botões públicos em laranja-abóbora e os privados em um tom mais escuro, mantendo os indicadores distinguíveis.
- [x] Aplicar as cores sazonais somente na apresentação: não modificar `vis`, cores personalizadas ou conteúdo do JSON.
- [x] Preservar as escolhas de cor dos botões “Outro”.
- [x] Polir os cabeçalhos e ícones das seções, com leitura consistente nos temas claro e escuro.
- [x] Explorar detalhes discretos inspirados em Halloween, Dia das Bruxas e lendas do folclore brasileiro, sem prejudicar leitura ou interação.
- [x] Atualizar o What's New com novas cores/gradientes, ícones nas seções e “Tema de Dia das Bruxas”; deixar detalhes internos de desenvolvimento de fora.
- [x] Sinalizar novidades pelo sininho, sem abrir o What's New automaticamente.
- [x] Ativar o visual sazonal na primeira abertura voluntária das novidades, seguindo o comportamento do visual Novo e respeitando escolhas posteriores de ON/OFF.
- [x] Validar a regra de primeira ativação após “Redefinir Preferências” e “Limpar Tudo”.
- [x] Confirmar a janela sazonal de 2026: 01/10 a 02/11 às 20h (horário de São Paulo), com retorno automático ao visual normal.
- [x] Mostrar uma despedida breve com fantasma uma vez em 02/11, somente quando o visual de Halloween estiver ativo.
- [x] Após 60 segundos com uma seção aberta e visível (inclusive pela busca), mostrar uma aranha por seção em botões sem teia. Ela percorre um botão por vez e cria teia após 15 segundos; pausa quando a aba fica oculta e respeita movimento reduzido.
- [x] Mostrar o fantasma após dois minutos sem clicar em botões na primeira vez e após dez minutos nas aparições seguintes. Ele acompanha o mouse suavemente; ao voltar ao foco, o primeiro movimento do mouse o destaca por dois segundos. Pisca a cada clique e desaparece em um “puff” após 2–5 cliques. Respeitar aba oculta, toque e movimento reduzido.
- [x] Garantir retorno ao visual normal e ocultação do controle após o período, sem perder dados ou personalizações.
- [x] Validar contraste, navegação por teclado, telas estreitas e combinações Claro/Escuro × Clássico/Novo × Halloween ON/OFF.
- [x] Liberar manualmente as flags e atualizar o service worker na publicação da 1.9.5.

Ideias para uma próxima expansão sazonal (não incluídas na 1.9.5):

- [x] Primeira etapa: adicionar a paleta Zumbi e mostrar Vampiro, Bruxa e Fantasma indisponíveis no seletor até serem implementadas.
- [x] Segunda etapa: liberar Vampiro; manter Bruxa e Fantasma indisponíveis por enquanto.
- [x] Terceira etapa: liberar Bruxa; manter Fantasma indisponível até a definição do contraste da paleta clara.
- [x] Quarta etapa: liberar Fantasma com letras/ícones escuros no Público claro e brancos no Privado escuro.
- [x] Oferecer cinco paletas para botões Público/Privado: Abóbora (laranja queimado e roxo sombrio, atual), Zumbi (verde musgo e terra escura), Vampiro (vinho-sangue e carvão), Bruxa (roxo de poção e verde de ervas/vassoura) e Fantasma (névoa/lavanda apagada e osso ou cinza de cemitério).
- [x] Trocar somente as cores visuais dos botões Público/Privado nos visuais Clássico e Novo. Manter o tema base de Halloween, inclusive o menu hambúrguer com abóbora, igual em todas as paletas.
- [x] Não recolorir por padrão ações como Salvar, Cancelar, Sim e Não. Considerar apenas um ajuste pontual de destaque ou hover das seções se os testes de contraste realmente exigirem; preservar cores semânticas de confirmação, cancelamento e perigo.
- [x] Adicionar em Conteúdo um seletor discreto “Estilo:”, visível apenas com o tema sazonal ativo.
- [x] Mostrar um banner curto na primeira ativação após a novidade, com amostras das paletas disponíveis e atalho para o seletor; não repetir após escolha ou fechamento.
- [x] Aplicar as paletas só na apresentação, sem alterar JSON ou cores dos botões “Outro”; usar texto/ícones escuros no Público da paleta Fantasma.
- [x] Validar visualmente contraste e distinção entre Público/Privado nos temas Claro/Escuro e visuais Clássico/Novo. Conferidas as 20 combinações de cores em amostras geradas do CSS; menor contraste entre texto e fundo: 5,39:1.

### Histórico de atividade

Registro implementado em `blu:userdata`, separado dos dados compartilháveis de `blu:data`. As verificações abaixo são do código; os testes de interação seguem pendentes.

Eventos implementados:

- [x] Botão criado, editado, removido, restaurado por desfazer e duplicado.
- [x] Seção criada, editada, removida, restaurada por desfazer e duplicada.
- [x] Botão transferido de uma seção para outra.
- [x] Botão reordenado dentro da mesma seção.
- [x] Seção reordenada.
- [x] Resumo das propriedades alteradas durante uma edição.

Decisões:

- [x] Usar SVGs consistentes com a interface do Blû.
- [x] Diferenciar transferência `⇄` de reordenação `↕`.
- [x] Manter um retrato mínimo do nome e da seção para itens já removidos.
- [x] Mostrar os eventos recentes nas Estatísticas e o histórico completo em uma janela própria.
- [x] Permitir filtros por alvo e ação.
- [x] Agrupar eventos por data.
- [x] Limitar o histórico aos 500 eventos mais recentes.
- [x] Limpar o histórico sem apagar métricas ou botões.
- [x] Registrar restauração quando uma remoção for desfeita.

Polimentos pendentes:

- [ ] Testar todos os movimentos com mouse, toque e controles de organização.
- [ ] Avaliar detalhes expansíveis para edições.
- [ ] Avaliar a apresentação de valores anteriores e posteriores para campos curtos.
- [ ] Revisar como eventos de refazer devem aparecer.
- [ ] Decidir se arquivar, restaurar do arquivo e excluir definitivamente também devem gerar eventos; esses fluxos ainda não registram atividade.

## Próximos recursos

### Espaço Sincronizado

Nome curto da interface: **Espaço Sincronizado**. Descrição: “Publique versões dos seus botões para outras pessoas acessarem pelo nome do espaço.” As versões são enviadas manualmente; não há edição simultânea nem sincronização em tempo real. O espaço expira quatro dias após a última publicação, e uma nova publicação reinicia o prazo.

Primeira etapa:

- [ ] Em Compartilhar > Espaço Sincronizado, oferecer **Criar espaço**, **Acessar espaço** e, para o criador, **Publicar atualização**. Reaproveitar a seleção e a prévia dos dados compartilháveis antes do envio; não gerar link.
- [ ] Criar o espaço com nome público e senha de atualização. A leitura exige somente o nome; a senha autoriza publicações. Explicar na interface que qualquer pessoa com o nome pode ler os dados e que conteúdo sensível não deve ser publicado.
- [ ] Normalizar nomes de forma única e previsível (acentos, maiúsculas e espaços), rejeitar colisões e reservar o nome até a expiração. Não permitir que duas criações simultâneas ocupem o mesmo nome.
- [ ] Guardar no servidor uma versão crescente, data de publicação e prazo de expiração; validar tamanho e estrutura dos dados, limitar requisições e proteger a senha sem armazená-la em texto puro.
- [ ] Ao acessar, salvar a cópia em `blu:data-sync`, separada de `blu:data`. A primeira versão local guarda um espaço; definir o formato para permitir até três depois. Não substituir dados locais ao receber ou atualizar.
- [ ] Oferecer **Ver meus dados** e **Ver espaço** com indicação persistente da origem. Na visualização do espaço, bloquear edição até definir um fluxo explícito para importar uma cópia aos dados locais.
- [ ] Permitir **Buscar atualização** sob demanda. Se houver nova versão, mostrar data, versão e resumo das mudanças antes de atualizar `blu:data-sync`; manter a cópia anterior se o usuário cancelar ou ocorrer erro.
- [ ] Manter a cópia recebida após a expiração no servidor até o usuário removê-la; explicar que novas buscas deixarão de funcionar. Liberar o nome e apagar conteúdo e metadados do servidor quando expirar.

Etapas seguintes:

- [ ] Importar total ou parcialmente os dados recebidos com prévia e confirmação explícita, aproveitando o fluxo `/share/sync-data` via POST; nunca substituir `blu:data` apenas por buscar uma versão.
- [ ] Com o espaço ativo, tentar verificar novas versões até duas vezes em uma hora. Guardar esse controle temporariamente no navegador e zerá-lo em “Limpar Tudo”; evitar tentativas quando estiver offline.
- [ ] Permitir até três espaços recebidos, com seleção e remoção independentes.

Antes de implementar, definir o comportamento quando duas publicações ocorrerem quase ao mesmo tempo e como apresentar versões publicadas que diferem da cópia local.

Base da API iniciada: `POST /api/sync` cria um espaço; `GET` e `PATCH /api/sync/:name` leem e publicam versões. Os registros usam o prefixo `blu:sync-space:` no Redis, separado de `blu:share:`. O nome é normalizado e reservado com `SET NX`; a publicação exige senha e `expectedVersion`, com gravação atômica para recusar concorrência. Ainda faltam a interface, a seleção/prévia, a cópia local em `blu:data-sync` e a apresentação das diferenças antes de atualizar. Não marcar os itens acima como concluídos até integrar e testar esses fluxos.

Cliente preparado em `js/data/sync-space-client.js` com criar, acessar e publicar, mensagens de erro e testes. O arquivo continua fora do loader e não faz requisições até ser chamado pela futura interface.

Cópia local preparada em `js/data/sync-space-store.js`: `blu:data-sync` guarda um envelope versionado com lista de espaços (limite atual de um, expansível para três), metadados de publicação e dados recebidos. Gravar, consultar e remover são ações explícitas; o módulo não lê nem altera `blu:data` e continua fora do loader. A futura interface ainda precisará ligar o acesso da API ao salvamento após confirmação.

### Arquivar botões e seções

Fundação do recurso:

- [x] Adicionar `archived.buttons` e `archived.sections` ao estado principal.
- [x] Normalizar e sanitizar itens arquivados vindos de backups.
- [x] Incluir arquivados em autosave, snapshots, desfazer/refazer e detecção de backup pendente.
- [x] Reconhecer o schema no diagnóstico de JSON.
- [x] Criar ações de arquivar, restaurar e excluir definitivamente.
- [x] Criar a tela de Arquivados com abas para botões e seções.
- [x] Permitir ativar ou desativar as ações de arquivar no menu de contexto.
- [x] Incluir arquivados por padrão no backup completo.
- [x] Adicionar “Incluir itens arquivados?” aos compartilhamentos e às exportações personalizadas.
- [x] Compartilhamento personalizado por seção e botão, com busca por nome/tag ou @seção, arquivados opcionais e confirmação ao descartar alterações.
- [x] Preservar rolagem e expansão ao marcar itens no compartilhamento personalizado.
- [x] Manter arquivados fora da pesquisa e da tela inicial comuns.

### Remoção dos Favoritos

O recurso foi removido em favor de Arquivados. Backups antigos continuam importáveis; o campo de favoritos é ignorado, enquanto botões, seções e estatísticas são mantidos.

- [x] Remover painel, ações e preferências de Favoritos.
- [x] Remover favoritos do estado `blu:userdata` e dos novos backups de estatísticas.
- [x] Remover preset, escopo e campo de Favoritos da Exportação Personalizada.
- [x] Atualizar textos de backup, importação e interface.
- [x] Aceitar backups antigos sem reintroduzir Favoritos.

### Criptografia versionada para o Blû

Substituir a chave fixa pública usada atualmente por um formato criptográfico versionado, preservando a leitura de arquivos e links criados pelas versões anteriores.

Objetivos:

- Continuar usando AES-GCM com chave de 256 bits, IV aleatório de 96 bits e tag de autenticação.
- Marcar novos envelopes com `version`, `keyMode` e `keyId`.
- Tratar envelopes sem versão como criptografia legada `v1`.
- Manter a chave antiga exclusivamente para leitura e migração; nunca usá-la para criar novos conteúdos.
- Permitir reexportar dados legados usando o formato atual.

#### Compartilhamentos com chave no servidor

Usar as Vercel Functions como camada de criptografia dos compartilhamentos:

- `POST /api/share` valida, criptografa e armazena o conteúdo.
- `GET /api/share/:id` busca, descriptografa e devolve o conteúdo por HTTPS.
- A chave ativa permanece somente nas variáveis de ambiente da Vercel.
- O Redis recebe apenas o envelope criptografado.
- Não criar uma rota pública e genérica como `/api/decrypt`.
- Aplicar limite de payload, rate limit e `Cache-Control: no-store`.
- Não registrar chaves, conteúdo aberto ou payloads completos nos logs.

Formato planejado:

```json
{
  "blu_encrypted": true,
  "version": 2,
  "alg": "AES-GCM-256",
  "keyMode": "server",
  "keyId": "share-2026-01",
  "iv": "...",
  "data": "..."
}
```

Rotação de chaves:

- Definir no `.env` o identificador e a chave ativa.
- Manter temporariamente as chaves anteriores para links ainda válidos.
- Selecionar a chave correta por `keyId`.
- Como os links expiram após três dias, remover chaves antigas somente depois dessa janela.
- Documentar um procedimento de rotação e recuperação antes da publicação.

Limitação assumida: nesse modelo, o servidor consegue ler os dados durante a criação e abertura do compartilhamento. A proteção principal é contra leitura direta do Redis ou exposição da chave no front-end.

#### Alternativa sem conhecimento do servidor

Avaliar como opção futura uma chave aleatória por compartilhamento no fragmento da URL:

```text
https://blu.rwz.app/s/EquipeA1#k=chave-aleatoria
```

Nesse modelo, o servidor nunca recebe a chave e não consegue descriptografar o conteúdo. O botão de copiar e o fluxo de personalização do link devem preservar obrigatoriamente o fragmento. Apelidos curtos e previsíveis exigem atenção especial, pois não devem ser tratados como segredo.

#### Arquivos exportados

- Derivar a chave a partir de uma senha definida pelo usuário usando PBKDF2-SHA-256 e salt aleatório.
- Calibrar a quantidade de iterações em computadores e celulares reais.
- Futuramente permitir que usuários avançados forneçam a própria chave.
- Nunca salvar senha ou chave dentro do mesmo arquivo criptografado.
- Informar claramente que uma senha ou chave perdida não pode ser recuperada pelo Blû.
- Identificar na interface “Criptografia legada” e “Criptografia Blû 1.8”.

#### Etapas sugeridas

1. Definir e validar o envelope criptográfico `v2`.
2. Criar testes com payload correto, adulterado, chave incorreta e versões desconhecidas.
3. Manter o leitor `v1` e passar todas as novas gravações para `v2`.
4. Implementar criptografia e rotação de chave dentro das rotas de compartilhamento.
5. Implementar exports protegidos por senha.
6. Avaliar chave própria e compartilhamentos sem conhecimento do servidor.

### Importação em massa por texto

Criar seções e botões a partir de uma sintaxe textual simples, inspirada em Markdown. Nome provisório do recurso: **Importar por Texto**. Nome provisório da linguagem: **Sintaxe Blû**.

Objetivos:

- Criar vários botões e seções sem abrir um modal para cada item.
- Permitir edição confortável em qualquer editor de texto.
- Validar toda a estrutura antes de modificar os dados atuais.
- Futuramente permitir exportar para a mesma sintaxe e reimportar o arquivo editado.

#### Sintaxe básica

```text
# Mesa do Mestre

## Crítico!
@tag mestre
@vis public

Role o dano crítico novamente.

## Falha Crítica
@tag mestre
@vis public

Algo deu terrivelmente errado.
```

Regras iniciais:

- `# Nome` inicia uma seção.
- `## Nome` inicia um botão.
- `@tag valor` define a tag do botão.
- `@vis public`, `@vis private` e `@vis other` definem a visibilidade.
- Também aceitar valores amigáveis como `público`, `privado` e `outro`.
- IDs não são obrigatórios; o Blû os gera automaticamente.
- Diretivas são reconhecidas somente na área inicial do botão, antes do texto.

#### Modos de importação

O comportamento estrutural deve ser escolhido pela interface, evitando exigir sintaxe avançada para tarefas comuns.

1. **Criar seções com botões**
   - Cria todas as seções descritas e adiciona seus botões.
   - Em conflitos de nome, permite mesclar, criar cópia ou ignorar.

2. **Adicionar botões a uma seção**
   - Exibe um seletor com as seções existentes.
   - Todos os botões do texto são enviados para a seção escolhida.
   - Títulos de seção encontrados no texto são ignorados com aviso.

3. **Distribuir botões entre seções existentes**
   - Cada `# Nome` referencia uma seção já existente.
   - Permite enviar botões diferentes para seções diferentes na mesma importação.
   - Não cria silenciosamente uma seção que não foi encontrada.

4. **Criar somente seções**
   - Cria seções vazias a partir de títulos `#`.
   - Blocos de botões encontrados são ignorados com aviso.
   - Permite escolher se as novas seções começam expandidas ou minimizadas.

#### Referência a seções existentes

No modo de distribuição, títulos comuns são suficientes:

```text
# Mesa do Mestre

## Botão 4
Texto do botão 4.

# Taverna

## Botão 8
Texto do botão 8.
```

Resolução recomendada:

1. Procurar pelo ID quando `@section-id` estiver presente.
2. Procurar pelo nome exato.
3. Procurar pelo nome normalizado, ignorando acentos e maiúsculas.
4. Se houver mais de uma candidata, exigir uma escolha na prévia.
5. Se nenhuma seção existir, mostrar erro e oferecer criar, redirecionar ou ignorar o bloco.

Referência precisa opcional:

```text
# Mesa do Mestre
@section-id s1
```

Atalho avançado a ser avaliado:

```text
#> Mesa do Mestre
```

O marcador `#>` significaria “usar esta seção existente”. Ele não deve ser obrigatório quando o modo da interface já define esse comportamento.

#### Textos com múltiplas linhas

Para textos simples, o conteúdo começa depois das diretivas e termina no próximo botão, seção ou fim do arquivo:

```text
## Rumores
@tag taverna

Dizem que luzes foram vistas ao norte.
Alguns juram ter ouvido vozes.
```

Para conteúdos complexos, aceitar blocos cercados por crases, preservando quebras, linhas vazias e símbolos que poderiam parecer comandos:

````text
## Carta Encontrada
@tag pistas
@vis private

```text
Meu caro amigo,

Não confie no mercador.

# Esta linha faz parte do texto.
@tag Esta linha também faz parte do texto.
```
````

Regras dos blocos:

- Preservar as quebras de linha internas.
- Não interpretar `#`, `##` ou diretivas dentro do bloco.
- Permitir cercas maiores para textos que contenham três crases.
- Exigir o mesmo número de crases para abrir e fechar.
- Impedir a importação quando um bloco não for fechado.
- Informar a linha exata do erro.

#### Prévia e validação

Antes de importar, apresentar:

- Quantidade de seções novas.
- Quantidade de seções existentes que serão utilizadas.
- Quantidade de botões novos.
- Tags encontradas.
- Seção de destino de cada botão.
- Linhas ignoradas.
- Erros e avisos com número da linha.
- Conflitos de nomes e referências ambíguas.
- Quantidade de linhas e caracteres dos textos extensos.

A prévia deve permitir resolver individualmente seções não encontradas:

- Escolher uma seção existente.
- Criar uma nova seção.
- Ignorar o bloco.

#### Conflitos

Seções com o mesmo nome:

- Mesclar com a existente.
- Criar uma cópia.
- Ignorar.
- Perguntar individualmente.

Botões com o mesmo nome:

- Adicionar mesmo assim, opção padrão por compatibilidade com o comportamento atual.
- Renomear automaticamente como cópia.
- Substituir o existente.
- Ignorar.

#### Opções complementares

- Tag padrão para botões sem `@tag`.
- Visibilidade padrão para botões sem `@vis`.
- Estado inicial das novas seções.
- Inserir referência de uma seção existente pelo seletor da interface.
- Copiar referência de uma seção pelo menu de contexto.
- Adicionar ao conteúdo atual ou substituir tudo, com confirmação reforçada para substituição.
- Uma aba “Sintaxe” com documentação e exemplo copiável.

#### Implementação sugerida em etapas

1. Parser de `#`, `##`, `@tag`, `@vis` e texto implícito.
2. Validação sem alterar os dados atuais.
3. Modos “Criar seções com botões” e “Adicionar botões a uma seção”.
4. Prévia e tratamento de conflitos.
5. Distribuição entre várias seções existentes.
6. Blocos cercados para textos complexos.
7. IDs e referências avançadas.
8. Exportação personalizada para Sintaxe Blû.

## Polimentos planejados

### Exportação personalizada

- [x] Renomear o item do menu para “Exportação Personalizada” ou “Exportação Avançada”.
- [ ] Na aba de prévia, substituir “Visualizar” por “Voltar para configurar” ou ocultar o botão redundante.
- [ ] Bloquear exportações sem conteúdo útil em vez de produzir apenas `{}`.
- [ ] Melhorar CSV contendo somente seções.
- [ ] Exibir o nome final do arquivo na prévia.
- [ ] Destacar “Reimportável no Blû” ou “Somente consulta”.
- [ ] Avaliar renderização visual da prévia Markdown.
- [ ] Adicionar debounce para arquivos grandes.
- [ ] Limitar apenas a prévia de arquivos enormes sem truncar o arquivo exportado.
- [ ] Testar todas as combinações de campos, escopos, formatos e estruturas.

### Pesquisa

- [x] Histórico de pesquisas desativado por padrão, registrando somente buscas que produziram resultados.
- [x] Dica inicial e atalho `Alt+H` para ativar ou desativar o histórico.
- [x] Controle para ativar ou desativar o histórico.
- [x] Exclusão individual de buscas recentes.
- [x] Limpar o histórico em “Limpar Tudo” e “Restaurar Configurações”.

### Simplificação do menu

- [x] Adicionar **Opções avançadas** para revelar menus e configurações menos utilizados.
- [x] Manter as ações essenciais visíveis no menu simplificado.
- [x] Preservar o menu completo para usuários existentes durante a migração.
- [x] Evitar que o modo simplificado altere preferências ou desative recursos ocultos.
- [x] Manter as ações de janela acessíveis pelos atalhos `Alt+J` e `Alt+P`.
- [x] Reunir ações destrutivas dentro de Dados, em uma área visualmente separada.

#### Acesso rápido personalizável

- [x] Consolidar revisões internas, atualizações vistas e evidências históricas em `blu:meta`.
- [x] Registrar permanentemente neste navegador se ao menos um link de compartilhamento já foi criado.
- [x] Migrar a evidência a partir do registro antigo do último link compartilhado.
- [x] Limitar o Acesso rápido a quatro posições no topo do menu.
- [x] Manter `Modo de Edição`/`Modo de Organização` e `Nova Seção` nas duas posições fixas.
- [x] Reservar as duas posições restantes para itens fixados pelo usuário.
- [x] Manter `Gerenciar Tags` fixado por padrão.
- [x] Fixar `Compartilhar` durante a migração somente quando houver evidência de link criado.
- [x] Mover `Compartilhar` para `Dados` quando não estiver fixado, sem duplicar a ação.
- [x] Adicionar ao hambúrguer um menu de contexto para gerenciar os itens fixados.
- [x] Permitir fixar ou desfixar ações pelo menu de contexto de cada item elegível.
- [x] Fazer `Redefinir Preferências` recompor os padrões e preservar a evidência de compartilhamento.
- [x] Fazer `Limpar Tudo` apagar preferências, itens fixados e a evidência de compartilhamento.

- [ ] Revisar quais outras opções avançadas também devem permanecer acessíveis pela pesquisa ou por atalhos.
- [x] Apresentar as novidades da reorganização aos usuários.
  - [x] Preparar silenciosamente a tela e o controle de versão vista.
  - [x] Adicionar um acesso manual à tela.
  - [x] Liberar sino e acesso manual na versão 1.9.
  - [x] Atualizar `VERSION`, Marca e Versão visível para `1.9` no fechamento do lançamento.
  - [x] Não abrir automaticamente; sinalizar novidades não lidas com uma animação breve no sino.

### Mobile

> Revisão suspensa temporariamente. Retomar em um ciclo futuro sem bloquear a versão 1.9.

- Continuar testes reais em Android e iOS.
- Revisar tooltips em toque.
- Revisar gestos de movimentação com Pointer Events.
- Manter feedback tátil somente em ações relevantes.

## Backlog

- Toast de desfazer inline para mais tipos de ação.
- Avaliar presets pessoais na Exportação Personalizada.
- Lembrar a última configuração de exportação durante a sessão.
- Descrição contextual dos presets de exportação.
- Atalhos do PWA para nova seção, pesquisa e importação.
- Aviso controlado de nova versão do PWA.
- Revisar quais recursos devem ser levados para a edição Sprinklr.

## Princípios para novos recursos

- Funções extras devem permanecer desativadas visualmente por padrão quando puderem confundir usuários existentes.
- Dados pessoais e métricas ficam em `blu:userdata` e não entram em compartilhamentos comuns.
- `blu:data` deve continuar contendo somente a estrutura compartilhável de seções, botões e tags.
- Ações destrutivas precisam de confirmação e, quando possível, suporte a desfazer.
- Importações devem ser validadas e visualizadas antes de modificar os dados atuais.
- Recursos avançados devem ter um caminho simples para usuários comuns e opções explícitas para usuários avançados.
