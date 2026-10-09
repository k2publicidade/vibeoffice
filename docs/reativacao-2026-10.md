# Reativação do VIBEDISTRO Office

Aplicação: https://office.vibedistro.com. Projeto Supabase: `uipqqyqhwfzqhucvtrrf`.

O banco antigo está inacessível. O novo banco foi reconstruído a partir do código, sem importar históricos ou usuários fictícios. Contas autorizadas: ADMIN master `admin@vibedistro.com.br` e Gerente `gerencia@vibedistro.com.br`. O ADMIN cadastra os colaboradores em **Funcionários**. Senhas e chaves ficam fora do Git.

## Banco e permissões

As migrações em `supabase/migrations` foram aplicadas em ordem no banco novo. A primeira é uma instalação para banco vazio; não deve ser executada novamente em produção. As demais corrigem permissões, visibilidade de registros recém-criados, notificações, solicitações, anexos e resumos do chat. Faça backup antes de alterações futuras.

O banco valida os cargos pelo perfil ativo, restringe dados com RLS e mantém os buckets privados. O cadastro público não concede acesso ao escritório. O usuário não pode alterar seu próprio cargo, setor ou ativação. Reservas do mesmo estúdio não podem se sobrepor. Reações e confirmações de leitura são atualizadas atomicamente.

## Correções

- Autenticação, renovação de cookies, redirecionamentos e MFA; cadastro e gestão de funcionários pelo ADMIN.
- Tarefas e tickets com visibilidade por atribuição, comentários internos restritos e prevenção de duplicação durante Realtime.
- Solicitações e reuniões do painel persistidas no banco; calendário preserva os vínculos ao editar.
- Arquivos e materiais de cursos com referências persistentes e URLs assinadas renovadas ao carregar. Upload de capas e áudio de lançamentos no bucket correto.
- Chat de setor, grupos e conversas diretas; menções, reações, leitura, resumos de todas as salas, anexos privados e gravação de áudio em navegadores compatíveis.
- Preferências e notificações geradas no servidor, webhook autenticado, push com VAPID e repetição de entregas pendentes. E-mail depende de remetente e provedor configurados.
- Configurações reais de perfil, senha, tema e notificações. Removidas ações de demonstração sem implementação do chat (chamadas nativas, bloquear e silenciar). Reuniões usam o link de Meet/Zoom/Teams fornecido pelo usuário.
- Dependências de produção atualizadas; código de IA sem uso que continha chave embutida removido. Capas gera briefings e salva projetos no navegador, conforme a implementação existente; não gera imagens por IA.

## Validação reproduzível

`npm test -- --runInBand`, `npm run lint` e `npm run build`.

Para testar o banco e a aplicação, configure `.env.local` e `OFFICE_AUDIT_ACCOUNTS` com o caminho de um JSON privado de duas contas de auditoria (ADMIN e Gerente), contendo `email`, `password`, `id` e `role`:

```powershell
node scripts/audit-database.mjs
node scripts/audit-http.mjs https://office.vibedistro.com
node scripts/audit-access.mjs https://office.vibedistro.com
```

Esses testes criam registros e contas temporárias, validam permissões positivas/negativas e removem os registros próprios. O teste de acesso confirma MFA, desativação de funcionário e Realtime. Não usar contas de pessoas que não autorizaram a auditoria.

## Pendências para concluir a auditoria

Configurar e validar Site URL/redirects do Supabase para produção e a recuperação de senha por e-mail. Configurar um remetente autorizado com SMTP/Resend e testar entrega real. Validar push em dispositivo com permissão concedida pelo usuário. Avisos de desenvolvimento do lint e dependências de teste merecem manutenção separada; não foram tratados como falhas operacionais de produção.

A auditoria não implica restauração de dados históricos indisponíveis nem comprovação de funcionalidades externas sem credenciais/configuração. O relatório deve registrar a versão efetivamente publicada e os resultados em produção antes de dar a reativação por concluída.
