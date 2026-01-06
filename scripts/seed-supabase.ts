/**
 * Supabase Database Seeding Script
 *
 * Popula o banco de dados Supabase com dados mockados para desenvolvimento e testes.
 *
 * Uso: npx tsx scripts/seed-supabase.ts
 */

import { createClient } from '@supabase/supabase-js'
import { mockTasks, mockTickets, mockChatRooms, mockMessages, mockDriveItems, mockCourses, mockCourseProgress, mockCalendarEvents } from '../src/lib/mock-data'

// Supabase Admin Client (usa service_role_key para bypass de RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas!')
  console.error('Certifique-se de ter NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  console.log('🌱 Iniciando seed do banco Supabase...\n')

  try {
    await seedTasks()
    await seedTickets()
    await seedChat()
    await seedDrive()
    await seedCourses()
    await seedCalendar()

    console.log('\n✅ Seed completo!')
  } catch (error) {
    console.error('\n❌ Erro durante seed:', error)
    process.exit(1)
  }
}

async function seedTasks() {
  console.log('📋 Seeding Tasks...')

  const { data, error } = await supabase.from('tasks').insert(
    mockTasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.dueDate?.toISOString(),
      assigned_to: task.assignedTo,
      sector: task.sector,
      created_by: task.createdBy,
      tags: task.tags || [],
      created_at: task.createdAt.toISOString(),
      updated_at: task.updatedAt.toISOString(),
    }))
  )

  if (error) throw error
  console.log(`  ✅ ${mockTasks.length} tasks inseridas`)
}

async function seedTickets() {
  console.log('🎫 Seeding Tickets...')

  // Inserir tickets
  const { error: ticketsError } = await supabase.from('tickets').insert(
    mockTickets.map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      requester: ticket.requester,
      created_by: ticket.createdBy,
      assigned_to: ticket.assignedTo,
      created_at: ticket.createdAt.toISOString(),
      updated_at: ticket.updatedAt.toISOString(),
    }))
  )

  if (ticketsError) throw ticketsError
  console.log(`  ✅ ${mockTickets.length} tickets inseridos`)

  // Gerar alguns comentários de exemplo
  const sampleComments = mockTickets.slice(0, 5).flatMap((ticket, idx) => [
    {
      ticket_id: ticket.id,
      user_id: ticket.createdBy,
      content: `Este é um comentário de exemplo no ticket "${ticket.title}".`,
      is_internal: false,
      attachments: [],
      created_at: new Date(Date.now() - idx * 3600000).toISOString(),
    },
    {
      ticket_id: ticket.id,
      user_id: ticket.assignedTo || ticket.createdBy,
      content: 'Estou analisando este chamado. Retorno em breve com uma solução.',
      is_internal: true,
      attachments: [],
      created_at: new Date(Date.now() - idx * 1800000).toISOString(),
    },
  ])

  const { error: commentsError } = await supabase
    .from('ticket_comments')
    .insert(sampleComments)

  if (commentsError) throw commentsError
  console.log(`  ✅ ${sampleComments.length} comentários inseridos`)
}

async function seedChat() {
  console.log('💬 Seeding Chat...')

  // Inserir salas de chat
  const { error: roomsError } = await supabase.from('chat_rooms').insert(
    mockChatRooms.map((room) => ({
      id: room.id,
      name: room.name,
      type: room.type,
      participants: room.participants,
      created_at: room.createdAt.toISOString(),
      updated_at: room.updatedAt.toISOString(),
    }))
  )

  if (roomsError) throw roomsError
  console.log(`  ✅ ${mockChatRooms.length} salas de chat inseridas`)

  // Inserir mensagens
  const { error: messagesError } = await supabase.from('messages').insert(
    mockMessages.map((msg) => ({
      id: msg.id,
      room_id: msg.roomId,
      user_id: msg.userId,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
    }))
  )

  if (messagesError) throw messagesError
  console.log(`  ✅ ${mockMessages.length} mensagens inseridas`)
}

async function seedDrive() {
  console.log('📁 Seeding Drive...')

  // Inserir itens do drive (apenas metadata, sem upload real de arquivos)
  const { error } = await supabase.from('drive_items').insert(
    mockDriveItems.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      parent_id: item.parentId || null,
      size: item.size,
      mime_type: item.mimeType,
      storage_path: item.type === 'file' ? `mock/${item.id}/${item.name}` : null,
      uploaded_by: item.uploadedBy,
      shared_with: item.sharedWith || [],
      is_public: item.isPublic || false,
      created_at: item.createdAt.toISOString(),
      updated_at: item.updatedAt.toISOString(),
    }))
  )

  if (error) throw error
  console.log(`  ✅ ${mockDriveItems.length} itens do drive inseridos`)
}

async function seedCourses() {
  console.log('📚 Seeding Courses...')

  // Inserir cursos
  const { error: coursesError } = await supabase.from('courses').insert(
    mockCourses.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      instructor: course.instructor,
      duration: course.duration,
      sector: course.sector,
      thumbnail: course.thumbnail,
      created_at: course.createdAt.toISOString(),
      updated_at: course.updatedAt.toISOString(),
    }))
  )

  if (coursesError) throw coursesError
  console.log(`  ✅ ${mockCourses.length} cursos inseridos`)

  // Inserir lições
  const allLessons = mockCourses.flatMap((course) =>
    course.lessons.map((lesson, idx) => ({
      id: lesson.id,
      course_id: course.id,
      title: lesson.title,
      description: lesson.description,
      duration: lesson.duration,
      video_url: lesson.videoUrl,
      content: lesson.content,
      order_index: idx,
    }))
  )

  const { error: lessonsError } = await supabase.from('lessons').insert(allLessons)

  if (lessonsError) throw lessonsError
  console.log(`  ✅ ${allLessons.length} lições inseridas`)

  // Inserir progresso de cursos
  const { error: progressError } = await supabase.from('course_progress').insert(
    mockCourseProgress.map((progress) => ({
      user_id: progress.userId,
      course_id: progress.courseId,
      completed_lessons: progress.completedLessons || [],
      last_accessed_at: progress.lastAccessedAt?.toISOString(),
    }))
  )

  if (progressError) throw progressError
  console.log(`  ✅ ${mockCourseProgress.length} registros de progresso inseridos`)
}

async function seedCalendar() {
  console.log('📅 Seeding Calendar...')

  const { error } = await supabase.from('calendar_events').insert(
    mockCalendarEvents.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      start_time: event.startTime.toISOString(),
      end_time: event.endTime.toISOString(),
      type: event.type,
      location: event.location,
      participants: event.participants || [],
      created_by: event.createdBy,
    }))
  )

  if (error) throw error
  console.log(`  ✅ ${mockCalendarEvents.length} eventos de calendário inseridos`)
}

main()
