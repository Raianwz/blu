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

- Histórico opcional de pesquisas que produziram resultados.
- Controle para ativar ou desativar o histórico.
- Exclusão individual de buscas recentes.
- Limpar o histórico em “Limpar Tudo” e “Restaurar Configurações”.

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
