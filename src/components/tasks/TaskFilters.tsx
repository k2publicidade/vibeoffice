 'use client'
import type {TaskFilters,DateFilter,TaskStats} from '@/hooks/useTasks'
import {FilterMultiSelect} from '@/components/ui/filter-multi-select'
import {selectedFilterValues,hasFilterSelection} from '@/lib/filter-selection'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {Separator} from '@/components/ui/separator'
import {X,Search,AlertTriangle,Calendar} from 'lucide-react'
import {useUsers} from '@/hooks/useUsers'
import {cn} from '@/lib/utils'
interface Props {filters:TaskFilters;onFiltersChange:(filters:TaskFilters)=>void;stats?:TaskStats}
const sectors=['A&R','Marketing','Financeiro','Jurídico','Administrativo','TI/Suporte','Atendimento ao Artista', 'Análise de fonogramas']
const dates:{value:DateFilter;label:string}[]=[{value:'all',label:'Todas as datas'},{value:'overdue',label:'Atrasadas'},{value:'today',label:'Hoje'},{value:'tomorrow',label:'Amanhã'},{value:'this_week',label:'Esta semana'},{value:'this_month',label:'Este mês'},{value:'no_date',label:'Sem data'}]
export function TaskFilters({filters,onFiltersChange,stats}:Props) {
 const {users}=useUsers()
 const hasFilters=Object.values(filters).some(hasFilterSelection)
 const selectedDates=selectedFilterValues(filters.dateFilter).filter(v=>v!=='all')
 function change(key:keyof TaskFilters,value:string[]|undefined){onFiltersChange({...filters,[key]:value})}
 function toggleDate(value:DateFilter){
  if(value==='all'){onFiltersChange({...filters,dateFilter:undefined});return}
  const next=selectedDates.includes(value)?selectedDates.filter(v=>v!==value):[...selectedDates,value]
  onFiltersChange({...filters,dateFilter:next.length?next as DateFilter[]:undefined})
 }
 return <Card className="bg-[#0a0a0a] border-[#2a2a2a]">
  <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-base text-white">Filtros</CardTitle>{hasFilters&&<Button variant="ghost" size="sm" onClick={()=>onFiltersChange({})} className="text-xs text-gray-400 hover:text-white"><X className="h-3 w-3 mr-1"/>Limpar</Button>}</div></CardHeader>
  <CardContent className="space-y-4">
   <div className="space-y-2"><label htmlFor="task-filter-search" className="text-sm font-medium text-gray-300">Buscar</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"/><Input id="task-filter-search" placeholder="Título ou descrição..." value={filters.searchQuery||''} onChange={e=>onFiltersChange({...filters,searchQuery:e.target.value||undefined})} className="pl-9 bg-[#1a1a1a] border-[#2a2a2a] text-white"/></div></div>
   <Separator className="bg-[#2a2a2a]"/>
   <div className="space-y-2"><h4 className="text-sm font-medium text-gray-300 flex items-center gap-2"><Calendar className="h-4 w-4 text-[#fc7a67]"/>Data de Vencimento</h4><p className="text-xs text-gray-500">Você pode combinar mais de uma opção.</p><div className="flex flex-wrap gap-2">{dates.map(date=>{const checked=date.value==='all'?!selectedDates.length:selectedDates.includes(date.value);return <button type="button" key={date.value} aria-pressed={checked} onClick={()=>toggleDate(date.value)} className={cn('px-3 py-1.5 text-xs font-medium rounded-full border flex items-center gap-1.5',checked?'bg-[#fc7a67] text-black border-[#fc7a67]':'bg-[#1a1a1a] text-gray-300 border-[#2a2a2a] hover:border-[#fc7a67]/50')}>{date.value==='overdue'&&<AlertTriangle className="h-3 w-3 text-red-500"/>}{date.label}{date.value==='overdue'&&!!stats?.overdue&&<Badge variant="destructive" className="h-4 px-1.5 text-[10px]">{stats.overdue}</Badge>}{date.value==='today'&&!!stats?.dueToday&&<Badge className="h-4 px-1.5 text-[10px] bg-blue-500">{stats.dueToday}</Badge>}</button>})}</div></div>
   <Separator className="bg-[#2a2a2a]"/>
   <FilterMultiSelect label="Setor" placeholder="Todos os setores" value={filters.sector} onChange={value=>change('sector',value)} options={sectors.map(value=>({value,label:value}))}/>
   <FilterMultiSelect label="Prioridade" placeholder="Todas as prioridades" value={filters.priority} onChange={value=>change('priority',value)} options={[{value:'low',label:'Baixa'},{value:'medium',label:'Média'},{value:'high',label:'Alta',className:'text-red-400'}]}/>
   <FilterMultiSelect label="Status" placeholder="Todos os status" value={filters.status} onChange={value=>change('status',value)} options={[{value:'todo',label:'A Fazer'},{value:'in_progress',label:'Em Progresso'},{value:'done',label:'Concluído'}]}/>
   <FilterMultiSelect label="Responsável" placeholder="Todas as pessoas" value={filters.assignees} onChange={value=>change('assignees',value)} options={(users||[]).map(user=>({value:user.id,label:user.name}))}/>
        {/* Stats Summary */}
        {stats && (
          <>
            <Separator className="bg-[#2a2a2a]" />
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Resumo</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                  <p className="text-gray-500">Total</p>
                  <p className="text-lg font-bold text-white">{stats.total}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                  <p className="text-gray-500">Concluídas</p>
                  <p className="text-lg font-bold text-green-500">{stats.completed}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                  <p className="text-gray-500">Em Progresso</p>
                  <p className="text-lg font-bold text-[#fc7a67]">{stats.inProgress}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#1a1a1a] border border-red-500/30">
                  <p className="text-gray-500">Atrasadas</p>
                  <p className="text-lg font-bold text-red-500">{stats.overdue}</p>
                </div>
              </div>
            </div>
          </>
        )}</CardContent>
 </Card>
}
