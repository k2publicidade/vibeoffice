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

A Vercel publicou a revisão de código `4d9027d` com estado READY. Depois da proteção adicional, as auditorias completas de banco e acesso em produção passaram, incluindo MFA pela interface HTTP, cadastro/desativação, preferências concorrentes e Realtime. A tela Funcionários continuou exibindo apenas ADMIN e Gerente autorizados. A conferência final encontrou duas contas, 24/24 tabelas públicas com RLS, quatro buckets privados, dois agendadores ativos e nenhum registro/arquivo temporário de auditoria.

## Auditoria de 10/10/2026

Os links de notificações passaram a abrir a tarefa, o ticket ou a conversa indicada. A seleção usa somente os registros retornados pelos hooks autorizados, espera o carregamento, preserva filtros e limpa o parâmetro ao fechar. Destinos inválidos ou sem acesso são rejeitados. Login e MFA preservam o destino, com proteção contra redirecionamentos externos. A interface confirmou abertura de tarefa/ticket/conversa, leitura da notificação e troca entre duas tarefas sem recarregar a página.

O editor de tarefas agora respeita abertura controlada pelo Kanban, troca o formulário quando muda a identidade do registro, preserva ausência de prazo ao editar e aguarda persistência antes de fechar. Erros mantêm o rascunho e mostram mensagem; o botão fica desabilitado durante a gravação. A interface confirmou abertura pela coluna Em Progresso e gravação da edição, além dos testes de regressão.

O webhook Resend/push retorna falha explícita por canal quando falta configuração ou ocorre erro de rede. O envio Resend tem timeout de dez segundos e preserva a chave de idempotência. Uma inscrição push malformada não interrompe o envio aos demais dispositivos. Essas condições foram reproduzidas por testes antes da correção.

Validação local desta rodada: 98 testes em 15 suítes; build de produção e TypeScript aprovados; lint sem erros (354 avisos legados); auditoria das dependências de produção sem vulnerabilidades. `scripts/audit-system.mjs <origin>` cria credenciais descartáveis, executa as cinco auditorias existentes e remove as contas e credenciais ao terminar. Banco, HTTP, acesso/Realtime, Drive e MFA passaram com a aplicação local ligada ao Supabase real. Houve um timeout Realtime na primeira execução; a reprodução isolada e a repetição completa passaram. O sucesso posterior não elimina a necessidade de acompanhar eventual recorrência.

O usuário escolheu Resend. A conta Resend está conectada; faltam verificar o domínio/remetente e configurar a chave; SMTP personalizado continua desativado. [Configuração e critérios de validação do Resend](./resend-configuration.md). Entrega real de e-mail, push no dispositivo e definição do formato de chamadas continuam pendentes. A revisão de código `426a632` foi publicada com estado READY em Production, com `office.vibedistro.com` entre os aliases confirmados. As cinco auditorias passaram no domínio oficial, incluindo cadastro/desativação, concorrência de preferências, Realtime, compartilhamento/download do Drive, revogação e MFA. A interface de produção preservou o destino ao acessar `/login?next=...` e abriu a tarefa com prazo ausente.


A migração `202610100001_atomic_tasks.sql` foi aplicada em 10/10 com TLS e certificado oficial verificados. `save_office_task` usa SECURITY INVOKER e preserva RLS, perfil ativo e MFA. Criação/edição transacionam tarefa, responsáveis, ticket e eventos automáticos. Uma atribuição inválida reverte tudo, inclusive alterações de título/prazo; a substituição mantém vínculos existentes sem emitir atribuições repetidas. Tickets automáticos acompanham título, prioridade, responsável e status inicial/alterado.

A agenda usa o horário exato do prazo, sincroniza edição e remoção, inclui responsáveis e preserva reuniões manuais. Eventos gerados têm origem explícita e índice único por tarefa; a interface direciona a edição para a tarefa. Arrastar esse evento atualiza o prazo por RPC. Remoção de data no editor foi reproduzida e corrigida. Auditoria SQL com ROLLBACK confirmou criação/edição inválidas, vínculo/status de ticket, horário escolhido, sincronização sem duplicação, preservação de reunião manual, colaborador autoatribuído, usuário inativo e acesso anônimo negados. Os auxiliares privados da agenda não são executáveis por usuários. A auditoria MFA confirmou também o novo RPC: acesso negado antes da segunda etapa, com token antigo e perfil inativo; acesso permitido após verificação.

Validação desta revisão: 105 testes em 16 suítes, lint sem erros e build/TypeScript aprovados. Para repetir a auditoria transacional, configure `OFFICE_AUDIT_ACCOUNTS` com conta Admin temporária, `SUPABASE_DB_HOST/USER/PASSWORD` e `DATABASE_SSL_CA` com o certificado oficial baixado do painel; execute `node scripts/audit-task-transactions.mjs`. A opção `--migration-preview` testa a migração antes de aplicá-la; tanto a migração quanto os registros desse modo são revertidos no fim. Não desativar validação de certificado.
A revisão `9cc3a93` foi publicada com estado READY no domínio oficial. As cinco auditorias passaram novamente em produção. Pela interface, limpar a data gravou `due_date = null` e removeu o evento automático; a agenda exibiu o prazo de uma tarefa técnica às 17:25–18:25, com responsável e link para a tarefa correta. A navegação do link foi verificada por teclado; o fechamento simultâneo do modal foi removido para deixar a navegação ser concluída pelo Link. As credenciais descartáveis do runner foram removidas.
Na conferência em tela pequena, o link para a tarefa quebrava em duas linhas e o centro da sua caixa não era clicável. A área do link passou a ocupar uma linha própria para ser acionável de forma consistente.
