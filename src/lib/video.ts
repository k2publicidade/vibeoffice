/**
 * Converte uma URL de vídeo (YouTube, Vimeo) em uma URL de embed.
 * Retorna null se a URL for inválida; retorna a URL original se for de outra origem.
 */
export function videoEmbedUrl(url: string | null | undefined): string | null {
    if (!url) return null
    try {
        const u = new URL(url)

        // YouTube full URL
        if (u.hostname.includes('youtube.com')) {
            const v = u.searchParams.get('v')
            if (v) return `https://www.youtube.com/embed/${v}`
            // shorts: /shorts/abc
            const shorts = u.pathname.match(/^\/shorts\/([^/]+)/)
            if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`
            // embed direto: /embed/abc
            const embed = u.pathname.match(/^\/embed\/([^/]+)/)
            if (embed) return `https://www.youtube.com/embed/${embed[1]}`
        }

        // YouTube curtinho: youtu.be/abc
        if (u.hostname === 'youtu.be') {
            const id = u.pathname.slice(1).split('/')[0]
            return id ? `https://www.youtube.com/embed/${id}` : null
        }

        // Vimeo: vimeo.com/12345 ou player.vimeo.com/video/12345
        if (u.hostname.includes('vimeo.com')) {
            const id = u.pathname.split('/').filter(Boolean).pop()
            return id ? `https://player.vimeo.com/video/${id}` : null
        }

        // Outras URLs (ex: drive direto) retornam como estão
        return url
    } catch {
        return null
    }
}
