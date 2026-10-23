# Filtros e prioridade alta

Tarefas e Solicitações permitem combinar múltiplas opções por filtro. Opções do mesmo grupo usam OU e grupos diferentes usam E. Busca e limpeza continuam disponíveis. Datas também podem ser combinadas. O menu mantém-se aberto após marcar uma opção e funciona dentro do painel lateral.

O painel de Tarefas passa a ter área própria de rolagem para alcançar o Resumo em telas baixas. O painel móvel de Solicitações também usa a altura disponível.

Prioridade alta aparece em vermelho nos cartões e listas de tarefas e tickets, inclusive tarefas concluídas. No cartão vinculado, o selo Ticket acompanha a prioridade e há uma etiqueta explícita de Prioridade Alta. Não há mudança nos dados nem migração.

Validação local: suíte completa com 438 testes aprovados; após incluir a regressão específica do selo Ticket azul, 34 testes direcionados aprovados. Testes cobrem combinação entre grupos, múltiplas datas, menus no Sheet, limpeza e estilos de prioridade. TypeScript e lint sem erros. Build de produção aprovado; verificação final de publicação registrada abaixo.

Publicado: commit `70fcb1e`, deployment `dpl_E4eyVcir9Vicv9PncqG46EpC9gKq`, READY em `office.vibedistro.com`, SHA confirmado por `scripts/audit-deployment.mjs`. Navegador autenticado confirmou o cartão real com borda e ambos os selos vermelhos, prioridade Alta+Média simultaneamente marcada e Resumo inteiro visível após rolar o painel em 1366x600 (área rolável de 482px para conteúdo de 895px). Grade de Solicitações também apresentou a prioridade alta em vermelho. Filtros limpos e viewport restaurado após conferir. Alerta preexistente do Next.js permanece acompanhado no issue `vibeoffice-bzc`.
