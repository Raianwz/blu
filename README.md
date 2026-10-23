# Blû Offline

Versão independente do [Blû](https://github.com/Raianwz/blu), feita para organizar e copiar textos sem depender de conta, servidor ou PWA. Seções, botões e tags ficam salvos no navegador em `blu:offline`.

## Rodar

Abra `index.html` mantendo as pastas `js/` e `assets/` na mesma estrutura, ou sirva a pasta por HTTP:

```bash
python -m http.server 5500
```

Depois acesse [http://localhost:5500](http://localhost:5500). O servidor local oferece uma origem estável para o armazenamento do navegador; em `file://`, a persistência pode variar entre navegadores.

O núcleo funciona sem conexão. O seletor de ícones é opcional: tenta carregar catálogos pelo jsDelivr e fica oculto se eles não estiverem disponíveis. Ícones já presentes em um JSON continuam preservados no backup padrão.

## Dados e compatibilidade

Use **Exportar Backup** para guardar ou transferir seus dados em JSON. A exportação personalizada serve para consulta e pode omitir campos. Ao importar dados do Blû principal, o Offline preserva no backup padrão recursos sem interface local, como itens arquivados e ícones de seção, e avisa sobre as limitações na importação.

Os dados não sincronizam automaticamente. Limpar os dados do navegador remove a cópia local; mantenha um backup externo.

## Arquivos

```text
index.html          Interface
js/bundle.js        Aplicação
assets/style.css    Estilos
assets/blu.svg      Ícone
libs/               Catálogos e SVGs de ícones
```

Para consumir arquivos desta branch pelo jsDelivr, prefira uma tag ou um commit fixo no lugar de uma referência mutável: `https://cdn.jsdelivr.net/gh/Raianwz/blu@<commit>/js/bundle.js`.

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE). As bibliotecas em `libs/` mantêm suas próprias licenças.
