import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getNotificationPath } from '@/lib/notification-links'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { z } from 'zod'

export async function POST(request: Request) {
  const expected = process.env.NOTIFICATION_WEBHOOK_SECRET || ''
  const received = request.headers.get('authorization')?.replace(/^Bearer /, '') || ''
  if (!expected || Buffer.byteLength(received) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(received), Buffer.from(expected))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = z.object({ id: z.uuid() }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: notification, error } = await admin.from('notifications').select('*').eq('id', parsed.data.id).single()
  if (error) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  const { data: recipient, error: recipientError } = await admin.from('users').select('email,active').eq('id', notification.user_id).maybeSingle()
  if (recipientError) return NextResponse.json({ error: 'Recipient lookup failed' }, { status: 503 })
  if (notification.archived || !recipient?.active) return NextResponse.json({ delivered: false, skipped: 'inactive_or_archived' })
  const { data: preferences, error: preferenceError } = await admin.from('notification_preferences').select('*').eq('user_id', notification.user_id).eq('notification_type', notification.type).maybeSingle()
  if (preferenceError) return NextResponse.json({ error: 'Preference lookup failed' }, { status: 503 })
  const updates: Record<string, string> = {}
  const failures: string[] = []
  const raw = notification as unknown as { push_sent_at?: string; email_sent_at?: string }
  if (preferences?.enable_email && !raw.email_sent_at && (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) && notification.type !== 'message_received' && notification.type !== 'mentioned_in_chat') failures.push('email_unconfigured')
  const pushConfigured = Boolean(process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  if (preferences?.enable_push && !raw.push_sent_at && !pushConfigured) failures.push('push_unconfigured')
  const path = getNotificationPath(notification) || '/'
  if (preferences?.enable_push && !raw.push_sent_at && pushConfigured) {
    try {
    webpush.setVapidDetails('mailto:admin@vibedistro.com.br', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)
    const { data: subscriptions, error: subscriptionError } = await admin.from('push_subscriptions' as never).select('*').eq('user_id', notification.user_id)
    if (subscriptionError) return NextResponse.json({ error: 'Subscription lookup failed' }, { status: 503 })
    for (const sub of (subscriptions || []) as { id: string; endpoint: string; keys: { p256dh: string; auth: string } }[]) {
      try {
        const endpoint = new URL(sub.endpoint)
        if (endpoint.protocol !== 'https:' || !/^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[^.]+\.notify\.windows\.com|web\.push\.apple\.com)$/.test(endpoint.hostname) || endpoint.username || endpoint.password || (endpoint.port && endpoint.port !== '443')) { failures.push('push'); continue }
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify({ title: notification.title, body: notification.message, url: path }), { TTL: 3600, timeout: 10000 })
      }
      catch (e) { const status = (e as { statusCode?: number }).statusCode; if (status === 404 || status === 410) await admin.from('push_subscriptions' as never).delete().eq('id', sub.id); else failures.push('push') }
    }
    if (!failures.includes('push')) updates.push_sent_at = new Date().toISOString()
    } catch { failures.push('push') }
  }
  if (preferences?.enable_email && !raw.email_sent_at && process.env.RESEND_API_KEY && process.env.EMAIL_FROM && notification.type !== 'message_received' && notification.type !== 'mentioned_in_chat') {
    try {
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `office-${notification.id}` }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: recipient.email, subject: notification.title, text: `${notification.message}\n\nhttps://office.vibedistro.com${path}` }) })
      if (response.ok) updates.email_sent_at = new Date().toISOString(); else failures.push('email')
    } catch { failures.push('email') }
  }
  if (Object.keys(updates).length) {
    const { error: updateError } = await admin.from('notifications').update(updates).eq('id', notification.id)
    if (updateError) return NextResponse.json({ error: 'Delivery status update failed' }, { status: 503 })
  }
  return NextResponse.json({ delivered: !failures.length, failedChannels: failures }, { status: failures.length ? 502 : 200 })
}
