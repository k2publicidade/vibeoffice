import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilePreviewModal } from '../FilePreviewModal'
import { supabase } from '@/lib/supabase/client'
import type { DriveItem } from '@/types/drive'

const image=(id='11111111-1111-4111-8111-111111111111'):DriveItem=>({id,name:`${id}.png`,type:'file',url:`private/${id}.png`,mimeType:'image/png',uploadedBy:'owner',createdAt:new Date('2030-01-01'),updatedAt:new Date('2030-01-01')})
beforeEach(()=>{jest.clearAllMocks();jest.spyOn(console,'warn').mockImplementation(()=>{});jest.spyOn(console,'error').mockImplementation(()=>{})})
afterEach(()=>jest.restoreAllMocks())

it('loads previews through the authenticated application route and never issues a bearer signed URL',async()=>{
  const signed=jest.fn().mockResolvedValue({data:{signedUrl:'https://storage.invalid/token'},error:null})
  ;(supabase.storage.from as jest.Mock).mockReturnValue({createSignedUrl:signed})
  const file=image();render(<FilePreviewModal open onClose={jest.fn()} file={file} />)
  const preview=await screen.findByAltText(file.name)
  expect(preview.getAttribute('src')).toMatch(new RegExp(`^/api/drive/files/${file.id}/content\\?`))
  expect(signed).not.toHaveBeenCalled()
})

it('does not show a previous file after its delayed URL resolves',async()=>{
  let resolve!:(value:unknown)=>void
  const old=new Promise(done=>{resolve=done}),signed=jest.fn().mockReturnValueOnce(old).mockResolvedValueOnce({data:{signedUrl:'https://storage.invalid/new'},error:null})
  ;(supabase.storage.from as jest.Mock).mockReturnValue({createSignedUrl:signed})
  const first=image(),second=image('22222222-2222-4222-8222-222222222222')
  const {rerender}=render(<FilePreviewModal open onClose={jest.fn()} file={first} />)
  rerender(<FilePreviewModal open onClose={jest.fn()} file={second} />)
  await waitFor(()=>expect(screen.getByAltText(second.name)).toBeInTheDocument())
  await act(async()=>{resolve({data:{signedUrl:'https://storage.invalid/previous'},error:null});await old})
  await waitFor(()=>expect(screen.getByAltText(second.name).getAttribute('src')).not.toContain('previous'))
})

it('keeps the preview open and its download indicator active until an asynchronous download ends',async()=>{
  const signed=jest.fn().mockResolvedValue({data:{signedUrl:'https://storage.invalid/current'},error:null})
  ;(supabase.storage.from as jest.Mock).mockReturnValue({createSignedUrl:signed})
  let finish!:()=>void;const pending=new Promise<void>(done=>{finish=done}),download=jest.fn(()=>pending)
  render(<FilePreviewModal open onClose={jest.fn()} file={image()} onDownload={download} />)
  await userEvent.click(screen.getByRole('button',{name:'Download',exact:true}))
  expect(screen.getByRole('button',{name:'Baixando...',exact:true})).toBeDisabled()
  finish();await waitFor(()=>expect(screen.getByRole('button',{name:'Download',exact:true})).toBeEnabled())
})
