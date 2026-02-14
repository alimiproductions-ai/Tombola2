
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getPrizeDescription = async (prizeName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Génère une description courte (1 phrase), accrocheuse et humoristique pour un prix de tombola nommé : "${prizeName}".`,
      config: {
        temperature: 0.8,
        topP: 0.95,
      }
    });
    return response.text || "Un prix incroyable qui va changer votre vie !";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Une surprise géniale pour l'heureux gagnant.";
  }
};

export const getWinnerCheer = async (winnerName: string, prizeName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Génère un message de félicitations court et explosif pour ${winnerName} qui vient de gagner ${prizeName} lors d'une tombola. Utilise des émojis.`,
      config: {
        temperature: 0.9,
      }
    });
    return response.text || `Mazal Tov ${winnerName} !`;
  } catch (error) {
    return `Félicitations ${winnerName} pour votre gain ! 🎊`;
  }
};
