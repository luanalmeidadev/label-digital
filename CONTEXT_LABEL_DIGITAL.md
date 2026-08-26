# CONTEXTO DO PROJETO — LA'BEL DIGITAL

> Arquivo de contexto para uso com Codex/assistente de desenvolvimento.
> Atualizado em 2026-08-14 com base no histórico desta conversa.
> Objetivo: permitir que outra ferramenta entenda rapidamente o que já existe, decisões tomadas, arquitetura, regras de negócio, segurança e próximos passos.

---

## 1. VISÃO GERAL DO PROJETO

Projeto: **La'bel Digital**

Tipo: cardápio digital + checkout + administração para uma confeitaria.

Stack principal:
- Next.js 16.x com App Router
- React / TypeScript
- Tailwind CSS
- Supabase
- Supabase Auth
- Supabase Storage
- Supabase Realtime
- `@supabase/ssr`
- `@supabase/supabase-js`
- `lucide-react`

Estrutura geral conhecida:

```text
app/
  admin/
    (dashboard)/
      pedidos/
      produtos/
      categorias/
      clientes/
      configuracoes/
      entregas/
      faturamento/
    login/
  store/
    checkout/
      actions.ts
  page.tsx

components/
  admin/
    AdminSidebar.tsx
    EditProductDialog.tsx
    NewProductDialog.tsx
    DeleteProductDialog.tsx
    OrderDetailsDialog.tsx
    OrdersRealtime.tsx
  store/
    Header.tsx
    Hero.tsx
    CategoryGrid.tsx
    MenuSections.tsx
    PreorderBanner.tsx
    CartProvider.tsx
    CartUI.tsx
    CheckoutDrawer.tsx
    AddToCartButton.tsx

lib/
  supabase/
    client.ts
    server.ts
    admin.ts
```

---

## 2. IDENTIDADE VISUAL

Marca: **La'bel Confeitaria**

Cores muito usadas:
- Vermelho principal: `#8B0000`
- Fundo: `#FFFDF9`
- Creme/bege: `#D2B48C`
- Texto principal: `#241B19`
- Texto secundário: `#756A66`
- Bordas: `#EEE6DF`
- Fundo secundário: `#F7F0EA`

Logo:
```text
/brand/logo-creme.svg
```

Ícone:
```text
/brand/icon-vermelho.svg
```

Foi corrigido aviso do Next Image no `AdminSidebar.tsx` definindo as duas dimensões em CSS:

```tsx
<Image
  src="/brand/logo-creme.svg"
  alt="La'bel Confeitaria"
  width={105}
  height={42}
  className="h-[42px] w-[105px]"
  priority
/>
```

Ainda pode existir `404 /favicon.ico`; isso não foi tratado ainda.

---

## 3. HOME / CARDÁPIO PÚBLICO

A Home pública carrega:
- Header
- Hero
- Categorias
- Destaques
- Produtos por categoria
- Banner de encomendas
- Carrinho
- Checkout

Arquivo principal:
```text
app/page.tsx
```

A Home consulta:
- `categories`
- `products`

Campos já usados em `products`:
```text
id
category_id
name
description
price
image_url
image_position_x
image_position_y
product_type
available
featured
active
sort_order
```

A Home passou a respeitar o enquadramento salvo das fotos usando:

```tsx
style={{
  objectPosition: `${
    product.image_position_x ?? 50
  }% ${
    product.image_position_y ?? 50
  }%`,
}}
```

### MenuSections

Arquivo:
```text
components/store/MenuSections.tsx
```

Regras:
- Destaques mostram apenas produtos:
  - `featured = true`
  - `available = true`
- Produtos indisponíveis continuam visíveis no cardápio com indicação de indisponibilidade.
- Produto sem imagem usa fallback visual.
- Cards usam `object-cover`.

---

## 4. AJUSTE DE ENQUADRAMENTO DAS FOTOS

Foi implementado suporte a posicionamento da foto do produto sem crop físico.

Colunas adicionadas em `public.products`:

```sql
image_position_x integer not null default 50
image_position_y integer not null default 50
```

Faixa:
```text
0 a 100
```

Centro padrão:
```text
50 / 50
```

### Cadastro de produto

Arquivo:
```text
components/admin/NewProductDialog.tsx
```

Foi adicionado:
- preview da imagem
- slider Horizontal
- slider Vertical
- atualização em tempo real via `objectPosition`
- hidden fields:
  - `image_position_x`
  - `image_position_y`

### Edição de produto

Arquivo:
```text
components/admin/EditProductDialog.tsx
```

O componente recebe:
```ts
imagePositionX: number;
imagePositionY: number;
```

Estados:
```ts
const [positionX, setPositionX] = useState(imagePositionX);
const [positionY, setPositionY] = useState(imagePositionY);
```

A imagem existente pode ser reposicionada mesmo sem trocar o arquivo.

A listagem do admin também usa `objectPosition`.

### Actions de produtos

Arquivo:
```text
app/admin/(dashboard)/produtos/actions.ts
```

A action de criação e de edição já:
- lê `image_position_x`
- lê `image_position_y`
- valida 0..100
- salva em `products`

Upload de imagem:
- bucket: `product-images`
- formatos:
  - JPG
  - PNG
  - WebP
- máximo: 5 MB

Helpers existentes:
- `validateImage`
- `createImagePath`
- `extractStoragePath`
- `uploadProductImage`
- `removeProductImage`

---

## 5. CARRINHO E CHECKOUT

O carrinho público foi implementado com:
```text
CartProvider
CartUI
```

O carrinho:
- acompanha o scroll com botão flutuante
- mostra quantidade de itens
- abre modal/drawer
- permite revisar itens, quantidade e total

Checkout:
```text
components/store/CheckoutDrawer.tsx
```

Server Actions:
```text
app/store/checkout/actions.ts
```

Fluxo atual:

```text
Cliente adiciona produtos
→ Carrinho
→ Checkout
→ WhatsApp
→ Pedido criado
→ Status "Enviado ao WhatsApp"
```

Status usados:
```text
created
sent_to_whatsapp
confirmed
out_for_delivery
ready_for_pickup
completed
cancelled
```

Labels no admin:
```text
Criado
Enviado ao WhatsApp
Confirmado
Saiu para entrega
Pronto para retirada
Finalizado
Cancelado
```

---

## 6. CLIENTES

Tabela:
```text
customers
```

Campos conhecidos:
```text
id uuid
auth_user_id uuid nullable
first_name text
last_name text
phone text
created_at timestamptz
```

### Regra de identidade do cliente

O telefone é usado como identificador do cliente no fluxo atual.

O telefone é normalizado:
```ts
phone.replace(/\D/g, "")
```

O banco tem:
```text
customers_phone_key UNIQUE(phone)
customers_auth_user_id_key UNIQUE(auth_user_id)
customers_auth_user_id_fkey FOREIGN KEY(auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
```

Uma constraint duplicada em `phone` foi removida.

### Cliente recorrente

Ao digitar o telefone:
- se existir cliente:
  - busca cadastro
  - preenche Nome e Sobrenome automaticamente
  - campos ficam bloqueados
  - não sobrescreve o nome salvo
- se não existir:
  - permite preencher normalmente
  - cria cliente no pedido

Foi decidido que **não deve ser possível alterar automaticamente o nome de um cliente existente apenas informando o mesmo telefone**, para evitar que alguém digite um número errado e renomeie outra pessoa.

---

## 7. ENDEREÇOS SALVOS

Tabela:
```text
addresses
```

Campos conhecidos:
```text
id uuid
customer_id uuid
label text nullable
zip_code text
street text
number text
complement text nullable
neighborhood text
city text
reference text nullable
is_default boolean
created_at timestamptz
```

Checkout suporta:
- múltiplos endereços por cliente
- endereço principal
- labels:
  - Casa
  - Trabalho
  - Outro
- selecionar endereço salvo
- adicionar novo
- excluir endereço
- reaproveitar endereço existente
- evitar duplicação por:
  - CEP
  - rua
  - número

Se o endereço excluído era principal:
- outro endereço vira principal

Se excluir o último:
- checkout muda para modo de novo endereço

### CEP

Usa ViaCEP.

Regiões de entrega atuais:
- Palhoça
- São José

---

## 8. REGIÕES / TAXA DE ENTREGA

Tabela:
```text
delivery_zones
```

Campos conhecidos:
```text
id uuid
neighborhood text
delivery_fee numeric nullable
active boolean
created_at timestamptz
fee_type text
```

Dados atuais vistos:
```text
Palhoça | consult | NULL | true
São José | consult | NULL | true
```

Tipos:
```text
fixed
consult
```

Se `fixed`:
- soma taxa ao total

Se `consult`:
- entrega fica "a consultar"

---

## 9. PEDIDOS

Tabela:
```text
orders
```

Campos conhecidos:
```text
id uuid
order_number bigint
customer_id uuid nullable
address_id uuid nullable
order_type text
status text
subtotal numeric
delivery_fee numeric
total numeric
notes text nullable
created_at timestamptz
completed_at timestamptz nullable
```

Itens:
```text
order_items
```

Campos conhecidos:
```text
id uuid
order_id uuid
product_id uuid nullable
product_name text
quantity integer
unit_price numeric
created_at timestamptz
```

### Tipos de pedido

```text
pickup
delivery
```

### Criação do pedido

A action:
- valida itens
- consulta produtos reais no banco
- não confia no preço do navegador
- valida disponibilidade
- soma subtotal no servidor
- valida região
- calcula taxa
- cria cliente se necessário
- reutiliza cliente existente
- reutiliza endereço existente
- cria pedido
- cria itens
- remove pedido se os itens falharem

---

## 10. WHATSAPP DO CHECKOUT

Número usado:
```text
+55 48 8868-1096
```

No código:
```text
5548988681096
```

Fluxo mobile:
```text
whatsapp://send?phone=...&text=...
```

Fallback desktop:
```text
https://wa.me/...
```

Status continua sendo marcado como:
```text
sent_to_whatsapp
```

Foi decidido manter o label:
```text
Enviado ao WhatsApp
```

### Mensagem atual formatada

Estrutura aproximada:

```text
🍰 *LA'BEL CONFEITARIA*
*Pedido #XX*

👤 *CLIENTE*
Nome Sobrenome
📱 telefone

🛍️ *ITENS*
1x Produto — R$ XX,XX

📍 *ENTREGA*
ou
📍 *RETIRADA NA LOJA*

💰 *RESUMO*
Produtos: R$ XX,XX
Taxa de entrega: *a consultar*
*Subtotal: R$ XX,XX*

Podemos confirmar o pedido? 😊
```

Importante:
- linhas vazias são preservadas
- filtro correto:
```ts
.filter((line) => line !== null)
```

Não usar:
```ts
.filter((line) => line !== "")
```
porque isso remove os espaçamentos.

---

## 11. IMPRESSÃO DE PEDIDO

Já foi implementada uma rota de impressão para pedido:

```text
/admin/pedidos/[id]/imprimir
```

Pedido confirmado ou em etapas posteriores mostra botão:
```text
Imprimir
```

Status que permitem impressão:
```text
confirmed
ready_for_pickup
out_for_delivery
completed
```

A impressão foi feita em formato de comanda térmica / estilo iFood.

No mobile:
- abre nova guia
- usuário ainda precisa clicar em imprimir
- impressão totalmente automática foi adiada até existir impressora/configuração adequada

---

## 12. ADMIN DE PEDIDOS — REALTIME

Problema identificado:
- novos pedidos só apareciam após F5

Solução implementada:
```text
Supabase Realtime
```

Tabela:
```text
public.orders
```

Já está na publication:
```text
supabase_realtime
```

Componente criado:
```text
components/admin/OrdersRealtime.tsx
```

Versão final:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";

export default function OrdersRealtime() {
  const router = useRouter();

  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
```

Na página de pedidos:
```tsx
<OrdersRealtime />
```

Eventos:
```text
INSERT
UPDATE
DELETE
```
porque `event: "*"`.

### Correção importante do client Supabase

Antes o client usava:
```ts
createClient
```

Foi trocado para `@supabase/ssr`, para compartilhar corretamente a sessão do admin.

Arquivo:
```text
lib/supabase/client.ts
```

Conteúdo atual:

```ts
import { createBrowserClient } from "@supabase/ssr";

export const supabase =
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
```

Servidor:

```text
lib/supabase/server.ts
```

Usa:
```ts
createServerClient
cookies()
```

Não confundir `client.ts` com `server.ts`.

---

## 13. SUPABASE ADMIN CLIENT / SERVICE ROLE

Arquivo:
```text
lib/supabase/admin.ts
```

Estrutura:

```ts
import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL não configurada."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

Usado em:
```text
app/store/checkout/actions.ts
```

Esse arquivo começa com:
```ts
"use server";
```

Nunca importar `admin.ts` em componente `"use client"`.

---

## 14. VARIÁVEIS DE AMBIENTE

Nomes atuais:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Nunca expor:
```text
SUPABASE_SERVICE_ROLE_KEY
```

Nunca transformar em:
```text
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
```

`.gitignore` já contém:
```gitignore
.env*
```

Verificações já feitas:
```bash
git status
git ls-files | findstr /I ".env"
git grep -n "createSupabaseAdminClient"
git grep -n "SUPABASE_SERVICE_ROLE_KEY"
```

Resultado:
- `.env.local` não está no Git
- service role aparece apenas em `lib/supabase/admin.ts`

---

## 15. RLS / SEGURANÇA DO SUPABASE

RLS está ativo em:
```text
addresses
admin_profiles
categories
customers
delivery_zones
order_items
orders
products
```

Policies atuais:

### Público
Pode ler:
- categorias ativas
- produtos ativos
- regiões de entrega ativas

### Admin autenticado
Pode gerenciar:
- produtos
- categorias
- clientes
- endereços
- pedidos
- itens de pedido
- regiões de entrega

### Dados privados
Não há policy pública de leitura para:
- customers
- addresses
- orders
- order_items

Isso está correto.

---

## 16. SEGURANÇA DOS CLIENTES / OTP

Foi identificado um problema importante:

Hoje:
```text
cliente digita telefone
→ Server Action usa service role
→ busca nome e endereços
```

Isso significa que, em produção, alguém poderia descobrir dados de outro cliente apenas sabendo o telefone.

Foi planejado implementar verificação de telefone via OTP antes de liberar dados salvos.

Tabela `customers` já está preparada:
```text
auth_user_id UNIQUE
FOREIGN KEY → auth.users(id)
ON DELETE SET NULL
```

### Supabase Phone Auth

Foi estudado usar:
- Phone OTP
- eventualmente WhatsApp OTP via Twilio

Decisão:
- **Twilio NÃO será ativado agora**
- OTP foi adiado
- antes do deploy, precisa voltar para essa questão

IMPORTANTE:
- em produção, não liberar automaticamente nome/endereço apenas com telefone sem alguma forma de verificação
- excluir endereço também precisa ser protegido por identidade/sessão, não apenas `phone + addressId`

---

## 17. LOGIN ADMIN

Admin usa:
```text
Supabase Auth
```

Layout admin verifica:
```ts
supabase.auth.getUser()
```

Depois verifica existência em:
```text
admin_profiles
```

Sem admin:
```text
redirect("/admin/login")
```

Existe hoje 1 usuário em `auth.users` sem telefone, provavelmente o admin.

---

## 18. FATURAMENTO

Tela de faturamento já existe.

Filtros:
- Hoje
- 7 dias
- 30 dias
- Este mês
- Todos
- Personalizado

Foi decidido que os campos Data Inicial / Data Final só aparecem ao clicar em:
```text
Personalizado
```

Indicadores vistos:
- Faturamento hoje
- Faturamento do período
- Faturamento total
- Ticket médio
- Vendas finalizadas

---

## 19. CONFIGURAÇÕES

Tela de configurações já existe e inclui:

### Dados da loja
- Nome
- WhatsApp
- Instagram
- Endereço para retirada
- Retirada no local
- Entrega

### Horários de funcionamento
Por dia da semana:
- aberto/fechado
- horário inicial
- horário final

### Regiões de entrega
Exemplos:
- Palhoça
- São José

Permite:
- adicionar
- editar
- salvar
- ativar/desativar
- excluir

---

## 20. STATUS / FLUXO OPERACIONAL DOS PEDIDOS

Fluxo pensado desde o início:

```text
Cliente faz pedido
→ Criado

Clicou para enviar ao WhatsApp
→ Enviado ao WhatsApp

Venda fechada pelo WhatsApp
→ Confirmado

Depois:
→ Pronto para retirada
ou
→ Saiu para entrega

Final:
→ Finalizado
```

Cancelamento:
```text
Cancelado
```

Pedidos finalizados entram no faturamento.

---

## 21. NOTIFICAÇÕES AUTOMÁTICAS DE STATUS PELO WHATSAPP

Nova necessidade identificada:

Quando status mudar para:
```text
confirmed
```
enviar mensagem automática ao cliente.

Quando mudar para:
```text
out_for_delivery
```
enviar mensagem automática.

Possível também:
```text
ready_for_pickup
```

Exemplos:

Confirmado:
```text
🍰 La'bel Confeitaria
Pedido #23 confirmado! ✅

Já estamos preparando seu pedido.
Avisaremos por aqui quando houver uma nova atualização.
```

Saiu para entrega:
```text
🛵 Seu pedido saiu para entrega!
Pedido #23

Agora é só aguardar. ❤️
Obrigado por escolher a La'bel!
```

Pronto para retirada:
```text
🎁 Seu pedido está pronto para retirada!
Pedido #23
Rua Capitão Augusto Vidal, 3600 — Palhoça/SC
```

### Estratégia desejada

Preferência:
```text
WhatsApp Cloud API oficial da Meta
```

Evitar Twilio para esse caso, se possível, para reduzir intermediários/custos adicionais.

Arquitetura futura:

```text
updateOrderStatus()
→ atualiza status
→ status confirmed?
  → enviar mensagem
→ status out_for_delivery?
  → enviar mensagem
```

Ideal registrar notificações para evitar duplicidade, por exemplo:
```text
confirmed_notified_at
out_for_delivery_notified_at
```

ou tabela:
```text
order_notifications
```

---

## 22. META / WHATSAPP BUSINESS

O WhatsApp da La'bel já é:
```text
WhatsApp Business App
```

Número:
```text
+55 48 8868-1096
```

Foi confirmado no Meta Business:
```text
Label - Confeitaria
WhatsApp Business App
```

A conta do WhatsApp aparece dentro da estrutura empresarial da Meta.

Na aba Phone numbers:
```text
+55 48 8868-1096
Status: Offline
```

Não interpretar esse `Offline` sozinho como ausência de Cloud API.

### Meta Business

Conta/portfólio:
```text
La'Bel Confeitaria Gourmet
```

Perfil que administra:
```text
Izabel Almeida
```

Status da conta:
- sem problemas aparentes
- página sem problemas aparentes

### Meta for Developers

Inicialmente apareceu:
```text
You don't have access.
This feature isn't available to you yet.
```

Depois o acesso funcionou.

Tela atual alcançada:
```text
Meta for Developers
→ Meus apps
→ Nenhum app por enquanto
→ Criar aplicativo
```

**PONTO EXATO ONDE PAROU:**
o próximo passo seria clicar em:
```text
Criar aplicativo
```

e configurar um app para usar WhatsApp Cloud API.

IMPORTANTE:
- não remover o número do business portfolio
- não migrar/desvincular o WhatsApp Business atual sem confirmar compatibilidade/coexistência
- preservar o uso normal do WhatsApp Business App no celular

---

## 23. ENCOMENDAS

Existe:
```text
components/store/PreorderBanner.tsx
```

O botão ainda não tem função.

Foi decidido que Encomendas será implementado depois.

Ideia futura:
```text
Cliente toca em Encomendar
→ escolhe data
→ descreve o pedido
→ tamanho/quantidade/sabor se aplicável
→ nome/WhatsApp
→ envia para La'bel
```

Encomenda deve ser separada do pedido normal.

Possível tabela:
```text
preorders
```
ou:
```text
custom_orders
```

Status sugeridos:
```text
requested
contacted
confirmed
completed
cancelled
```

Também pode existir uma área Encomendas no admin.

---

## 24. BUILD / EXECUÇÃO LOCAL

Comandos usados:

Dev local:
```bash
npm run dev
```

Para testar no celular pela rede:
```bash
npm run dev -- -H 0.0.0.0
```

Também foi usado IP explícito:
```bash
npm run dev -- -H 192.168.2.112
```

Celular e PC precisam estar na mesma rede Wi-Fi.

Exemplo de acesso:
```text
http://192.168.2.112:3000
```

Build:
```bash
npm run build
```

---

## 25. COMMITS IMPORTANTES FEITOS

Commits citados durante o desenvolvimento:

```text
feat: reuse customer data by phone on checkout
feat: add saved customer addresses to checkout
fix: improve checkout loading and error states
feat: add product image positioning
feat: add realtime order updates
```

Sempre que fechar uma funcionalidade estável:
```bash
git add .
git commit -m "..."
git push
```

---

## 26. PONTOS DE PRODUÇÃO JÁ DISCUTIDOS

Antes de publicar:

1. Resolver verificação do telefone / privacidade de endereços
2. Não deixar lookup de cliente por telefone expor dados privados sem verificação
3. Manter `SUPABASE_SERVICE_ROLE_KEY` somente no servidor
4. Revisar erros/loading
5. Revisar responsividade
6. Revisar estados vazios
7. Limpar dados de teste
8. Configurar deploy
9. Configurar WhatsApp Cloud API para notificações, se decidido
10. Configurar favicon
11. Avaliar rate limiting
12. Avaliar CAPTCHA em fluxos sensíveis
13. Revisar possíveis custos das APIs externas

---

## 27. DECISÕES IMPORTANTES DE PRODUTO

### Cliente recorrente
Usar telefone como chave, mas:
- não sobrescrever nome automaticamente
- futuramente exigir verificação para acessar dados salvos

### Endereço
- múltiplos por cliente
- principal
- excluir
- reutilizar
- não duplicar

### Produto indisponível
- continuar visível
- mostrar "Indisponível"
- não permitir adicionar ao carrinho

### WhatsApp
- manter status "Enviado ao WhatsApp"
- abrir app diretamente no mobile quando possível
- envio automático do checkout não existe via `wa.me`
- automação real exige API oficial

### Impressão
- manter confirmação de impressão do navegador por enquanto
- impressão automática pode ser estudada quando houver impressora física

### Encomendas
- separar de pedido normal
- implementar depois

### Realtime
- usar no admin de pedidos
- não foi considerado necessário para Home pública neste momento

---

## 28. CUIDADOS AO ALTERAR O PROJETO

### Não quebrar:
- login admin
- checkout
- múltiplos endereços
- carrinho
- impressão
- Realtime
- upload de imagens
- Service Role

### Supabase client/server/admin

Browser:
```text
lib/supabase/client.ts
```

Server:
```text
lib/supabase/server.ts
```

Admin/service role:
```text
lib/supabase/admin.ts
```

NÃO misturar esses arquivos.

### Nunca:
- colocar service role em `NEXT_PUBLIC_*`
- importar `admin.ts` em `"use client"`
- remover RLS para “resolver” erro de acesso
- criar policy pública para customers/addresses/orders apenas por conveniência

---

## 29. PRÓXIMOS PASSOS RECOMENDADOS

### Passo atual imediato
Continuar configuração do:
```text
Meta for Developers
→ Criar aplicativo
→ WhatsApp Cloud API
```

Objetivo:
- manter WhatsApp Business App funcionando
- avaliar coexistência
- obter integração oficial para notificações automáticas de status

### Depois
Implementar:
1. mensagem automática em `confirmed`
2. mensagem automática em `out_for_delivery`
3. opcional em `ready_for_pickup`
4. proteção contra envio duplicado

### Em seguida
Voltar para:
```text
PreorderBanner / Encomendas
```

### Antes do deploy
Voltar ao tema:
```text
OTP / verificação do telefone
```

---

## 30. ESTADO ATUAL RESUMIDO

Funcional:
- Admin autenticado
- Produtos
- Categorias
- Disponibilidade
- Destaques
- Upload de imagens
- Ajuste de enquadramento
- Home pública
- Carrinho
- Checkout
- Cliente recorrente
- Cliente novo
- Múltiplos endereços
- Endereço principal
- Exclusão de endereço
- CEP
- Regiões
- Pedido
- Itens
- WhatsApp
- Status
- Impressão
- Faturamento
- Configurações
- Realtime de pedidos

Pendente:
- Cloud API do WhatsApp
- notificações automáticas de status
- OTP/privacidade de clientes
- Encomendas
- favicon
- revisão final/deploy

---

## 31. INSTRUÇÃO PARA O CODEX

Ao continuar este projeto:

1. Leia este arquivo antes de alterar código.
2. Preserve as decisões de arquitetura e segurança descritas aqui.
3. Prefira alterações pequenas e testáveis.
4. Sempre indicar exatamente:
   - arquivo
   - trecho
   - o que substituir
   - comando de teste
5. Não presumir nomes de funções existentes sem olhar o arquivo atual.
6. Antes de alterar Supabase:
   - conferir schema
   - conferir RLS
   - conferir policies
7. Não expor secrets.
8. Não transformar Server Actions em Client Components sem necessidade.
9. Rodar:
```bash
npm run build
```
antes de considerar uma alteração concluída.
10. Quando fechar uma feature estável, sugerir commit separado.

---

Fim do contexto.
