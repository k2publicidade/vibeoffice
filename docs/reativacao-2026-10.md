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
A revisão `0dd1398` foi confirmada READY/Production, com `office.vibedistro.com` entre os aliases. Na interface em tela pequena, clicar em “Editar tarefa vinculada” abriu o editor da tarefa técnica correta com horário 17:25. As contas, tarefas, tickets, salas, mensagens e notificações próprias de auditoria foram removidas por IDs conhecidos; as credenciais descartáveis da interface foram excluídas. A conferência final encontrou zero contas de auditoria, zero tarefas técnicas e zero eventos automáticos temporários. A investigação de retenção de rascunho em edição de evento manual está registrada em vibeoffice-16 para a próxima etapa; Resend, teste push e formato de chamadas continuam pendentes.

### Agenda manual: persistência e setores (10/10/2026)

- Criação e edição aguardam a gravação. Falhas mantêm os valores do formulário e exibem o erro; duplicação malsucedida e exclusão cancelada preservam os detalhes abertos.
- Escolher `Nenhum` remove os vínculos anteriores. O setor pode ser editado e é persistido. O último horário do dia prepara um intervalo válido de 23:00 a 23:30.
- Criação/duplicação não acrescentam outra cópia local quando o Realtime já entregou o mesmo evento. Exclusão exige uma linha retornada pelo banco para confirmar sucesso.
- A migração `202610100002_calendar_sector_edits.sql` aplica à edição a mesma autorização de setor da criação. A falha foi reproduzida antes da correção: um colaborador Marketing conseguia alterar seu evento para Financeiro.
- Validação: 115 testes em 17 suites, build com TypeScript e lint sem erros. `scripts/audit-calendar-transactions.mjs` valida criação/edição por setor, remoção de vínculo, cópia, privilégios do administrador e exclusão bloqueada para inativos. Todos os registros e contas dessa auditoria são revertidos na mesma transação.
- Executar a auditoria com `DATABASE_SSL_CA` apontando para o certificado oficial do Supabase, além de `SUPABASE_DB_HOST`, `SUPABASE_DB_USER` e `SUPABASE_DB_PASSWORD`. `--migration-preview` testa a migração sem aplicá-la permanentemente.

As revisões `2c25f2c` e `b3213c1` foram confirmadas READY/Production no domínio oficial. As cinco auditorias completas passaram após a mudança de autorização no banco. A interface confirmou criação, edição de título/categoria/setor e duplicação; uma nova aba e o banco confirmaram dois eventos Marketing persistidos. Os contadores dos filtros agora acompanham os dados carregados, preservando a seleção. A tela mostrou `Setor 2` para os dois eventos técnicos.

O diálogo nativo de confirmação da exclusão bloqueou a automação; a interação visual com Cancelar ficou pendente de liberação pelo usuário. Os testes de cancelamento e de exclusão autorizada/negada passaram. Os dois eventos próprios foram removidos por IDs e titularidade conferidos; contas e credenciais do runner também foram removidas. Resend, push em dispositivo e escolha do formato de chamadas continuam pendentes; não há comprovação de entrega real de e-mail nesta etapa.

### Dependências e confirmação de exclusão no estúdio

A manutenção `56c72e3` foi publicada READY/Production. A auditoria passou de 25 para cinco alertas nas ferramentas de desenvolvimento; produção segue sem vulnerabilidades conhecidas no `npm audit --omit=dev`. A resolução foi reconstruída com `npm ci`, e configurações da cobertura passaram por teste de YAML/JSON e herança. [Relatório e limitações](./dependency-audit-2026-10.md).

Foi reproduzido sucesso indevido na exclusão de sessão: uma resposta sem erro, mas sem linha autorizada, removia a sessão apenas da lista local e anunciava sucesso. `useStudio.deleteBooking` agora exige uma linha retornada para confirmar a gravação; falhas preservam a listagem. Oito testes novos cobrem exclusão autorizada/negada, conflito de reservas, edição malsucedida, ausência de autenticação, criação concorrente com Realtime, atualizações/removidas remotas, liberação da inscrição e recuperação após falha de carregamento.

`scripts/audit-studio-transactions.mjs` confirmou no banco real que um colaborador pode ver a sessão de outro, mas não editá-la/excluí-la; intervalos inválidos e conflitos são negados; horários adjacentes são permitidos; edição conflitante preserva o horário; exclusão própria retorna uma linha. Contas e sessões foram revertidas com ROLLBACK. Executar com as mesmas variáveis de conexão e certificado oficial usadas na auditoria da agenda.

Validação local: 123 testes em 18 suites, build/TypeScript e lint sem erros. O gate global de cobertura ainda falha e permanece em `vibeoffice-19`; não foi reduzido. A busca por casos semelhantes encontrou outros deletes sem confirmação em tarefas, tickets, avisos, lançamentos e cursos, registrados para reprodução em `vibeoffice-22`.

A revisão `f576b55` foi confirmada READY/Production em `office.vibedistro.com`. Após os testes do estúdio, a cobertura global mediu statements 15,21%, branches 13,60%, functions 13,59% e lines 15,78%; `useStudio` mediu 92,20% de statements, 77,27% de branches, 85% de functions e 95% de lines. Os 123 testes passaram, mas o comando com cobertura retornou 1 devido ao limite global de 40%. A conferência posterior encontrou zero contas temporárias de auditoria, zero tarefas técnicas e zero eventos automáticos temporários.

### Confirmação de exclusões (12/10/2026)

Oito testes reproduziram sucesso indevido ao excluir tarefas, tickets, comentários, avisos, lançamentos, cursos, módulos e aulas: PostgREST pode retornar sucesso sem remover nenhuma linha por RLS ou ausência do registro. Essas operações agora exigem um ID retornado com `single()` antes de alterar listas, comentários ou anunciar sucesso. A limpeza de notificações de uma tarefa ocorre após a confirmação da exclusão. A remoção idempotente de progresso de aula continua aceitando zero registros.

Os 18 novos testes verificam preservação de todos os registros nas negativas, exclusões confirmadas, comentários relacionados, espera da resposta antes de limpar notificações e remoção idempotente de progresso. `scripts/audit-delete-transactions.mjs` confirmou no banco real que os oito tipos de registro são visíveis ao colaborador, mas não podem ser excluídos por ele; o banco retorna zero linhas e preserva os dados. O Admin remove cada registro com uma linha retornada; repetir a exclusão retorna zero. Contas, notificações e demais fixtures são revertidas com ROLLBACK. Executar com `SUPABASE_DB_HOST/USER/PASSWORD` e `DATABASE_SSL_CA` apontando ao certificado oficial.

Validação: 141 testes em 19 suítes passaram; build de produção, TypeScript e lint sem erros. O comando de cobertura retornou 1: statements 17,34%, branches 15,27%, functions 15,52% e lines 17,89%, abaixo do gate global de 40%. O limite foi preservado e a expansão dos testes continua em `vibeoffice-19`. Resend, entrega push no dispositivo e definição do formato de chamadas permanecem pendentes.

A revisão de código `026a391` foi enviada ao remoto. A publicação manual `FMqxmBUaagLpt4ee1kmewu7k4kXe` foi confirmada Ready/Production. Depois, o Overview mostrou como Production Deployment atual `DMkqggm91LVUe67HDAaEZ17sq7SH`, também Ready, com o mesmo código `026a391` e `office.vibedistro.com` entre os domínios. Não surgiu deployment na observação inicial após o push; a origem da segunda publicação não foi verificada. A API com credencial CLI existente retornou 403; a investigação está em `vibeoffice-24`. A conferência de limpeza encontrou zero contas de auditoria, zero tarefas técnicas e zero eventos automáticos temporários. A inspeção também registrou em `vibeoffice-23` a reprodução de limpeza explícita dos campos de edição de cursos.

### Cursos: edição, capas e progresso (12/10/2026)

Testes reproduziram restauração da descrição vazia e de campos opcionais removidos, imagens privadas indisponíveis após criar/editar, dois avisos para um erro de criação e contagem de progresso de aulas já removidas. A leitura, criação e edição agora usam a mesma conversão do registro: valores confirmados pelo banco substituem os anteriores, URLs de capas são assinadas e a estrutura de módulos/aulas é preservada ao editar metadados. Falha ao assinar somente a capa deixa o curso disponível e informa o problema da imagem, sem anunciar falha de uma gravação já confirmada. O progresso considera somente aulas ainda presentes.

O editor de capas usava `drive-files`, que impede o acesso de outros funcionários. Um teste de interação reproduziu essa escolha e a prévia `storage://` inutilizável. Uploads agora usam `course-assets` e uma URL assinada na prévia, como a criação de cursos. `scripts/audit-courses.mjs` criou contas Admin/Colaborador, cursos e arquivos descartáveis e confirmou pela API: download do PNG pelo colaborador no bucket correto, acesso negado ao arquivo equivalente no Drive, limpeza persistida de descrição/subtítulo/capa, curso despublicado oculto, progresso repetido sem duplicação e remoção do progresso ao excluir a aula. Cursos, arquivos e contas foram removidos ao final. A conferência posterior encontrou zero cursos, zero contas/arquivos técnicos dessa auditoria e nenhum registro antigo com capa no Drive para reparar.

Validação: 159 testes em 21 suítes passaram, build/TypeScript e lint sem erros. A cobertura global continua abaixo de 40% (statements 18,51%, branches 16,70%, functions 16,45%, lines 19,04%); o gate permanece inalterado em `vibeoffice-19`. `useCourses` alcançou 91,62% de statements, 83,19% de branches, 97,43% de functions e 95,70% de lines. A limpeza de vídeo/capítulo ao editar aulas e a validação de título na edição de cursos foram registradas para reprodução em `vibeoffice-25/26`.

Código enviado ao remoto em `1bbbb6e`. A publicação foi solicitada uma vez pelo painel, que resolveu o SHA como master/Production. Na última observação, o formulário continuava processando, sem ID de deployment nem confirmação de Ready dessa revisão; `vibeoffice-23` permanece em andamento até essa confirmação. A API retornou 403 (`forbidden`, `Not authorized`) com credencial CLI presente. Preservar a solicitação na aba existente e verificar seu resultado antes de iniciar outra publicação.

### Aulas e validação de cursos (12/10/2026)

O teste do formulário reproduziu remoção aparente de vídeo/capítulo: os campos vazios eram convertidos para `undefined` e omitidos do JSON, mantendo os valores no banco. O editor agora envia `null` para remover esses campos; as interfaces aceitam essa distinção e edições parciais continuam podendo omiti-los. Conteúdo HTML intencionalmente vazio também permanece vazio ao reabrir a aula, em vez de receber o texto inicial de uma aula nova. Falhas de gravação preservam o rascunho e não fecham o modal; uma gravação pendente desabilita nova submissão.

O editor de cursos e `useCourses.updateCourse` rejeitam título vazio/espaços antes de gravar. O hook apara o título enviado e permite edições parciais sem título. O teste de interação confirmou que o rascunho vazio permanece disponível com mensagem específica e sem chamada de persistência/sucesso indevido.

`scripts/audit-courses.mjs` reproduziu pela API real que campos omitidos preservam vídeo/capítulo e que `null` remove ambos, com leitura posterior pelo colaborador. A auditoria também repetiu acesso às capas, campos limpos, visibilidade de publicação e progresso; fixtures foram removidas. Os testes de HTML executam DOMPurify real pelo adaptador do navegador no jsdom e verificam manutenção da formatação/links normais e remoção de scripts, handlers, URLs JavaScript e atributos de dados.

Validação: 169 testes em 23 suítes passaram, build/TypeScript e lint sem erros. Cobertura global: statements 19,67%, branches 17,80%, functions 17,48%, lines 20,28%; o comando com cobertura continua retornando 1 pelo gate de 40%, sem redução do limite. `vibeoffice-25/26` permanecem em andamento até a confirmação de publicação, junto à revisão de cursos em `vibeoffice-23`.
