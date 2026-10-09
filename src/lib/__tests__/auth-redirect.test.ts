import { safeAuthRedirect } from '../auth-redirect'

describe('authentication callback redirects', () => {
  it.each(['https://evil.example', '//evil.example', '/\\evil.example', '/\nLocation: evil', null])('rejects outside redirects %s', value => {
    expect(safeAuthRedirect(value)).toBe('/')
  })
  it('preserves an internal destination', () => {
    expect(safeAuthRedirect('/courses?a=1#lesson')).toBe('/courses?a=1#lesson')
  })
})
