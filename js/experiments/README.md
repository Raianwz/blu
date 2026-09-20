# Experimentos do Blû

Recursos experimentais ficam separados dos módulos principais até serem considerados estáveis.

## Contrato

- `runtime.js` é a única infraestrutura experimental carregada na inicialização.
- Cada experimento registra `enable()`, `disable()` e, opcionalmente, `hooks`.
- JavaScript e CSS do experimento são carregados apenas quando ele é ativado.
- Toda classe CSS experimental deve ser escopada por uma classe exclusiva no `body`.
- Eventos criados pelo experimento devem poder ser removidos em `disable()`, preferencialmente com `AbortController`.
- Exceções em hooks desativam apenas o experimento que falhou.
- `?safe=1` inicia o Blû sem carregar experimentos.
- Os arquivos de cada experimento não entram no `APP_SHELL` do service worker. Somente o runtime entra no cache principal.

## Promoção

Quando um experimento se tornar estável, sua implementação deve ser movida para o módulo definitivo. Em seguida, seu registro, arquivos e preferência experimental devem ser removidos.
