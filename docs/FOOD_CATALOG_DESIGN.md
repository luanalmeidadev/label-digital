# Food Service Catalog Design

## Status e objetivo

Este documento define o modelo técnico recomendado para evoluir o catálogo diário
do Label Digital sem criar regras por segmento. Ele é um desenho de arquitetura:
nenhuma migration, tabela, policy, rota ou componente é alterado por esta fase.

O modelo deve atender produtos simples e produtos configuráveis usando os mesmos
conceitos: `Product`, `Variant`, `OptionGroup` e `Option`. A instalação La'Bel deve
continuar usando os produtos atuais sem recadastro e sem mudança de comportamento.
O módulo de Encomendas não faz parte desta modelagem e permanece inalterado.

### Decisões centrais

1. `Product` continua sendo a identidade comercial e a unidade principal de
   relatório.
2. `Variant` é opcional e representa uma versão vendável com preço próprio.
3. `OptionGroup` pertence a um produto e define as regras de escolha.
4. `Option` pertence a um grupo e pode acrescentar valor ao preço unitário.
5. O navegador envia somente identificadores, quantidade e observação; o servidor
   valida o catálogo e calcula todos os preços.
6. Cada item do pedido guarda snapshots imutáveis. Alterações futuras no catálogo
   não alteram pedidos históricos.
7. Produtos sem variantes ou opções continuam no fluxo atual de preço simples.

## 1. Auditoria do modelo atual

### 1.1 Banco de dados

| Área | Estado atual | Limitação para catálogo configurável |
|---|---|---|
| `categories` | Nome, slug, ativo e ordenação | Já é genérica e não precisa mudar na V1 |
| `products` | Um preço em `price`, disponibilidade global e uma categoria | Não representa tamanho, variante ou opções |
| `order_items` | Snapshot mínimo de `product_name` e `unit_price` | Não guarda variante, escolhas, acréscimos ou observação por item |
| `orders` | Totais, canal, pagamento e observação geral | Continua adequado; a observação geral não substitui observação por item |
| `product_losses` | Produto, quantidade, nome e valor estimado | Calcula a perda diretamente com `products.price` e não distingue variante |

Evidências principais:

- `supabase/migrations/20260816151731_baseline_producao.sql:127-163`
  define categorias;
- `supabase/migrations/20260816151731_baseline_producao.sql:252-269`
  define o snapshot mínimo de item;
- `supabase/migrations/20260816151731_baseline_producao.sql:286-327`
  define pedidos;
- `supabase/migrations/20260816151731_baseline_producao.sql:344-395`
  define o produto de preço único;
- `supabase/migrations/20260818132000_cash_register_foundation.sql:318-475`
  agrupa a venda presencial por `product_id` e usa `products.price`;
- `supabase/migrations/20260824133000_cash_refunds_and_product_losses.sql:44-79`
  define perdas por produto;
- `supabase/migrations/20260824133000_cash_refunds_and_product_losses.sql:337-367`
  calcula a perda com o preço atual do produto.

O código usa `image_zoom`, mas esse valor está em Storage por meio de
`image-display-settings-store`, não em uma coluna presente nas migrations atuais.
Isso não interfere no modelo proposto, mas confirma que uma futura migration deve
ser comparada com o schema realmente provisionado antes de qualquer execução.

### 1.2 Runtime e fluxo de dados

| Arquivo / função | Comportamento atual | Impacto futuro |
|---|---|---|
| `app/page.tsx` / `Home` | Consulta produto com preço único e entrega um catálogo simples ao carrinho | Consultar configuração publicável e montar DTO de catálogo |
| `components/store/MenuSections.tsx` / `ProductCard` | Exibe `product.price` e adiciona diretamente | Exibir preço simples ou “a partir de”; abrir configurador quando necessário |
| `components/store/AddToCartButton.tsx` | Envia produto pronto ao carrinho | Manter adição direta para simples e delegar configuráveis ao editor |
| `components/store/CartProvider.tsx` | Identifica, mescla e altera linhas somente pelo `product.id` | Usar identidade da configuração, preservando linhas diferentes do mesmo produto |
| `components/store/CartDrawer.tsx` | Mostra somente produto, quantidade e preço | Mostrar variante, escolhas e observação por linha |
| `components/store/CheckoutDrawer.tsx` / `handleCreateOrder` | Envia somente `productId` e quantidade | Enviar IDs de variante/opções e observação, nunca preços |
| `app/store/checkout/actions.ts` / `createOrder` | Soma duplicados por produto, busca `products.price` e cria snapshot mínimo | Validar configurações, reconstruir preço e persistir snapshots completos |
| `app/admin/(dashboard)/produtos/page.tsx` | Lista e edita preço único | Exibir modo simples/configurável e gerenciar configuração em área própria |
| `app/admin/(dashboard)/produtos/actions.ts` | CRUD direto de `products.price` | Preservar CRUD simples e adicionar operações transacionais de catálogo |
| `components/admin/CashRegisterPOS.tsx` | Carrinho é `Record<productId, quantity>` | Usar linhas configuradas e o mesmo configurador da loja pública |
| `app/admin/(dashboard)/caixa/actions.ts` | Envia produto/quantidade à RPC | Enviar seleção de catálogo sem preços |
| `create_cashier_sale` | Recalcula com `products.price` dentro do banco | Evoluir para validar variante, grupos e opções na mesma transação |
| `app/admin/(dashboard)/pedidos/page.tsx` | Busca snapshot mínimo | Buscar e montar opções do item |
| `components/admin/OrderDetailsDialog.tsx` | Mostra uma linha por produto | Renderizar detalhes do snapshot |
| `app/admin/(dashboard)/pedidos/[id]/imprimir/page.tsx` | Imprime produto e preço | Imprimir variante, opções e observação sem redesenhar a comanda |
| `components/store/CheckoutDrawer.tsx` e `lib/whatsapp.ts` | Mensagem contém apenas nome e preço do produto | Formatar o mesmo snapshot usado na impressão |
| `app/admin/(dashboard)/relatorios/page.tsx` | Agrupa por `product_id` e receita de `unit_price` | Manter produto principal e permitir dimensões opcionais por variante/opção |
| `components/admin/CashSessionControls.tsx` | Perda seleciona apenas produto | Variante opcional em etapa posterior, sem estoque por ingrediente |

`CartUI`, categorias, pagamentos, estornos, entrega e rastreamento não precisam de
alteração conceitual. Eles apenas devem receber os novos totais e representações de
item quando o fluxo configurável for implementado.

## 2. Modelo conceitual

```text
Category 1 ── N Product
                  │
                  ├── 0..N ProductVariant
                  │
                  └── 0..N ProductOptionGroup
                                │
                                └── 1..N ProductOption

Order 1 ── N OrderItem
                  │
                  └── 0..N OrderItemOptionSnapshot
```

### Product

É a identidade principal do item vendido: X-Bacon, Marmita Executiva, Açaí ou
Bolo de Pote. Continua ligado à categoria, imagem, descrição, destaque,
disponibilidade e ordenação já existentes.

O produto terá dois modos de precificação:

- `simple`: usa `products.price`, como hoje;
- `variant`: exige uma variante ativa e usa o preço dela.

Grupos de opções podem existir nos dois modos. Portanto, um produto simples pode
ter adicionais sem precisar criar uma variante artificial.

### Variant

É uma versão vendável do produto com nome e preço próprios. Exemplos: P, M, G;
300 ml, 500 ml; individual, família.

### OptionGroup

Agrupa escolhas e suas regras. Exemplos: “Escolha o ponto”, “Proteína”,
“Adicionais” e “Remover ingredientes”. Na V1, o grupo pertence ao produto e se
aplica a todas as variantes desse produto.

### Option

É uma escolha dentro de um grupo. Exemplos: “Ao ponto”, “Frango”, “Cheddar” e
“Sem cebola”. Pode ter acréscimo de preço zero ou positivo.

## 3. Variantes

Cada variante deve possuir:

- `id` próprio;
- `product_id`;
- `name`;
- `sku` ou identificador externo opcional;
- `price`;
- `active`, para ciclo de vida;
- `available`, para indisponibilidade temporária;
- `sort_order`;
- timestamps.

Regras:

- produto em modo `variant` exige exatamente uma variante selecionada;
- produto em modo `simple` não aceita `variant_id` no pedido;
- preço deve ser não negativo e ter duas casas decimais;
- variante inativa não aparece; variante indisponível pode aparecer como esgotada,
  mas não pode ser comprada;
- exclusão física deve ser evitada no uso normal; desativação preserva histórico;
- na vitrine, produto com variantes exibe “a partir de” usando o menor preço
  disponível, sem transformar esse valor em fonte de verdade do checkout.

Não é necessário criar variante “Padrão” para produtos atuais da La'Bel.

## 4. Grupos de opções

Um grupo deve armazenar:

- `name`;
- `selection_mode`: `single` ou `multiple`;
- `min_selections`;
- `max_selections` opcional para múltipla escolha;
- `presentation_mode`: `choice`, `addition` ou `removal`;
- `active`;
- `sort_order`;
- timestamps.

O caráter obrigatório é derivado de `min_selections > 0`, evitando duas fontes
de verdade. A interface pode mostrar “Obrigatório” ou “Opcional”.

Regras:

- `min_selections >= 0`;
- `max_selections`, quando informado, deve ser maior ou igual ao mínimo;
- grupo `single` deve ter máximo igual a 1;
- grupo obrigatório precisa ter pelo menos uma opção ativa e disponível;
- opções repetidas não contam duas vezes;
- limites são validados novamente no servidor no momento do pedido;
- na V1, o máximo técnico por grupo e por item deve ser limitado para evitar
  payloads abusivos, por exemplo até 50 escolhas.

`presentation_mode` é genérico e resolve a apresentação sem conhecer o segmento:

- `choice`: `Ponto: ao ponto`;
- `addition`: `+ Cheddar`;
- `removal`: `- Cebola`.

Dependência condicional entre variante, grupo e opção fica fora da V1.

## 5. Opções

Cada opção deve possuir:

- `id`;
- `option_group_id`;
- `name`;
- `price_delta`, acréscimo unitário não negativo;
- `active`;
- `available`;
- `sort_order`;
- timestamps.

Regras:

- a opção deve pertencer a um grupo do mesmo produto enviado no item;
- opção inativa ou indisponível não pode ser selecionada;
- cada opção aparece no máximo uma vez por item na V1;
- `price_delta` é aplicado por unidade do produto. Duas unidades configuradas com
  cheddar multiplicam o acréscimo por dois;
- quantidades de um mesmo adicional, descontos e preço por linha inteira são
  extensões futuras, não parte do MVP.

## 6. Snapshot imutável do pedido

`order_items` deve continuar sendo a fonte histórica do produto vendido. Para
novos pedidos, cada linha preservará:

- `product_id`, apenas como referência opcional ao catálogo atual;
- `product_name`, snapshot já existente;
- `variant_id`, referência opcional;
- `variant_name`, snapshot opcional;
- `base_unit_price`, preço do produto simples ou da variante naquele momento;
- `options_unit_price`, soma dos acréscimos selecionados por unidade;
- `unit_price`, preço final unitário já existente;
- `quantity`;
- `item_notes`, observação específica da linha;
- `configuration_signature`, assinatura canônica opcional para diagnóstico;
- timestamps.

As opções escolhidas devem ser persistidas em linhas normalizadas de
`order_item_options`, contendo:

- referências opcionais `option_group_id` e `option_id`;
- snapshots `group_name` e `option_name`;
- snapshot de `presentation_mode`;
- snapshot de `price_delta`;
- ordenação do grupo e da opção no momento da compra.

As referências ao catálogo usam `ON DELETE SET NULL`; os textos e preços de
snapshot nunca são apagados. O preço histórico sempre vem do item do pedido, não
de um `JOIN` com o catálogo atual.

Exemplo histórico:

```text
product_name: X-Bacon
variant_name: Grande
base_unit_price: 28.00
options_unit_price: 6.00
unit_price: 34.00
item_notes: cortar ao meio
options:
  - Adicionais / Cheddar / addition / 3.00
  - Adicionais / Bacon / addition / 3.00
  - Remover ingredientes / Cebola / removal / 0.00
```

Se o administrador renomear o produto, mudar preços ou excluir uma opção, esse
registro permanece exatamente igual.

## 7. Carrinho e identidade de linha

Hoje `CartProvider` mescla por `product.id`. O novo carrinho precisa distinguir a
configuração completa.

A identidade lógica de uma linha será criada a partir de uma representação
canônica de:

```text
productId
variantId ou null
optionIds únicos ordenados
itemNotes normalizada
```

Quantidade e preços não participam da identidade. A representação pode ser
serializada e convertida em uma chave/hash local, chamada aqui de `lineKey`.

Exemplos:

```text
2x X-Bacon + cheddar  -> uma linha, quantidade 2
1x X-Bacon sem cheddar -> outra linha
1x X-Bacon, obs. cortar ao meio -> outra linha
```

As ações `increaseItem`, `decreaseItem` e `removeItem` passam a operar pelo
`lineKey`, não pelo `productId`. O formato persistido no `localStorage` deve ser
versionado para permitir migração do carrinho atual. Itens simples existentes
podem ser convertidos automaticamente para:

```text
variantId: null
optionIds: []
itemNotes: null
```

O carrinho pode exibir um preço calculado com o catálogo público atual para boa
experiência, mas esse valor é apenas uma estimativa. Checkout e caixa sempre
revalidam no servidor.

## 8. Precificação e validação no servidor

### Payload permitido

O cliente envia por linha somente:

```text
productId
variantId ou null
optionIds[]
quantity
itemNotes ou null
```

O cliente nunca envia como valor confiável:

- preço do produto;
- preço da variante;
- preço das opções;
- preço final unitário;
- subtotal ou total calculado no browser.

### Algoritmo autoritativo

Para cada linha, o servidor deve:

1. validar formato, quantidade, limites e tamanho da observação;
2. carregar o produto e confirmar `active` e `available`;
3. de acordo com `pricing_mode`, rejeitar ou exigir uma variante;
4. confirmar que a variante pertence ao produto e está ativa/disponível;
5. carregar todos os grupos ativos e suas opções;
6. rejeitar IDs duplicados, desconhecidos, inativos ou pertencentes a outro
   produto;
7. validar seleção única/múltipla e limites mínimo/máximo de todos os grupos;
8. calcular `baseUnitPrice` a partir do banco;
9. somar `price_delta` das opções carregadas do banco;
10. calcular `unitPrice`, subtotal do item e subtotal do pedido;
11. criar os snapshots usando nomes, preços e ordenação lidos do banco;
12. inserir pedido, itens, opções e pagamentos de forma atômica.

Fórmula da V1:

```text
baseUnitPrice = product.price OU variant.price
optionsUnitPrice = soma(options.price_delta)
unitPrice = baseUnitPrice + optionsUnitPrice
itemTotal = unitPrice * quantity
orderSubtotal = soma(itemTotal)
```

A criação deve ocorrer em uma única transação. Como o cliente Supabase não mantém
transação entre chamadas independentes, a implementação recomendada é uma RPC
versionada que valida o catálogo e grava todos os snapshots. O site e o POS podem
ter entradas distintas para autenticação e dados do pedido, mas devem reutilizar
o mesmo contrato de seleção e as mesmas regras de precificação.

Se o catálogo mudar entre a abertura da tela e o envio, o servidor deve retornar
erro estruturado de catálogo alterado/indisponível. O browser atualiza o carrinho e
pede confirmação; nunca aceita o preço antigo silenciosamente.

Idempotência deve incluir a seleção canônica de variante/opções e observação no
fingerprint. Caso contrário, dois pedidos configurados podem ser confundidos.

## 9. Compatibilidade integral com a La'Bel

A evolução será estritamente aditiva:

- `products.pricing_mode` terá default `simple`;
- `products.price` continuará obrigatório e autoritativo no modo simples;
- produtos poderão ter zero variantes e zero grupos;
- linhas históricas continuarão válidas com os novos campos nulos/default;
- o botão atual “Adicionar” continuará direto para produto simples;
- o carrinho atual será migrado localmente sem perder produtos simples;
- relatórios continuarão agrupando pelo produto principal;
- impressões e WhatsApp sem configuração manterão exatamente a apresentação
  atual;
- nenhum produto da La'Bel precisará ser recadastrado.

A aplicação deve escolher o fluxo por capacidade do produto, nunca por preset ou
segmento. Não haverá condições como `if (segment === "hamburgueria")`.

## 10. Caixa / POS

O POS deve usar o mesmo catálogo configurável e o mesmo conceito de `lineKey`:

- toque em produto simples: adiciona diretamente, como hoje;
- toque em produto configurável: abre configurador;
- edição de uma linha: reabre o configurador com a seleção atual;
- linhas iguais podem ser somadas; linhas com escolhas ou observações diferentes
  permanecem separadas;
- revisão exibe variante, opções e observação;
- `createCashierSale` recebe somente IDs, quantidade e observação;
- a RPC de caixa revalida disponibilidade e preço antes de registrar pagamento.

`orders`, `order_payments`, fechamento, estorno e cálculo de dinheiro esperado não
precisam mudar: eles recebem o total autoritativo já calculado. A RPC atual
`create_cashier_sale` deve ganhar uma versão nova, mantendo a versão existente
durante a transição dos produtos simples.

## 11. Impressão e WhatsApp

Impressão, detalhes administrativos e WhatsApp devem receber um único modelo de
apresentação derivado dos snapshots, evitando formatações divergentes.

Exemplo:

```text
1x X-Bacon — R$ 34,00
  Tamanho: Grande
  + Cheddar — R$ 3,00
  + Bacon — R$ 3,00
  - Cebola
  Obs: cortar ao meio
```

Regras:

- `choice` usa `Grupo: Opção`;
- `addition` usa `+ Opção` e mostra acréscimo quando maior que zero;
- `removal` usa `- Opção`;
- ordem segue os snapshots de `sort_order`;
- pedidos simples não ganham linhas extras;
- observação geral do pedido permanece separada da observação do item.

Arquivos impactados no futuro: `OrderDetailsDialog`, página de impressão de
pedido, montagem manual da mensagem no `CheckoutDrawer` e `lib/whatsapp.ts`.

## 12. Relatórios

O produto principal continua sendo a dimensão padrão:

- quantidade vendida é atribuída a `product_id`/`product_name`;
- faturamento usa `order_items.unit_price * quantity`, que já inclui opções;
- ranking de produtos e baixa saída continuam compatíveis;
- pedidos históricos sem novas colunas continuam participando normalmente.

Dimensões futuras opcionais:

- variante: `variant_id`, com fallback para `variant_name` do snapshot;
- opção: `order_item_options.option_id`, com fallback para nome e grupo;
- receita base: `base_unit_price * quantity`;
- receita de adicionais: `options_unit_price * quantity`.

Não se deve somar `price_delta` diretamente sem multiplicar pela quantidade do
item. Relatórios por opção devem contar tanto seleções quanto unidades vendidas,
pois são métricas diferentes.

## 13. Perdas

O modelo atual registra perda do produto principal e estima valor usando o preço
de venda atual. Isso não é estoque nem custo de mercadoria.

Para o MVP, perdas podem continuar no produto principal. Antes de habilitar
produtos somente com variantes no POS, a tela deve aceitar uma variante opcional e
o registro deve guardar:

- `variant_id` opcional;
- `variant_name` como snapshot;
- `unit_value` como snapshot usado no cálculo;
- `estimated_value = unit_value * quantity`.

Opções não representam ingredientes em estoque. Perder cheddar, massa, carne ou
embalagem exige um futuro módulo de ingredientes/fichas técnicas e não deve ser
simulado com `ProductOption`. Perda de um produto final configurado também fica
fora da V1.

## 14. Banco de dados proposto

Não criar estas estruturas nesta fase. Nomes finais devem ser confirmados antes da
primeira migration.

### 14.1 Alteração aditiva em `products`

| Coluna | Tipo | Regra |
|---|---|---|
| `pricing_mode` | `text not null default 'simple'` | `CHECK IN ('simple', 'variant')` |

`price` continua existente. Em `simple`, é o preço base. Em `variant`, fica apenas
como fallback de compatibilidade e não participa do preço autoritativo.

### 14.2 `product_variants`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `product_id` | `uuid` | FK `products(id) ON DELETE CASCADE`, not null |
| `name` | `text` | not null, tamanho limitado |
| `sku` | `text` | nullable, identificador próprio quando necessário |
| `price` | `numeric(10,2)` | not null, `>= 0` |
| `active` | `boolean` | not null, default true |
| `available` | `boolean` | not null, default true |
| `sort_order` | `integer` | not null, default 0, `>= 0` |
| `created_at` | `timestamptz` | not null, default `now()` |
| `updated_at` | `timestamptz` | not null, default `now()` |

Índices:

- `(product_id, sort_order, id)`;
- único parcial em `sku` quando não nulo, se o identificador for adotado;
- unicidade case-insensitive de nome dentro do produto deve ser validada no
  admin e, preferencialmente, por índice funcional.

### 14.3 `product_option_groups`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `uuid` | PK |
| `product_id` | `uuid` | FK `products(id) ON DELETE CASCADE`, not null |
| `name` | `text` | not null, tamanho limitado |
| `selection_mode` | `text` | `single` ou `multiple` |
| `min_selections` | `integer` | not null, default 0, `>= 0` |
| `max_selections` | `integer` | nullable, entre mínimo e limite técnico |
| `presentation_mode` | `text` | `choice`, `addition` ou `removal` |
| `active` | `boolean` | not null, default true |
| `sort_order` | `integer` | not null, default 0, `>= 0` |
| `created_at` / `updated_at` | `timestamptz` | not null |

Constraints:

- `max_selections IS NULL OR max_selections >= min_selections`;
- grupo `single` exige `max_selections = 1`;
- limite técnico máximo, inicialmente 50;
- nome único case-insensitive por produto.

Índice: `(product_id, sort_order, id)`.

### 14.4 `product_options`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `uuid` | PK |
| `option_group_id` | `uuid` | FK `product_option_groups(id) ON DELETE CASCADE` |
| `name` | `text` | not null, tamanho limitado |
| `price_delta` | `numeric(10,2)` | not null, default 0, `>= 0` |
| `active` | `boolean` | not null, default true |
| `available` | `boolean` | not null, default true |
| `sort_order` | `integer` | not null, default 0, `>= 0` |
| `created_at` / `updated_at` | `timestamptz` | not null |

Índices:

- `(option_group_id, sort_order, id)`;
- nome único case-insensitive dentro do grupo.

### 14.5 Alterações aditivas em `order_items`

| Coluna | Tipo | Regra |
|---|---|---|
| `variant_id` | `uuid` | FK `product_variants(id) ON DELETE SET NULL`, nullable |
| `variant_name` | `text` | snapshot nullable |
| `base_unit_price` | `numeric(10,2)` | snapshot; inicialmente nullable para migração |
| `options_unit_price` | `numeric(10,2)` | not null, default 0, `>= 0` |
| `item_notes` | `text` | nullable, limite sugerido de 300 caracteres |
| `configuration_signature` | `text` | nullable, diagnóstico/idempotência |

`unit_price` permanece como preço final unitário. Após backfill,
`base_unit_price` pode se tornar not null e uma constraint pode garantir:

```text
unit_price = base_unit_price + options_unit_price
```

Índices opcionais para relatório: `variant_id` e `product_id` já existente ou a
ser confirmado no schema remoto antes da migration.

### 14.6 `order_item_options`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `uuid` | PK |
| `order_item_id` | `uuid` | FK `order_items(id) ON DELETE CASCADE`, not null |
| `option_group_id` | `uuid` | FK `product_option_groups(id) ON DELETE SET NULL`, nullable |
| `option_id` | `uuid` | FK `product_options(id) ON DELETE SET NULL`, nullable |
| `group_name` | `text` | snapshot not null |
| `option_name` | `text` | snapshot not null |
| `presentation_mode` | `text` | snapshot not null |
| `price_delta` | `numeric(10,2)` | snapshot not null, `>= 0` |
| `group_sort_order` | `integer` | snapshot not null |
| `option_sort_order` | `integer` | snapshot not null |
| `created_at` | `timestamptz` | not null, default `now()` |

Índices:

- `(order_item_id, group_sort_order, option_sort_order, id)` para leitura;
- `(option_id, created_at)` para análise futura;
- `(option_group_id, created_at)` para análise futura.

Snapshots são imutáveis. Atualização administrativa de catálogo não atualiza esta
tabela.

### 14.7 Evolução opcional de `product_losses`

| Coluna | Tipo | Regra |
|---|---|---|
| `variant_id` | `uuid` | FK `product_variants(id) ON DELETE SET NULL`, nullable |
| `variant_name` | `text` | snapshot nullable |
| `unit_value` | `numeric(10,2)` | snapshot não negativo |

Essa alteração pertence a uma etapa posterior ao núcleo de catálogo.

## 15. Segurança e RLS

### Catálogo público

`product_variants`, `product_option_groups` e `product_options` precisam de RLS.
Leitura `anon`/`authenticated` deve ser limitada a registros `active = true` cujo
produto pai também esteja ativo. `available` deve ser legível para permitir exibir
esgotados, mas impede compra no servidor.

Somente colunas públicas devem ser concedidas ao papel anônimo. Se `sku` ou futuros
campos internos não forem públicos, usar grants por coluna ou uma view pública
`security_invoker`; não confiar em selecionar poucos campos no frontend como
controle de acesso.

### Escrita administrativa

Criação, edição, ordenação, ativação e disponibilidade exigem usuário
administrativo com permissão `catalog`. Operações que alteram vários registros
devem ser transacionais e auditadas.

### Pedido e snapshots

`order_items` e `order_item_options` não têm leitura pública direta. A criação
pública passa por Server Action protegida por Turnstile, rate limit e idempotência,
e a gravação ocorre por função/RPC server-side. Administradores leem conforme a
permissão de pedidos; alterações arbitrárias de snapshots não devem ser concedidas.

O servidor deve impedir:

- IDOR por opção/variante de outro produto;
- seleção de registros inativos/indisponíveis;
- duplicação de IDs para burlar máximo de escolhas;
- preço, subtotal ou snapshot fornecido pelo navegador;
- payloads excessivos;
- mutation de pedido histórico após a criação.

Nenhuma policy será alterada até a migration específica ser revisada e testada em
ambiente isolado.

## 16. Plano de migração incremental

### Etapa A — Contratos e testes de caracterização — complexidade média

- criar tipos de domínio e DTOs públicos/server-only;
- registrar casos simples atuais como testes de compatibilidade;
- testar seleção canônica, limites e precificação como funções puras;
- não alterar banco nem UI.

### Etapa B — Schema aditivo e leitura — complexidade alta

- criar tabelas, constraints, índices e RLS em migration local;
- adicionar colunas nullable/default sem remover nada;
- backfill `base_unit_price = unit_price` nos itens históricos;
- gerar tipos de banco e testar migration/rollback em Supabase isolado;
- La'Bel continua no caminho simples.

### Etapa C — Administração do catálogo — complexidade alta

- manter cadastro atual como “Produto simples”;
- adicionar modo configurável, editor de variantes, grupos e opções;
- validar grupos obrigatórios e disponibilidade;
- adicionar auditoria e testes de concorrência/ordenação.

### Etapa D — Configurador público e carrinho V2 — complexidade alta

- carregar DTO público do catálogo;
- abrir configurador somente quando necessário;
- migrar `localStorage` para carrinho versionado;
- usar `lineKey` e mostrar snapshots de apresentação;
- manter adição direta dos produtos La'Bel.

### Etapa E — Checkout autoritativo e snapshots — complexidade alta

- criar RPC transacional versionada;
- validar IDs, regras, disponibilidade e preços no servidor;
- persistir snapshots completos;
- devolver erro estruturado quando o catálogo mudar;
- preservar temporariamente o caminho atual para payload simples até a nova RPC
  estar validada.

### Etapa F — Caixa / POS — complexidade alta

- reutilizar configurador e identidade de linha;
- criar versão configurável da RPC de venda presencial;
- validar pagamentos contra o total recalculado;
- manter fechamento, estorno e impressão atuais.

### Etapa G — Consumidores operacionais — complexidade média

- detalhes do pedido;
- impressão;
- WhatsApp;
- relatórios por produto e preparação das dimensões opcionais;
- perda por variante opcional.

### Etapa H — Remoção do caminho legado — complexidade média

Somente após todos os produtos simples, site e POS passarem pela nova precificação
com resultados equivalentes. Remover duplicação interna, não remover
`products.price` nem exigir recadastro.

## 17. Escopo MVP e futuro

### MVP necessário

- produto simples ou com variantes;
- uma variante obrigatória em produto `variant`;
- grupos single/multiple;
- mínimo e máximo de escolhas;
- opções com acréscimo fixo não negativo;
- disponibilidade por produto, variante e opção;
- observação por item;
- snapshots completos;
- mesmo comportamento no site e no POS;
- impressão, WhatsApp e relatório principal compatíveis.

Esse conjunto atende:

- hamburgueria: tamanho, ponto, adicionais e remoções;
- marmitaria: tamanho, proteína, acompanhamentos e adicionais;
- açaí: tamanho, complementos e limites;
- pizzaria simples: tamanho, um sabor e borda;
- confeitaria: tamanho, sabor, adicionais e personalização textual simples.

### Futuro, fora da V1

- combos e produtos compostos;
- pizza meio a meio e estratégias de preço por fração;
- quantidade repetida do mesmo adicional;
- grupos/opções condicionais por variante ou por escolha anterior;
- preço ou disponibilidade de uma opção sobrescrito por variante;
- descontos ou `price_delta` negativo;
- estoque, custo e perda por ingrediente;
- ficha técnica e baixa de insumos;
- opções com preço por linha em vez de por unidade;
- regras de capacidade, horários ou disponibilidade por canal.

## 18. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Mesclar linhas diferentes | Pedido incorreto | `lineKey` canônico incluindo variante, opções e observação |
| Confiar no preço do browser | Fraude e divergência financeira | Reprecificação integral e transacional no servidor |
| Alterar pedido histórico ao editar catálogo | Auditoria e relatórios inválidos | Snapshots normalizados e FKs `SET NULL` |
| Quebrar produtos atuais | Impacto direto na La'Bel | `pricing_mode = simple` por default e testes de caracterização |
| Duplicar regras entre site e POS | Totais diferentes | Mesmo contrato de seleção e mesmo motor/RPC de precificação |
| RLS expor dados internos | Vazamento | Grants por coluna/view pública e testes anon/admin |
| Regras condicionais crescerem cedo demais | Complexidade e bugs | Produto/grupo/opção simples na V1; dependências condicionais adiadas |
| Migration divergir do schema real | Falha operacional | Comparar schema local/remoto somente em fase autorizada e usar dry-run isolado |
| Perdas confundirem preço com custo | Indicador financeiro enganoso | Nomear como valor estimado e adiar estoque/custo por ingrediente |

## 19. Ordem recomendada de implementação

1. Contratos de domínio e testes de compatibilidade simples.
2. Migration aditiva local, tipos e RLS em ambiente isolado.
3. Motor autoritativo de validação/precificação e testes de segurança.
4. CRUD administrativo de variantes, grupos e opções.
5. Configurador público e carrinho V2.
6. Checkout transacional e snapshots.
7. Caixa/POS usando o mesmo contrato.
8. Impressão, WhatsApp, detalhes e relatórios.
9. Perdas por variante, se houver demanda operacional.
10. Primeiro catálogo fictício multissegmento completo para validação E2E.

## 20. Critérios de aceite da implementação futura

- um produto simples atual gera exatamente o mesmo preço, pedido e impressão;
- nenhum produto La'Bel precisa ser recadastrado;
- duas configurações diferentes do mesmo produto não são mescladas;
- preço adulterado no browser não altera o total salvo;
- opção de outro produto, inativa ou acima do limite é rejeitada;
- alteração/exclusão do catálogo não muda pedidos históricos;
- site e POS produzem o mesmo preço para a mesma seleção;
- produto principal continua aparecendo corretamente nos relatórios;
- testes de RLS comprovam leitura pública limitada e escrita administrativa;
- Encomendas permanece sem alteração e fora deste fluxo.
