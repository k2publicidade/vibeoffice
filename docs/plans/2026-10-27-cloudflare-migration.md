# Migração completa do VibeOffice para Cloudflare

## Objetivo e estado

Migrar dados e serviços atualmente dependentes de Supabase para Cloudflare, preservando registros, vínculos, arquivos, contas e autorização. O sistema atual continua em produção até a validação da substituição.

Em 27/10/2026 foi criado o D1 `vibeoffice-staging`, ID `c1fc1888-9b7b-4d1b-847e-8bf33282ad65`. O banco está vazio, não conectado à aplicação. A conta Cloudflare tem acesso ao destino. A conta disponível do Supabase ainda não acessa o projeto de origem; o usuário informou que entrará na conta correta.

O inventário estático encontrou 32 tabelas e 62 funções nas migrações. No aplicativo há 231 chamadas candidatas em 47 arquivos: 122 de tabela, 24 de RPC, 7 de Storage, 53 de Auth e 25 de Realtime. Há 26 chamadas dinâmicas que exigem revisão. As contagens são do código, não do banco real.

## Substituições

| Hoje | Destino previsto | Trabalho necessário |
| --- | --- | --- |
| PostgreSQL/Supabase | D1/SQLite | Converter tipos, enums, arrays/JSON, índices, constraints e referências; preservar UUIDs e precisão monetária. |
| RLS e funções SQL | API em Workers com autorização no servidor | Reproduzir cada regra por cargo, usuário ativo, setor, propriedade, atribuição, compartilhamento e MFA. Não oferecer execução SQL ao navegador. |
| RPCs de gravação | Operações atômicas em D1 | Tarefa/responsáveis/ticket/agenda e lançamento/agenda devem confirmar ou reverter juntos; preservar idempotência de uploads e limpeza. |
| Supabase Auth | Autenticação e sessões revisadas, armazenadas em D1 | Avaliar biblioteca compatível com Workers; preservar hashes compatíveis quando possível. Não copiar sessões antigas nem desativar MFA para facilitar a migração. |
| Storage | R2 privado | Copiar bytes, metadados e referências; conferir tamanho/checksum e ACL de download/upload/compartilhamento. URLs antigas não bastam como backup. |
| Realtime | Durable Objects/WebSockets | Autorizar assinatura e publicação por sala/usuário, incluindo alterações de acesso, bloqueio e desativação. |
| Jobs e notificações | Workers/Queues/Cron conforme o fluxo | Preservar retries, deduplicação, recibos e autorização dos webhooks. Validar e-mail e push separadamente. |
| Next.js em Vercel | Workers com adaptador compatível | Validar o Next.js existente, proxy/middleware, cookies, uploads e APIs antes da virada. Não mudar framework só para concluir o banco. |

## Sequência de implementação

1. Exportar o esquema real e os dados em snapshot consistente, além de contas e inventário/bytes de arquivos. Guardar backup privado e verificar contagens/checksums. A ferramenta preparada em `scripts/cloudflare-export-source.mjs` cobre dados/estrutura e metadados, não os blobs.
2. Comparar o esquema real com as migrações do Git. Revisar diferenças e converter explicitamente para D1. Não usar substituições de texto em SQL como conversor automático de segurança/transações.
3. Implementar autenticação e autorização server-side. Bloquear anonimamente por padrão, proteger mutações contra CSRF e manter proteção de sessão, recuperação e MFA. Definir o tratamento de senhas/fatores não portáveis antes de mexer nas contas.
4. Migrar cada módulo em homologação, começando por usuários/tarefas/tickets/agenda, depois chat, Drive, cursos, estúdio, lançamentos e demais recursos. Usar o inventário para eliminar cada dependência direta do Supabase no runtime.
5. Copiar arquivos para R2 privado, reconciliar todos os caminhos, tamanhos e checksums e testar compartilhamento positivo e negativo. Não ativar exposição pública do bucket como solução para permissões.
6. Fazer ensaio completo com cópia privada da origem. Validar todos os critérios abaixo. Testes unitários com mocks não comprovam que o novo backend funciona.
7. Na janela de virada, suspender escritas na origem, fazer snapshot/cópia final ou aplicar o delta validado, reconciliar contagens/checksums e só então mudar a aplicação/DNS. Evitar dois backends aceitando escritas divergentes.
8. Monitorar erros, latência e operações centrais. Manter a origem e o backup preservados até validar o período de observação. Se houver rollback depois de aceitar novas escritas em Cloudflare, reconciliar essas escritas antes de retornar à origem.

## Validação necessária

- Login, logout, expiração/revogação de sessão, recuperação e MFA com contas de teste autorizadas. Perfis Admin/Gerente/Colaborador e conta inativa/anônima, sem ampliar acesso entre perfis.
- Criação de demanda pelo colaborador no setor permitido, autoatribuição e vínculo ao ticket/calendário; rollback de falhas; edição/exclusão somente quando permitidas; não anunciar sucesso para zero registros alterados.
- Chat, grupos, DMs, reações, recibos e anexos com assinatura/publicação negadas a terceiros e usuários desativados.
- Drive hierárquico, compartilhamento view/edit/manage, movimentação, retomada de upload, limpeza e acesso privado/público conforme a regra original.
- Cursos, progresso, materiais, reservas sem sobreposição, lançamentos, histórico, relatórios e preferências/notificações.
- Contagem por tabela, integridade de FKs, IDs preservados, índices/constraints válidos, valores monetários exatos, fusos e datas compatíveis. Arquivos conferidos por tamanho e checksum.
- Build compatível com Workers, testes de integração no destino, quotas/custos avaliados com volume medido e ausência de credenciais no frontend/logs.

## Bloqueios e limites atuais

A migração não foi concluída. Falta acesso ao banco de origem ou um backup completo, a exportação dos arquivos e a implementação/validação dos serviços Cloudflare. O D1 criado não contém dados do usuário. Não há justificativa para trocar a produção para esse banco ainda. Nenhum teste realizado nesta preparação garante que todo o sistema funcionará em D1.

O R2 exige ativação de assinatura e aceite de termos com cobrança por excedentes. A confirmação foi pedida ao usuário diante da tela de ativação; enquanto não respondida, o R2 permanece desativado. Os sete testes da preparação (inventário e integridade/exportação simulada) passaram; não são testes do backend migrado nem da exportação real. Lint dos scripts sem erros.
