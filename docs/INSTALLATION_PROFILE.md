# Installation Profile

O Installation Profile é o contrato público e tipado que descreve uma
instalação individual do Label Digital. Ele inicia a separação entre o core do
produto e os dados de uma marca sem transformar o sistema em multi-tenant e sem
criar uma aplicação diferente por segmento.

## Core, Profile e Preset

- **Core:** catálogo, pedidos, clientes, caixa, relatórios, segurança e demais
  regras compartilhadas por todas as instalações.
- **Installation Profile:** contrato versionado de identidade, tema, contato,
  endereço, regionalização, SEO, conteúdo público, dados legais e módulos.
- **Preset:** valores iniciais validados para uma instalação ou segmento. Um
  preset fornece dados ao contrato; ele não cria branches ou componentes
  exclusivos.

O contrato está em `config/installation/types.ts`, a validação em
`config/installation/validate.ts` e a resolução pública única em
`config/installation/public.ts`.

## Preset La'Bel

O preset compatível atual fica em
`config/installation/presets/label.ts`. Ele possui `schemaVersion: 3` e
`preset.version: 3`, e reproduz os valores atualmente encontrados no código:

- identidade, assets e paleta La'Bel;
- WhatsApp e Instagram;
- endereço de fallback;
- `pt-BR`, `BRL` e `America/Sao_Paulo`;
- SEO, Open Graph, Hero, textos de retirada/entrega, chamadas de encomendas e
  dados legais atuais;
- todos os módulos usados hoje marcados como habilitados.

Todos os dados do perfil atual são públicos. Secrets de Supabase, Turnstile,
Sentry, SMTP ou qualquer outro provedor não pertencem a esse contrato e devem
continuar exclusivamente em variáveis server-side. Ainda não existe uma camada
privada de instalação porque esta fase não precisa dela.

## Resolução e compatibilidade

`getPublicInstallationProfile()` é a entrada única para consumidores públicos.
Ela delega a seleção a `config/installation/resolve.ts`. A instalação La'Bel é
sempre o padrão seguro.
As seguintes áreas já estão conectadas ao perfil:

1. os fallbacks de `config/store.ts` para nome, contatos, endereço e
   modalidades;
2. `BrandLogo`, mantendo o mesmo logo creme, dimensões e texto alternativo;
3. metadata global, viewport, manifest PWA, JSON-LD e imagem Open Graph;
4. Hero, chamadas públicas de encomendas, estados vazios e identidade das
   telas de autenticação;
5. mensagens institucionais de pedidos e WhatsApp, sem alterar o fluxo manual
   de envio;
6. cabeçalhos e rodapés das impressões de pedido, encomenda e caixa;
7. título e nome seguro dos arquivos CSV de relatório;
8. aviso de privacidade e seu contato;
9. páginas de erro e identidade textual principal do administrativo.

`lib/installation-presentation.ts` concentra transformações de apresentação
que não pertencem aos componentes, como metadata, Schema.org, endereço,
relatórios e textos legais. `lib/site-url.ts` exige `SITE_URL` válida na
produção da Vercel; o fallback para localhost é restrito ao fluxo local e
previews podem usar a URL fornecida pela Vercel.

`lib/public-store-settings.ts` continua sendo a fonte operacional do banco para
nome, contato, endereço, horários, regiões e modalidades da La'Bel. Presets de
demonstração usam seus próprios dados fictícios e não consultam essa identidade
operacional, evitando que a marca La'Bel apareça durante a validação local.

## Tema semântico

O tema efetivo é aplicado no elemento `html` por meio de dez variáveis CSS:

- `primary`, `primary-foreground` e `primary-hover`;
- `secondary`;
- `background`, `surface` e `surface-muted`;
- `foreground` e `muted-foreground`;
- `border`.

`config/installation/theme.ts` converte o tema do perfil nas variáveis
`--installation-*`. `app/globals.css` as expõe ao Tailwind com utilitários como
`bg-brand-primary`, `text-brand-foreground` e `border-brand-border`. Estados
funcionais de sucesso, erro, alerta e informação continuam com suas cores
semânticas próprias e não devem ser tratados como branding.

## Preset de validação demo-burger

`config/installation/presets/demo-burger.ts` é fictício e existe somente para
provar que o mesmo core troca identidade, tema, textos, contatos, endereço e SEO
sem editar componentes. Ele não implementa catálogo, adicionais ou fluxos
específicos de hamburgueria.

Para executar localmente no PowerShell:

```powershell
$env:NEXT_PUBLIC_INSTALLATION_PRESET="demo-burger"
npm.cmd run dev
```

Para voltar ao padrão La'Bel:

```powershell
Remove-Item Env:NEXT_PUBLIC_INSTALLATION_PRESET
npm.cmd run dev
```

O identificador do preset é público e não contém secrets. O resolver rejeita
explicitamente qualquer preset diferente de `label` quando `NODE_ENV` é
`production`, portanto uma build de produção não pode selecionar o demo por
engano. Não existe seletor no painel administrativo.

## Manifesto de demonstração da Platform

O Core também pode receber o contrato público versionado que a Label Digital
Platform exporta. O fluxo usa o mesmo resolvedor de instalação:

```text
defaults do Core < preset conhecido < overrides permitidos do manifesto
```

O manifesto não substitui o preset e não pode declarar módulos, catálogo,
secrets, variáveis, comandos, SQL ou caminhos do sistema. Ele altera somente
nome, slug, duas cores de marca, contatos e localização. Assets continuam no
preset porque a versão 1 atualmente emitida pela Platform não inclui logo; isso
evita download de arquivo remoto arbitrário e mantém um fallback seguro.

`config/installation/platform-manifest.mjs` contém a validação runtime e
`config/installation/platform-manifest.d.mts` descreve o contrato tipado.
`config/installation/platform-manifest-profile.ts` aplica a lista fechada de
overrides, e `config/installation/resolve.ts` continua sendo a única camada que
produz o Installation Profile efetivo.

O manifesto só é aceito em desenvolvimento, testes ou em modo local explícito
com URL do Supabase apontando para `localhost`/`127.0.0.1`. Uma execução normal
de produção o rejeita. O procedimento completo e o comando estão documentados
em `docs/PLATFORM_DEMO_MANIFEST.md`.

## Módulo de encomendas

Encomendas é o primeiro módulo declarativo que passou a ser respeitado pelo
Core. `config/installation/modules.ts` é a API central para consultar flags,
validar acesso e decidir se consultas dependentes devem ser executadas. Rotas
server-side usam `lib/installation-modules-server.ts`; componentes não devem
comparar diretamente o identificador de um preset.

Com `preorders: false`, o Core remove os CTAs públicos, navegação e abas
administrativas, métricas, faturamento de encomendas, sitemap, robots, health
check e recursos de backup relacionados. As rotas públicas e administrativas
do módulo respondem como não encontradas, e as Server Actions recusam acesso
antes de consultar catálogo ou Storage. `preorderSchedule` depende de
`preorders` e possui proteção adicional para o calendário.

O preset `label` mantém as duas flags ativas. O `demo-burger` mantém ambas
desativadas. O código, os dados e os Storages do módulo continuam instalados no
Core; desligar uma flag não remove nem migra dados.

Scripts Node usam `config/installation/module-presets.mjs` como fonte das
mesmas flags, evitando exigir o bucket `preorder-catalog` em instalações sem
Encomendas. Demais módulos continuam apenas declarativos nesta fase.

## Divergências encontradas

- o código alternava `La'Bel` e `La'bel`; o perfil usa a grafia exibida nos
  principais pontos públicos: `La'Bel`;
- a migration deixa os campos de endereço nulos, enquanto `config/store.ts`
  contém Rua Capitão Augusto Vidal, 3600, Palhoça/SC; o fallback foi preservado;
- bairro, complemento e CEP da loja não existem nas fontes locais e permanecem
  nulos no perfil;
- `config/brand.ts` apontava para `/brand/logo.svg`, que não existe; o adapter
  agora referencia os assets reais sem alterar o logo atualmente renderizado;
- valores atuais de produção em `store_settings` não foram consultados nesta
  tarefa para evitar acesso ao Supabase remoto.

## O que ainda não foi migrado

A aplicação ainda não é totalmente white-label. Permanecem temporariamente:

- tons auxiliares ainda hardcoded que não fazem parte da paleta mínima de marca;
- horários e cidades de fallback em `config/store.ts`;
- descrições do catálogo e o fluxo de encomendas específicos de confeitaria;
- textos operacionais que não representam identidade institucional;
- namespaces técnicos de Auth e localStorage;
- configuração operacional armazenada em `store_settings` e tabelas auxiliares.

As cores principais de marca nas lojas pública, autenticação, administrativo,
componentes compartilhados, botões, badges e impressões já consomem os tokens.
Tons auxiliares usados em formulários e superfícies específicas permanecem
temporariamente literais para evitar ampliar o contrato ou produzir alterações
visuais acidentais. O favicon file-based em `app/icon.svg` também permanece
estático; manifest, logos e Open Graph já leem o perfil. Não se deve interpretar
esta integração como white-label completo, catálogo multissegmento ou
desacoplamento completo dos módulos.

## Regra para novos hardcodes

Nome da empresa, nome curto, slogan, contatos, endereço, localidade, logos,
ícones, metadata, identidade de relatórios e textos institucionais não devem
ser adicionados diretamente a componentes. Esses valores devem ser incluídos
no contrato quando realmente fizerem parte de todas as instalações e lidos por
`getPublicInstallationProfile()` ou por um helper de apresentação.

Dados operacionais editáveis pelo administrativo continuam vindo de
`store_settings`; o perfil atua como identidade e fallback local. Strings de
domínio específicas do catálogo de confeitaria devem permanecer no módulo até
a futura definição de presets de conteúdo. Namespaces técnicos persistidos não
devem ser renomeados sem uma migração de compatibilidade.

## Presets futuros

Um novo preset deverá implementar o mesmo `InstallationProfile`, passar por
`defineInstallationProfile`, possuir identificador e versão próprios e ser
registrado no resolver. Presets comerciais futuros precisarão de uma estratégia
de seleção própria para cada instalação; a variável pública atual é deliberada
e restrita ao desenvolvimento/teste. Não se deve copiar o repositório, criar
uma branch permanente por cliente ou introduzir condicionais pelo nome da
empresa.
