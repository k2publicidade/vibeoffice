import { getNotificationPath } from '../notification-links'

const id = '11111111-1111-4111-8111-111111111111'
describe('notification destinations shared by in-app, push and email', () => {
  it('targets the individual task, ticket and conversation', () => {
    expect(getNotificationPath({ entity_type: 'task', entity_id: id })).toBe(`/tasks?open=${id}`)
    expect(getNotificationPath({ entity_type: 'ticket', entity_id: id })).toBe(`/tickets?open=${id}`)
    expect(getNotificationPath({ entity_type: 'message', entity_id: id, metadata: { roomId: id } })).toBe(`/chat?room=${id}`)
  })

  it('rejects malformed identifiers and unsupported metadata shapes', () => {
    expect(getNotificationPath({ entity_type: 'task', entity_id: 'https://outside.example' })).toBeNull()
    expect(getNotificationPath({ entity_type: 'message', entity_id: id, metadata: { roomId: 123 } })).toBeNull()
    expect(getNotificationPath({ entity_type: 'message', entity_id: id, metadata: [{ roomId: id }] })).toBeNull()
    expect(getNotificationPath({ entity_type: null, entity_id: null })).toBeNull()
  })
})
