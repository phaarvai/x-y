import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable, sessionsTable, usersTable } from "@workspace/db";
import { SearchBody } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";

const router = Router();

const AI_RESPONSES: Record<string, string[]> = {
  en: [
    "Based on your question, here is what I found: This is a comprehensive topic with many facets. Let me break it down for you in a clear and accessible way.",
    "Great question! I've analyzed your query and here's my response: The information you're looking for involves several key points that I'll explain step by step.",
    "I understand what you're asking. Here's a detailed answer: This subject is important and I want to make sure you have all the information you need.",
    "Thank you for your question. Based on my knowledge, I can tell you that this is a nuanced topic that requires careful consideration of multiple perspectives.",
  ],
  ar: [
    "استناداً إلى سؤالك، إليك ما وجدته: هذا موضوع شامل له جوانب عديدة. دعني أشرح لك ذلك بطريقة واضحة وسهلة الفهم.",
    "سؤال رائع! لقد حللت استفسارك وإليك ردي: المعلومات التي تبحث عنها تتضمن عدة نقاط رئيسية سأشرحها خطوة بخطوة.",
  ],
  fr: [
    "D'après votre question, voici ce que j'ai trouvé: C'est un sujet complet avec de nombreuses facettes. Permettez-moi de vous l'expliquer de manière claire et accessible.",
    "Excellente question! J'ai analysé votre requête et voici ma réponse: Les informations que vous recherchez impliquent plusieurs points clés que j'expliquerai étape par étape.",
  ],
  es: [
    "Basándome en tu pregunta, esto es lo que encontré: Este es un tema completo con muchas facetas. Permíteme explicártelo de manera clara y accesible.",
    "¡Excelente pregunta! He analizado tu consulta y aquí está mi respuesta: La información que buscas involucra varios puntos clave que explicaré paso a paso.",
  ],
};

const SEARCH_RESULTS_POOL = [
  { title: "Comprehensive Guide", snippet: "A detailed overview covering all aspects of your query with expert insights and practical applications.", url: "https://example.com/guide", relevanceScore: 0.95 },
  { title: "Expert Analysis", snippet: "Professional analysis from leading researchers in the field, providing evidence-based information.", url: "https://example.com/analysis", relevanceScore: 0.89 },
  { title: "Community Resources", snippet: "Curated resources from trusted community contributors with real-world examples and case studies.", url: "https://example.com/resources", relevanceScore: 0.82 },
  { title: "Latest Research", snippet: "Up-to-date findings and research on this topic from peer-reviewed publications and studies.", url: "https://example.com/research", relevanceScore: 0.78 },
  { title: "Practical Applications", snippet: "Step-by-step guides and practical tutorials to apply this knowledge in real-world scenarios.", url: "https://example.com/tutorials", relevanceScore: 0.75 },
];

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token)).limit(1);
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user || null;
}

router.post("/search", async (req, res) => {
  const parsed = SearchBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { query, language = "en", conversationId, isVoice = false } = parsed.data;
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);

  const langResponses = AI_RESPONSES[language] || AI_RESPONSES["en"];
  const aiResponse = langResponses[Math.floor(Math.random() * langResponses.length)];
  const results = SEARCH_RESULTS_POOL.slice(0, 3).map(r => ({
    ...r,
    relevanceScore: r.relevanceScore + (Math.random() * 0.05 - 0.025),
  }));

  let convId = conversationId;
  let msgId: number | undefined;

  if (user) {
    if (!convId) {
      const [conv] = await db.insert(conversationsTable).values({
        userId: user.id,
        title: query.substring(0, 100),
        language,
      }).returning();
      convId = conv.id;
    }

    await db.insert(messagesTable).values({
      conversationId: convId,
      role: "user",
      content: query,
      isVoice: isVoice ? "true" : "false",
    });

    const [aiMsg] = await db.insert(messagesTable).values({
      conversationId: convId,
      role: "assistant",
      content: aiResponse,
      isVoice: "false",
    }).returning();

    msgId = aiMsg.id;

    await db.update(conversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(conversationsTable.id, convId));
  }

  return res.status(200).json({
    query,
    aiResponse,
    results,
    language,
    conversationId: convId,
    messageId: msgId,
  });
});

router.get("/search/suggestions", async (req, res) => {
  const lang = (req.query.lang as string) || "en";

  const suggestionsByLang: Record<string, { suggestions: string[], trending: string[] }> = {
    en: {
      suggestions: [
        "How does AI work?",
        "What is climate change?",
        "Best practices for health",
        "How to learn a new language",
        "What are human rights?",
        "How to start a small business",
      ],
      trending: [
        "AI and education",
        "Digital literacy",
        "Mental health resources",
        "Community support programs",
      ],
    },
    ar: {
      suggestions: [
        "كيف يعمل الذكاء الاصطناعي؟",
        "ما هو تغير المناخ؟",
        "أفضل الممارسات للصحة",
        "كيفية تعلم لغة جديدة",
      ],
      trending: [
        "الذكاء الاصطناعي والتعليم",
        "محو الأمية الرقمية",
      ],
    },
    fr: {
      suggestions: [
        "Comment fonctionne l'IA?",
        "Qu'est-ce que le changement climatique?",
        "Meilleures pratiques pour la santé",
      ],
      trending: [
        "IA et éducation",
        "Littératie numérique",
      ],
    },
    es: {
      suggestions: [
        "¿Cómo funciona la IA?",
        "¿Qué es el cambio climático?",
        "Mejores prácticas de salud",
      ],
      trending: [
        "IA y educación",
        "Alfabetización digital",
      ],
    },
  };

  const data = suggestionsByLang[lang] || suggestionsByLang["en"];
  return res.status(200).json(data);
});

export default router;
