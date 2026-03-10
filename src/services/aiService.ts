import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function explainMedicalTopic(topic: string, context: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Siz tibbiyot bo'yicha mutaxassis va o'qituvchisiz. 
      Mavzu: ${topic}
      Kontekst: ${context}
      
      Iltimos, ushbu mavzuni tibbiyot talabalari uchun o'zbek tilida sodda va tushunarli qilib tushuntirib bering. 
      Agar bu mnemonika bo'lsa, uni qanday eslab qolishni va uning klinik ahamiyatini tushuntiring.
      Agar bu savol bo'lsa, nima uchun aynan shu javob to'g'riligini va boshqalari nima uchun noto'g'riligini tushuntiring.
      Agar bu simptom bo'lsa, uning patofiziologiyasini va klinik ahamiyatini tushuntiring.
      
      Javobni Markdown formatida bering.`,
    });
    return response.text;
  } catch (error) {
    console.error("AI Error:", error);
    return "Kechirasiz, AI tushuntirishini olishda xatolik yuz berdi.";
  }
}
