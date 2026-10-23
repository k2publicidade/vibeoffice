import {render,screen} from '@testing-library/react'
import {PremiumTaskCard} from '../PremiumTaskCard'
import {TicketList} from '@/components/tickets/TicketList'
import type {Task} from '@/types/tasks'
import type {Ticket} from '@/types/tickets'
jest.mock('@/components/ui/card-spotlight',()=>({CardSpotlight:({children,className}:{children:React.ReactNode;className?:string})=><div className={className}>{children}</div>}))
jest.mock('framer-motion',()=>({motion:{div:({children,className}:{children:React.ReactNode;className?:string})=><div className={className}>{children}</div>}}))
jest.mock('@/hooks/useUsers',()=>({useUsers:()=>({users:[]})}))
jest.mock('@dnd-kit/sortable',()=>({useSortable:()=>({attributes:{},listeners:{},setNodeRef:jest.fn(),transform:null,transition:undefined,isDragging:false})}))
const task={id:'task',title:'Ticket vinculado',description:'',priority:'high',status:'done',assignees:[],sector:'Marketing',linkedTicketId:'ticket',createdAt:new Date(),updatedAt:new Date()} as Task
const ticket={id:'ticket',title:'Solicitação urgente',description:'',priority:'high',status:'completed',category:'Outro',requester:'user',createdAt:new Date(),updatedAt:new Date()} as Ticket
it('keeps high priority red on completed linked ticket cards',()=>{
 const {container}=render(<PremiumTaskCard task={task}/>)
 expect(screen.getByText('Prioridade Alta')).toHaveClass('text-red-300')
 expect(screen.getByText('🎫 Ticket')).toHaveClass('text-red-300')
 expect(container.querySelector('[data-priority="high"]')).toHaveClass('border-red-500/70')
})
it('removes the red highlight when priority changes',()=>{
 const {rerender,container}=render(<PremiumTaskCard task={task}/>)
 rerender(<PremiumTaskCard task={{...task,priority:'medium'}}/>)
 expect(screen.queryByText('Prioridade Alta')).not.toBeInTheDocument()
 expect(container.querySelector('[data-priority="medium"]')).not.toHaveClass('border-red-500/70')
})
it.each(['grid','list'] as const)('shows high priority red in the ticket %s view',view=>{
 const {container}=render(<TicketList tickets={[ticket]} view={view}/>)
 expect(container.querySelector('.border-red-500\\/70')).not.toBeNull()
 expect(screen.getByText(view==='grid'?'#Alta Prioridade':'Alta')).toHaveClass(view==='grid'?'text-red-300':'text-red-400')
})
