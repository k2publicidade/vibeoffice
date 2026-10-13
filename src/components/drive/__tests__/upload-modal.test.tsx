import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadModal } from '../UploadModal'
import { DriveUploadBatchError, DriveUploadPendingError } from '@/types/drive'

beforeEach(()=>jest.spyOn(console,'warn').mockImplementation(()=>{}))
afterEach(()=>jest.restoreAllMocks())
const files=()=>[new File(['one'],'one.txt',{type:'text/plain'}),new File(['two'],'two.txt',{type:'text/plain'})]

it('retains confirmed files after a partial failure and retries only the remaining files',async()=>{
  const upload=jest.fn().mockRejectedValueOnce(new DriveUploadBatchError(1,new Error('offline'))).mockResolvedValueOnce(undefined),close=jest.fn()
  render(<UploadModal open onClose={close} onUpload={upload} />)
  const selected=files();await userEvent.upload(screen.getByLabelText('Selecionar arquivos'),selected)
  await userEvent.click(screen.getByRole('button',{name:'Iniciar Upload'}))
  expect(await screen.findByText('Enviado')).toBeInTheDocument()
  expect(screen.getByText('Erro no upload')).toBeInTheDocument()
  expect(screen.getByText('one.txt')).toBeInTheDocument();expect(screen.getByText('two.txt')).toBeInTheDocument()
  expect(close).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button',{name:'Iniciar Upload'}))
  await waitFor(()=>expect(upload).toHaveBeenNthCalledWith(2,[selected[1]]))
  expect(screen.getAllByText('Enviado')).toHaveLength(2)
})

it('retains failed files for retry and never marks a rejected upload as completed',async()=>{
  const upload=jest.fn().mockRejectedValue(new Error('denied')),close=jest.fn()
  render(<UploadModal open onClose={close} onUpload={upload} />)
  await userEvent.upload(screen.getByLabelText('Selecionar arquivos'),files())
  await userEvent.click(screen.getByRole('button',{name:'Iniciar Upload'}))
  expect(await screen.findAllByText('Erro no upload')).toHaveLength(2)
  expect(screen.queryByText('Enviado')).not.toBeInTheDocument()
  expect(close).not.toHaveBeenCalled()
  expect(screen.getByRole('button',{name:'Iniciar Upload'})).toBeEnabled()
})

it('blocks submission and file changes while another upload is active',async()=>{
  const upload=jest.fn();render(<UploadModal open onClose={jest.fn()} onUpload={upload} isUploading />)
  expect(screen.getByLabelText('Selecionar arquivos')).toBeDisabled()
  expect(screen.getByRole('button',{name:'Enviando...'})).toBeDisabled()
  expect(screen.queryByRole('button',{name:'Cancelar'})).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button',{name:'Enviando...'}));expect(upload).not.toHaveBeenCalled()
})

it('shows an unconfirmed result separately from a failed upload and keeps it available for reconciliation',async()=>{
  const upload=jest.fn().mockRejectedValue(new DriveUploadBatchError(0,new DriveUploadPendingError()))
  render(<UploadModal open onClose={jest.fn()} onUpload={upload} />)
  await userEvent.upload(screen.getByLabelText('Selecionar arquivos'),files().slice(0,1))
  await userEvent.click(screen.getByRole('button',{name:'Iniciar Upload'}))
  expect(await screen.findByText('Confirmação pendente')).toBeInTheDocument()
  expect(screen.queryByText('Erro no upload')).not.toBeInTheDocument()
  expect(screen.getByRole('button',{name:'Iniciar Upload'})).toBeEnabled()
})
