# Produção, monitoramento e recuperação

## Monitoramento

Depois da publicação, configure um monitor HTTP para consultar
`https://SEU-DOMINIO/api/health` a cada cinco minutos.

- `200 {"status":"ok"}`: aplicação, banco e Storages respondendo.
- `503 {"status":"degraded"}`: verificar o Supabase e os logs do deploy.

Erros inesperados do servidor são registrados nos logs como JSON com o
evento `server_request_error`. O registro contém rota e tipo da operação,
mas não inclui cabeçalhos, formulários, telefone ou endereço do cliente.

## Estratégia de backup

O backup nativo do banco é a fonte principal para restauração. Confira
periodicamente em **Supabase > Database > Backups** se há um ponto recente.
Projetos sem backup automático devem executar regularmente um `db dump` pela
CLI do Supabase e guardar a cópia fora do computador da loja.

Os objetos do Storage não são restaurados pelo backup do banco. Por isso,
execute também:

```bash
npm run backup:check
npm run backup
```

O primeiro comando apenas valida o acesso e não grava dados. O segundo cria
a cópia local.

O comando cria `backups/<data-e-hora>` com:

- uma cópia JSON dos dados da aplicação;
- a lista das contas administrativas, sem senhas;
- todas as imagens de produtos;
- o catálogo, as imagens e os pedidos de encomenda guardados no Storage;
- um manifesto para conferir a quantidade de registros e arquivos.

A pasta `backups` contém dados pessoais de clientes, está ignorada pelo Git
e deve ser copiada para um local privado e criptografado. Nunca envie essa
pasta ao GitHub, WhatsApp ou e-mail comum.

O snapshot JSON serve para conferência e recuperação pontual; ele não
substitui o backup completo do banco, pois não contém senhas, políticas RLS,
gatilhos nem todas as configurações do projeto.

### Frequência recomendada

- Banco: backup diário ou o menor intervalo disponível no plano.
- Storage: executar `npm run backup` diariamente e antes de alterações grandes.
- Teste de recuperação: a cada três meses, usando um projeto separado.

## Recuperação de incidente

1. Interrompa temporariamente o recebimento de novos pedidos.
2. Anote a hora aproximada em que o problema ocorreu.
3. Restaure o banco pelo painel do Supabase para um ponto anterior ao incidente.
4. Reenvie pelo painel ou por uma ferramenta S3 apenas os arquivos ausentes
   das pastas `backups/.../storage/product-images` e
   `backups/.../storage/preorder-catalog`.
5. Confira as variáveis da Vercel e as permissões das contas administrativas.
6. Acesse `/api/health` e confirme a resposta `200`.
7. Faça um pedido diário e uma encomenda de teste antes de reabrir o sistema.

Uma restauração real pode causar perda dos pedidos recebidos depois do ponto
escolhido. Ela deve ser feita somente depois de preservar uma cópia do estado
atual e confirmar o horário correto.

## Antes de cada publicação

```bash
npm run lint
npm run build
```

Depois do deploy:

1. abra a loja e o painel administrativo;
2. confira `/api/health`;
3. confirme que `SITE_URL` contém o domínio público final, sem barra no fim;
4. confira `/robots.txt`, `/sitemap.xml` e `/opengraph-image`;
5. valide login, cardápio, pedido, encomenda e impressão;
6. acompanhe os logs durante os primeiros pedidos reais.

## Referências oficiais

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/storage/management/download-objects
