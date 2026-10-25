# JavaScript

Os scripts do Blû ainda são clássicos e compartilham o escopo global. O
`index.html` carrega `js/loader.js`, que mantém a ordem necessária e inicia
`js/app.js` depois dos demais. Preserve essa ordem até uma futura migração
para módulos.

## Estrutura

- `core/`: infraestrutura e utilitários compartilhados, como armazenamento,
  criptografia e diagnóstico.
- `data/`: leitura, alteração, importação e exportação dos dados da aplicação.
- `features/`: comportamentos completos disponibilizados ao usuário.
- `ui/`: renderização e componentes de interação reutilizáveis.
- `app.js`: inicialização e coordenação geral da aplicação.
- `loader.js`: lista e carrega os scripts na ordem necessária.
- `service-worker.js`: cache offline e ciclo de vida do PWA.

Ao adicionar ou mover um script carregado pela página principal, atualize também
o `APP_SHELL` de `service-worker.js` e incremente `CACHE_VERSION` quando caminhos
antigos precisarem ser invalidados.
