# Blû Offline

Versão atual: **1.7.0 LTS**.

Versão independente do [Blû](https://github.com/Raianwz/blu), feita para organizar e copiar textos sem depender de conta, servidor ou PWA. Seções, botões e tags ficam salvos no navegador em `blu:offline`.

## Rodar

Abra `index.html` mantendo as pastas `js/` e `assets/` na mesma estrutura, ou sirva a pasta por HTTP:

```bash
python -m http.server 5500
```

Depois acesse [http://localhost:5500](http://localhost:5500). O servidor local oferece uma origem estável para o armazenamento do navegador; em `file://`, a persistência pode variar entre navegadores.

O núcleo funciona sem conexão. Os **Extras** são opcionais: o aplicativo busca `js/extras-loader.js` pelo jsDelivr, e ele carrega o JS e o CSS de cada módulo. O extra de ícones busca os catálogos de `libs/` pelo jsDelivr a partir da branch `blu/offline`, com fallback para os pacotes oficiais de Bootstrap e Material. O extra de cores oferece a paleta de botões do Blû principal: o padrão é o gradiente no Clássico e o roxo no Novo; a outra opção fica disponível no seletor. O extra de visual alterna os botões entre Clássico (gradientes e emojis) e Novo (cores sólidas e indicadores SVG). No Clássico, as seções mostram os emojis escritos no começo do nome. No Novo, o extra de ícones das seções permite escolher SVGs ao editar uma seção e oculta o emoji inicial na tela, sem removê-lo do nome salvo. Se o carregador ou um extra não abrir, o núcleo continua funcionando. Cores já salvas continuam aparecendo nos botões, e os dados dos extras permanecem no backup padrão.

Para testar o carregador, os módulos e os catálogos desta pasta sem publicar no CDN, abra `index.html?extras=local` (ou `http://localhost:5500/?extras=local`). Sem esse parâmetro, todos os Extras são buscados pelo jsDelivr.

## Dados e compatibilidade

Use **Exportar Backup** para guardar ou transferir seus dados em JSON. A exportação personalizada serve para consulta e pode omitir campos. Ao importar dados do Blû principal, o Offline preserva no backup padrão recursos sem interface local, como itens arquivados, e avisa sobre as limitações na importação. Os ícones de seção importados aparecem no visual Novo quando o extra e o catálogo correspondente carregam.

Os dados não sincronizam automaticamente. Limpar os dados do navegador remove a cópia local; mantenha um backup externo.

## Arquivos

```text
index.html          Interface
js/bundle.js        Aplicação
js/extras-loader.js Carregador opcional de Extras
js/extra/icons.js  Módulo opcional de ícones
js/extra/button-colors.js Módulo opcional de cores
js/extra/button-visual.js Módulo opcional dos visuais dos botões
js/extra/section-icons.js Módulo opcional de ícones das seções
assets/style.css    Estilos
assets/extra/icons.css Estilos opcionais dos ícones
assets/extra/button-colors.css Estilos opcionais das cores
assets/extra/button-visual.css Estilos opcionais dos visuais
assets/extra/section-icons.css Estilos opcionais dos ícones das seções
assets/blu.svg      Ícone
libs/               Catálogos e SVGs de ícones
```

Os arquivos publicados nesta branch podem ser consumidos pelo jsDelivr com `@blu%2Foffline`, por exemplo: `https://cdn.jsdelivr.net/gh/Raianwz/blu@blu%2Foffline/js/bundle.js`. Para uma versão imutável, use uma tag ou um commit no lugar do nome da branch.

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE). As bibliotecas em `libs/` mantêm suas próprias licenças.
