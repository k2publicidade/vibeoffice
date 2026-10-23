import {useState} from 'react'
import {render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {TaskFilters} from '../TaskFilters'
import type {TaskFilters as Filters} from '@/hooks/useTasks'
import {Sheet,SheetContent,SheetHeader,SheetTitle} from '@/components/ui/sheet'
jest.mock('@/hooks/useUsers',()=>({useUsers:()=>({users:[{id:'one',name:'Pessoa Um'},{id:'two',name:'Pessoa Dois'}]})}))
function Wrapper({sheet=false}:{sheet?:boolean}) {
 const [filters,setFilters]=useState<Filters>({})
 const body=<><TaskFilters filters={filters} onFiltersChange={setFilters} stats={{total:9,completed:3,inProgress:2,overdue:1,dueToday:1,dueTomorrow:0,dueThisWeek:2,todo:4}}/><output data-testid="filters">{JSON.stringify(filters)}</output></>
 return sheet?<Sheet open><SheetContent aria-describedby={undefined}><SheetHeader><SheetTitle>Filtros de Busca</SheetTitle></SheetHeader>{body}</SheetContent></Sheet>:body
}
it('keeps multi-choice menus usable inside a sheet and combines each filter',async()=>{
 const user=userEvent.setup()
 render(<Wrapper sheet/>)
 for(const [label,choices] of [['Prioridade',['Alta','Média']],['Status',['A Fazer','Concluído']],['Setor',['Marketing','Financeiro']],['Responsável',['Pessoa Um','Pessoa Dois']]] as const){
  await user.click(screen.getByRole('button',{name:label,exact:true}))
  await user.click(await screen.findByRole('menuitemcheckbox',{name:choices[0],exact:true}))
  expect(screen.getByRole('menuitemcheckbox',{name:choices[0],exact:true})).toBeChecked()
  await user.click(screen.getByRole('menuitemcheckbox',{name:choices[1],exact:true}))
  expect(screen.getByRole('menuitemcheckbox',{name:choices[1],exact:true})).toBeChecked()
  await user.keyboard('{Escape}')
 }
 expect(JSON.parse(screen.getByTestId('filters').textContent||'{}')).toMatchObject({priority:['high','medium'],status:['todo','done'],sector:['Marketing','Financeiro'],assignees:['one','two']})
})
it('combines date buttons and resets them with all dates',async()=>{
 const user=userEvent.setup();render(<Wrapper/> )
 await user.click(screen.getByRole('button',{name:/^Hoje/}))
 await user.click(screen.getByRole('button',{name:'Sem data'}))
 expect(JSON.parse(screen.getByTestId('filters').textContent||'{}').dateFilter).toEqual(['today','no_date'])
 await user.click(screen.getByRole('button',{name:'Todas as datas'}))
 expect(screen.getByRole('button',{name:'Todas as datas'})).toHaveAttribute('aria-pressed','true')
 expect(JSON.parse(screen.getByTestId('filters').textContent||'{}').dateFilter).toBeUndefined()
})
it('clears one selection group without changing the other filters',async()=>{
 const user=userEvent.setup();render(<Wrapper/> )
 await user.click(screen.getByRole('button',{name:/^Hoje/}))
 await user.click(screen.getByRole('button',{name:'Prioridade',exact:true}))
 await user.click(await screen.findByRole('menuitemcheckbox',{name:'Alta'}))
 await user.click(screen.getByRole('menuitem',{name:'Todas as prioridades'}))
 await waitFor(()=>expect(JSON.parse(screen.getByTestId('filters').textContent||'{}')).toEqual({dateFilter:['today']}))
 expect(screen.getByText('Resumo')).toBeInTheDocument()
})
