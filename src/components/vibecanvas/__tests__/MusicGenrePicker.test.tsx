import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { MusicGenrePicker } from '../MusicGenrePicker'
import { generateBriefing } from '@/lib/vibecanvas/briefingGenerator'
import { AlbumMood, VisualStyle, type GenerationConfig } from '@/types/vibecanvas'
const mockRole = { value: 'Admin' }
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { role: mockRole.value } }) }))
const initial = { musicGenre: 'Pop', visualStyle: VisualStyle.DIGITAL_ART, mood: AlbumMood.ENERGETIC, textConfig: { title: 'Title', artist: 'Artist' } } as GenerationConfig
function Wrapper() {
 const [config,setConfig] = useState(initial)
 return <><MusicGenrePicker config={config} setConfig={setConfig} /><output data-testid="briefing">{generateBriefing(config)}</output></>
}
beforeEach(() => {
 mockRole.value='Admin'
 global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{id:'pop',name:'Pop'},{id:'rock',name:'Rock'}] })
})
it('combines two genres in the briefing and allows clearing the second', async () => {
 render(<Wrapper />)
 const secondary=await screen.findByLabelText('Segundo estilo (opcional)')
 fireEvent.change(secondary,{target:{value:'Rock'}})
 expect(screen.getByTestId('briefing')).toHaveTextContent('Pop e Rock')
 fireEvent.change(secondary,{target:{value:''}})
 expect(screen.getByTestId('briefing')).not.toHaveTextContent('Pop e Rock')
})
it('keeps the selections distinct when the primary changes', async () => {
 render(<Wrapper />)
 fireEvent.change(await screen.findByLabelText('Segundo estilo (opcional)'),{target:{value:'Rock'}})
 fireEvent.change(screen.getByLabelText('Estilo principal'),{target:{value:'Rock'}})
 expect(screen.getByLabelText('Segundo estilo (opcional)')).toHaveValue('')
})
it('lets admins add an option and makes it immediately selectable', async () => {
 render(<Wrapper />)
 await screen.findByLabelText('Estilo principal')
 fireEvent.click(screen.getByText('Gerenciar estilos musicais'))
 fireEvent.change(screen.getByLabelText('Novo estilo'),{target:{value:'Piseiro'}})
 ;(global.fetch as jest.Mock).mockResolvedValueOnce({ok:true,json:async()=>({id:'new',name:'Piseiro'})})
 fireEvent.click(screen.getByText('Cadastrar estilo'))
 await waitFor(()=>expect(screen.getByLabelText('Novo estilo')).toHaveValue(''))
 expect(screen.getByLabelText('Estilo principal')).toHaveTextContent('Piseiro')
})
it('hides catalog administration from collaborators', async () => {
 mockRole.value='Colaborador'
 render(<Wrapper />)
 await screen.findByLabelText('Estilo principal')
 expect(screen.queryByText('Gerenciar estilos musicais')).not.toBeInTheDocument()
})
it('keeps a legacy genre visible when removed from catalog', async () => {
 ;(global.fetch as jest.Mock).mockResolvedValueOnce({ok:true,json:async()=>[]})
 render(<Wrapper />)
 expect(await screen.findByLabelText('Estilo principal')).toHaveTextContent('Pop (salvo no projeto)')
})
