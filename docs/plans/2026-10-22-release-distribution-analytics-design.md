# Distribuição e análise de lançamentos

Usuário confirmou ambos os fluxos e uso da Revelator. Acesso de parceiro à API ainda será solicitado.

## Fluxo utilizável sem API

Adicionar abas Distribuição e Análise ao módulo Lançamentos. Cada lançamento terá fila de revisão, checklist de metadados/arquivos/direitos, aprovação por Admin ou Gerente, devolução com observações, registro de envio feito na Revelator e confirmação manual de publicação. Cada mudança terá autor, data e histórico. Edições no lançamento invalidam aprovações anteriores antes do envio. Envios são registros manuais e não chamadas de entrega às plataformas.

A análise aceitará CSV de relatórios reais, com prévia e validação de período, plataforma, streams, receita, moeda e UPC opcional. O usuário escolhe o lançamento do relatório; se houver UPC, deve corresponder. Importações substituem atomicamente as linhas dos meses incluídos para o lançamento, evitando duplicação de relatórios e preservando outros meses. Só Admin/Gerente importam e veem receitas; colaborador proprietário vê consumo de seus lançamentos. Moedas nunca são somadas entre si. Sem dados, exibir estado vazio explícito.

## Persistência e segurança

Tabelas de workflow, histórico e métricas com RLS, mutações por funções transacionais e validação no servidor. Papel obtido por office_role inclui atividade e MFA. Etapas controladas, revisão com versão e bloqueio do lançamento na gravação. Relatórios têm origem Revelator/importação manual, data e autor. Dados inválidos abortam a importação inteira.

## Integração Revelator

Documentação consultada: https://api-docs.revelator.com/en/distribution/ e https://api-docs.revelator.com/en/analytics/ e https://api-docs.revelator.com/v2/en/getting-started . Integração automática permanece pendente, sem envio simulado ou métricas de demonstração. A API requer chave e usuário parceiro apenas no servidor. A aprovação final de distribuição tem etapa no painel Revelator conforme documentação. Não sobrescrever metadados remotos por atualizações parciais.

## Verificação

Testes de parser, agregações monetárias, permissões e transições; auditoria SQL revertida; testes de interface; TypeScript, lint e build. Aplicar migração com TLS, publicar e verificar interfaces no domínio.

## Implementação e evidências

- Abas Distribuição e Análise de lançamentos em /lancamentos. Cadastro existente de lançamentos continua como fonte do catálogo.
- Backend: /api/release-operations; RPCs transacionais com revisão otimista, bloqueio de lançamento e histórico. Confirmar publicação também atualiza o status do lançamento para released.
- Migração 202610220002_release_operations.sql aplicada com CA/TLS. Auditoria de prévia executada com rollback antes da aplicação; confirmações de direitos e aprovação são exigidas pelo banco.
- Relatórios importam um lançamento por vez, até 5.000 linhas e 2 MB, reconhecem cabeçalhos do modelo e aliases distributorName/streamsCount/netRevenue. Número decimal configurável. Períodos mensais, plataformas, país e moeda são validados. Importações são atômicas e substituem integralmente os meses incluídos para o lançamento. UPC informado precisa corresponder.
- Receitas visíveis somente a Admin/Gerente, inclusive em acesso direto à tabela; snapshot de colaborador proprietário remove receitas e não expõe lançamentos alheios. Dados de consumo são acessíveis ao proprietário.
- 19 testes direcionados e suíte completa com 423 testes/49 suítes passaram. TypeScript e lint sem erros. Build concluiu no retry; primeira execução emitiu alerta de segurança do Next.js 16.4, registrado em tarefa própria.
- Integração automática Revelator pendente de acesso parceiro (usuário informou que ainda solicitará). Não há credenciais nem chamadas automáticas de entrega. Follow-up vibeoffice-0iz.
