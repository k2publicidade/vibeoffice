# Testes Manuais - Sistema de Notificações

## Pré-requisitos

1. **Executar migration SQL:**
   - Abrir Supabase SQL Editor
   - Executar `docs/supabase-migrations-notifications.sql`
   - Verificar que tabelas foram criadas

2. **Configurar variáveis de ambiente (opcional para push/email):**
   - VAPID_PUBLIC_KEY
   - VAPID_PRIVATE_KEY
   - RESEND_API_KEY

## Teste 1: Criação de Notificação via Task

**Passos:**
1. Login no sistema
2. Criar nova task atribuída a outro usuário
3. Login com outro usuário em aba anônima
4. Verificar:
   - [ ] Badge do sino mostra "1"
   - [ ] Toast aparece automaticamente
   - [ ] Notificação visível na lista
   - [ ] Clicar marca como lida
   - [ ] Badge decrementa para "0"

## Teste 2: Realtime (Tempo Real)

**Passos:**
1. Abrir duas abas (usuário A e usuário B)
2. Usuário A atribui task para usuário B
3. Verificar:
   - [ ] Usuário B recebe notificação instantaneamente
   - [ ] Toast aparece em tempo real
   - [ ] Badge atualiza automaticamente
   - [ ] Múltiplas abas sincronizadas

## Teste 3: Mudança de Status

**Passos:**
1. Criar task atribuída a você
2. Mudar status da task
3. Verificar:
   - [ ] Notificação "Status alterado" aparece
   - [ ] Prioridade é "low" (azul)
   - [ ] Metadata contém oldStatus e newStatus

## Teste 4: Deep Linking

**Passos:**
1. Clicar em notificação de task
2. Verificar:
   - [ ] Navega para /tarefas?task=ID
   - [ ] Modal/página da task abre corretamente
   - [ ] Notificação marca como lida automaticamente

## Teste 5: Marcar todas como lidas

**Passos:**
1. Ter múltiplas notificações não lidas
2. Clicar "Marcar todas como lidas"
3. Verificar:
   - [ ] Todas mudam para estado "lida"
   - [ ] Badge vai para "0"
   - [ ] Estilo visual muda (opacidade)

## Teste 6: Arquivar Notificação

**Passos:**
1. Hover sobre notificação
2. Clicar botão X (archive)
3. Verificar:
   - [ ] Notificação desaparece da lista
   - [ ] Badge decrementa se era não lida
   - [ ] Não reaparece ao recarregar

## Resultados Esperados

**✅ Todos os testes devem passar**

Sistema está funcional quando:
- Notificações aparecem em tempo real
- Badge conta corretamente
- Marcar como lida funciona
- Deep linking navega corretamente
- Arquivar remove da lista

## Próximos Passos (Opcional)

1. **Push Notifications:** Configurar Service Worker
2. **Email:** Configurar VAPID keys e Resend
3. **Preferências:** Criar UI de configuração
4. **Testes automatizados:** Playwright E2E
