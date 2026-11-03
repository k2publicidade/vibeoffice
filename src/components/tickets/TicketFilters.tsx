'use client'
import { requestTypes } from '@/lib/request-types'
import type {TicketFilters} from '@/hooks/useTickets'
import {FilterMultiSelect} from '@/components/ui/filter-multi-select'
import {hasFilterSelection} from '@/lib/filter-selection'
import {Button} from '@/components/ui/button'
import {X} from 'lucide-react'
import {useUsers} from '@/hooks/useUsers'
interface Props{filters:TicketFilters;onFiltersChange:(filters:TicketFilters)=>void}
export function TicketFilters({filters,onFiltersChange}:Props) {
 const {users}=useUsers()
 const change=(key:keyof TicketFilters,value:string[]|undefined)=>onFiltersChange({...filters,[key]:value})
 return <div className="rounded-2xl bg-zinc-800/50 border border-zinc-700/50 p-4 space-y-6">
  <div className="flex justify-between items-center"><h3 className="font-semibold text-foreground">Filtros</h3>{Object.values(filters).some(hasFilterSelection)&&<Button variant="ghost" size="sm" onClick={()=>onFiltersChange({})}><X className="w-3 h-3 mr-1"/>Limpar</Button>}</div>
  <div className="space-y-5">
   <FilterMultiSelect label="Status" placeholder="Todos os status" value={filters.status} onChange={value=>change('status',value)} options={[{value:'open',label:'A Fazer'},{value:'analyzing',label:'Em Análise'},{value:'in_progress',label:'Em Progresso'},{value:'completed',label:'Concluído'}]}/>
   <div className="flex flex-wrap gap-1">{[{label:'Pendentes',values:['open','analyzing']},{label:'Em andamento',values:['in_progress']},{label:'Finalizados',values:['completed']}].map(item=><Button key={item.label} variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={()=>change('status',item.values)}>{item.label}</Button>)}</div>
   <FilterMultiSelect label="Prioridade" placeholder="Todas as prioridades" value={filters.priority} onChange={value=>change('priority',value)} options={[{value:'low',label:'Baixa'},{value:'medium',label:'Média'},{value:'high',label:'Alta',className:'text-red-400'}]}/>
   <FilterMultiSelect label="Categoria" placeholder="Todas as categorias" value={filters.category} onChange={value=>change('category',value)} options={Array.from(new Set(requestTypes.map(type => type.sector))).map(value=>({value,label:value}))}/>
   <FilterMultiSelect label="Atribuído a" placeholder="Todas as pessoas" value={filters.assignedTo} onChange={value=>change('assignedTo',value)} options={(users||[]).map(user=>({value:user.id,label:user.name}))}/>
  </div>
 </div>
}
