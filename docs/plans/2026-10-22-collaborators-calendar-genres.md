# Colaboradores, cores da agenda e estilos musicais

## Fluxos implementados

- Admin > Funcionários: formulário de criação exige somente email e senha, mantendo mínimo de 12 caracteres. O nome inicial deriva do email; cargo Colaborador e setor Administrativo. O admin pode ajustar cargo e setor na gestão de acesso existente. A conta tem email confirmado e acesso imediato. Falha ao gravar perfil tenta remover a conta recém-criada para permitir nova tentativa. A criação exige papel Admin com MFA satisfeito.
- Agenda: seletor de data e seis cores, com opção Sem cor. As marcações são pessoais, persistidas no banco e protegidas por RLS. Aparecem no mês, nos cabeçalhos semanais e nos eventos da data. Dias marcados sem eventos também aparecem na lista mensal móvel.
- VibeCanvas: estilo principal e segundo estilo opcional, sem duplicação. Ambos aparecem no briefing, revisão e projetos salvos. O admin gerencia o catálogo no passo Estilo Musical; colaboradores só podem selecionar. Remover uma opção preserva projetos antigos. O catálogo inicial mantém os estilos anteriores.

## Banco

Migração `202610220001_collaborator_calendar_genres.sql` aplicada no banco conectado, com certificado CA e validação TLS habilitada. Novas tabelas music_genres e calendar_day_colors têm RLS; sem acesso anônimo. Auditoria de permissões com dados temporários executada em transação revertida.

## Validação

- Build de produção e TypeScript passaram.
- Lint dos arquivos alterados: zero erros, avisos existentes e de efeitos React.
- 21 testes direcionados passaram (cadastro, seleção de estilos e persistência de eventos).
- `scripts/audit-office-preferences.mjs`: catálogo exclusivo do admin, leitura por colaborador, cores pessoais e operações de gravação/alteração/remoção confirmadas no banco.

## Limites das cores

As cores são organização pessoal da agenda. Filtros Pessoal, Setor e Empresa continuam controlando quais eventos são mostrados; uma cor de data substitui a cor visual desses eventos para aquele usuário.
