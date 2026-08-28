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

## Runtime local oficial

Com Docker Desktop disponível, execute no diretório do Core:

```powershell
npm.cmd run demo:serve -- "C:\caminho\brasa-burger.json"
```

O runner:

1. limita o arquivo a JSON e 64 KB;
2. valida contrato, preset, segmento, slug e ambiente antes do seed;
3. inicia o Supabase local quando ele ainda não estiver disponível;
4. lê exclusivamente as credenciais retornadas por `supabase status` local;
5. rejeita URLs que não usem `localhost` ou `127.0.0.1`;
6. prepara o seed registrado para o preset;
7. injeta o manifesto validado apenas no processo Next.js filho;
8. aguarda `/api/health` responder `ok` e a Home apresentar o slug exato;
9. imprime o status final e mantém a aplicação ativa até `Ctrl+C`.

Saída esperada:

```text
Demo: Brasa Burger
Status: READY
URL: http://127.0.0.1:3100
Slug: brasa-burger
```

O runtime usa a porta fixa `127.0.0.1:3100`. Se ela estiver ocupada, a
execução falha com uma mensagem clara. O runner nunca reutiliza silenciosamente
uma instância existente, mesmo que o conteúdo pareça compatível.

Não é necessário editar `.env.local`.

## Modos

`--reset` executa `supabase db reset --local`, reaplica todas as migrations e
recria o catálogo demo antes de subir a aplicação:

```powershell
npm.cmd run demo:serve -- "C:\caminho\brasa-burger.json" --reset
```

`--test` sobe a aplicação, aguarda `READY`, executa o smoke/integrador local e
encerra somente os processos iniciados pelo runtime:

```powershell
npm.cmd run demo:manifest -- "tests\fixtures\platform-manifests\brasa-burger.json" --test
```

`--visual` usa o mesmo ciclo e executa o Playwright com a URL já validada:

```powershell
npm.cmd run demo:manifest -- "tests\fixtures\platform-manifests\brasa-burger.json" --visual
```

`--json` suprime os logs operacionais do próprio runtime e emite um resultado
estruturado para futura automação da Platform:

```powershell
npm.cmd run --silent demo:serve -- "C:\caminho\brasa-burger.json" --json
```

```json
{"status":"ready","name":"Brasa Burger","slug":"brasa-burger","url":"http://127.0.0.1:3100","preset":"demo-burger","segment":"hamburgueria"}
```

Em falhas, o mesmo formato usa `"status":"failed"` e uma mensagem sem secrets.
O `--silent` remove o cabeçalho que o próprio npm imprime antes de executar o
script, deixando o `stdout` adequado para consumo automatizado.

## Readiness e cleanup

O timeout de startup é de 120 segundos. A demo somente fica pronta quando:

- o Supabase local está acessível;
- o seed terminou;
- `/api/health` respondeu com `status: ok`;
- a Home respondeu com `data-installation-slug` igual ao manifesto.

Em timeout, erro, conclusão de teste ou `Ctrl+C`, o runner encerra a árvore do
Next.js que ele próprio iniciou. Se o Supabase já estava ativo, ele é preservado.
Se foi iniciado pelo runner, é desligado no cleanup sem apagar seus volumes. O
modo `--reset` é a única opção que apaga e recria o banco local.

## Compatibilidade operacional

Os comandos existentes continuam válidos:

- `demo:manifest` usa o mesmo runtime e aceita `--test` e `--visual`;
- `demo:burger`, `demo:burger:test`, `demo:burger:visual` e
  `demo:burger:reset` continuam disponíveis;
- `demo:serve` é o comando recomendado para execução humana ou automação futura.

## Segurança

Objetos e campos desconhecidos são rejeitados em todos os níveis. A lista
fechada impede que o manifesto declare service role, secrets, env vars,
comandos, SQL ou URLs internas. O caminho do manifesto é usado somente para
leitura de um JSON limitado; nenhum valor dele é interpolado em comandos de
shell. WhatsApp, e-mail, Instagram, slug, HEX, UF, versão, datas, tamanhos e
compatibilidade segmento/preset são validados.

O comando é bloqueado quando `NODE_ENV=production` ou `VERCEL_ENV` estiver
presente. Além disso, o Installation Profile só resolve o manifesto em modo
demo local e com URL pública do Supabase local. Assim, uma instalação normal da
La'Bel não ativa uma demo por acidente.

A saída bruta do Supabase CLI é capturada pelo runtime porque pode conter chaves
locais. Os logs operacionais nunca exibem variáveis de ambiente ou credenciais.

## Fora de escopo

Continuam manuais e não implementados: upload de logo, deploy, Vercel API,
Supabase Management API, domínio, sincronização Platform/Core, provisionamento
hospedado e billing.
