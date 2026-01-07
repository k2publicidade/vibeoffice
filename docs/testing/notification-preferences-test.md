# Testes - Página de Preferências de Notificação

## Pré-requisitos

- ✅ Usuário logado no sistema
- ✅ Migration de notificações executada
- ✅ Tabela `notification_preferences` criada

## Testes Funcionais

### 1. Carregamento Inicial

**Cenário 1: Usuário com preferências existentes**
- Navegar para `/settings/notifications`
- Verificar que preferências são carregadas do banco
- Switches refletem estado correto

**Cenário 2: Usuário novo (sem preferências)**
- Criar novo usuário
- Navegar para `/settings/notifications`
- Verificar que defaults são criados automaticamente
- Switches mostram valores default (conforme `defaults.ts`)

### 2. Auto-Save

**Test:** Alterar switch e verificar salvamento
1. Clicar em qualquer switch (ex: task_assigned → Push)
2. Verificar mudança imediata na UI (optimistic)
3. Aguardar 300ms
4. Verificar toast: "Preferência atualizada"
5. Verificar no banco que mudança foi salva

**Test:** Múltiplas mudanças rápidas
1. Clicar em 3 switches diferentes rapidamente (< 300ms entre cliques)
2. Aguardar 600ms
3. Verificar que apenas últimas mudanças foram salvas (debounce)

### 3. Restrições de Canal

**Test:** Chat não pode ter email
1. Ir para card "Chat"
2. Verificar que switches de Email estão desabilitados
3. Verificar que são visualmente diferentes (opacity-50)
4. Passar mouse sobre ícone ⓘ
5. Verificar tooltip: "Mensagens de chat não enviam notificações por email"
6. Tentar clicar → nada acontece (disabled)

### 4. Tratamento de Erros

**Test:** Simular falha de rede
1. Desabilitar conexão (DevTools → Network → Offline)
2. Alterar um switch
3. Verificar toast de erro
4. Verificar que switch reverte ao estado anterior (rollback)

### 5. Responsividade

**Desktop (>1024px):**
- Grid com 2 colunas
- Cards lado a lado

**Mobile (<1024px):**
- Grid com 1 coluna
- Cards empilhados verticalmente

### 6. Acessibilidade

**Teclado:**
- Tab navega entre switches
- Enter/Space ativa switch
- Tooltips aparecem com foco

**Screen Reader:**
- Labels descritivos em cada switch
- Aria-labels presentes

## Queries SQL para Debug

```sql
-- Ver preferências de um usuário
SELECT * FROM notification_preferences WHERE user_id = '[user-id]';

-- Contar preferências (deve ser 11)
SELECT COUNT(*) FROM notification_preferences WHERE user_id = '[user-id]';

-- Ver preferências de email para chat (devem ser false)
SELECT notification_type, enable_email
FROM notification_preferences
WHERE user_id = '[user-id]'
AND notification_type IN ('message_received', 'mentioned_in_chat');
```

## Checklist Final

- [ ] Página carrega sem erros
- [ ] 4 cards aparecem corretamente
- [ ] Breadcrumb funciona
- [ ] Switches refletem estado do banco
- [ ] Auto-save funciona (toast aparece)
- [ ] Email desabilitado para chat
- [ ] Tooltip explica restrição
- [ ] Responsivo em mobile
- [ ] Navegação por teclado funciona
- [ ] Erros tratados com rollback
