# Plano de Correção: Drag & Drop do Kanban de Tarefas

**Data:** 2026-01-07
**Status:** Análise Completa - Causa Raiz Identificada
**Prioridade:** Alta

---

## 1. CAUSA RAIZ IDENTIFICADA

Após análise detalhada do código e comparação com outras implementações Kanban funcionais no projeto, identifiquei **3 problemas críticos** que impedem o drag & drop:

### Problema 1: `pointer-events-none` no Card (CRÍTICO)
**Arquivo:** `src/components/tasks/PremiumTaskCard.tsx` (linha 56)

```tsx
<Card className="... pointer-events-none">
```

**Impacto:** O Card está com `pointer-events: none`, o que BLOQUEIA completamente os eventos de mouse/touch que o dnd-kit precisa para funcionar. Mesmo que o wrapper tenha `{...listeners}`, o Card filho com `pointer-events-none` impede a propagação dos eventos.

**Evidência:** Outras implementações (`TaskBoard.tsx`, `trello-kanban-board.tsx`) NÃO usam `pointer-events-none` nos cards e funcionam corretamente.

### Problema 2: Estrutura de Dados Incorreta no handleDragEnd
**Arquivo:** `src/components/tasks/PremiumKanbanBoard.tsx` (linha 104-107)

```tsx
const handleTaskMove = (taskId: string, toStatus: TaskStatus) => {
  const task = filteredTasks.find(t => t.id === taskId)
  if (task) {
    updateTask(taskId, { ...task, status: toStatus })
  }
}
```

**Problema:** A função `updateTask` espera receber **apenas os campos que mudaram** (`Partial<Task>`), mas está recebendo o objeto completo com `{ ...task, status: toStatus }`. Isso pode causar:
- Sobrescrita desnecessária de todos os campos
- Conflitos de concorrência (dados desatualizados)
- Problemas de validação no Zod

**Evidência:** O hook `useTasks.ts` (linha 317) mostra que `updateTask` aceita `Partial<Task>`:
```tsx
const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
```

### Problema 3: Falta de useDroppable nos Columns
**Arquivo:** `src/components/tasks/PremiumKanbanBoard.tsx` (linha 54-56)

```tsx
function KanbanColumn({ ... }) {
  const { setNodeRef } = useDroppable({ id: column.id })
  // setNodeRef está sendo chamado (linha 78)
}
```

**Problema:** O `useDroppable` está configurado corretamente, **MAS** o `setNodeRef` está sendo aplicado no `div` interno (linha 78) que **NÃO é a área droppable real**.

**Evidência da estrutura atual:**
```tsx
<div className="flex-1 min-w-[320px]...">  {/* Container externo - SEM ref */}
  <div className="flex items-center...">    {/* Header */}
  <SortableContext>
    <div ref={setNodeRef} className="flex flex-col gap-3...">  {/* setNodeRef aqui */}
```

**Comparação com implementação funcional (`trello-kanban-board.tsx` linha 156-157):**
```tsx
<Card ref={setNodeRef} className={cn(...)}>  {/* setNodeRef no Card PRINCIPAL */}
```

---

## 2. ANÁLISE COMPARATIVA

### Implementação Funcional (TrelloKanbanBoard)
✅ **Sem** `pointer-events-none` nos cards
✅ `setNodeRef` aplicado no Card principal (wrapper da coluna)
✅ Handlers de drag aplicados diretamente no item arrastável
✅ Update otimista com apenas status: `onTaskMove?.(activeId, sourceColumn, targetColumn)`

### Implementação Atual (PremiumKanbanBoard)
❌ Card com `pointer-events-none` BLOQUEIA eventos
❌ `setNodeRef` no div interno (não no container principal)
❌ Spread completo do objeto `{ ...task, status }` em vez de `Partial<Task>`
❌ Listeners aplicados no wrapper, mas Card filho bloqueia eventos

---

## 3. SOLUÇÃO TÉCNICA DEFINITIVA

### 3.1. Correção do PremiumTaskCard.tsx

**Mudança 1: Remover `pointer-events-none` do Card**
```tsx
// ANTES (linha 56):
<Card className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#fc7a67] transition-all duration-300 p-4 shadow-lg group-hover:shadow-[#fc7a67]/10 relative pointer-events-none">

// DEPOIS:
<Card className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#fc7a67] transition-all duration-300 p-4 shadow-lg group-hover:shadow-[#fc7a67]/10 relative">
```

**Mudança 2: Remover `pointer-events-none` dos filhos (linha 71)**
```tsx
// ANTES:
<div className="space-y-3 pointer-events-none">

// DEPOIS:
<div className="space-y-3">
```

**Mudança 3: Manter `pointer-events-auto` no botão de edição (já está correto)**
```tsx
// Linha 64 - JÁ ESTÁ CORRETO
<button
  onClick={(e) => {
    e.stopPropagation()
    onClick()
  }}
  className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-auto"
>
```

### 3.2. Correção do tasks/page.tsx

**Mudança: Simplificar handleTaskMove para enviar apenas status**
```tsx
// ANTES (linha 104-109):
const handleTaskMove = (taskId: string, toStatus: TaskStatus) => {
  const task = filteredTasks.find(t => t.id === taskId)
  if (task) {
    updateTask(taskId, { ...task, status: toStatus })
  }
}

// DEPOIS:
const handleTaskMove = (taskId: string, toStatus: TaskStatus) => {
  updateTask(taskId, { status: toStatus })
}
```

**Justificativa:**
- `updateTask` já busca a task no banco via `id`
- Enviar apenas `{ status: toStatus }` é mais seguro (evita race conditions)
- Mais performático (menos dados trafegados)
- Alinhado com a assinatura `Partial<Task>` do hook

### 3.3. Correção do PremiumKanbanBoard.tsx (Opcional - Melhoria)

**Mudança: Aplicar setNodeRef no Card principal da coluna**
```tsx
// ANTES (linha 59 e 78):
<div className="flex-1 min-w-[320px] flex flex-col bg-[#0a0a0a] rounded-xl p-4...">
  {/* ... */}
  <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
    <div ref={setNodeRef} className="flex flex-col gap-3 min-h-[200px] flex-1">

// DEPOIS:
<div
  ref={setNodeRef}
  className="flex-1 min-w-[320px] flex flex-col bg-[#0a0a0a] rounded-xl p-4..."
>
  {/* ... */}
  <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
    <div className="flex flex-col gap-3 min-h-[200px] flex-1">
```

**Justificativa:**
- Área droppable deve ser o container principal da coluna
- Padrão usado em outras implementações funcionais
- Melhora detecção de drop quando coluna está vazia

---

## 4. VALIDAÇÃO DA SOLUÇÃO

### Checklist de Testes

**Teste 1: Drag básico**
- [ ] Consegue clicar e segurar um card
- [ ] Card fica semi-transparente ao arrastar
- [ ] DragOverlay aparece com visual rotacionado

**Teste 2: Drop entre colunas**
- [ ] Soltar em "A Fazer" → status = 'todo'
- [ ] Soltar em "Em Progresso" → status = 'in_progress'
- [ ] Soltar em "Concluído" → status = 'done'

**Teste 3: Persistência**
- [ ] Status atualizado no banco (Supabase)
- [ ] UI reflete mudança imediatamente (optimistic update)
- [ ] Ticket vinculado sincroniza status (trigger do banco)

**Teste 4: Funcionalidade de edição**
- [ ] Botão de edição aparece no hover
- [ ] Clicar no botão abre TaskDialog
- [ ] Editar não interfere com drag & drop

**Teste 5: Edge cases**
- [ ] Arrastar e soltar na mesma coluna (reordenação)
- [ ] Soltar fora das colunas (cancelar drag)
- [ ] Arrastar múltiplas tasks rapidamente

---

## 5. IMPACTO E RISCOS

### Impacto Positivo
✅ Drag & drop funcionando completamente
✅ UX melhorada (interação fluida)
✅ Alinhamento com padrões do projeto
✅ Performance melhorada (menos dados no update)

### Riscos
⚠️ **Baixo Risco:** Mudanças são isoladas e não afetam outros módulos
⚠️ **Mitigação:** Testar botão de edição após remover `pointer-events-none`

### Rollback
Se houver problemas com o botão de edição:
- Adicionar `pointer-events-auto` no wrapper do card
- Manter `pointer-events-none` APENAS nos elementos de texto (não no Card)

---

## 6. IMPLEMENTAÇÃO STEP-BY-STEP

### Ordem de Execução

**Passo 1:** Corrigir `PremiumTaskCard.tsx` (remover `pointer-events-none`)
**Passo 2:** Corrigir `tasks/page.tsx` (simplificar `handleTaskMove`)
**Passo 3:** Testar drag & drop básico
**Passo 4:** (Opcional) Mover `setNodeRef` no `PremiumKanbanBoard.tsx`
**Passo 5:** Testes completos de validação

### Comandos de Desenvolvimento

```bash
# 1. Iniciar dev server
npm run dev

# 2. Acessar página de tasks
# http://localhost:3000/tasks

# 3. Testar drag & drop em cada cenário do checklist

# 4. Verificar console do browser para erros

# 5. Inspecionar network tab para confirmar updates no Supabase
```

---

## 7. EVIDÊNCIAS TÉCNICAS

### Código de Referência Funcional

**trello-kanban-board.tsx (linha 110-124):**
```tsx
function SortableTaskItem({ task, renderCard, onClick }: SortableTaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-grab active:cursor-grabbing"  // SEM pointer-events-none
    >
      {renderCard ? renderCard(task, isDragging) : <DefaultTaskCard task={task} isDragging={isDragging} />}
    </motion.div>
  )
}
```

**Diferença crítica:**
- ✅ Funcional: Card filho **SEM** `pointer-events-none`
- ❌ PremiumTaskCard: Card filho **COM** `pointer-events-none`

### Fluxo de Eventos (dnd-kit)

```
1. User mousedown/touchstart → PointerSensor (activationConstraint: distance 8px)
2. Sensor dispara DragStart → setActiveId(taskId)
3. User move → DragOver → handleDragOver (optimistic UI update)
4. User mouseup/touchend → DragEnd → onTaskMove(taskId, newStatus)
5. Parent page → updateTask(taskId, { status }) → Supabase
6. Supabase trigger → sync ticket status
```

**Ponto de Falha Atual:** Passo 1 é BLOQUEADO pelo `pointer-events-none` do Card

---

## 8. CHECKLIST DE IMPLEMENTAÇÃO

### Antes de Começar
- [x] Código atual analisado
- [x] Causa raiz identificada
- [x] Comparação com código funcional feita
- [x] Plano de correção documentado

### Durante Implementação
- [ ] Backup do código atual (git commit)
- [ ] Correção 1: `PremiumTaskCard.tsx` (remover `pointer-events-none`)
- [ ] Correção 2: `tasks/page.tsx` (simplificar `handleTaskMove`)
- [ ] Correção 3: `PremiumKanbanBoard.tsx` (mover `setNodeRef` - OPCIONAL)
- [ ] Teste manual básico

### Após Implementação
- [ ] Executar checklist de testes completo
- [ ] Verificar logs do Supabase (updates corretos)
- [ ] Testar em mobile (touch events)
- [ ] Documentar problemas encontrados (se houver)

---

## 9. PRÓXIMOS PASSOS

1. ✅ **Análise completa** (FEITO)
2. ⏸️ **Aguardando aprovação do usuário** para iniciar implementação
3. 🔄 Implementar correções
4. 🧪 Executar testes de validação
5. 📝 Documentar resultados

---

## 10. PERGUNTAS PARA O USUÁRIO

Antes de prosseguir com a implementação, gostaria de confirmar:

1. **Aprovação do Plano:** O diagnóstico e a solução propostos fazem sentido?

2. **Prioridade das Correções:**
   - Correção 1 e 2 são **obrigatórias** (resolvem o problema)
   - Correção 3 (mover `setNodeRef`) é **opcional** (melhoria)
   - Deseja implementar todas ou apenas as obrigatórias?

3. **Testes Específicos:** Há algum cenário de uso específico que devo priorizar nos testes?

4. **Rollback:** Deseja que eu crie um branch separado para facilitar rollback se necessário?

---

**Conclusão:** A causa raiz do problema é a combinação de `pointer-events-none` no Card (bloqueia eventos do mouse/touch) + estrutura de dados incorreta no update. A solução é simples, cirúrgica e de baixo risco.
