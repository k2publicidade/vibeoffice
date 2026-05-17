import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i', 'u', 's',
  'a',
  'img',
  'blockquote', 'code', 'pre',
  'span', 'div',
  'iframe', 'video', 'source',
]

const ALLOWED_ATTR = [
  'href', 'target', 'rel',
  'src', 'alt', 'title',
  'class', 'className',
  'frameborder', 'allow', 'allowfullscreen', 'controls',
  'width', 'height',
]

/**
 * Sanitiza HTML editado pelo admin antes de renderizar no player.
 * Whitelist conservadora: permite formatação básica + media embeds, bloqueia scripts/event handlers.
 */
export function sanitizeLessonHtml(html: string): string {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })
}
