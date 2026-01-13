
import { GoogleGenAI } from "@google/genai";
import { Session } from '../types';

// Ensure API key is present
const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const analyzeSessions = async (sessions: Session[], query: string): Promise<string> => {
  if (!apiKey) {
    return "Erro: API Key não configurada. Por favor configure o ambiente.";
  }

  const model = "gemini-3-flash-preview";
  
  // Minimal data representation to save tokens
  const dataContext = JSON.stringify(sessions.map(s => ({
    date: s.date,
    track: s.trackTitle,
    studio: s.studio,
    duration: `${s.startTime}-${s.endTime}`,
    types: s.type.join(', '),
    pc: s.pc,
    notes: s.notes || '',
    createdBy: s.createdBy,
    people: {
      producers: s.producers.map(p => `${p.name} (${p.contactRole || ''}) - Tel: ${p.phone || p.contact || 'N/A'}, Email: ${p.email || 'N/A'}`),
      artists: s.artists.map(p => `${p.name} (${p.contactRole || ''}) - Tel: ${p.phone || p.contact || 'N/A'}, Email: ${p.email || 'N/A'}`),
      composers: s.composers.map(p => `${p.name} (${p.contactRole || ''}) - Tel: ${p.phone || p.contact || 'N/A'}, Email: ${p.email || 'N/A'}`)
    }
  })));

  const systemInstruction = `
    Você é um assistente inteligente de gerenciamento de estúdio de música (Vibe Distro Studio AI).
    Você tem acesso ao banco de dados JSON das sessões do estúdio.
    Sua tarefa é responder perguntas do usuário sobre o histórico, estatísticas, contatos e detalhes das sessões.
    
    Contexto de Dados:
    ${dataContext}

    Diretrizes:
    - Responda em Português do Brasil.
    - Seja conciso e profissional.
    - Se perguntarem sobre estatísticas (ex: "Quantas horas o artista X gravou?"), faça uma estimativa baseada nos horários de início e fim.
    - Se perguntarem "Quem cadastrou" ou "Responsável pelo registro", consulte o campo 'createdBy'.
    - Se perguntarem sobre o local, consulte o campo 'studio'.
    - Se não encontrar a informação, diga que não há registros.
    - Ao responder, considere também as informações no campo 'notes' (observações) se forem relevantes para a pergunta.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: query,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "Não foi possível gerar uma resposta.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Ocorreu um erro ao consultar a inteligência artificial. Verifique sua conexão ou chave de API.";
  }
};
