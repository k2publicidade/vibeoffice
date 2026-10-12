import { sanitizeLessonHtml } from '../sanitize'

// The browser adapter exports DOMPurify directly, using the existing jsdom window.
jest.mock('isomorphic-dompurify', () => jest.requireActual('dompurify'))

describe('lesson HTML sanitization', () => {
  it('preserves course formatting and normal links while removing executable markup', () => {
    const node = document.createElement('div')
    node.innerHTML = sanitizeLessonHtml('<p><strong>Conteúdo</strong><a href="https://example.test">Material</a></p><script>alert(1)</script><img src="https://example.test/cover.png" onerror="alert(2)"><a href="javascript:alert(3)">Perigoso</a><div data-private="value" onclick="alert(4)">Texto</div>')
    expect(node.querySelector('strong')).toHaveTextContent('Conteúdo')
    expect(node.querySelector('a')).toHaveAttribute('href', 'https://example.test')
    expect(node.querySelector('script')).toBeNull()
    expect(node.querySelector('img')).not.toHaveAttribute('onerror')
    expect(node.querySelectorAll('a')[1]).not.toHaveAttribute('href')
    expect(node.querySelector('div')).not.toHaveAttribute('onclick')
    expect(node.querySelector('div')).not.toHaveAttribute('data-private')
  })

  it('handles empty content', () => expect(sanitizeLessonHtml('')).toBe(''))
})
