# Tickets, solicitações por setor e sessões

Implementação em `codex/tickets-solicitacoes-setores`.

- Cards do kanban abrem por clique, Enter ou espaço; botões de editar/excluir mantêm ações independentes. Adicionar tarefa aparece acima dos cards de cada coluna.
- Tarefas novas iniciam sem vencimento. Ao selecionar uma data, o vencimento fica no fim daquele dia no fuso local. Criação usa o horário registrado automaticamente pelo banco; o detalhe do ticket mostra data e hora.
- Análise de fonogramas foi incluída nos catálogos e validações de setores. Ensaio foi incluído nos tipos de sessão de estúdio.
- Nova Solicitação está disponível em Tickets e no quadro de solicitações do painel. O catálogo inicial contém tipos para os oito setores, preservando as solicitações administrativas anteriores. Motivo obrigatório (mínimo de 10 caracteres), destino e período acompanham o envio. As linhas do painel abrem o ticket correspondente.
- A caixa de entrada inclui membros do setor destinatário. O destinatário, responsável atribuído ou administrador pode aceitar ou recusar uma única vez; a resposta registra autor e horário no banco. Aceitar atribui o ticket ao respondente. Recusar preserva o ticket e mostra sua decisão, sem marcar a demanda como concluída. Solicitante recebe notificação da decisão e setor recebe notificação de chegada.

## Publicação pendente

Não há credenciais/configuração de banco neste checkout. As migrações não foram aplicadas nem auditadas em PostgreSQL real. Antes de publicar o frontend, aplicar separadamente e nesta ordem:

1. `supabase/migrations/202610270001_phonogram_sector.sql`
2. `supabase/migrations/202610270002_request_decisions.sql`

A primeira adiciona um valor ao enum; a segunda preserva o requisito de usuário ativo/MFA e adiciona o fluxo de resposta com bloqueio de concorrência e validação também em atualizações diretas. Recarrega o schema do PostgREST.

Validar em ambiente conectado: criação sem prazo, horário automático, novo setor em usuários/tarefas, encaminhamento com contas de setores distintos, aceite/recusa e segunda resposta simultânea, notificações, comentários, sessão Ensaio. Tratar em `vibeoffice-req27`.

`bd` não está instalado neste ambiente. O acompanhamento foi registrado no JSONL de issues para posterior sincronização pela ferramenta.

## Validação local

- Jest: 52 suítes e 424 testes aprovados, incluindo clique/teclado, posição do botão, tarefa sem prazo, filtragem por setor, roteamento do formulário e persistência/erro de resposta.
- TypeScript e ESLint: sem erros.
- Build Next.js aprovado com URL/chave fictícias passadas apenas ao processo de build. A primeira tentativa sem configuração falhou na criação do cliente Supabase durante pré-renderização; nenhum arquivo de ambiente foi criado.
- Não houve publicação nem alteração no banco remoto.
