# Migração do VibeOffice para Cloudflare

Status em 27/10/2026: preparação, não migração concluída. O D1 `vibeoffice-staging` foi criado no plano gratuito, com zero tabelas de aplicação. A produção continua em Vercel/Supabase, com a correção de demandas do PR #6. Nenhum registro, arquivo ou conta foi copiado ainda. A origem requer acesso pela conta correta do Supabase.

O destino está identificado em `destination.json`. Os IDs são identificadores de recursos, não credenciais. Não cadastrar um banco vazio como produção nem trocar DNS/variáveis até a importação, a autorização e os testes de cada módulo estarem concluídos.

O R2 ainda não foi ativado. A conta solicita uma assinatura com aceite de termos e cobrança por excedentes; a autorização específica foi solicitada ao usuário. Nenhum bucket foi criado e nenhuma assinatura foi contratada nesta preparação.

## Inventário reproduzível

```powershell
node scripts/cloudflare-inventory.mjs > cloudflare/inventory.json
node --test scripts/__tests__/cloudflare-inventory.test.mjs scripts/__tests__/cloudflare-export-source.test.mjs
```

O inventário usa o parser TypeScript para registrar tabelas, RPCs, autenticação, buckets e canais com arquivo e linha. Chamadas dinâmicas ficam sinalizadas para revisão. As listas SQL representam as migrações no Git; não são uma inspeção do banco efetivamente instalado. O inventário pode incluir candidatos que exigem revisão manual e não substitui testes de ponta a ponta.

## Exportar a origem sem modificar dados

Configurar `DATABASE_URL` somente no `.env.local`, para o projeto de origem `uipqqyqhwfzqhucvtrrf`. Se necessário, `DATABASE_SSL_CA` aponta ao certificado oficial. A conexão verifica TLS; a ferramenta não aceita parâmetros SSL na URL que substituam essa verificação. Usar uma conta autorizada a ler as tabelas públicas e os metadados de Storage; `--include-auth` também exige leitura de contas e fatores MFA.

```powershell
node scripts/cloudflare-export-source.mjs export .migration-private/source-2026-10-27 --include-auth
node scripts/cloudflare-export-source.mjs verify .migration-private/source-2026-10-27
```

A exportação ocorre em uma transação `REPEATABLE READ READ ONLY`, com cursores de 250 registros. Usa `SET LOCAL row_security = off` para exigir erro se o papel da conexão receber linhas filtradas por RLS; isso não concede bypass nem altera políticas. Preserva o JSON textual do PostgreSQL para não arredondar valores `BIGINT`/`NUMERIC`. Inclui estrutura, constraints, índices, enums, políticas, funções e triggers, tabelas públicas e metadados de buckets/objetos. A opção de contas inclui hashes de senha e estado de MFA, mas não sessões, tokens de recuperação/confirmação ou segredos dos fatores.

Cada arquivo tem contagem de bytes e SHA-256; tabelas também têm contagem de linhas. A verificação exige todas as tabelas declaradas e detecta arquivos alterados/incompletos. O manifesto permanece `complete:false` em caso de falha. A ferramenta recusa sobrescrever snapshots existentes.

**Esse snapshot não contém os bytes dos arquivos do Storage e não é um backup físico/restaurável do PostgreSQL.** Ele é uma entrada de conversão, não SQL importável em D1. A cópia de Storage para R2 e sua verificação continuam obrigatórias. Também é necessário capturar e reconciliar alterações posteriores ao snapshot, ou suspender escritas durante a exportação final.

Snapshots ficam em `.migration-private/`, ignorado pelo Git, e contêm dados privados/hashes. Permissões POSIX são restritivas quando suportadas; no Windows, verificar a ACL da pasta. Nunca anexar snapshots, chaves ou hashes ao PR, aos issues ou ao chat. Não executar a exportação em runners compartilhados sem armazenamento privado apropriado.

## Arquitetura e critérios de virada

O plano detalhado está em `docs/plans/2026-10-27-cloudflare-migration.md`. A mudança exige substituir também Auth, Storage e Realtime; D1 não executa as funções PL/pgSQL e políticas PostgreSQL que o aplicativo usa hoje. A ferramenta de inventário/exportação não implementa essas substituições.

Referências oficiais: [D1](https://developers.cloudflare.com/d1/), [importação/exportação](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [chaves estrangeiras](https://developers.cloudflare.com/d1/sql-api/foreign-keys/), [WebSockets em Durable Objects](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) e [Next.js em Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/).
