# GEMINI / ANTIGRAVITY — LABEL DIGITAL

Leia `LABEL_DIGITAL_MASTER_CONTEXT.md` no início de uma nova sessão.

## Regras rápidas

- Core: `E:\Documents\label-digital`
- Platform: `E:\Documents\label-digital-platform`
- Não misturar os dois projetos.
- Não tocar produção/remotos sem autorização.
- Não fazer push/merge/deploy sem autorização.
- Usar Supabase local para testes.
- Rodar `npm run quality`.
- Commit isolado por fase.
- Parar e entregar resumo.

## Disco E:

Tudo que for instalável/configurável deve ir para E: sempre que possível:

```text
E:\DevTools\
E:\DevTools\npm-cache\
E:\DevTools\npm-global\
E:\DevTools\temp\
E:\DevTools\downloads\
```

Se alguma ferramenta exigir C:, informar antes.

## AG Kit

O usuário já executou:

```bash
npx @vudovn/ag-kit init
```

Os agentes instalados devem seguir o contexto mestre.

## Estado atual

Core:
```text
aa5f49e feat: add local demo runtime
```

Platform:
```text
105475a feat: add demo provisioning workflow
```

Próxima direção provável:
desenhar/substituir o provisionador mock da Platform por um provisionador remoto real.

Não iniciar essa fase sem autorização explícita.
