# Roadmap do Blû

Este documento reúne recursos planejados, polimentos e decisões de produto ainda não concluídas. Ele deve ser atualizado quando uma ideia for implementada, descartada ou reformulada.

## Em desenvolvimento

### Histórico de atividade

Registrar em `blu:userdata` as alterações estruturais feitas no Blû, sem misturá-las aos dados compartilháveis de `blu:data`.

Eventos previstos:

- Botão criado, editado, removido, restaurado e duplicado.
- Seção criada, editada, removida, restaurada e duplicada.
- Botão transferido de uma seção para outra.
- Botão reordenado dentro da mesma seção.
- Seção reordenada.
- Resumo das propriedades alteradas durante uma edição.

Decisões:

- Usar SVGs consistentes com a interface do Blû.
- Diferenciar transferência `⇄` de reordenação `↕`.
- Manter um retrato mínimo do nome e da seção para itens já removidos.
- Mostrar os eventos recentes nas Estatísticas e o histórico completo em uma janela própria.
- Permitir filtros por alvo e ação.
- Agrupar eventos por data.
- Limitar o histórico aos 500 eventos mais recentes.
- Limpar o histórico sem apagar métricas, favoritos ou botões.
- Registrar restauração quando uma remoção for desfeita.

Polimentos pendentes:

- Testar todos os movimentos com mouse, toque e controles de organização.
- Avaliar detalhes expansíveis para edições.
- Avaliar a apresentação de valores anteriores e posteriores para campos curtos.
- Revisar como eventos de refazer devem aparecer.

## Próximos recursos

### Arquivar botões e seções

Fundação do recurso:

- [x] Adicionar `archived.buttons` e `archived.sections` ao estado principal.
- [x] Normalizar e sanitizar itens arquivados vindos de backups.
- [x] Incluir arquivados em autosave, snapshots, desfazer/refazer e detecção de backup pendente.
- [x] Reconhecer o schema no diagnóstico de JSON.
- [x] Criar ações de arquivar, restaurar e excluir definitivamente.
- [x] Criar a tela de Arquivados com abas para botões e seções.
- [x] Incluir arquivados por padrão no backup completo.
- [ ] Adicionar “Incluir itens arquivados?” aos compartilhamentos e às exportações personalizadas.
- [x] Manter arquivados fora da pesquisa e da tela inicial comuns.

### Descontinuação dos Favoritos — antecipada

Migração antecipada para abrir espaço ao recurso Arquivar.

Comportamento após a descontinuação:

- [x] Impedir a inclusão de novos favoritos.
- Manter a leitura dos favoritos já existentes nos dados locais e em JSONs antigos.
- [x] Exibir os favoritos existentes somente na tela de **Estatísticas**, enquanto houver itens legados.
- [x] Continuar permitindo a remoção individual e o desfazer com `Ctrl+Z`.
- [x] Remover a prateleira de Favoritos da tela inicial.
- [x] Remover as opções “Favoritos na Tela Inicial” e “Favoritar pelo Menu”.
- Não incluir o campo ou estado de favorito em novos JSONs exportados.
- Preservar a compatibilidade de importação com arquivos e backups antigos que contenham favoritos.
- Não apagar automaticamente os favoritos existentes; mantê-los até que o usuário os remova.

Cuidados de implementação:

- Separar a ação atual de alternância entre inclusão e remoção, bloqueando apenas a inclusão.
- Garantir que a importação de dados antigos não reative controles de inclusão descontinuados.
- Revisar os presets, escopos e campos da Exportação Personalizada relacionados a Favoritos.
- Atualizar textos de backup, ajuda e interface que ainda mencionem a criação ou exportação de favoritos.

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

- Renomear o item do menu para “Exportação Personalizada” ou “Exportação Avançada”.
- Na aba de prévia, substituir “Visualizar” por “Voltar para configurar” ou ocultar o botão redundante.
- Bloquear exportações sem conteúdo útil em vez de produzir apenas `{}`.
- Melhorar CSV contendo somente seções.
- Exibir o nome final do arquivo na prévia.
- Destacar “Reimportável no Blû” ou “Somente consulta”.
- Avaliar renderização visual da prévia Markdown.
- Adicionar debounce para arquivos grandes.
- Limitar apenas a prévia de arquivos enormes sem truncar o arquivo exportado.
- Testar todas as combinações de campos, escopos, formatos e estruturas.

### Pesquisa

- [x] Histórico de pesquisas desativado por padrão, registrando somente buscas que produziram resultados.
- [x] Dica inicial e atalho `Alt+H` para ativar ou desativar o histórico.
- [x] Controle para ativar ou desativar o histórico.
- [x] Exclusão individual de buscas recentes.
- [x] Limpar o histórico em “Limpar Tudo” e “Restaurar Configurações”.

### Simplificação do menu

- Avaliar um **Modo avançado** que revele menus e configurações menos utilizados.
- Manter as ações essenciais visíveis para usuários comuns.
- Definir quais configurações avançadas devem permanecer acessíveis pela pesquisa ou por atalhos.
- Evitar que a mudança altere preferências já configuradas quando o modo avançado estiver desligado.

### Mobile

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
