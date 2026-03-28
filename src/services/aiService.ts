import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function explainMedicalTopic(topic: string, context: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Mavzu: ${topic}\nKontekst: ${context}\n\nIltimos, ushbu mavzuni tibbiyot talabalari uchun o'zbek tilida sodda va tushunarli qilib tushuntirib bering.\nAgar bu mnemonika bo'lsa, uni qanday eslab qolishni va uning klinik ahamiyatini tushuntiring.\nAgar bu savol bo'lsa, nima uchun aynan shu javob to'g'riligini va boshqalari nima uchun noto'g'riligini tushuntiring.\nAgar bu simptom bo'lsa, uning patofiziologiyasini va klinik ahamiyatini tushuntiring.\n\nJavobni Markdown formatida bering.`,
      config: {
        systemInstruction: "Siz tajribali va qattiqqo'l tibbiyot professori, hamda MedUz platformasining bosh o'qituvchisisiz. Sizning vazifangiz tibbiyot talabalariga faqat ilmiy asoslangan, dalillarga tayangan (Evidence-Based Medicine) va xalqaro standartlarga (WHO, FDA, EMA) mos keladigan tibbiy ma'lumotlarni o'zbek tilida taqdim etish. Hech qachon taxmin qilmang, agar aniq bilmasangiz 'bilmayman' deb ayting. Tibbiy atamalarni to'g'ri (lotin/rus/o'zbek) ishlating.",
        temperature: 0.2, // Low temperature for high factual accuracy
        topP: 0.8,
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } // Deep reasoning for medical topics
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Error:", error);
    return "Kechirasiz, AI tushuntirishini olishda xatolik yuz berdi.";
  }
}
