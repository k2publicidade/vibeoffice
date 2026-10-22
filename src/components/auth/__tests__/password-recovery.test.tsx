import {StrictMode} from 'react'
import {render,screen,fireEvent,waitFor} from '@testing-library/react'
import UpdatePasswordPage from '@/app/(auth)/update-password/page'
import RecoveryPage from '@/app/auth/recover/page'
const mockGetUser=jest.fn(),mockUpdate=jest.fn(),mockVerify=jest.fn(),mockReplace=jest.fn()
jest.mock('@/lib/supabase/client',()=>({createClient:()=>({auth:{getUser:mockGetUser,updateUser:mockUpdate,verifyOtp:mockVerify}})}))
jest.mock('next/navigation',()=>({useRouter:()=>({replace:mockReplace,push:mockReplace,refresh:jest.fn()})}))
beforeEach(()=>{jest.clearAllMocks();window.history.replaceState({},'','/update-password');mockGetUser.mockResolvedValue({data:{user:{id:'user'}},error:null});mockUpdate.mockResolvedValue({error:null});mockVerify.mockResolvedValue({data:{session:{access_token:'test'}},error:null})})
it('shows an expired link instead of an unusable password form',async()=>{
 window.history.replaceState({},'','/update-password#error_code=otp_expired&error=access_denied')
 render(<StrictMode><UpdatePasswordPage/></StrictMode>);
 expect(await screen.findByRole('alert')).toHaveTextContent(/expirou|inválido/i)
 expect(screen.queryByRole('button',{name:'Salvar senha'})).not.toBeInTheDocument()
 expect(mockUpdate).not.toHaveBeenCalled()
})
it('requires an authenticated session before accepting a new password',async()=>{
 mockGetUser.mockResolvedValue({data:{user:null},error:null});render(<UpdatePasswordPage/>);
 expect(await screen.findByRole('alert')).toHaveTextContent(/sessão|recuperação/i)
 expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
})
it('explains the minimum length and matching confirmation',async()=>{
 render(<UpdatePasswordPage/>);
 const password=await screen.findByLabelText('Nova senha')
 fireEvent.change(password,{target:{value:'short'}})
 expect(screen.getByRole('button',{name:'Salvar senha'})).toBeDisabled()
 expect(screen.getByText(/faltam 7 caracteres/i)).toBeInTheDocument()
 fireEvent.change(password,{target:{value:'a-long-test-password'}})
 fireEvent.change(screen.getByLabelText('Confirmar nova senha'),{target:{value:'different'}})
 expect(screen.getByText(/senhas ainda não coincidem/i)).toBeInTheDocument()
 fireEvent.change(screen.getByLabelText('Confirmar nova senha'),{target:{value:'a-long-test-password'}})
 expect(screen.getByRole('button',{name:'Salvar senha'})).toBeEnabled()
})
it('does not consume a recovery token when the page is only opened',async()=>{
 window.history.replaceState({},'','/auth/recover#token_hash=one-time-test-token')
 render(<StrictMode><RecoveryPage/></StrictMode>);
 const button=await screen.findByRole('button',{name:'Continuar recuperação'})
 expect(button).toBeEnabled();expect(mockVerify).not.toHaveBeenCalled()
 expect(window.location.hash).toBe('')
 fireEvent.click(button)
 await waitFor(()=>expect(mockVerify).toHaveBeenCalledWith({type:'recovery',token_hash:'one-time-test-token'}))
 expect(mockReplace).toHaveBeenCalledWith('/update-password')
})
it('shows a clear recovery failure and does not navigate on an expired token',async()=>{
 window.history.replaceState({},'','/auth/recover#token_hash=expired-test-token')
 mockVerify.mockResolvedValue({data:{session:null},error:{code:'otp_expired',message:'Expired'}})
 render(<RecoveryPage/>);fireEvent.click(await screen.findByRole('button',{name:'Continuar recuperação'}))
 expect(await screen.findByRole('alert')).toHaveTextContent(/expirou|inválido/i)
 expect(mockReplace).not.toHaveBeenCalled()
})
