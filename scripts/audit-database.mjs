import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
const env=process.env;
if(!process.env.OFFICE_AUDIT_ACCOUNTS) throw Error('Set OFFICE_AUDIT_ACCOUNTS to a private JSON file with Admin and Gerente test credentials');
const accounts=JSON.parse(fs.readFileSync(process.env.OFFICE_AUDIT_ACCOUNTS,'utf8'));
const service=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const make=()=>createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=make(),manager=make(),collaborator=make(),anonymous=make();
const prefix='AUDITORIA '+randomUUID().slice(0,8);
const created=[];let tempUser;
function ok(r,label){if(r.error)throw Error(label+': '+r.error.message);console.log('PASS '+label);return r.data;}
function deny(r,label){if(!r.error && r.data?.length)throw Error('Permissão indevida: '+label);console.log('PASS denied '+label)}
async function insert(client,table,payload){const data=ok(await client.from(table).insert(payload).select().single(),'criar '+table);created.push([table,data.id]);return data;}
async function privateChannel(client,topic,receive){
 const channel=client.channel(topic,{config:{private:true}});
 if(receive)channel.on('broadcast',{event:'audit'},receive);
 try { return await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Private channel timed out')),12000);channel.subscribe((status,error)=>{if(status==='SUBSCRIBED'){clearTimeout(timeout);resolve(channel)}else if(status==='CHANNEL_ERROR'){clearTimeout(timeout);reject(error||Error('Channel denied'))}})}); }
 catch(error) { await client.removeChannel(channel); channel.teardown(); throw error; }
}
try{
 for(const [client,account] of [[admin,accounts[0]],[manager,accounts[1]]]) ok(await client.auth.signInWithPassword({email:account.email,password:account.password}),'login '+account.role);
 const {data,error}=await service.auth.admin.createUser({email:'audit-'+randomUUID()+'@example.invalid',password:'audit!'+randomUUID(),email_confirm:true,user_metadata:{name:prefix,role:'Admin'}});if(error)throw error;tempUser=data.user;
 ok(await service.from('users').update({active:true}).eq('id',tempUser.id),'ativar colaborador de teste');
 const link=await service.auth.admin.generateLink({type:'magiclink',email:tempUser.email});if(link.error)throw link.error;
 ok(await collaborator.auth.verifyOtp({token_hash:link.data.properties.hashed_token,type:'magiclink'}),'login colaborador');
 const profile=ok(await collaborator.from('users').select('role').eq('id',tempUser.id).single(),'perfil confiável');if(profile.role!=='Colaborador')throw Error('Escalada por user_metadata');
 deny(await collaborator.from('users').update({role:'Admin'}).eq('id',tempUser.id).select(),'alteração do próprio cargo');
 deny(await anonymous.from('users').select('*'),'leitura anônima');
 for(const table of ['users','tasks','tickets','chat_rooms','messages','drive_items','shared_access','courses','modules','lessons','calendar_events','studio_bookings','releases','company_announcements','notifications','notification_preferences'])ok(await admin.from(table).select('*').limit(1),'leitura '+table);
 const task=await insert(admin,'tasks',{title:prefix,sector:'Administrativo',created_by:accounts[0].id});
 ok(await admin.from('task_assignees').insert({task_id:task.id,user_id:tempUser.id}),'atribuir tarefa');
 ok(await collaborator.from('tasks').select('*').eq('id',task.id).single(),'colaborador vê tarefa atribuída');
 ok(await collaborator.from('tasks').update({status:'in_progress'}).eq('id',task.id).select().single(),'colaborador move tarefa');
 const ticket=await insert(admin,'tickets',{title:prefix,description:'Teste técnico',category:'TI/Suporte',requester:accounts[0].id,created_by:accounts[0].id,assigned_to:accounts[1].id,linked_task_id:task.id});
 ok(await admin.from('tasks').update({linked_ticket_id:ticket.id}).eq('id',task.id),'vincular tarefa e ticket');
 const comment=await insert(collaborator,'ticket_comments',{ticket_id:ticket.id,user_id:tempUser.id,content:prefix,is_internal:false});
 await insert(manager,'ticket_comments',{ticket_id:ticket.id,user_id:accounts[1].id,content:prefix,is_internal:true});
 const visible=ok(await collaborator.from('ticket_comments').select('*').eq('ticket_id',ticket.id),'comentários permitidos');if(visible.length!==1)throw Error('Comentário interno exposto');
 const room=await insert(admin,'chat_rooms',{name:prefix,type:'project',participants:[accounts[0].id,tempUser.id],created_by:accounts[0].id});
 const added=ok(await admin.rpc('manage_group_member',{room_id:room.id,member_id:accounts[1].id,adding:true}),'adicionar membro atomicamente');if(!added.participants.includes(accounts[1].id))throw Error('Participante não adicionado');
 const unauthorized=await manager.rpc('manage_group_member',{room_id:room.id,member_id:tempUser.id,adding:false});if(!unauthorized.error)throw Error('Membro não criador alterou grupo');console.log('PASS apenas criador gerencia grupo');
 ok(await admin.rpc('manage_group_member',{room_id:room.id,member_id:accounts[1].id,adding:false}),'remover membro atomicamente');
 let received;const nonce=randomUUID();const delivered=new Promise(resolve=>{received=resolve});
 const receiver=await privateChannel(collaborator,'office-room:'+room.id,({payload})=>{if(payload.nonce===nonce)received()});
 const sender=await privateChannel(admin,'office-room:'+room.id);
 try{await privateChannel(manager,'office-room:'+room.id);throw Error('Pessoa de fora entrou no canal privado')}catch(error){if(error.message?.includes('Pessoa de fora')||error.message?.includes('timed out'))throw error;console.log('PASS canal privado nega pessoa de fora')}
 await sender.send({type:'broadcast',event:'audit',payload:{nonce}});
 await Promise.race([delivered,new Promise((_,reject)=>setTimeout(()=>reject(Error('Broadcast privado não entregue')),10000))]);console.log('PASS broadcast privado entre participantes');await admin.removeChannel(sender);await collaborator.removeChannel(receiver);
 const message=await insert(admin,'messages',{room_id:room.id,user_id:accounts[0].id,content:prefix,type:'text'});
 ok(await collaborator.rpc('toggle_message_reaction',{message_id:message.id,emoji:'👍'}),'reagir à mensagem de outra pessoa');
 ok(await collaborator.rpc('mark_messages_read',{message_ids:[message.id]}),'confirmar leitura');
 const reacted=ok(await admin.from('messages').select('*').eq('id',message.id).single(),'ler reações');if(!reacted.read_by[tempUser.id] || !reacted.reactions['👍'].includes(tempUser.id))throw Error('RPC não persistiu');
 const summaries=ok(await collaborator.rpc('chat_room_summaries'),'resumos de chat');if(!summaries.some(s=>s.room_id===room.id&&Number(s.unread)===0))throw Error('Contagem de não-lidas incorreta');
 const assetPath=room.id+'/'+randomUUID();ok(await admin.storage.from('message-assets').upload(assetPath,'Teste técnico'),'upload de anexo de chat');
 try {ok(await collaborator.storage.from('message-assets').createSignedUrl(assetPath,60),'participante acessa anexo');const denied=await manager.storage.from('message-assets').createSignedUrl(assetPath,60);if(!denied.error)throw Error('Anexo exposto fora da sala');console.log('PASS anexo privado por sala')}finally{ok(await admin.storage.from('message-assets').remove([assetPath]),'remover anexo de teste')}
 await insert(collaborator,'tickets',{title:prefix+' solicitação',description:'Solicitação de teste do colaborador',category:'Administrativo',requester:tempUser.id,created_by:tempUser.id,request_type:'remote',request_start_date:'2035-01-01',request_end_date:'2035-01-02'});
 const notifications=ok(await collaborator.from('notifications').select('*'),'notificações');if(!notifications.some(n=>n.type==='task_assigned')||!notifications.some(n=>n.type==='message_received'))throw Error('Notificações não geradas');
 const dm=await insert(admin,'chat_rooms',{name:prefix,type:'dm',participants:[accounts[0].id,tempUser.id],created_by:accounts[0].id});
 const duplicate=await collaborator.from('chat_rooms').insert({name:prefix,type:'dm',participants:[tempUser.id,accounts[0].id],created_by:tempUser.id});if(duplicate.error?.code!=='23505')throw Error('DM duplicada aceita');console.log('PASS conversa direta única');
 ok(await collaborator.from('user_chat_preferences').upsert({user_id:tempUser.id,room_id:dm.id,is_muted:true},{onConflict:'user_id,room_id'}),'silenciar sala');
 const mutedMessage=await insert(admin,'messages',{room_id:dm.id,user_id:accounts[0].id,content:prefix+' silenciado'});
 const mutedNotifications=ok(await collaborator.from('notifications').select('*').eq('entity_id',mutedMessage.id),'verificar silenciamento');if(mutedNotifications.length)throw Error('Sala silenciada gerou notificação');
 ok(await collaborator.from('user_chat_preferences').upsert({user_id:tempUser.id,room_id:dm.id,is_archived:true},{onConflict:'user_id,room_id'}),'arquivar mantendo preferências');
 const retained=ok(await collaborator.from('user_chat_preferences').select('is_muted,is_archived').eq('room_id',dm.id).single(),'preferências preservadas');if(!retained.is_muted||!retained.is_archived)throw Error('Preferências sobrescritas');
 ok(await collaborator.from('user_chat_preferences').update({is_blocked:true}).eq('room_id',dm.id).eq('user_id',tempUser.id),'bloquear conversa');
 const blocked=await admin.from('messages').insert({room_id:dm.id,user_id:accounts[0].id,content:prefix+' bloqueado'});if(!blocked.error)throw Error('Mensagem enviada apesar do bloqueio');console.log('PASS bloqueio aplicado pelo banco');
 ok(await collaborator.from('user_chat_preferences').update({is_blocked:false,is_muted:false}).eq('room_id',dm.id).eq('user_id',tempUser.id),'desbloquear conversa');
 await insert(admin,'messages',{room_id:dm.id,user_id:accounts[0].id,content:prefix+' desbloqueado'});
 const folder=await insert(admin,'drive_items',{name:prefix,type:'folder',uploaded_by:accounts[0].id,sector:'Marketing'});
 ok(await admin.from('shared_access').insert({item_id:folder.id,user_id:tempUser.id,permission:'view',shared_by:accounts[0].id}),'compartilhar pasta');
 const course=await insert(admin,'courses',{title:prefix,author_id:accounts[0].id,is_published:true});
 const coverConfig={textConfig:{title:prefix,artist:'Teste'},musicGenre:'Pop',visualStyle:'Arte digital'};
 const cover=await insert(admin,'cover_projects',{created_by:accounts[0].id,config:coverConfig,briefing:prefix});
 deny(await collaborator.from('cover_projects').select('*').eq('id',cover.id),'colaborador lê projeto de capa alheio');
 const ownCover=await insert(collaborator,'cover_projects',{created_by:tempUser.id,config:coverConfig,briefing:prefix});
 ok(await manager.from('cover_projects').select('*').eq('id',ownCover.id).single(),'gerente acompanha projetos de capa');
 ok(await collaborator.from('cover_projects').update({briefing:prefix+' editado',deleted_at:new Date().toISOString()}).eq('id',ownCover.id).select().single(),'editar e arquivar capa');
 ok(await collaborator.from('cover_projects').update({deleted_at:null}).eq('id',ownCover.id).select().single(),'restaurar capa');
 const ownerAttack=await collaborator.from('cover_projects').update({created_by:accounts[1].id}).eq('id',ownCover.id).select();if(!ownerAttack.error)throw Error('Titularidade alterada');console.log('PASS titularidade da capa protegida');
 deny(await manager.from('courses').insert({title:prefix}).select(),'gerente administra cursos');
 const courseModule=await insert(admin,'modules',{course_id:course.id,title:prefix});
 const lesson=await insert(admin,'lessons',{course_id:course.id,module_id:courseModule.id,title:prefix,type:'html',content:'<p>Teste</p>',order:0});
 ok(await collaborator.from('user_course_progress').upsert({user_id:tempUser.id,course_id:course.id,lesson_id:lesson.id},{onConflict:'user_id,lesson_id'}),'progresso de curso');
 const booking=await insert(admin,'studio_bookings',{track_title:prefix,studio_name:prefix,booking_date:'2035-01-01',start_time:'10:00',end_time:'11:00',created_by:accounts[0].id});
 const overlap=await admin.from('studio_bookings').insert({track_title:prefix,studio_name:prefix,booking_date:'2035-01-01',start_time:'10:30',end_time:'11:30',created_by:accounts[0].id});if(overlap.error?.code!=='23P01')throw Error('Reserva sobreposta aceita');console.log('PASS conflito de horário');
 await insert(admin,'releases',{title:prefix,artist:'Teste',created_by:accounts[0].id,artists:[{name:'Teste',role:'main'}],tracks:[]});
 await insert(admin,'calendar_events',{title:prefix,start_time:'2035-01-01T13:00:00Z',end_time:'2035-01-01T14:00:00Z',type:'company',created_by:accounts[0].id});
 await insert(manager,'company_announcements',{title:prefix,message:'Teste',created_by:accounts[1].id,expires_at:'2035-01-01T00:00:00Z'});
 deny(await collaborator.from('company_announcements').insert({title:prefix,message:'Teste',created_by:tempUser.id,expires_at:'2035-01-01T00:00:00Z'}).select(),'colaborador publica avisos');
 for(const bucket of ['drive-files','release-assets','course-assets']){
  const path='audit/'+randomUUID()+'.txt';ok(await admin.storage.from(bucket).upload(path,'Teste técnico'),'upload '+bucket);
  try{const signed=ok(await admin.storage.from(bucket).createSignedUrl(path,60),'URL privada '+bucket);const response=await fetch(signed.signedUrl);if(response.status!==200)throw Error('Download falhou '+bucket);console.log('PASS download '+bucket)}finally{ok(await admin.storage.from(bucket).remove([path]),'remover arquivo de teste')}
 }
 console.log('DATABASE CHECK COMPLETE');
}catch(e){console.error(e);process.exitCode=1}
finally{
 if(created.length) await service.from('notifications').delete().in('entity_id',created.map(([,id])=>id));
 for(const [table,id] of created.reverse()){const r=await service.from(table).delete().eq('id',id);if(r.error)console.error('cleanup '+table+': '+r.error.message)}
 if(tempUser){await service.auth.admin.deleteUser(tempUser.id)}
 for(const client of [admin,manager,collaborator,anonymous,service]) { const channels=client.getChannels(); await client.removeAllChannels(); for(const channel of channels)channel.teardown(); client.realtime.disconnect(); }
 console.log('AUDIT CLEANUP COMPLETE');
}
