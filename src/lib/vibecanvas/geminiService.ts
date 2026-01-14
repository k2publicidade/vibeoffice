import { GenerationConfig, AlbumMood } from "@/types/vibecanvas";

// Hardcoded for this specific request as per user instruction
const OPENROUTER_API_KEY = "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";

// Priority queue of free models to try in case of failure/rate-limits
const FALLBACK_MODELS = [
    "google/gemini-2.0-flash-exp:free",
    "google/gemini-2.0-flash-thinking-exp:free",
    "google/gemini-exp-1206:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-7b-instruct:free"
];

/**
 * Generates 3 distinct prompt options using OpenRouter with fallback strategy.
 */
export const generatePrompts = async (config: GenerationConfig): Promise<string[]> => {
    const systemPrompt = `
    Role: Senior Prompt Engineer for Midjourney V6 and high-end image generators.
    Task: Generate 3 distinct text-to-image prompts by filling in the following TEMPLATE based on user inputs.

    TEMPLATE:
    "Crie uma capa quadrada 1:1 (single/álbum) em alta resolução e aparência profissional, no estilo visual {ESTILO_VISUAL} e com a temática {TEMA}, transmitindo o mood {MOOD}. A cena deve mostrar {CENÁRIO_PRINCIPAL} com {ELEMENTOS_DE_AMBIENTE} e iluminação {ILUMINAÇÃO} (com profundidade de campo moderada para separar o fundo do primeiro plano), mantendo o fundo realista/cinematográfico e sem poluir a leitura do texto. No centro exato da arte, coloque um lettering 3D hiper-realista com estética premium, como se fosse um render de Cinema 4D com Octane, usando materiais {MATERIAIS_PREMIUM} (ex.: cromo/metal escovado/vidro/acrílico), bordas chanfradas, reflexos e highlights fortes, rim light bem definido, sombras físicas e oclusão realistas, com tipografia moderna e altamente legível mesmo em miniatura. O lettering deve ocupar aproximadamente 65% da arte e ficar centralizado vertical e horizontalmente, com composição limpa e foco total no título. O único texto permitido na imagem deve ser exatamente: “${config.textConfig.title}” (sem nome do artista e sem qualquer outro texto, logotipo ou marca d’água). Ajuste as cores para {PALETA_DE_CORES} com contraste {CONTRASTE} e finalize com um leve look cinematográfico (granulação sutil opcional), preservando nitidez e impacto visual."

    USER INPUTS:
    - Visual Style: ${config.visualStyle}
    - Music Genre: ${config.musicGenre} (Use this to infer TEMA if needed)
    - Mood: ${config.mood}
    - Details: ${config.details || "None"}
    - Specific Scenario: ${config.scenario || "Infer based on genre/mood if empty"}
    - Specific Elements: ${config.elements || "Infer based on genre/mood if empty"}
    - Lighting: ${config.lighting || "Infer best match"}
    - Text Material: ${config.textMaterial || "Infer best match"}
    - Color Palette: ${config.colorPalette || "Infer best match"}
    - Contrast: ${config.contrast || "High/Cinematic"}

    INSTRUCTIONS:
    1. You must output a JSON array of 3 strings.
    2. Each string must be the TEMPLATE above, but with the placeholders {ESTILO_VISUAL}, {TEMA}, {MOOD}, {CENÁRIO_PRINCIPAL}, {ELEMENTOS_DE_AMBIENTE}, {ILUMINAÇÃO}, {MATERIAIS_PREMIUM}, {PALETA_DE_CORES}, {CONTRASTE} replaced by specific, descriptive terms derived from the User Inputs.
    3. Make 3 variations. For example, if the user didn't specify a scenario, create 3 different suitable scenarios for that genre. If they did specify, refine it in 3 slightly different ways.
    4. Do not include the artist name in the image prompt, as per the template's strict instruction.
    5. The final output must be Portuguese (as the template is in Portuguese).

    Format Example:
    [
      "Crie uma capa quadrada... (Variation 1)",
      "Crie uma capa quadrada... (Variation 2)",
      "Crie uma capa quadrada... (Variation 3)"
    ]
  `;

    const messages: any[] = [
        {
            role: "system",
            content: systemPrompt
        }
    ];

    const userContent: any[] = [
        {
            type: "text",
            text: "Generate the prompts now. Ensure output is valid JSON."
        }
    ];

    if (config.referenceImage) {
        userContent.push({
            type: "image_url",
            image_url: {
                url: config.referenceImage
            }
        });
    }

    messages.push({
        role: "user",
        content: userContent
    });

    let lastError: any = null;

    for (const model of FALLBACK_MODELS) {
        try {
            console.log(`Attempting generation with model: ${model}`);

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://vibecanvas.app",
                    "X-Title": "VibeCanvas"
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    // Some models support json_object, others might ignore it. 
                    // It's generally safe to send for advanced models.
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP Error ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;

            if (!content) throw new Error("No content received from AI");

            // Attempt to parse JSON
            let prompts;
            try {
                // Find the JSON array in the text (in case model adds markdown code blocks)
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                const jsonString = jsonMatch ? jsonMatch[0] : content;

                prompts = JSON.parse(jsonString);

                if (!Array.isArray(prompts) && prompts.prompts && Array.isArray(prompts.prompts)) {
                    prompts = prompts.prompts;
                }
            } catch (e) {
                console.warn(`Model ${model} returned invalid JSON:`, content);
                // If JSON parse fails but we have content, we might try to just split lines or throw to try next model
                // For now, let's treat invalid JSON as a failure to force retry with a better model if possible
                // unless it's the last model
                throw new Error("Invalid JSON format in response");
            }

            if (Array.isArray(prompts) && prompts.length > 0) {
                return prompts.map(p => typeof p === 'string' ? p : JSON.stringify(p));
            } else {
                throw new Error("Response was not a valid array of prompts");
            }

        } catch (error) {
            console.warn(`Failed to generate with ${model}:`, error);
            lastError = error;
            // Continue to next model in loop
            continue;
        }
    }

    // If we exit the loop, all models failed
    console.error("All fallback models failed.");
    throw new Error("Não foi possível gerar os prompts no momento. Nossos serviços gratuitos estão congestionados. Por favor, tente novamente em alguns instantes." + (lastError ? ` (${lastError.message})` : ""));
};
