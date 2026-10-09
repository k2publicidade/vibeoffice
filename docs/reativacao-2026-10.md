# Reativação do VIBEDISTRO Office

Aplicação: https://office.vibedistro.com. Projeto Supabase: `uipqqyqhwfzqhucvtrrf`.

O banco antigo está inacessível. O novo banco foi reconstruído a partir do código, sem importar históricos ou usuários fictícios. Contas autorizadas: ADMIN master `admin@vibedistro.com.br` e Gerente `gerencia@vibedistro.com.br`. O ADMIN cadastra os colaboradores em **Funcionários**. Senhas e chaves ficam fora do Git.

## Banco e permissões

As migrações em `supabase/migrations` foram aplicadas em ordem no banco novo. A primeira é uma instalação para banco vazio; não deve ser executada novamente em produção. As demais corrigem permissões, visibilidade de registros recém-criados, notificações, solicitações, anexos e resumos do chat. Faça backup antes de alterações futuras.

O banco valida os cargos pelo perfil ativo, restringe dados com RLS e mantém os buckets privados. O cadastro público não concede acesso ao escritório. O usuário não pode alterar seu próprio cargo, setor ou ativação. Reservas do mesmo estúdio não podem se sobrepor. Reações e confirmações de leitura são atualizadas atomicamente.

Quem ativou MFA precisa confirmar o autenticador para acessar dados do escritório, Storage e operações do chat, inclusive por chamadas diretas ao Supabase. Apenas o próprio perfil ativo pode ser lido durante o login anterior à confirmação. A regra é opcional por fator verificado, conforme a [documentação oficial do Supabase](https://supabase.com/docs/guides/auth/auth-mfa). Tokens antigos sem segunda etapa continuam bloqueados depois de confirmar MFA em outra sessão.

## Correções

- Autenticação, renovação de cookies, redirecionamentos e MFA; cadastro e gestão de funcionários pelo ADMIN.
- Tarefas e tickets com visibilidade por atribuição, comentários internos restritos e prevenção de duplicação durante Realtime.
- Solicitações e reuniões do painel persistidas no banco; calendário preserva os vínculos ao editar.
- Arquivos e materiais de cursos com referências persistentes e URLs assinadas renovadas ao carregar. Upload de capas e áudio de lançamentos no bucket correto.
- Drive carrega os acessos concedidos e distingue visualizar, editar e gerenciar. Links públicos têm página e download próprios; links privados exigem login, MFA quando habilitado e permissão no banco. Pastas propagam acesso aos descendentes. O banco impede ciclos, troca de titularidade e referências a arquivos de outro proprietário. A regra do Storage foi corrigida para permitir download/exclusão conforme o compartilhamento. Links assinados já emitidos expiram em até 60 segundos na página pública.
- Chat de setor, grupos e conversas diretas; menções, reações, leitura, resumos de todas as salas, anexos privados e gravação de áudio em navegadores compatíveis. Grupos têm gestão de membros pelo criador; conversas diretas não se duplicam. Bloqueio impede envio no banco, silenciamento interrompe notificações e arquivamento preserva as preferências. Presença e indicação de digitação usam canais privados autorizados.
- Preferências e notificações geradas no servidor, webhook autenticado, push com VAPID e repetição de entregas pendentes. E-mail depende de remetente e provedor configurados.
- Configurações reais de perfil, senha, tema e notificações. Chamadas do chat compartilham convites com link HTTPS de Meet/Zoom/Teams. O participante abre o link para entrar na reunião. Áudio/vídeo nativo não está implementado; o formato de chamadas está aguardando confirmação da preferência do usuário.
- Capas gera briefings e salva projetos no Supabase, com edição, arquivamento/restauração e importação explícita dos projetos antigos deste navegador. Colaboradores acessam seus próprios projetos; ADMIN/Gerente acompanham os projetos da equipe. O módulo não gera imagens por IA.
- Dependências de produção atualizadas; código de IA sem uso que continha chave embutida removido.

## Validação reproduzível

`npm test -- --runInBand`, `npm run lint` e `npm run build`.

Para testar o banco e a aplicação, configure `.env.local` e `OFFICE_AUDIT_ACCOUNTS` com o caminho de um JSON privado de duas contas de auditoria (ADMIN e Gerente), contendo `email`, `password`, `id` e `role`:

```powershell
node scripts/audit-database.mjs
node scripts/audit-http.mjs https://office.vibedistro.com
node scripts/audit-access.mjs https://office.vibedistro.com
node scripts/audit-drive.mjs https://office.vibedistro.com
node scripts/audit-mfa.mjs
```

Esses testes criam registros e contas temporárias, validam permissões positivas/negativas e removem os registros próprios. O teste de acesso confirma MFA, desativação de funcionário e Realtime. Não usar contas de pessoas que não autorizaram a auditoria.

## Pendências para concluir a auditoria

Site URL e redirects foram configurados no painel Supabase em 09/10/2026 para `https://office.vibedistro.com`, `/auth/callback**` e `/update-password`. Falta configurar um remetente autorizado com SMTP/Resend e testar entrega real de recuperação de senha e notificações. SMTP personalizado está desativado no projeto; o serviço padrão não atende funcionários externos. Validar push em dispositivo com permissão concedida pelo usuário. Avisos de desenvolvimento do lint e dependências de teste merecem manutenção separada; não foram tratados como falhas operacionais de produção.

A auditoria não implica restauração de dados históricos indisponíveis nem comprovação de funcionalidades externas sem credenciais/configuração. O relatório deve registrar a versão efetivamente publicada e os resultados em produção antes de dar a reativação por concluída.

## Evidências de publicação

Em 09/10/2026, a Vercel publicou a revisão `d00f47c` com estado READY no domínio oficial. A autenticação ADMIN foi confirmada pela interface, e a tela Funcionários exibiu as duas contas autorizadas. Os testes HTTP passaram nas 16 páginas e nas negativas de autorização, origem de requisição e webhook. Os testes de acesso em produção confirmaram cadastro, login, MFA, desativação de funcionário e entrega Realtime de reservas. O webhook autenticado retornou 200 e negou credencial inválida com 401.

Validação local: 77 testes passaram; compilação de produção passou; lint sem erros, com avisos legados; `npm audit --omit=dev` sem vulnerabilidades. Os testes do banco confirmaram CRUD, regras de acesso, cursos/progresso, arquivos privados, notificações, anexos por sala e conflito de reservas. Pela interface foram verificadas criação/persistência e mudança de status de tarefa, envio de mensagem privada e reação. Os registros de auditoria foram removidos, ficando duas contas ativas e nenhum histórico artificial de tarefas/tickets/mensagens.

A validação adicional confirmou persistência, edição e restauração de capas com controle de acesso, gestão atômica de participantes, DM única, silenciamento e bloqueio aplicado pelo banco. Broadcast privado entre participantes funcionou, e acesso de pessoa fora da sala foi negado. Os 24 conjuntos de dados públicos têm RLS e os quatro buckets são privados. A auditoria permanece em andamento até concluir as pendências de e-mail/autenticação, confirmar push em dispositivo autorizado e concluir a escolha do formato de chamadas.

Em seguida, a revisão `bb19686` foi publicada pela Vercel com estado READY no domínio oficial. Os testes HTTP e de acesso passaram novamente em produção. Pela interface foram confirmados criação de briefing, persistência após recarregar, arquivamento e restauração; no chat, silenciamento, edição de grupo, convite com link e arquivamento/restauração sem perder a preferência. Presença global e digitação em sala privada foram transmitidas entre duas contas autorizadas, enquanto entrada anônima no canal de presença foi negada. Os registros técnicos próprios foram removidos. A revisão passou por 77 testes, lint sem erros e compilação de produção.

A revisão `a7a56d6` foi publicada com estado READY. Notificações usam inscrições Realtime independentes; falhas de gravação não consomem a leitura e arquivamento/preferências atualizam a lista. Inicialização concorrente das 11 preferências preservou escolhas existentes. Em produção, destinatários inativos e avisos arquivados foram ignorados; e-mail solicitado sem provedor retornou falha explícita. O agendador de lembretes não duplicou avisos nem notificou funcionários inativos.

As revisões `9af4365` e `fd8f6e8` foram publicadas com estado READY. O Drive passou por testes reais no Supabase e HTTP em produção: leitura/edição/gerenciamento, herança em subpastas, download com bytes conferidos, revogação pública, exclusão autorizada de arquivo e negativas para acesso indevido, alteração de titularidade e ciclos. A interface mostrou a permissão real do gerente, copiou o link correto e gravou ativação/revogação pública de uma pasta técnica. A capa selecionada pelo Drive carregou em Lançamentos. O cabeçalho foi corrigido para não cobrir notificações/perfil; sino e menu foram verificados em desktop e em 390px. A leitura gravou `read_at` e zerou o contador. Validação: 80 testes, lint sem erros (356 avisos legados) e compilação de produção. Os registros temporários foram removidos.

Uma verificação adicional reproduziu acesso direto ao banco sem a segunda etapa de MFA. A migração `202610090010_mfa_enforcement.sql` corrigiu o banco e as operações com privilégios elevados. O teste `audit-mfa.mjs` confirmou bloqueio de leitura, gravação, diretório de funcionários, alteração de perfil, download e reação antes de verificar o código; confirmou acesso após MFA, negação de token antigo e restauração do acesso opcional ao remover o fator. Perfil inativo também não pode reagir pelo RPC. Todas as contas/arquivos técnicos desse teste foram removidos.
