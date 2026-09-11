# JavaScript

Os scripts do Blû ainda são carregados como scripts clássicos e compartilham o
escopo global. Por isso, a ordem declarada em `index.html` é intencional e deve
ser preservada até uma futura migração para módulos.

## Estrutura

- `core/`: infraestrutura e utilitários compartilhados, como armazenamento,
  criptografia e diagnóstico.
- `data/`: leitura, alteração, importação e exportação dos dados da aplicação.
- `features/`: comportamentos completos disponibilizados ao usuário.
- `ui/`: renderização e componentes de interação reutilizáveis.
- `app.js`: inicialização e coordenação geral da aplicação.
- `service-worker.js`: cache offline e ciclo de vida do PWA.

Ao adicionar ou mover um script carregado pela página principal, atualize também
o `APP_SHELL` de `service-worker.js` e incremente `CACHE_VERSION` quando caminhos
antigos precisarem ser invalidados.
