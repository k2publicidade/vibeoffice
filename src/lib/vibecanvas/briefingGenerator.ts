import { GenerationConfig, AlbumMood } from "@/types/vibecanvas";

export const generateBriefing = (config: GenerationConfig): string => {
    const {
        visualStyle,
        musicGenre,
        mood,
        details,
        scenario,
        elements,
        lighting,
        textMaterial,
        colorPalette,
        contrast,
        textConfig
    } = config;

    // Helper to handle empty fields with "Not specified" or similar if needed, 
    // but better to fit the narrative flow.
    const _scenario = scenario || "um cenário adequado ao gênero musical";
    const _elements = elements || "elementos visuais complementares";
    const _lighting = lighting || "iluminação adequada ao estilo";
    const _materials = textMaterial || "materiais premium";
    const _colors = colorPalette || "cores harmoniosas";
    const _contrast = contrast || "contraste equilibrado";
    const _mood = mood === AlbumMood.NONE ? "neutro" : mood;

    // The approved template
    const template = `Crie uma capa quadrada 1:1 (single/álbum) em alta resolução e aparência profissional, no estilo visual ${visualStyle} e com a temática baseada em ${musicGenre}, transmitindo o mood ${_mood}.

A cena deve mostrar ${_scenario} com ${_elements} e iluminação ${_lighting} (com profundidade de campo moderada para separar o fundo do primeiro plano), mantendo o fundo realista/cinematográfico e sem poluir a leitura do texto.

No centro exato da arte, coloque um lettering 3D hiper-realista com estética premium, como se fosse um render de Cinema 4D com Octane, usando materiais ${_materials} (ex.: cromo/metal escovado/vidro/acrílico), bordas chanfradas, reflexos e highlights fortes, rim light bem definido, sombras físicas e oclusão realistas, com tipografia moderna e altamente legível mesmo em miniatura.

O lettering deve ocupar aproximadamente 65% da arte e ficar centralizado vertical e horizontalmente, com composição limpa e foco total no título.

O único texto permitido na imagem deve ser exatamente: "${textConfig.title}" (sem nome do artista e sem qualquer outro texto, logotipo ou marca d’água).

Ajuste as cores para ${_colors} com contraste ${_contrast} e finalize com um leve look cinematográfico (granulação sutil opcional), preservando nitidez e impacto visual.

${details ? `\nObservações Adicionais: ${details}` : ''}`;

    return template;
};
