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
`config/installation/presets/label.ts`. Ele possui `schemaVersion: 1` e
`preset.version: 1`, e reproduz os valores atualmente encontrados no código:

- identidade, assets e paleta La'Bel;
- WhatsApp e Instagram;
- endereço de fallback;
- `pt-BR`, `BRL` e `America/Sao_Paulo`;
- SEO, Hero, textos de retirada/entrega e dados legais atuais;
- todos os módulos usados hoje marcados como habilitados.

Todos os dados do perfil atual são públicos. Secrets de Supabase, Turnstile,
Sentry, SMTP ou qualquer outro provedor não pertencem a esse contrato e devem
continuar exclusivamente em variáveis server-side. Ainda não existe uma camada
privada de instalação porque esta fase não precisa dela.

## Resolução e compatibilidade

`getPublicInstallationProfile()` é a entrada única para consumidores públicos.
Nesta primeira fase, apenas pontos de baixo risco foram conectados:

1. os fallbacks de `config/store.ts` para nome, contatos, endereço e
   modalidades;
2. `BrandLogo`, mantendo o mesmo logo creme, dimensões e texto alternativo;
3. o manifest PWA, mantendo nome, descrição, cores, locale e ícone atuais.

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

- metadata do layout, JSON-LD, Open Graph gerado e textos legais renderizados;
- textos do Hero, encomendas, mensagens de WhatsApp, impressões e CSV;
- cores hardcoded e tokens com namespace La'Bel;
- horários e cidades de fallback em `config/store.ts`;
- catálogo e fluxo de encomendas específicos de confeitaria;
- namespaces técnicos de Auth e localStorage;
- configuração operacional armazenada em `store_settings` e tabelas auxiliares.

## Presets futuros

Um novo preset deverá implementar o mesmo `InstallationProfile`, passar por
`defineInstallationProfile` e possuir identificador e versão próprios. Antes
disso, será necessário definir como a instalação ativa é selecionada e criar
testes de caracterização equivalentes. Não se deve copiar o repositório, criar
uma branch permanente por cliente ou introduzir condicionais pelo nome da
empresa.
