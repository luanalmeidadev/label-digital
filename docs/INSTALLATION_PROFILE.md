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
`config/installation/presets/label.ts`. Ele possui `schemaVersion: 2` e
`preset.version: 2`, e reproduz os valores atualmente encontrados no código:

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
nome, contato, endereço, horários, regiões e modalidades. O preset é o fallback
local e não substitui alterações já feitas no admin ou em `store_settings`.

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

- cores hardcoded e tokens com namespace La'Bel;
- horários e cidades de fallback em `config/store.ts`;
- descrições do catálogo e o fluxo de encomendas específicos de confeitaria;
- textos operacionais que não representam identidade institucional;
- namespaces técnicos de Auth e localStorage;
- configuração operacional armazenada em `store_settings` e tabelas auxiliares.

As cores gerais continuam propositalmente fora desta fase. Somente metadata,
manifest, Open Graph e branding central leem o tema do perfil. Não se deve
interpretar esta integração como white-label completo ou como desacoplamento
dos módulos.

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
`defineInstallationProfile` e possuir identificador e versão próprios. Antes
disso, será necessário definir como a instalação ativa é selecionada e criar
testes de caracterização equivalentes. Não se deve copiar o repositório, criar
uma branch permanente por cliente ou introduzir condicionais pelo nome da
empresa.
