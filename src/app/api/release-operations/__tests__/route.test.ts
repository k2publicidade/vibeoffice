/** @jest-environment node */
import {GET,PATCH,POST} from '../route'
const mockUser=jest.fn(),mockRpc=jest.fn()
jest.mock('@/lib/supabase/server',()=>({createServerSupabaseClient:async()=>({auth:{getUser:mockUser},rpc:mockRpc})}))
const id='11111111-1111-4111-8111-111111111111'
function request(method='GET',body?:unknown,origin='https://office.test'){return new Request('https://office.test/api/release-operations',{method,headers:{origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})}
beforeEach(()=>{
 jest.clearAllMocks()
 mockUser.mockResolvedValue({data:{user:{id:'admin'}}})
 mockRpc.mockImplementation(async(name:string)=>({data:name==='office_role'?'Admin':{workflows:[],history:[],metrics:[],canManage:true},error:null}))
})
it('returns only the authorized database snapshot and disables caching',async()=>{
 const response=await GET(request());expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toContain('no-store');expect(mockRpc).toHaveBeenCalledWith('release_operations_snapshot')
})
it('rejects an unauthenticated caller',async()=>{
 mockUser.mockResolvedValue({data:{user:null}});expect((await GET(request())).status).toBe(401)
})
it('blocks unauthenticated MFA or inactive roles',async()=>{
 mockRpc.mockResolvedValue({data:null});expect((await GET(request())).status).toBe(403)
})
it('does not allow collaborators to import revenue reports',async()=>{
 mockRpc.mockResolvedValue({data:'Colaborador'});expect((await POST(request('POST',{}))).status).toBe(403);expect(mockRpc).not.toHaveBeenCalledWith('import_release_performance',expect.anything())
})
it('sends only validated csv rows to the transactional import',async()=>{
 const response=await POST(request('POST',{releaseId:id,csv:'month,platform,streams,revenue,currency\n2026-09,Spotify,120,2.50,USD',locale:'en-US',source:'revelator.csv'}))
 expect(response.status).toBe(200)
 expect(mockRpc).toHaveBeenCalledWith('import_release_performance',{p_release_id:id,p_rows:[{month:'2026-09',platform:'Spotify',country:'ZZ',streams:120,revenue:2.5,currency:'USD'}],p_source:'revelator.csv'})
})
it('rejects an invalid report before writing',async()=>{
 expect((await POST(request('POST',{releaseId:id,csv:'invalid',locale:'en-US',source:'bad.csv'}))).status).toBe(400)
 expect(mockRpc).not.toHaveBeenCalledWith('import_release_performance',expect.anything())
})
it('rejects cross origin and hostile Revelator links',async()=>{
 expect((await PATCH(request('PATCH',{releaseId:id,action:'approve',revision:1},'https://evil.test'))).status).toBe(403)
 expect((await PATCH(request('PATCH',{releaseId:id,action:'record_submission',revision:1,revelator_url:'https://account.revelator.pro.evil.test/'}))).status).toBe(400)
})
it('returns a conflict on concurrent state changes',async()=>{
 mockRpc.mockImplementation(async(name:string)=>name==='office_role'?{data:'Admin'}:{data:null,error:{code:'40001',message:'Atualize antes de continuar'}})
 const response=await PATCH(request('PATCH',{releaseId:id,action:'approve',revision:1}));expect(response.status).toBe(409)
})
