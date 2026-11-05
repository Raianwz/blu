# JavaScript

Os scripts do Blû ainda são clássicos e compartilham o escopo global. O
`index.html` carrega `js/loader.js`. O loader carrega os scripts essenciais na
ordem atual e inicia `js/app.js`. Depois que o app sinaliza `BluCoreReady`,
carrega os recursos opcionais. A falha de um opcional não impede o uso do app;
seus controles ficam ocultos. O loader emite `blu:optional-status` com
`{ id, loaded }` para cada opcional.
Eventos emitidos antes de um opcional carregar devem ter também um estado
consultável; a checagem de atualização usa `BluUpdateCheckComplete` para isso.
O app emite `blu:preferences-reset` e `blu:prepare-popout-clone` para que
integrações sazonais possam atualizar seu estado e remover efeitos transitórios
da cópia do pop-out. O Halloween está arquivado em `../libs/events/halloween/`.

## Estrutura

- `core/`: infraestrutura e utilitários compartilhados, como armazenamento,
  criptografia e diagnóstico.
- `data/`: leitura, alteração, importação e exportação dos dados da aplicação.
- `features/`: comportamentos completos disponibilizados ao usuário.
- `../libs/events/`: recursos sazonais, com CSS, JavaScript e imagens agrupados por evento.
- `../libs/experiments/`: runtime e recursos experimentais carregados sob demanda.
- `ui/`: renderização e componentes de interação reutilizáveis.
- `app.js`: inicialização e coordenação geral da aplicação.
- `loader.js`: lista scripts essenciais e opcionais e coordena a inicialização.
- `service-worker.js`: cache offline e ciclo de vida do PWA.

Os opcionais atuais são depuração, experimentos, diagnóstico JSON, exportação
personalizada, ações rápidas, Vice City e novidades. Os demais continuam
essenciais porque ainda há chamadas diretas entre eles. Exemplos: `storage.js`
chama a busca ao restaurar dados; `render.js` usa os catálogos de ícones e o
seletor de aparência; `app.js` usa o painel de conteúdo; `crud.js` usa as opções
de compartilhamento. A próxima etapa para reduzir o núcleo é explicitar essas
interfaces antes de mover mais arquivos para a lista opcional.

Ao adicionar ou mover um script essencial, atualize também o `APP_SHELL` de
`service-worker.js` e incremente `CACHE_VERSION` quando caminhos antigos
precisarem ser invalidados. Recursos opcionais são armazenados pelo cache de
execução quando forem acessados, sem participar da instalação do PWA.
