# Blû Offline

Uma versão independente do [Blû](https://github.com/Raianwz/blu) para guardar textos em seções e copiá-los com um clique. Funciona localmente, sem conta, servidor ou PWA. Os dados ficam neste navegador.

**Versão:** 1.7.0 LTS · **Acesse:** [offline.blu.rwz.app](https://offline.blu.rwz.app) ou [blu.rwz.app/sprinklr/](https://blu.rwz.app/sprinklr/)

## Usar no computador

Baixe os arquivos desta branch, mantendo as pastas `js/` e `assets/` ao lado de `index.html`, e abra o HTML. Se preferir uma origem local estável para os dados, rode na pasta:

```bash
python -m http.server 5500
```

Depois abra [localhost:5500](http://localhost:5500). O núcleo funciona sem internet. Em `file://`, a persistência dos dados pode variar conforme o navegador.

## Extras

Com conexão, o Blû tenta carregar pelo jsDelivr recursos opcionais: ícones, cores, visuais Clássico/Novo, ícones de seções, histórico de pesquisas e exportação personalizada. Se algum Extra falhar, as funções básicas continuam disponíveis.

Para testar os Extras desta cópia local, use `?extras=local` no endereço, por exemplo `http://localhost:5500/?extras=local`.

## Seus dados

Seções, botões e preferências são salvos no navegador. Use **Exportar Backup** para guardar um JSON ou transferir os dados; não há sincronização automática. Limpar os dados do site apaga a cópia local.

O backup padrão pode ser transferido entre o Blû principal e o Offline. Na importação, o Offline avisa quando encontra recursos com suporte limitado e preserva esses campos para o próximo backup padrão. A exportação personalizada pode omitir campos e não substitui esse backup.

Distribuído sob a licença [MIT](LICENSE). As bibliotecas em `libs/` mantêm suas próprias licenças.
