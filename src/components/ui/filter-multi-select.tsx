'use client'
import {ChevronDown} from 'lucide-react'
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuCheckboxItem,DropdownMenuItem,DropdownMenuLabel,DropdownMenuSeparator} from '@/components/ui/dropdown-menu'
import {selectedFilterValues,type FilterSelection} from '@/lib/filter-selection'
export interface FilterOption { value:string; label:string; className?:string }
export function FilterMultiSelect({label,placeholder,value,onChange,options}:{label:string;placeholder:string;value?:FilterSelection;onChange:(value:string[]|undefined)=>void;options:FilterOption[]}) {
 const selected=selectedFilterValues(value)
 const text=selected.length ? selected.map(v=>options.find(o=>o.value===v)?.label||v).join(', ') : placeholder
 function toggle(value:string){const next=selected.includes(value)?selected.filter(v=>v!==value):[...selected,value];onChange(next.length?next:undefined)}
 return <div className="space-y-2">
  <span className="text-sm font-medium text-gray-300">{label}</span>
  <DropdownMenu>
   <DropdownMenuTrigger asChild><button type="button" aria-label={label} title={text} className="flex w-full min-h-10 items-center justify-between gap-2 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-left text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fc7a67]"><span className="min-w-0 truncate">{selected.length>2?`${selected.length} selecionados`:text}</span><ChevronDown className="h-4 w-4 shrink-0 text-gray-400"/></button></DropdownMenuTrigger>
   <DropdownMenuContent align="start" className="z-[110] w-[var(--radix-dropdown-menu-trigger-width)] max-h-[min(20rem,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto bg-[#1a1a1a] text-white">
    <DropdownMenuLabel className="text-xs text-gray-400">Selecione uma ou mais opções</DropdownMenuLabel>
    <DropdownMenuItem onSelect={()=>onChange(undefined)}>{placeholder}</DropdownMenuItem>
    <DropdownMenuSeparator/>
    {options.map(option=><DropdownMenuCheckboxItem key={option.value} checked={selected.includes(option.value)} onCheckedChange={()=>toggle(option.value)} onSelect={event=>event.preventDefault()} className={option.className}>{option.label}</DropdownMenuCheckboxItem>)}
   </DropdownMenuContent>
  </DropdownMenu>
 </div>
}
