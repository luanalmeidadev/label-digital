# Demo comercial Brasa Burger

A Brasa Burger é uma instalação fictícia usada exclusivamente para demonstrar o Core white-label em ambiente local ou de testes. Ela não usa dados, contatos, imagens ou infraestrutura da La'Bel.

## Pré-requisitos

1. Docker Desktop ativo.
2. Supabase local iniciado com `npx supabase start`.
3. Migrations locais aplicadas.

## Preparar os dados

```bash
npm run demo:burger:seed
```

O seed é protegido por uma validação de host local (`localhost` ou `127.0.0.1`), usa identificadores determinísticos e pode ser executado novamente. Para recriar somente os dados que pertencem ao demo:

```bash
npm run demo:burger:reset
```

Ele cria quatro categorias, cinco produtos, variantes, grupos de opções, dados operacionais fictícios, um caixa aberto e a conta local:

- E-mail: `admin@brasa-burger.test`
- Senha: `Brasa-Demo-2026!`

Essas credenciais são apenas de desenvolvimento e não são usadas pelo preset ou pelo runtime de produção.

## Executar

```bash
npm run demo:burger
```

O runner injeta URLs e chaves do Supabase local no processo, seleciona `demo-burger` e inicia a aplicação em `http://127.0.0.1:3100`. Ele não lê uma URL remota como fallback.

## Validar

```bash
npm run demo:burger:test
npm run demo:burger:visual
```

Esses dois comandos limpam e recriam somente os registros marcados como demo
antes da execução. O modo `npm run demo:burger` preserva os dados criados
durante a navegação manual.

As capturas visuais ficam em `test-results/demo-burger/` e não são versionadas.

## Escopo demonstrado

- produto simples;
- produto com variantes, escolha obrigatória, adicionais pagos e remoções gratuitas;
- carrinho e checkout;
- pedidos online e de caixa com snapshots;
- impressão e detalhes administrativos;
- relatórios por produto, variante e opção;
- perda por produto e variante.

O Combo Burger é intencionalmente um produto simples. Combos avançados, estoque por ingrediente, multi-tenancy, Platform e billing não fazem parte desta demonstração.
