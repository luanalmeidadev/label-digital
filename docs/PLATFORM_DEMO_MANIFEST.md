# Manifesto de demonstração da Platform

Este fluxo liga dois projetos que permanecem independentes:

```text
Label Digital Platform
  -> exporta JSON público
Label Digital Core
  -> valida JSON
  -> carrega preset conhecido
  -> aplica overrides permitidos
  -> gera Installation Profile efetivo
  -> executa demo no Supabase local
```

Não existe sincronização direta, deploy automático ou acesso do Core ao banco
da Platform nesta fase.

## Contrato versão 1

O loader aceita o formato atualmente produzido por
`createDemoManifest()` na Platform:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-08-28T12:00:00.000Z",
  "business": {
    "name": "Brasa Burger",
    "slug": "brasa-burger",
    "segment": "hamburgueria",
    "preset": "demo-burger"
  },
  "theme": {
    "primary": "#155EEF",
    "secondary": "#0E9384"
  },
  "contact": {
    "whatsapp": "5511990000000",
    "email": "contato@brasa-burger.example",
    "instagram": "@brasa_burger_demo"
  },
  "location": {
    "address": "Rua das Brasas, 250",
    "city": "Florianópolis",
    "state": "SC"
  }
}
```

`expiresAt` é uma extensão opcional aceita pelo Core. Quando presente, deve ser
uma data ISO futura. O formato atual da Platform não inclui esse campo.

Logo também não faz parte do manifesto atual. O Core usa os assets seguros do
preset base e não baixa imagens remotas. Uma futura versão do contrato poderá
adicionar logo somente depois de definir origem, armazenamento e validação.

## Campos e precedência

O preset continua definindo:

- segmento e comportamento do Core;
- módulos habilitados;
- catálogo/seed local;
- assets de fallback;
- textos próprios do segmento.

O manifesto pode sobrescrever apenas:

- nome, nome curto e slug;
- cor principal e cor secundária;
- WhatsApp, e-mail e Instagram informados;
- logradouro/número, cidade e estado informados;
- identidade derivada em SEO, metadata, Schema.org, Hero e documentos.

Campos opcionais ausentes preservam o valor do preset. O catálogo comercial
`demo-burger` continua vindo de `scripts/demo-burger-catalog.mjs`, e Encomendas
permanece desligado pelas flags do preset.

## Executar localmente

Com Docker Desktop e o Supabase local iniciados, execute no diretório do Core:

```powershell
npm.cmd run demo:manifest -- "C:\caminho\brasa-burger.json"
```

O runner:

1. limita o arquivo a JSON e 64 KB;
2. valida todo o contrato antes de tocar no seed;
3. lê exclusivamente as credenciais retornadas por `supabase status` local;
4. rejeita URLs que não usem `localhost` ou `127.0.0.1`;
5. executa o seed já registrado para o preset;
6. injeta o manifesto validado apenas no processo filho;
7. inicia a aplicação em `http://127.0.0.1:3100`.

Não é necessário editar `.env.local`.

Testes de integração e validação visual usam o mesmo runner:

```powershell
npm.cmd run demo:manifest -- "tests\fixtures\platform-manifests\brasa-burger.json" --test
npm.cmd run demo:manifest -- "tests\fixtures\platform-manifests\brasa-burger.json" --visual
```

O Next.js permite somente um `next dev` por diretório. Feche uma instância local
incompatível antes do modo `--visual`; se já existir uma instância com o mesmo
manifesto em `localhost:3000`, o runner pode reutilizá-la.

## Segurança

Objetos e campos desconhecidos são rejeitados em todos os níveis. A lista
fechada impede que o manifesto declare service role, secrets, env vars,
comandos, paths, SQL ou URLs internas. WhatsApp, e-mail, Instagram, slug, HEX,
UF, versão, datas, tamanhos e compatibilidade segmento/preset são validados.

Em `NODE_ENV=production`, o manifesto só pode ser resolvido quando o processo
estiver explicitamente em modo `local` e a URL pública do Supabase também for
local. Assim, uma instalação normal da La'Bel não ativa uma demo por acidente.

## Fora de escopo

Continuam manuais e não implementados: upload de logo, deploy, Vercel API,
Supabase Management API, domínio, sincronização Platform/Core, provisionamento
hospedado e billing.
