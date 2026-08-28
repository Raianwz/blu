# Blû

Blû é um painel de textos reutilizáveis organizados em seções e tags. Ele permite criar botões para copiar rapidamente respostas, comandos de RPG, prompts, links ou qualquer conteúdo usado com frequência.

**Acesse:** [blu.rwz.app](https://blu.rwz.app)

## Funcionalidades

- Criação e edição de seções, botões e tags
- Cópia de texto com um clique
- Busca por nome, tag, seção ou conteúdo
- Reordenação de botões e seções
- Menus de contexto para ações rápidas
- Desfazer e refazer alterações
- Tema claro e escuro
- Importação e exportação em JSON
- Diagnóstico e visualização de JSON
- Diagnóstico, normalização e mesclagem de tags
- Compartilhamento temporário por link
- Instalação como PWA e suporte offline
- Janela compacta e pop-out

## Como os dados são armazenados

O Blû não exige conta. Os dados principais ficam no `localStorage` do navegador em uso.

Isso significa que limpar os dados do site, trocar de navegador ou usar outro dispositivo não transfere automaticamente o conteúdo. Exporte regularmente um arquivo JSON para manter um backup externo.

Links de compartilhamento são armazenados temporariamente no Upstash Redis e expiram após três dias.

### Sobre a criptografia

Exportações podem ser ofuscadas com AES-GCM, e compartilhamentos são enviados ao servidor nesse formato. Entretanto, a chave é fixa e está presente no código-fonte.

Essa funcionalidade protege contra leitura casual, mas **não deve ser considerada segurança criptográfica real**. Não utilize o Blû para armazenar segredos, senhas ou informações altamente sensíveis.

## Executar localmente

O projeto principal não possui etapa de build. Sirva a pasta por HTTP e abra o endereço informado pelo servidor.

Exemplo com Python:

```bash
python -m http.server 5500
```

Depois, acesse:

```text
http://localhost:5500
```

Também é possível usar extensões como Live Server.

> O compartilhamento por link depende das Vercel Functions e das variáveis de ambiente do Upstash, portanto não funciona integralmente em um servidor estático local.

## Stack

- HTML, CSS e JavaScript puro
- Web Crypto API
- `localStorage`
- Service Worker e Web App Manifest
- Vercel Functions
- Upstash Redis e Upstash Ratelimit

O projeto não utiliza framework nem processo de build no front-end. Essa é uma decisão deliberada para preservar simplicidade, portabilidade e facilidade de manutenção.

## Estrutura resumida

```text
.
├── index.html            # Aplicação principal
├── share.html            # Importação de links compartilhados
├── assets/               # CSS, identidade e ícones
├── js/                   # Módulos do front-end
├── api/                  # Funções serverless de compartilhamento
├── manifest.json         # Configuração da PWA
├── vercel.json           # Rotas e cabeçalhos do deploy
└── package.json          # Dependências das funções serverless
```

## Limitações conhecidas

- O drag-and-drop utiliza a API HTML5 e ainda não oferece suporte completo a dispositivos touch.
- Não há contas ou sincronização automática entre dispositivos.
- A classificação `private` é visual; botões privados continuam incluídos em exportações e compartilhamentos.
- A criptografia disponível é ofuscação, não proteção adequada para dados sensíveis.

## Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE) para mais informações.
