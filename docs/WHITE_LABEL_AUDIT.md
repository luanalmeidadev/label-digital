# Auditoria white-label do Label Digital

**Data da auditoria:** 26/08/2026  
**Base auditada:** branch `homologacao`, em `E:\Documents\label-digital`  
**Escopo comercial considerado:** uma instalação isolada por cliente, sem multi-tenancy e sem billing na aplicação.

## Resumo executivo

O Label Digital já possui um **core operacional relevante e maduro para um piloto de empresa única**: cardápio, carrinho, pedidos, clientes, entrega/retirada, pagamentos, caixa, estornos, perdas, faturamento, relatórios, usuários, permissões, auditoria, impressão, rastreamento, segurança pública, monitoramento e rotinas de backup. A separação de Supabase/Vercel por cliente é compatível com a arquitetura atual e evita que a primeira fase comercial dependa de multi-tenancy.

Para se tornar uma base white-label replicável, o projeto está aproximadamente **50% pronto**. O principal trabalho não é reescrever o sistema: é retirar identidade e comportamento de negócio espalhados pelo código, definir fronteiras reais de módulos, tornar a instalação reproduzível e evoluir o modelo de catálogo/pedido para opções comuns em alimentação.

### Cinco maiores bloqueadores

1. **Branding e linguagem La'Bel espalhados** por metadata, páginas, mensagens, impressões, CSS e assets, com 43 cores hexadecimais em runtime e 1.802 ocorrências em 75 arquivos.
2. **Não existe um registro central de módulos**; encomendas atravessam navegação, home, saúde, backup, faturamento, visão geral, permissões e Storage. Ocultar o menu não desativa o recurso.
3. **Produto e item de pedido são simples demais** para hamburgueria, pizzaria, açaí e marmitaria: não há variações, grupos de opções, adicionais, combos, meio a meio ou snapshot de escolhas.
4. **Encomendas usam arquivos JSON no Storage**, inclusive catálogo, pedidos, ajustes de imagem e numeração, sem o modelo relacional, transações, consultas e auditoria do restante do sistema.
5. **Provisionamento por instalação ainda é manual e incompleto**: o seed configurado não existe, buckets não são declarativos, Auth/SMTP/templates dependem do painel e o backup não inclui todas as tabelas operacionais atuais.

### Primeiro conjunto de alterações recomendado

Sem mudar comportamento da La'Bel, a primeira entrega deve:

1. criar um contrato tipado de configuração da instalação, alimentado inicialmente pelos dados existentes e com o preset atual da La'Bel como compatibilidade;
2. centralizar identidade, contatos, locale, textos públicos, SEO, assets e tema;
3. criar um registro de módulos com dependências e usar o preset La'Bel com todos os recursos atuais habilitados;
4. tornar metadata, manifest, logos, mensagens, relatórios e impressões consumidores dessa configuração;
5. criar provisionamento idempotente e validável para uma instalação limpa, incluindo seed/preset, buckets, checklist de Auth/SMTP e backup completo.

### O que não fazer agora

- não adicionar `tenant_id`, organizações ou isolamento multi-tenant;
- não criar billing ou planos dentro do produto;
- não criar forks por segmento ou por cliente;
- não duplicar páginas para cada preset;
- não reescrever o sistema inteiro nem substituir o modelo de pedidos antes de estabilizar configuração e módulos;
- não migrar encomendas do Storage sem backup, compatibilidade de leitura e plano de reconciliação;
- não transformar toda particularidade da confeitaria em conceito genérico à força.

### Complexidade por fase

| Fase | Complexidade |
|---|---|
| Contrato de instalação e configuração central | Média |
| Tema, assets, textos, SEO e documentos | Média/alta |
| Registro de módulos e desacoplamento | Alta |
| Provisionamento, presets e validação de instalação | Média |
| Variações, grupos de opções e snapshots de pedido | Alta |
| Migração relacional das encomendas | Alta |
| Primeiro cliente externo e rotina de atualização | Média |

# 1. Estado atual

## Arquitetura observada

- Next.js 16.3, React 19, TypeScript, Tailwind 4 e componentes Base UI/shadcn.
- Supabase para PostgreSQL, Auth, Realtime e Storage.
- Sentry para erros e disponibilidade; Turnstile nas ações públicas.
- Vercel e domínio configurados externamente.
- Duas linhas comerciais na mesma aplicação:
  - venda diária/caixa, baseada em tabelas relacionais;
  - encomendas de confeitaria, baseada principalmente em JSON no Storage.
- Administração com papéis `admin` e `attendant` e permissões verificadas no servidor e no RLS.
- Fluxo de homologação e produção já existe, mas parte da configuração continua externa/manual.

## Diagnóstico de proximidade

| Dimensão | Estado | Avaliação |
|---|---|---|
| Core de operação | Amplo e funcional | Forte |
| Segurança de instalação única | RLS, autorização server-side e validações recentes | Forte |
| Identidade configurável | Parcial; contatos/endereço estão no banco, branding não | Fraco |
| Modularidade | Permissões existem, feature flags não | Fraco |
| Catálogo multissegmento | Produto simples e encomenda especializada | Fraco |
| Replicação de instalação | Variáveis e migrations existem; seed e configurações externas não estão fechados | Médio/fraco |
| Manutenção sem forks | Possível, mas ainda sem contrato de configuração/presets | Médio |

## Achados estruturais

| Arquivo | Componente/função | Problema atual | Classificação | Alteração sugerida | Prioridade |
|---|---|---|---|---|---|
| `README.md:1-36` | Documentação raiz | Ainda é majoritariamente o README padrão do Next.js; não documenta instalação do produto. | Infraestrutura | Substituir por documentação do core, setup isolado e ciclo de release. | P1 |
| `services/*.ts`, `data/mock-products.ts` | Camadas vazias | Cinco arquivos de arquitetura estão vazios e sem uso, confundindo a fonte de verdade. | Manutenção | Remover ou preencher somente quando houver uma fronteira de domínio definida. | P2 |
| `package.json:1-18` | Scripts | Há qualidade e backup, mas não há comando de bootstrap/preset ou validação de instalação. | Infraestrutura | Criar depois um fluxo idempotente de provisionamento e verificação. | P0 |

# 2. Core genérico

As funcionalidades abaixo podem servir, com pouca ou nenhuma adaptação conceitual, a praticamente qualquer pequeno negócio de alimentação.

| Capacidade | Implementação atual | Classificação | Observação para o core | Prioridade |
|---|---|---|---|---|
| Categorias | `categories`; `app/admin/(dashboard)/categorias`; `CategoryGrid` | Core genérico | Ordenação, ativação e navegação são reutilizáveis. | P1 |
| Produtos | `products`; `app/admin/(dashboard)/produtos`; `MenuSections` | Core genérico | CRUD, disponibilidade, destaque, imagem e ordenação são úteis; modelo de opções precisa evoluir. | P0 |
| Carrinho | `components/store/CartProvider.tsx`, `CartDrawer.tsx` | Core genérico | Persistência local e totais são reutilizáveis; identidade do item precisa incluir opções. | P0 |
| Checkout | `components/store/CheckoutDrawer.tsx`; `app/store/checkout/actions.ts` | Core genérico | Cliente, entrega/retirada, pagamento, segurança e precificação server-side são boa base. | P1 |
| Pedidos | `orders`, `order_items`; admin de pedidos | Core genérico | Estados e canais online/caixa são reaproveitáveis. | P1 |
| Clientes e endereços | `customers`, `addresses`; admin de clientes | Core genérico | Telefone único, histórico e endereços servem a todos os segmentos. | P2 |
| Entrega e retirada | `delivery_zones`, `business_hours`, `store_settings`; admin de entregas | Core genérico modular | Deve respeitar flags por instalação. | P1 |
| Pagamentos | `payment_method`, `order_payments`, dinheiro/Pix/débito/crédito/misto | Core genérico | Deve permitir subconjunto de meios aceitos por instalação. | P1 |
| Caixa | `cash_sessions`, `cash_movements`, `CashRegisterPOS`, `CashSessionControls` | Core genérico modular | Venda presencial, entradas, saídas, fechamento e formas de pagamento são reutilizáveis. | P1 |
| Estornos e perdas | `order_refunds`, `product_losses` | Core genérico modular | Reutilizável; perdas futuras devem suportar variante/insumo. | P2 |
| Financeiro | `app/admin/(dashboard)/faturamento` | Core genérico modular | Precisa parar de depender diretamente de encomendas. | P1 |
| Relatórios | `app/admin/(dashboard)/relatorios`; `lib/admin-reporting.ts` | Core genérico modular | Vendas, canais, meios, produtos, estornos e perdas são genéricos. | P1 |
| Usuários e permissões | Auth, `admin_profiles`, `lib/admin-permissions.ts` | Core genérico | O namespace interno pode ser neutralizado sem mudar a segurança. | P2 |
| Auditoria | `admin_audit_logs`, triggers e `recordAdminAudit` | Core genérico | Deve cobrir todos os módulos e configurações. | P1 |
| Impressão | comandas de pedido, caixa e encomenda | Core genérico com templates | Layout e identidade devem vir da instalação; dados específicos ficam no módulo. | P1 |
| Rastreamento | `/pedido/[id]`, token HMAC e Realtime | Core genérico modular | Bom recurso opcional para pedidos online. | P2 |
| Segurança pública | Turnstile, idempotência, validações, limite de ações | Core genérico | Deve continuar obrigatório nas ações públicas habilitadas. | P0 |
| Saúde e observabilidade | `/api/health`, Sentry, monitor de uptime | Core genérico | Checks devem ser compostos conforme módulos habilitados. | P1 |

# 3. Dependências específicas da La'Bel

A busca agrupada encontrou **191 ocorrências de nomes/identificadores da marca em 51 arquivos**. O número inclui nomes técnicos como `label-digital`; não significa que todas devam ser renomeadas imediatamente.

| Arquivo | Componente/função | Problema atual | Classificação | Alteração sugerida | Prioridade |
|---|---|---|---|---|---|
| `config/store.ts:1-20` | `storeConfig` | Nome, WhatsApp, Instagram, endereço, cidades e modalidades têm fallback La'Bel no código. | Específico da La'Bel / hardcode | Fazer o fallback vir do preset/instalação, não do core compilado. | P0 |
| `supabase/migrations/20260816151731_baseline_producao.sql:397-409` | `store_settings` | Defaults de nome, WhatsApp e Instagram gravam a La'Bel em toda instalação nova. | Específico da La'Bel / banco | Em migração futura, retirar defaults de marca e preencher via preset idempotente. | P0 |
| `app/layout.tsx:18-58` | `metadata`, viewport | Título, descrição, keywords, Open Graph, Twitter, localização e cor são da La'Bel. | Específico da La'Bel / SEO | Gerar metadata a partir da configuração pública da instalação. | P0 |
| `app/manifest.ts:3-20` | `manifest` | Nome, descrição, cores e ícone são fixos. | Específico da La'Bel / PWA | Montar manifest pela identidade ativa. | P0 |
| `app/opengraph-image.tsx:4-158` | OG image | Arte, textos, cores, “Confeitaria”, “doces” e Palhoça são fixos. | Específico da La'Bel / SEO | Renderizar template genérico com nome, slogan, segmento, local e tema configuráveis. | P1 |
| `components/brand/BrandLogo.tsx:5-33` | `BrandLogo` | Fonte, alt e proporções pressupõem o logo La'Bel. | Específico da La'Bel / branding | Receber assets e metadados da identidade; manter variantes de tamanho no core. | P0 |
| `app/icon.svg` e `public/brand/*` | Favicon e logos | Assets incorporam a marca atual. | Específico da La'Bel / assets | Provisionar assets por instalação e definir fallback neutro. | P0 |
| `components/store/Hero.tsx:89-139` | Hero | “confeitaria” e “Um doce momento” restringem o segmento. | Específico da La'Bel / conteúdo | Tornar título, descrição e textos de atendimento parte do preset/conteúdo. | P0 |
| `app/page.tsx:106` | JSON-LD | Tipo Schema.org é fixo em `Bakery`. | Específico da La'Bel / SEO | Mapear tipo de negócio pelo preset/configuração. | P1 |
| `lib/order-status.ts:81-117` | Mensagens de status | Cabeçalho “LA’BEL CONFEITARIA” e fallback de retirada usam configuração La'Bel. | Específico da La'Bel / comunicação | Usar identidade e endereço públicos resolvidos no servidor. | P0 |
| `lib/whatsapp.ts:48-73` | Mensagem de novo pedido | Marca e rodapé “Cardápio La'bel” estão fixos. | Específico da La'Bel / comunicação | Template por instalação com campos estruturados e fallback genérico. | P0 |
| `components/store/PreorderWhatsAppButton.tsx:153` | Mensagem de encomenda | Cabeçalho da marca está fixo no cliente. | Específico da La'Bel / comunicação | Fornecer texto/nome já resolvido pela camada server-side. | P0 |
| `app/privacidade/page.tsx:11-152` | Política de privacidade | Controlador, local, data, mensagem e marca são fixos. | Específico da La'Bel / legal | Template versionado preenchido com dados legais da instalação e provedores habilitados. | P0 |
| `app/admin/(dashboard)/relatorios/page.tsx:189,253` | CSV | Cabeçalho e nome do arquivo contêm La'Bel/Label. | Específico da La'Bel / exportação | Usar nome/slug seguro da instalação. | P1 |
| `app/admin/(dashboard)/pedidos/[id]/imprimir/page.tsx:173,391` | Comanda diária | Nome da confeitaria fixo na impressão. | Específico da La'Bel / impressão | Template de impressão com identidade configurada. | P1 |
| `app/admin/(dashboard)/pedidos/encomendas/[id]/imprimir/page.tsx:113,219` | Comanda de encomenda | Marca fixa. | Específico da La'Bel / impressão | Consumir identidade da instalação. | P1 |
| `app/admin/(dashboard)/caixa/[id]/imprimir/page.tsx:114` | Fechamento de caixa | Marca fixa. | Específico da La'Bel / impressão | Consumir identidade da instalação. | P1 |
| `components/store/CartProvider.tsx:39` | Chave `label-cart` | Namespace local é específico e pode colidir durante testes/migrações de domínio. | Específico da La'Bel / persistência local | Derivar uma chave estável da instalação ou adotar chave genérica versionada. | P2 |
| `lib/admin-permissions.ts:63,102` e migrations | `label_role`, `label_permissions` | Namespace técnico da marca aparece em Auth/RLS. Não é visível ao cliente, mas dificulta neutralizar o core. | Específico da La'Bel / infraestrutura | Renomear somente com migração compatível e janela de transição; não é bloqueador visual imediato. | P2 |
| `lib/site-url.ts:1-13` | URL fallback | Fallback aponta para `label-digital.vercel.app`. | Específico da La'Bel / deploy | Em ambiente implantado, falhar explicitamente sem URL válida; fallback somente local/teste. | P1 |
| `.github/workflows/e2e.yml:6-9` | URL padrão E2E | Homologação da La'Bel é o default global. | Específico da La'Bel / CI | Usar environment/repository variable ou entrada obrigatória. | P1 |
| `scripts/bootstrap-homologation-admin.mjs:12-37` | Bootstrap admin | Fallback de domínio é da La'Bel. | Específico da La'Bel / provisionamento | Tornar URL obrigatória ou originada do manifesto da instalação. | P1 |

# 4. Dependências específicas de confeitaria

| Arquivo | Componente/função | Problema atual | Classificação | Alteração sugerida | Prioridade |
|---|---|---|---|---|---|
| `lib/preorder-menu.ts:1-35` e catálogo restante | `PreorderProduct`, `preorderCategories` | Modelo fala em sabores, cento, quantidade mínima, antecedência e imagens de bolos/doces. | Específico de confeitaria | Preservar como módulo/preset de encomendas; não promover esse formato ao catálogo genérico. | P0 |
| `lib/preorder-request.ts:3-33` | `PreorderRequest` | Fluxo possui data desejada, sabores, produção e sinal. | Específico de confeitaria | Delimitar domínio de encomendas com interface própria, sem contaminar `orders`. | P0 |
| `lib/preorder-request.ts:61-80` | Regras financeiras | “Sinal pago” é fixado em 50%. | Específico de confeitaria / hardcode | Tornar política de sinal configurável dentro do módulo. | P1 |
| `app/encomendas` e componentes `Preorder*` | Jornada pública | Página, formulário e CTA são sempre parte da loja. | Específico de confeitaria / módulo | Habilitar rota, CTAs e conteúdo somente quando o módulo estiver ativo. | P0 |
| `app/admin/(dashboard)/pedidos/encomendas/calendario` | Agenda de produção | Agenda pressupõe encomendas com data e estados de produção. | Específico de confeitaria / módulo | Submódulo de agenda/produção dependente de encomendas. | P1 |
| `public/encomendas/*` | Imagens | 14 imagens de bolos, doces e brownies fazem parte do repositório base. | Específico de confeitaria / preset | Mover conceitualmente para dados/assets do preset La'Bel ou provisionamento de Storage. | P1 |
| `components/store/PreorderBanner.tsx:9-24` | Banner | Texto de celebração e produtos é de confeitaria. | Específico de confeitaria / conteúdo | Conteúdo do preset, renderizado só com o módulo habilitado. | P0 |
| `components/store/CategoryGrid.tsx:40-53` | Card de encomendas | Atalho é incondicional e separado do catálogo relacional. | Específico de confeitaria / módulo | Compor cards pela configuração de módulos. | P0 |

# 5. Hardcodes encontrados

## Inventário agrupado

| Grupo | Fonte atual | Exemplos | Destino conceitual | Prioridade |
|---|---|---|---|---|
| Identidade | Código, SVG e public | nome, nome curto, logos, favicon, alt | Configuração/assets da instalação | P0 |
| Contatos | Código + `store_settings` | WhatsApp, Instagram | Configuração pública única | P0 |
| Endereço e região | Código + `store_settings`/`delivery_zones` | rua, número, Palhoça, cidades | Banco/configuração da instalação | P0 |
| Conteúdo público | Componentes | hero, slogan, retirada, entrega, encomendas | Preset editável/conteúdo | P0 |
| SEO/PWA | `layout`, manifest e OG | títulos, keywords, `Bakery`, cores | Perfil SEO/segmento | P0 |
| Mensagens | libs/componentes | pedido novo, status, encomenda, rodapés | Templates configuráveis | P0 |
| Impressos/exports | páginas admin | cabeçalhos e filenames | Identidade da instalação | P1 |
| Legal | página de privacidade | controlador, local, data e contato | Configuração legal versionada | P0 |
| Tema | CSS e classes Tailwind | vinho, creme, superfícies, textos | Tokens semânticos | P0 |
| Catálogo de encomendas | `lib/preorder-menu.ts` | produtos, preços, sabores, regras | Seed do preset/módulo | P0 |
| Assets de encomenda | `public/encomendas` | fotos de produtos/hero | Storage/preset | P1 |
| Infraestrutura | scripts/workflows | domínio de homologação, project id, bucket names | Manifesto por instalação | P1 |
| Namespaces técnicos | Auth/localStorage/package | `label_role`, `label-cart`, `label-digital` | Namespace genérico versionado, quando seguro | P2 |

## Duplicação de configuração

`config/store.ts` e `store_settings` representam parcialmente os mesmos dados. `lib/public-store-settings.ts:40-135` tenta resolver banco + fallback, o que é uma boa direção, mas a interface pública cobre apenas nome, contatos, modalidades, endereço, cidades e horários. Ela não cobre tema, assets, SEO, locale, moeda, fuso, conteúdo, módulos, meios aceitos, política legal ou templates.

`config/brand.ts:1-27` centraliza uma paleta e caminhos, porém **não é importado pela aplicação**. Além disso, declara `/brand/logo.svg` em `config/brand.ts:19`, arquivo que não existe; o componente real usa `/brand/logo-creme.svg` diretamente.

# 6. O que deve virar configuração

Os nomes finais de schema/API devem ser definidos na implementação; esta auditoria recomenda os domínios, não impõe os nomes conceituais citados no pedido.

| Domínio de configuração | Dados existentes a absorver | Origem atual | Prioridade |
|---|---|---|---|
| Identidade | nome, nome curto, logos claro/escuro, ícone, alt, slug | `config/brand.ts`, `BrandLogo`, assets | P0 |
| Tema | primária, secundária, fundo, superfície, texto, borda, estados e contraste | `globals.css`, classes arbitrárias | P0 |
| Contato/social | WhatsApp, Instagram e mensagem inicial | `store_settings`, `config/store.ts`, privacidade | P0 |
| Endereço/localização | logradouro, número, complemento, cidade, estado, CEP, país | `store_settings` e hardcodes | P0 |
| Regionalização | locale, moeda, fuso horário, formato de data/hora | hoje implícitos em `pt-BR`, real e horário local | P0 |
| SEO | títulos, descrição, keywords, site name, tipo Schema.org, OG e Twitter | `app/layout.tsx`, OG, home | P0 |
| Conteúdo público | headline, subtítulo, atendimento, retirada/entrega, footer, CTA | Hero, banner, footer/home | P0 |
| Operação | entrega, retirada, loja aberta, horários, áreas e taxas | banco existente | P1 |
| Pagamentos | meios aceitos, troco, pagamento misto, regras de sinal | checkout, caixa, encomendas | P1 |
| Templates de comunicação | pedido novo, atualizações, encomendas, Auth/e-mail | libs e painel Supabase | P0 |
| Documentos legais | controlador, contato, cidade, versão/data, provedores | privacidade | P0 |
| Impressão/exportação | cabeçalho, rodapé, logo, nome de arquivo | páginas de impressão/relatório | P1 |
| Observabilidade | ambiente, projeto Sentry, monitor e contatos de alerta | env/painéis externos | P1 |
| Política de encomenda | antecedência, percentual de sinal, estados e textos | módulo de encomendas | P1 |

# 7. O que deve virar módulo

Permissão de usuário e módulo da instalação são conceitos diferentes. Permissão decide **quem pode usar** um recurso habilitado; módulo decide **se o recurso existe** naquela instalação.

| Módulo proposto | Dependências reais | Comportamento quando desligado | Prioridade |
|---|---|---|---|
| Encomendas personalizadas | rota pública, catálogo, formulário, Storage, pedidos admin, permissões | remover rotas/CTAs/queries/checks e preservar dados sem expor operação | P0 |
| Agenda/produção de encomendas | encomendas, data desejada, status de produção | só pode ligar se encomendas estiver ligado | P1 |
| Sinal/saldo de encomenda | encomendas e faturamento | remover cards/cálculos sem afetar pagamentos diários | P1 |
| Delivery | checkout, endereços, zonas, taxas, entregas, status/mensagens | não pedir endereço, não mostrar admin/estados de entrega | P0 |
| Retirada | checkout, endereço da loja, status/mensagens | não oferecer retirada nem estados relacionados | P1 |
| Caixa | sessões, venda presencial, movimentos e pagamentos | pedidos online continuam independentes | P1 |
| Financeiro | pedidos concluídos, pagamentos, encomendas opcionais | ocultar rota e consultas, sem alterar vendas | P1 |
| Relatórios | pedidos, pagamentos, estornos, perdas | desligar leitura/exportação; operação segue | P2 |
| Estornos | pedidos concluídos e pagamentos | retirar ação e relatório correspondente | P2 |
| Perdas | produtos e, hoje, sessão de caixa | permitir política com/sem sessão ou desligar | P2 |
| Rastreamento do cliente | token, rota pública, status, Realtime | mensagens não incluem link e rota não é publicada | P2 |
| Usuários avançados | Auth, convites, permissões e SMTP | manter ao menos um administrador; ocultar gestão delegada | P2 |
| Auditoria administrativa | banco e ações server-side | recomendado como core sempre ligado; UI pode ser opcional | P1 |

## Dependências de desligamento mais críticas

### Encomendas

Hoje esse recurso aparece em pelo menos 39 arquivos de runtime/infra e depende de:

- `app/encomendas`, `PreorderBanner`, `CategoryGrid` e assets públicos;
- navegação, permissões, abas e formulários administrativos;
- visão geral (`listPreorderRequests`), faturamento e agenda;
- `/api/health`, sitemap e robots;
- backup, auditoria de homologação e sincronização de conteúdo;
- bucket, catálogo, requests, ajustes de imagem e numeração.

Portanto, uma flag não pode apenas esconder “Encomendas” da sidebar. Ela deve controlar composição de rota, navegação, consultas, métricas, health checks, exports e jobs.

### Caixa

O caixa adiciona colunas a `orders` e usa `cash_sessions`, `order_payments`, `cash_movements`, `order_refunds` e `product_losses`. Desligá-lo deve manter a criação e conclusão de pedidos online, mas remover venda presencial, sessão, movimentos e cards/relatórios relacionados.

### Delivery/retirada

Esses módulos afetam validação server-side do checkout, dados obrigatórios, cálculo de taxa, status possíveis, impressão, mensagens e painel de entregas. A configuração pública já possui `pickup_enabled` e `delivery_enabled`, mas a fronteira precisa ser aplicada uniformemente.

# 8. Limitações para outros segmentos

## Limitação estrutural atual

`products` possui um preço único (`baseline:344-359`); `CartProduct` contém apenas id, nome, preço e imagem (`CartProvider.tsx:10-18`); `order_items` salva somente produto, nome, quantidade e preço unitário (`baseline:252-259`). A observação existe apenas no nível do pedido. O modelo especializado de encomendas possui “sabores”, mas não é um sistema genérico de opções.

| Necessidade | Estado atual | Segmentos afetados | Alteração futura sugerida | Prioridade |
|---|---|---|---|---|
| Tamanhos/variações | Ausente no produto diário | pizza, açaí, café, marmita | Variantes com SKU/nome/preço/disponibilidade próprios. | P0 |
| Grupos de opções | Ausente | todos | Grupos ordenados, obrigatórios/opcionais, seleção única/múltipla. | P0 |
| Mínimo/máximo de escolhas | Só existe para sabores no JSON de encomendas | açaí, hambúrguer, pizza | Regras genéricas por grupo de opções. | P0 |
| Adicionais pagos | Ausente | lanches, açaí, pizza | Opções com acréscimo ou preço absoluto. | P0 |
| Snapshot das escolhas | `order_items` não registra configuração | todos | Persistir nome/preço/regra escolhida no momento da venda. | P0 |
| Observação por item | Só há `orders.notes` | lanches, marmita, pizza | Campo validado por item, separado da observação geral. | P1 |
| Combos/bundles | Ausente | hamburgueria, lanches | Produto composto com etapas e escolhas. | P1 |
| Meio a meio | Ausente | pizzaria | Composição de partes e estratégia de preço configurável. | P1 |
| Bordas | Ausente | pizzaria | Grupo de opção compatível com tamanho e preço. | P1 |
| Preço variável por opção | Só existe como string de preço em encomendas | todos | Decimal estruturado no banco, sem parsing de texto. | P0 |
| Disponibilidade por opção | Ausente | todos | Ativação/estoque por variante/opção. | P1 |
| Cardápio por dia/turno | Apenas loja aberta/fechada | marmitaria, restaurante | Disponibilidade por janela, dia ou serviço. | P2 |
| Tempo de preparo/capacidade | Ausente | restaurante, pizza, lanches | Tempo por item e capacidade operacional futura. | P2 |
| Ingredientes/estoque | Perdas registram produto final | restaurantes e operações maiores | Não é necessário para o primeiro white-label; módulo futuro. | P3 |

## Decisão de modelagem recomendada

Antes do primeiro cliente cujo cardápio dependa de adicionais, criar um modelo genérico de **variante + grupo de opções + opção**, e salvar snapshots imutáveis em cada item do pedido. “Sabores”, “bordas”, “tamanho” e “ponto da carne” devem ser dados/presets desse modelo, não novas colunas específicas por segmento.

# 9. Impactos no banco

## Tabelas atualmente genéricas

| Tabelas | Avaliação |
|---|---|
| `categories`, `products` | Core de catálogo, ainda simples. |
| `customers`, `addresses` | Core de relacionamento e entrega. |
| `orders`, `order_items` | Core de vendas, com canais online/caixa. |
| `store_settings`, `business_hours`, `delivery_zones` | Configuração operacional parcial. |
| `admin_profiles`, `admin_audit_logs` | Administração e auditoria. |
| `cash_sessions`, `order_payments`, `cash_movements` | Caixa e pagamentos. |
| `order_refunds`, `product_losses` | Estornos e perdas. |

## Dados específicos de confeitaria fora do modelo relacional

- `preorder-catalog/catalog.json`: catálogo de encomendas;
- `preorder-catalog/requests/*.json`: solicitações;
- `preorder-catalog/image-display-settings.json`: enquadramento e hero;
- arquivos de numeração no mesmo bucket;
- defaults de catálogo em `lib/preorder-menu.ts`.

## Achados de banco e persistência

| Arquivo | Componente/função | Problema atual | Classificação | Alteração sugerida | Prioridade |
|---|---|---|---|---|---|
| `lib/preorder-catalog-store.ts:9-11,51-151` | catálogo no Storage | Bucket e arquivo são fixos; bucket é criado em runtime com service role; fallback escreve catálogo La'Bel. | Banco / confeitaria | Migrar depois para persistência relacional ou camada de módulo versionada; provisionar bucket declarativamente enquanto houver compatibilidade. | P0 |
| `lib/preorder-request-store.ts:13-183` | requests JSON | Lista limitada a 1.000 e baixa cada arquivo individualmente; sem consultas, FK ou transações. | Banco / escalabilidade | Criar tabelas relacionais de encomenda e itens/pagamentos com migração de dados. | P0 |
| `lib/preorder-request.ts:91-98` | `parsePreorderPrice` | Preço financeiro é recuperado de string formatada. | Banco / integridade | Armazenar preço decimal estruturado e snapshot. | P0 |
| `lib/image-display-settings-store.ts:16-30` | ajustes de imagem | Configuração de hero e zoom diário fica no bucket de encomendas. | Banco / acoplamento | Separar configuração visual da persistência de encomendas. | P1 |
| `supabase/config.toml:66-71` | seed | `seed.sql` está habilitado, mas `supabase/seed.sql` não existe. | Infraestrutura / banco | Adicionar futuramente seed/preset idempotente e testado. | P0 |
| `supabase/config.toml:115-125` | buckets locais | Buckets usados em produção não são declarados na configuração local. | Infraestrutura / Storage | Provisionar buckets e políticas de forma reproduzível. | P1 |
| `supabase/migrations/20260818124000_admin_audit_logs.sql:216-238` | triggers de auditoria | Triggers cobrem seis tabelas; caixa, pagamentos, estornos, perdas e JSON dependem de outros caminhos. | Auditoria | Definir matriz de cobertura e incluir todo domínio mutável. | P1 |
| `scripts/backup-supabase.mjs:52-68` | lista de backup | Não exporta `cash_sessions`, `order_payments`, `cash_movements`, `order_refunds`, `product_losses` nem `admin_audit_logs`. | Backup / integridade | Completar inventário e adicionar teste que compare tabelas esperadas. | P0 |
| `products.product_type` vs catálogo JSON | Dois conceitos de preorder | Produto relacional aceita `preorder`, mas o catálogo real de encomendas vive fora da tabela. | Banco / domínio duplicado | Decidir papel de `product_type` e unificar sem apagar dados existentes. | P1 |

## Tabelas/conceitos futuros possíveis

Sem criar migrations nesta fase, o desenho futuro precisará contemplar:

- configuração de identidade, tema, conteúdo, SEO, legal, regionalização e módulos;
- variantes de produto;
- grupos de opções e opções;
- vínculo de opções permitidas por produto/variante;
- snapshot de escolhas e observação por item do pedido;
- entidades relacionais de encomenda, itens e recebimentos;
- versão do preset e versão do schema de configuração.

Não há necessidade de `tenant_id`, `organization_id` ou `store_id` no modelo comercial atual, pois cada cliente terá banco próprio.

# 10. Branding/temas

## Medição atual

No runtime (`app`, `components`, `config`, `lib`) foram encontradas:

- **43 cores hexadecimais distintas**;
- **1.802 ocorrências** em **75 arquivos**;
- **1.769 usos** em classes Tailwind com valores hexadecimais arbitrários;
- `#8B0000`: 527 ocorrências em 63 arquivos;
- `#D2B48C`: 72 ocorrências em 38 arquivos;
- `#241B19`: 306 ocorrências em 57 arquivos;
- `#756A66`: 309 ocorrências em 58 arquivos;
- `#EEE6DF`: 249 ocorrências em 53 arquivos.

Os arquivos com maior concentração incluem `CheckoutDrawer.tsx` (129), detalhe de encomenda (85), `CashSessionControls.tsx` (82), configurações (79), `CashRegisterPOS.tsx` (74) e `PreorderWhatsAppButton.tsx` (71).

<details>
<summary>Inventário completo dos 75 arquivos com cores hexadecimais</summary>

| Arquivo | Ocorrências |
|---|---:|
| `app/admin/(dashboard)/atividades/page.tsx` | 41 |
| `app/admin/(dashboard)/caixa/[id]/imprimir/page.tsx` | 11 |
| `app/admin/(dashboard)/caixa/page.tsx` | 22 |
| `app/admin/(dashboard)/categorias/page.tsx` | 31 |
| `app/admin/(dashboard)/clientes/page.tsx` | 40 |
| `app/admin/(dashboard)/configuracoes/page.tsx` | 79 |
| `app/admin/(dashboard)/encomendas/page.tsx` | 34 |
| `app/admin/(dashboard)/entregas/page.tsx` | 39 |
| `app/admin/(dashboard)/error.tsx` | 11 |
| `app/admin/(dashboard)/faturamento/page.tsx` | 44 |
| `app/admin/(dashboard)/layout.tsx` | 1 |
| `app/admin/(dashboard)/page.tsx` | 51 |
| `app/admin/(dashboard)/pedidos/[id]/imprimir/page.tsx` | 1 |
| `app/admin/(dashboard)/pedidos/encomendas/[id]/editar/page.tsx` | 6 |
| `app/admin/(dashboard)/pedidos/encomendas/[id]/imprimir/page.tsx` | 1 |
| `app/admin/(dashboard)/pedidos/encomendas/[id]/page.tsx` | 85 |
| `app/admin/(dashboard)/pedidos/encomendas/calendario/page.tsx` | 30 |
| `app/admin/(dashboard)/pedidos/encomendas/nova/page.tsx` | 6 |
| `app/admin/(dashboard)/pedidos/encomendas/page.tsx` | 63 |
| `app/admin/(dashboard)/pedidos/page.tsx` | 37 |
| `app/admin/(dashboard)/produtos/page.tsx` | 36 |
| `app/admin/(dashboard)/relatorios/page.tsx` | 54 |
| `app/admin/definir-senha/page.tsx` | 4 |
| `app/admin/login/page.tsx` | 14 |
| `app/admin/recuperar-senha/page.tsx` | 4 |
| `app/encomendas/page.tsx` | 51 |
| `app/error.tsx` | 11 |
| `app/global-error.tsx` | 11 |
| `app/globals.css` | 5 |
| `app/layout.tsx` | 1 |
| `app/manifest.ts` | 2 |
| `app/not-found.tsx` | 7 |
| `app/opengraph-image.tsx` | 7 |
| `app/page.tsx` | 4 |
| `app/pedido/[id]/page.tsx` | 28 |
| `app/privacidade/page.tsx` | 17 |
| `components/admin/AdminAccountsManager.tsx` | 44 |
| `components/admin/AdminPagePlaceholder.tsx` | 6 |
| `components/admin/AdminSidebar.tsx` | 12 |
| `components/admin/AdminTabSessionBoundary.tsx` | 4 |
| `components/admin/CashRegisterPOS.tsx` | 74 |
| `components/admin/CashSessionControls.tsx` | 82 |
| `components/admin/CustomerDetailsDialog.tsx` | 38 |
| `components/admin/DeleteCategoryDialog.tsx` | 3 |
| `components/admin/DeleteProductDialog.tsx` | 3 |
| `components/admin/DeliveryDetailsDialog.tsx` | 25 |
| `components/admin/EditCategoryDialog.tsx` | 10 |
| `components/admin/EditPreorderHeroDialog.tsx` | 11 |
| `components/admin/EditPreorderProductDialog.tsx` | 60 |
| `components/admin/EditProductDialog.tsx` | 39 |
| `components/admin/ImagePositionEditor.tsx` | 14 |
| `components/admin/ManualPreorderForm.tsx` | 50 |
| `components/admin/MonitoringTestCard.tsx` | 3 |
| `components/admin/NewProductDialog.tsx` | 36 |
| `components/admin/OrderDetailsDialog.tsx` | 45 |
| `components/admin/OrdersPanelTabs.tsx` | 9 |
| `components/admin/PrintOrderButton.tsx` | 2 |
| `components/admin/ProductCategorySection.tsx` | 9 |
| `components/admin/RecoverPasswordForm.tsx` | 23 |
| `components/admin/ReportsActions.tsx` | 5 |
| `components/admin/SetPasswordForm.tsx` | 9 |
| `components/store/AddToCartButton.tsx` | 2 |
| `components/store/CartDrawer.tsx` | 26 |
| `components/store/CategoryGrid.tsx` | 11 |
| `components/store/CheckoutDrawer.tsx` | 129 |
| `components/store/EmptyProducts.tsx` | 3 |
| `components/store/FloatingCartButton.tsx` | 4 |
| `components/store/Header.tsx` | 4 |
| `components/store/Hero.tsx` | 4 |
| `components/store/MenuSections.tsx` | 21 |
| `components/store/OrderTrackingRefresh.tsx` | 1 |
| `components/store/PreorderBanner.tsx` | 6 |
| `components/store/PreorderWhatsAppButton.tsx` | 71 |
| `components/store/StoreOpenStatus.tsx` | 8 |
| `config/brand.ts` | 7 |

</details>

## Estado dos tokens

`app/globals.css:7-15` já define variáveis como `--label-wine`, `--label-cream`, superfícies e textos, e `@theme` integra tokens do Tailwind. Isso é uma boa fundação, mas a maior parte da UI contorna os tokens com classes como `text-[#8B0000]` e `border-[#EEE6DF]`. `config/brand.ts` duplica a paleta e não é consumido.

## Estratégia recomendada

1. Definir um conjunto pequeno de tokens semânticos: marca, contraste da marca, destaque, fundo, superfície, texto, texto discreto, borda, sucesso, alerta e erro.
2. Resolver a identidade da instalação no servidor e expor somente valores públicos validados como CSS custom properties no layout raiz.
3. Migrar componentes progressivamente de hex arbitrário para classes semânticas; começar por layout público, checkout, admin shell e impressão.
4. Manter estados operacionais com cores semânticas independentes da marca para preservar legibilidade.
5. Validar contraste e formatos de cor antes de aplicar valores configurados.
6. Tornar logo, favicon e OG assets da instalação, com fallback neutro e dimensões/metadados configuráveis.
7. Não criar cópias de componentes por tema ou segmento.

# 11. Infraestrutura por instalação

## Variáveis atuais

`.env.example` documenta Supabase URL/anon/service role, segredo de rastreamento, URL do site, ambiente, Turnstile e Sentry. A separação entre chaves públicas e segredos está adequada; `SUPABASE_SERVICE_ROLE_KEY`, Turnstile secret e Sentry token devem continuar exclusivamente server-side/CI.

| Área | O que parametrizar por cliente | Estado atual | Prioridade |
|---|---|---|---|
| Vercel | projeto, domínio, environments, env vars, região e proteção de preview | Manual | P0 |
| Supabase | projeto, URL/chaves, migrations, Auth URLs, SMTP, templates e políticas | Parcialmente em código; hosted settings manuais | P0 |
| Storage | buckets, MIME, limites, políticas e assets iniciais | Parte em migration/script, parte em runtime | P0 |
| Turnstile | site key, secret e domínios autorizados | Env/painel | P1 |
| Sentry | DSN, org, projeto, auth token, ambiente, monitor e alertas | Env/painel | P1 |
| Domínio/DNS | apex, www, homologação, e-mail e TLS | Externo/manual | P0 |
| WhatsApp | número, templates e modo de envio/manual | Parcialmente no banco/código | P0 |
| E-mail | domínio, DKIM/SPF/DMARC, SMTP, remetente e templates Auth | Externo/manual | P0 |
| Backup | banco, Storage, retenção, destino externo e teste de restauração | Script local incompleto | P0 |
| Seed/preset | identidade, configurações, categorias e módulos iniciais | Inexistente como fluxo reproduzível | P0 |

## Achados adicionais

- `next.config.ts:4-18` valida as variáveis críticas no deploy Vercel, ponto positivo.
- `next.config.ts:78-89` só publica source maps quando todas as credenciais Sentry existem, ponto positivo.
- `app/api/health/route.ts:13-30` sempre exige o bucket de encomendas; a saúde deve ser composta pelos módulos ativos.
- `scripts/sync-homologation-content.mjs:51-75` conhece apenas conteúdo e buckets La'Bel; precisa aceitar um manifesto de instalação/preset.
- `supabase/config.toml:155-249` representa defaults locais; URLs, SMTP e templates reais do projeto hospedado não estão versionados/aplicados automaticamente.
- `README.md` e o runbook não formam ainda um manual de criação de novo cliente.

## Checklist futuro de provisionamento

1. validar manifesto sem secrets;
2. criar/vincular projetos Vercel e Supabase isolados;
3. aplicar migrations universais;
4. aplicar preset idempotente e registrar versão;
5. criar buckets/policies e enviar assets;
6. configurar Auth URLs, SMTP e templates;
7. cadastrar Turnstile, Sentry e domínio;
8. criar primeiro admin por fluxo seguro;
9. executar quality, smoke, E2E e `/api/health` conforme módulos;
10. gerar backup inicial e testar restauração.

# 12. Estratégia para presets

Um preset deve ser **dados + configuração inicial**, não uma aplicação diferente.

## Conteúdo permitido em um preset

- identidade visual padrão;
- textos e terminologia inicial;
- tipo Schema.org e SEO inicial;
- módulos habilitados;
- categorias e produtos demonstrativos/sugeridos;
- opções de produto comuns ao segmento;
- modalidades de atendimento e pagamento sugeridas;
- regras iniciais do módulo, como antecedência e sinal;
- assets de demonstração claramente substituíveis.

## Exemplo de composição conceitual

| Preset | Encomendas | Agenda/produção | Delivery | Retirada | Caixa | Opções prioritárias |
|---|---:|---:|---:|---:|---:|---|
| Confeitaria | Ligado | Ligado | Ligado | Ligado | Ligado | sabores, tamanhos, quantidade mínima, sinal |
| Hamburgueria | Desligado | Desligado | Ligado | Ligado | Ligado | ponto, adicionais, remoções, combos |
| Marmitaria | Opcional | Desligado | Ligado | Ligado | Ligado | tamanho, proteína, acompanhamentos, dia/turno |
| Pizzaria | Opcional | Opcional | Ligado | Ligado | Ligado | tamanho, sabores, meio a meio, borda |

## Regras

- presets não devem conter branches de código;
- devem ser versionados e aplicados de forma idempotente;
- a personalização posterior do cliente não deve ser sobrescrita por atualização do preset;
- módulos devem declarar dependências e validações;
- o preset La'Bel deve reproduzir integralmente o comportamento atual antes de existir um segundo preset.

# 13. Estratégia para manter um único Core

## Arquitetura recomendada

1. **Core único:** domínios de catálogo, pedido, cliente, pagamento, caixa, segurança, usuários, auditoria, impressão e observabilidade.
2. **Perfil da instalação:** configuração pública tipada e configuração privada server-side, resolvidas por uma única camada.
3. **Registro de módulos:** cada módulo declara chave, dependências, rotas, navegação, permissões, health checks, backup/exportação e recursos públicos.
4. **Presets versionados:** somente defaults, conteúdos e dados iniciais.
5. **Extensões controladas:** componentes aceitam slots/templates quando houver uma diferença real; evitar condicionais por nome de cliente.
6. **Migrations universais:** toda instalação recebe a mesma sequência. Tabelas de módulo podem existir desativadas sem serem expostas.
7. **Release versionado:** mudanças passam por homologação, backup, migration dry-run, quality/E2E e promoção controlada.

## Política para solicitações específicas de clientes

Uma solicitação entra no core quando é genérica ou pode ser expressa por configuração/módulo. Se for puramente visual ou textual, vira configuração da instalação. Se exigir comportamento exclusivo e não generalizável, deve passar por uma interface de extensão pequena e documentada — nunca por cópia do repositório ou `if (cliente === ...)` espalhado.

## Testes necessários para evitar forks

- teste de contrato do perfil da instalação;
- teste de cada preset contra o schema vigente;
- matriz de módulos ligada/desligada e dependências inválidas;
- snapshot/contrato de metadata, manifest, mensagens e impressão por preset;
- fluxo E2E mínimo comum a todos os presets;
- E2E específico somente para módulos habilitados;
- teste de bootstrap limpo e reexecução idempotente;
- teste de upgrade de uma configuração personalizada sem sobrescrever o cliente.

# 14. Riscos técnicos

| Risco | Evidência | Impacto | Mitigação | Prioridade |
|---|---|---|---|---|
| “Feature flag cosmética” | encomendas atravessam mais de três dezenas de arquivos | instalação quebra ou continua consultando módulo oculto | Registro de módulos com hooks e testes de desligamento | P0 |
| Perda de dados de caixa no backup | `backup-supabase.mjs:52-63` omite tabelas novas | restauração incompleta | Inventário automático e teste de restore | P0 |
| Divergência banco/Storage | pedidos diários relacionais e encomendas JSON | totais, auditoria e relatórios inconsistentes | Migração relacional gradual com reconciliação | P0 |
| Modelo insuficiente para novos segmentos | preço único e item sem opções | primeiro cliente externo exige fork | Modelo genérico de variantes/opções antes desse cliente | P0 |
| Tema parcial | 1.769 classes hex arbitrárias | custo alto e inconsistência visual | Tokens semânticos e migração por camadas | P0 |
| Configuração externa não reproduzível | SMTP/Auth/DNS/Sentry em painéis | instalação manual suscetível a erro | Manifesto, checklist automatizado e verificador | P0 |
| Fallback de marca silencioso | `config/store.ts`, `site-url.ts`, catálogo default | cliente pode publicar dados La'Bel | Fail-fast em deploy e preset explícito | P0 |
| Auditoria incompleta | triggers não cobrem todo o domínio | alterações financeiras/config podem não ter trilha uniforme | Matriz de cobertura e testes | P1 |
| Catálogo JSON limitado | listagem 1.000 + N downloads | degradação e limite operacional | Banco relacional/paginação | P1 |
| Configuração de cor insegura | futuro input de tema | contraste ruim ou CSS inválido | validação e paletas verificadas | P1 |
| Evolução de metadata Auth | `label_role` no JWT/RLS | renomear pode bloquear admins | compatibilidade dupla e migração planejada | P2 |
| Presets sobrescreverem cliente | seed sem versionamento | perda de personalização | seed idempotente, ownership e versão | P0 |

# 15. Plano de migração incremental

## Fase 0 — Congelar contrato e criar cobertura (média)

- registrar inventário de identidade, módulos e dependências;
- adicionar testes de caracterização da La'Bel;
- definir schema tipado do perfil de instalação sem alterar a saída atual;
- definir regra de versão da configuração/preset.

**Saída:** La'Bel continua idêntica e há contrato para as próximas mudanças.

## Fase 1 — Configuração central e branding (média/alta)

- consolidar leitura de configuração pública/privada;
- mover nome, contatos, endereço, regionalização, SEO, conteúdo, legal e assets;
- substituir cores mais críticas por tokens semânticos;
- adaptar metadata, manifest, OG, mensagens, impressões e CSV.

**Saída:** uma troca de configuração altera a identidade sem editar componentes.

## Fase 2 — Registro de módulos (alta)

- implementar registro e dependências;
- integrar sidebar, rotas, home, sitemap, robots, health, métricas, backup e permissões;
- criar matriz de teste ON/OFF;
- manter preset La'Bel com o comportamento atual.

**Saída:** uma instalação sem encomendas não carrega nem depende do módulo.

## Fase 3 — Provisionamento e presets (média)

- criar seed real e idempotente;
- versionar preset La'Bel/confeitaria;
- automatizar buckets/assets e verificação de settings externos;
- completar backup e restore;
- documentar criação de nova instalação.

**Saída:** ambiente limpo pode ser criado e validado de forma repetível.

## Fase 4 — Catálogo multissegmento (alta)

- modelar variantes, grupos, opções, preços e regras;
- evoluir carrinho e assinatura de item;
- salvar snapshots em itens do pedido;
- adaptar caixa, checkout, impressão, WhatsApp, relatórios e perdas;
- criar primeiro preset não confeitaria para provar o modelo.

**Saída:** hamburgueria/açaí/marmitaria simples funciona sem fork.

## Fase 5 — Encomendas relacionais (alta)

- criar modelo relacional do módulo;
- importar e reconciliar JSON;
- manter leitura compatível durante transição;
- integrar auditoria, backup, relatórios e pagamentos;
- aposentar arquivos somente após validação e retenção.

**Saída:** encomendas têm a mesma integridade operacional do core de pedidos.

## Fase 6 — Primeiro cliente externo (média)

- escolher segmento de complexidade controlada;
- criar instalação e preset sem mudar o core por cliente;
- executar checklist, segurança, backup, E2E e restore;
- documentar lacunas reais antes de ampliar segmentos.

# 16. Ordem recomendada de implementação

1. **P0 — Completar backup das tabelas atuais e provar restauração.** É uma correção operacional independente do white-label e protege as próximas fases.
2. **P0 — Definir o contrato tipado de instalação e preset La'Bel.** Sem mudar visual ou comportamento.
3. **P0 — Centralizar identidade, conteúdo, SEO, legal, mensagens e impressão.** Eliminar publicação acidental da marca errada.
4. **P0 — Criar tokens semânticos e migrar as superfícies prioritárias.** Não é necessário converter os 75 arquivos em uma única entrega.
5. **P0 — Criar registro de módulos e desacoplar encomendas completamente.** Validar instalação com encomendas ON e OFF.
6. **P0 — Fechar provisionamento reproduzível.** Seed, buckets, Auth/SMTP, env, domínio, Sentry, Turnstile e validação.
7. **P0 — Evoluir produto/carrinho/item de pedido para variantes e opções.** Antes do primeiro cliente que exija adicionais ou tamanhos.
8. **P1 — Migrar encomendas JSON para banco relacional.** Com compatibilidade e reconciliação.
9. **P1 — Criar um segundo preset real.** Preferencialmente hamburgueria ou marmitaria simples para provar o core.
10. **P2/P3 — Combos avançados, meio a meio, estoque por ingrediente e capacidade.** Implementar conforme demanda validada.

## Critério de aprovação para o primeiro cliente externo

O primeiro deploy comercial deve ocorrer somente quando:

- não houver texto, asset, domínio ou contato da La'Bel fora do preset da La'Bel;
- uma instalação limpa puder ser provisionada e reprovisionada de forma idempotente;
- módulos desligados não aparecerem nem forem consultados por rotas, health, backup ou relatórios;
- backup completo e restauração tiverem sido testados;
- metadata, mensagens, impressão e documentos legais refletirem o cliente;
- o cardápio do cliente couber no modelo sem fork;
- quality, E2E, segurança e checklist de produção passarem no ambiente isolado.

---

Esta auditoria não altera a decisão de arquitetura atual: **uma base única compartilhada, uma instalação isolada por cliente e presets por segmento**. Multi-tenancy, billing e forks por segmento não são necessários para iniciar a comercialização.
