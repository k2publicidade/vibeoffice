
export enum VisualStyle {
    DIGITAL_ART = 'Arte Digital',
    PHOTOGRAPHY = 'Fotografia',
    COLLAGE = 'Colagem',
    OIL_PAINTING = 'Pintura a Óleo',
    MINIMALIST_VECTOR = 'Vetor Minimalista',
    GRUNGE = 'Textura Grunge',
    SURREALISM = 'Surrealismo',
    CYBERPUNK = 'Render 3D Cyberpunk',
    RETRO_VINTAGE = 'Retrô/Vintage Anos 70',
    WATERCOLOR = 'Aquarela',
    ABSTRACT_3D = '3D Abstrato',
    PHOTOREALISTIC_3D = '3D Fotorrealista',
    POP_ART = 'Pop Art',
    UKIYO_E = 'Ukiyo-e (Xilogravura Japonesa)',
    PIXEL_ART = 'Pixel Art',
    BAUHAUS = 'Bauhaus',
    ART_NOUVEAU = 'Art Nouveau',
    ART_DECO = 'Art Deco',
    STEAMPUNK = 'Steampunk',
    GLITCH_ART = 'Glitch Art',
    GRAFFITI = 'Grafite / Arte de Rua',
    NOIR = 'Filme Noir / Preto e Branco',
    RISOGRAPH = 'Risografia',
    DOUBLE_EXPOSURE = 'Dupla Exposição',
    VAPORWAVE = 'Vaporwave',
    CLAYMATION = 'Massinha (Claymation)',
    LOW_POLY = 'Low Poly',
    STENCIL = 'Estêncil',
    CHARCOAL = 'Esboço a Carvão',
    IMPASTO = 'Impasto',
    PSYCHEDELIC = 'Psicodélico',
    ANIME = 'Anime / Mangá',
    COMIC_BOOK = 'História em Quadrinhos',
    BLUEPRINT = 'Planta Baixa (Blueprint)',
    LINOCUT = 'Linoleogravura',
    MOSAIC = 'Mosaico',
    STAINED_GLASS = 'Vitral',
    NEON_NOIR = 'Neon Noir',
    GOTHIC_FANTASY = 'Fantasia Gótica',
    PAPER_CUTOUT = 'Recorte de Papel',
}

// Grouping for better UI navigation
export const VISUAL_STYLE_CATEGORIES: Record<string, VisualStyle[]> = {
    "Realismo & 3D": [
        VisualStyle.PHOTOGRAPHY,
        VisualStyle.PHOTOREALISTIC_3D,
        VisualStyle.ABSTRACT_3D,
        VisualStyle.CYBERPUNK,
        VisualStyle.CLAYMATION,
        VisualStyle.LOW_POLY,
    ],
    "Pintura & Tradicional": [
        VisualStyle.OIL_PAINTING,
        VisualStyle.WATERCOLOR,
        VisualStyle.IMPASTO,
        VisualStyle.CHARCOAL,
        VisualStyle.UKIYO_E,
        VisualStyle.LINOCUT,
    ],
    "Retrô & Vintage": [
        VisualStyle.RETRO_VINTAGE,
        VisualStyle.POP_ART,
        VisualStyle.BAUHAUS,
        VisualStyle.ART_NOUVEAU,
        VisualStyle.ART_DECO,
        VisualStyle.VAPORWAVE,
        VisualStyle.STEAMPUNK,
        VisualStyle.NOIR,
    ],
    "Ilustração & Gráfico": [
        VisualStyle.DIGITAL_ART,
        VisualStyle.MINIMALIST_VECTOR,
        VisualStyle.ANIME,
        VisualStyle.COMIC_BOOK,
        VisualStyle.PIXEL_ART,
        VisualStyle.BLUEPRINT,
        VisualStyle.GRAFFITI,
        VisualStyle.STENCIL,
    ],
    "Textura & Experimental": [
        VisualStyle.COLLAGE,
        VisualStyle.GRUNGE,
        VisualStyle.GLITCH_ART,
        VisualStyle.SURREALISM,
        VisualStyle.RISOGRAPH,
        VisualStyle.DOUBLE_EXPOSURE,
        VisualStyle.PSYCHEDELIC,
        VisualStyle.MOSAIC,
        VisualStyle.STAINED_GLASS,
        VisualStyle.NEON_NOIR,
        VisualStyle.GOTHIC_FANTASY,
        VisualStyle.PAPER_CUTOUT,
    ]
};

export enum MusicGenre {
    // BRASIL
    FUNK_CARIOCA = 'Funk Carioca / Mandelão',
    SERTANEJO_UNIVERSITARIO = 'Sertanejo Universitário',
    SERTANEJO_RAIZ = 'Sertanejo Raiz / Modão',
    SAMBA = 'Samba',
    PAGODE = 'Pagode',
    MPB = 'MPB (Música Popular Brasileira)',
    BOSSA_NOVA = 'Bossa Nova',
    FORRO = 'Forró / Piseiro',
    AXE = 'Axé Music',
    RAP_NACIONAL = 'Rap Nacional / Trap BR',
    TROPICALIA = 'Tropicália',
    CHORO = 'Chorinho',
    BREGA_FUNK = 'Brega Funk',
    ROCK_BRASILEIRO = 'Rock Brasileiro',
    TECNOBREGA = 'Tecnobrega',

    // INTERNACIONAL
    POP = 'Pop',
    ROCK = 'Rock',
    HIP_HOP = 'Hip Hop',
    JAZZ = 'Jazz',
    ELECTRONIC = 'Eletrônica',
    CLASSICAL = 'Clássica',
    METAL = 'Heavy Metal',
    INDIE = 'Indie',
    LOFI = 'Lo-Fi',
    RNB = 'R&B',
    SOUL = 'Soul',
    REGGAE = 'Reggae',
    COUNTRY = 'Country (EUA)',
    FOLK = 'Folk',
    BLUES = 'Blues',
    FUNK_INTL = 'Funk Americano (70s)',
    DISCO = 'Disco',
    PUNK = 'Punk',
    TECHNO = 'Techno',
    HOUSE = 'House',
    TRANCE = 'Trance',
    AMBIENT = 'Ambiente',
    LATIN = 'Latina (Reggaeton/Salsa)',
    KPOP = 'K-Pop',
    JPOP = 'J-Pop',
    GOSPEL = 'Gospel',
    SOUNDTRACK = 'Trilha Sonora',
    TRAP_INTL = 'Trap Internacional',
    DUBSTEP = 'Dubstep',
    DRUM_AND_BASS = 'Drum & Bass',
    GRUNGE = 'Grunge',
    PSYCHEDELIC_ROCK = 'Rock Psicodélico',
    SYNTHWAVE = 'Synthwave',
    INDUSTRIAL = 'Industrial',
    SKA = 'Ska',
    OPERA = 'Ópera',
    AFROBEAT = 'Afrobeat',
}

export enum AlbumMood {
    // Neutro
    NONE = 'Nenhum / Neutro',

    // Positivo / Energético
    EUPHORIC = 'Eufórico / Extase',
    ENERGETIC = 'Energético / Adrenalina',
    HAPPY = 'Feliz / Otimista',
    CONFIDENT = 'Confiante / Poderoso',
    PARTY = 'Festivo / Balada / Noitada',
    SUMMER = 'Vibe de Verão / Ensolarado',
    MOTIVATIONAL = 'Motivacional / Triunfante',

    // Intenso / Agressivo
    AGGRESSIVE = 'Agressivo / Brutal',
    REBELLIOUS = 'Rebelde / Anárquico',
    CHAOTIC = 'Caótico / Destrutivo',
    DARK = 'Sombrio / Obscuro',
    DANGEROUS = 'Perigoso / Gangsta',
    SCARY = 'Assustador / Terror',

    // Calmo / Relaxado
    CHILL = 'Relaxado / Chill / Zen',
    PEACEFUL = 'Sereno / Paz Interior',
    MELANCHOLIC = 'Melancólico / Triste',
    NOSTALGIC = 'Nostálgico / Saudade',
    LONELY = 'Solitário / Isolado',
    DREAMY = 'Sonhador / Etéreo',

    // Romântico / Sensual
    ROMANTIC = 'Romântico / Apaixonado',
    SEDUCTIVE = 'Sedutor / Sexy / Quente',
    INTIMATE = 'Íntimo / Vulnerável',
    HEARTBROKEN = 'Coração Partido / Sofrência',

    // Conceitual / Outros
    PSYCHEDELIC = 'Psicodélico / Alucinógeno',
    MYSTERIOUS = 'Misterioso / Enigmático',
    SPIRITUAL = 'Espiritual / Místico',
    FUTURISTIC = 'Futurista / Tecnológico',
    RETRO = 'Retrô / Vintage / Clássico',
    LUXURY = 'Luxuoso / Ostentação / Rico',
    TRASH = 'Trash / Sujo / Underground',
}

export enum FontStyle {
    SERIF_CLASSIC = 'Serifa Clássica',
    SANS_BOLD = 'Sem Serifa Negrito',
    HANDWRITTEN = 'Manuscrito',
    GOTHIC = 'Gótico',
    FUTURISTIC = 'Futurista/Sci-Fi',
    GRAFFITI = 'Grafite',
    TYPEWRITER = 'Máquina de Escrever',
    MINIMALIST_SANS = 'Sem Serifa Minimalista',
    ELEGANT_SCRIPT = 'Escrita Elegante',
    RETRO_BUBBLE = 'Bolha Retrô',
    PIXEL = 'Pixel / 8-bit',
    BRUSH_STROKE = 'Pincelada',
    STENCIL = 'Estêncil',
    WESTERN = 'Faroeste',
    HORROR = 'Terror / Gotejando',
    VINTAGE_SERIF = 'Serifa Vintage',
    WIDE = 'Largo / Estendido',
    CONDENSED = 'Condensado',
    CALLIGRAPHY = 'Caligrafia',
    CHALKBOARD = 'Quadro Negro',
    NEON_TUBE = 'Tubo Neon',
    GROOVY = 'Groovy Anos 70',
    MODERN_GEOMETRIC = 'Geométrico Moderno',
    VAPOR_AESTHETIC = 'Estética Vaporwave',
}

export enum TextEffect {
    NONE = 'Nenhum / Plano',
    NEON_GLOW = 'Brilho Neon',
    DROP_SHADOW = 'Sombra Projetada',
    GLITCH = 'Glitch / Falha Digital',
    METALLIC = 'Metálico Simples',
    OUTLINE = 'Contorno (Outline)',
    GRADIENT = 'Preenchimento Gradiente',
    DISTORTED = 'Distorcido / Ondulado',
    GRUNGE = 'Textura Grunge',
    STICKER = 'Estilo Adesivo',

    // Efeitos 3D Realistas e Iluminação
    REALISTIC_3D_GOLD = '3D Ouro Realista (Reflexos)',
    REALISTIC_3D_CHROME = '3D Cromo Líquido (Liquid Metal)',
    REALISTIC_3D_GLASS = '3D Vidro Prismático (Refração)',
    REALISTIC_3D_STONE = '3D Pedra Esculpida (Cinematográfico)',
    REALISTIC_3D_NEON_VOLUMETRIC = '3D Neon Volumétrico (Cyberpunk)',
    REALISTIC_3D_INFLATED = '3D Inflado / Balão (Glossy)',
    REALISTIC_3D_WATER = '3D Água / Gotejando Realista',
    REALISTIC_3D_FIRE = '3D Fogo Realista (Brasas)',
    REALISTIC_3D_ICE = '3D Gelo / Congelado (Translucidez)',
    CINEMA_4D_STYLE = 'Estilo Cinema 4D (Render Octane)',
    VOLUMETRIC_LIGHTING = 'Luz Volumétrica Dramática',
    LETTERPRESS_DEEP = 'Baixo Relevo Profundo (Letterpress)',
}

export interface TextOverlayConfig {
    enabled: boolean;
    title: string;
    artist: string;
    fontStyle: FontStyle;
    color: string;
    effect: TextEffect[];
}

export enum Lighting {
    NATURAL = 'Natural / Solar',
    STUDIO = 'Estúdio / Fotografia',
    NEON = 'Neon / Cyberpunk',
    CINEMATIC = 'Cinemática / Dramática',
    VOLUMETRIC = 'Volumétrica / God Rays',
    DARK = 'Escura / Low Key',
    GOLDEN = 'Dourada / Golden Hour',
    SOFT = 'Suave / Difusa',
    HARD = 'Dura / Alto Contraste',
}

export enum TextMaterial {
    CHROME = 'Cromo / Prateado',
    GOLD = 'Ouro / Dourado',
    GLASS = 'Vidro / Cristal',
    BRUSHED_METAL = 'Metal Escovado',
    NEON = 'Neon Luminoso',
    GLOSSY_PLASTIC = 'Plástico Glossy',
    STONE = 'Pedra / Mármore',
    CONCRETE = 'Concreto',
    ICE = 'Gelo',
    WOOD = 'Madeira Polida',
    LIQUID = 'Líquido / Metálico',
}

export enum Contrast {
    HIGH = 'Alto / Dramático',
    MEDIUM = 'Médio / Equilibrado',
    LOW = 'Baixo / Suave',
}

export interface GenerationConfig {
    visualStyle: VisualStyle;
    musicGenre: MusicGenre;
    mood: AlbumMood;
    details: string; // Used for "Cenário Principal" in new pattern if not empty
    scenario: string;
    elements: string;
    lighting: Lighting;
    textMaterial: TextMaterial;
    colorPalette: string;
    contrast: Contrast;
    textConfig: TextOverlayConfig;
    referenceImage: string | null; // Base64 data string
}

export interface AppState {
    generatedImage: string | null; // Base64 or URL
    isGenerating: boolean;
    isEditing: boolean;
    config: GenerationConfig;
    editPrompt: string;
}

export interface SavedProject {
    id: string;
    deletedAt?: number;
    createdAt: number;
    config: GenerationConfig;
    briefing: string;
}
