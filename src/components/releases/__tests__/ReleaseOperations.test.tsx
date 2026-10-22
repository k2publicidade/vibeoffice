import {render,screen,fireEvent,waitFor} from '@testing-library/react'
import {ReleaseOperations} from '../ReleaseOperations'
import type {Release} from '@/types/releases'
const mockChange=jest.fn(),mockImport=jest.fn(),mockReload=jest.fn()
const mockOps={workflows:[] as unknown[],history:[],metrics:[] as unknown[],canManage:true,loading:false,error:'',saving:false,reload:mockReload,change:mockChange,importReport:mockImport}
jest.mock('@/hooks/useReleaseOperations',()=>({useReleaseOperations:()=>mockOps}))
jest.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'owner',role:'Admin'}})}))
const release={id:'release',title:'Meu single',artist:'Artista',releaseType:'single',releaseDate:new Date('2035-10-22'),fileReferences:{cover:'cover',wav:'audio'},composers:[{name:'Autor'}],isrc:'BRABC2600001',upc:'123456789012',createdBy:'owner'} as unknown as Release
beforeEach(()=>{jest.clearAllMocks();mockOps.workflows=[];mockOps.metrics=[];mockOps.canManage=true;mockChange.mockResolvedValue({});mockImport.mockResolvedValue({rows:1})})
it('requires rights confirmation and a complete checklist before review',async()=>{
 render(<ReleaseOperations releases={[release]} mode="distribution" onEdit={jest.fn()}/> )
 const button=screen.getByRole('button',{name:'Enviar para análise'});expect(button).toBeDisabled()
 fireEvent.click(screen.getByRole('checkbox'))
 expect(button).toBeEnabled();fireEvent.click(button)
 await waitFor(()=>expect(mockChange).toHaveBeenCalledWith('release','submit_review',expect.objectContaining({revision:0,rights_confirmed:true})))
})
it('clearly identifies the manual Revelator workflow',()=>{
 render(<ReleaseOperations releases={[release]} mode="distribution" onEdit={jest.fn()}/> )
 expect(screen.getByText('Revelator · operação manual')).toBeInTheDocument()
 expect(screen.getByText(/não envia músicas automaticamente/)).toBeInTheDocument()
})
it('shows the submission form only after approval',()=>{
 mockOps.workflows=[{release_id:'release',stage:'approved',revision:2,stores:[],rights_confirmed:true}]
 render(<ReleaseOperations releases={[release]} mode="distribution" onEdit={jest.fn()}/> )
 expect(screen.getByText('Registrar envio realizado na Revelator')).toBeInTheDocument()
 expect(screen.getByRole('button',{name:'Registrar envio manual'})).toBeDisabled()
})
it('shows a real empty state without invented metrics',()=>{
 render(<ReleaseOperations releases={[release]} mode="analytics" onEdit={jest.fn()}/> )
 expect(screen.getByText('Sem dados de desempenho neste período')).toBeInTheDocument()
})
it('validates a pasted report before enabling import',async()=>{
 render(<ReleaseOperations releases={[release]} mode="analytics" onEdit={jest.fn()}/> )
 fireEvent.click(screen.getByRole('button',{name:'Importar relatório'}))
 fireEvent.change(screen.getByLabelText('Lançamento do relatório'),{target:{value:'release'}})
 fireEvent.change(screen.getByLabelText('Conteúdo do relatório CSV'),{target:{value:'month,platform,streams,revenue,currency\n2026-09,Spotify,120,2.50,USD'}})
 expect(screen.getByRole('button',{name:'Importar e substituir meses incluídos'})).toBeDisabled()
 fireEvent.click(screen.getByRole('button',{name:'Validar e visualizar'}))
 fireEvent.click(screen.getByRole('button',{name:'Importar e substituir meses incluídos'}))
 await waitFor(()=>expect(mockImport).toHaveBeenCalledWith('release',expect.stringContaining('Spotify'),'en-US','Relatório Revelator'))
})
it('separates currencies and keeps revenue controls hidden from collaborators',()=>{
 mockOps.canManage=false
 mockOps.metrics=[{id:'row',release_id:'release',month:'2026-09',platform:'Spotify',country:'BR',streams:120,revenue:null,currency:'USD',source_name:'report.csv',imported_at:'2026-10-22T12:00:00Z'}]
 render(<ReleaseOperations releases={[release]} mode="analytics" onEdit={jest.fn()}/> )
 expect(screen.queryByRole('button',{name:'Importar relatório'})).not.toBeInTheDocument()
 expect(screen.queryByText('Receita reportada por moeda')).not.toBeInTheDocument()
 expect(screen.getByText('Cobertura dos relatórios')).toBeInTheDocument()
})
