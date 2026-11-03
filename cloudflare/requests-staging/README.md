# Solicitações no D1 — homologação

Este Worker separado não usa Supabase. Apenas dados sintéticos são permitidos.
A interface de produção continua usando o backend atual. Esta primeira entrega é
uma API de homologação, sem integração com o frontend, login real ou notificações.

## Validação local

Da raiz do repositório, com Node.js 24:

```powershell
node --test cloudflare/requests-staging/worker.test.mjs
npx --yes wrangler d1 migrations apply vibeoffice-staging --local --config cloudflare/requests-staging/wrangler.json
npx --yes wrangler deploy --dry-run --config cloudflare/requests-staging/wrangler.json
```

## Publicação em homologação

A conta esperada termina em 8c93, conforme destination.json. Em 03/11/2026 a
sessão disponível termina em a7c1 e a consulta ao D1 esperado foi negada (10000).
Faça login na conta correta e confira o banco antes de aplicar a migração.
Não modifique o domínio, o deploy ou as variáveis de produção.

```powershell
npx --yes wrangler whoami
npx --yes wrangler d1 info vibeoffice-staging --config cloudflare/requests-staging/wrangler.json
npx --yes wrangler d1 migrations apply vibeoffice-staging --remote --config cloudflare/requests-staging/wrangler.json
npx --yes wrangler deploy --config cloudflare/requests-staging/wrangler.json
npx --yes wrangler secret put STAGING_TOKEN_HASHES --config cloudflare/requests-staging/wrangler.json
```

O segredo é um objeto JSON com chaves requester, phonograms e marketing.
Gere um token distinto por identidade com randomBytes(32).toString('base64url')
e guarde apenas o SHA-256 hexadecimal de cada token no objeto. Não versione
os tokens. Sem o segredo configurado, o Worker rejeita todas as requisições.
O acesso é temporário, somente para o piloto.

Envie Authorization: Bearer <token> às rotas:

- GET /catalog: tipos de solicitação e respectivos setores.
- POST /requests: type, reason, startDate e endDate (AAAA-MM-DD). O servidor
  determina solicitante e setor. Use phonogram-review para testar o novo setor.
- GET /requests: mostra as solicitações próprias e do setor autenticado.
- POST /requests/{id}/decision: decision accepted ou rejected. Apenas o setor
  de destino pode responder, uma única vez.

Antes de avançar para dados reais: validar as três identidades no Worker remoto;
integrar o frontend de homologação, autenticação e notificações; só depois planejar
importação e conferência de registros. Nenhuma mudança de produção está prevista.
