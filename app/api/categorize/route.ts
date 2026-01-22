import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    let prompt = "";
    const hoje = new Date().toISOString().split('T')[0];

    // --- CENÁRIO 1: WALKIE-TALKIE (Extrair Transação) ---
    if (action === "extract_transaction") {
      prompt = `
        Aja como uma API financeira. Extraia os dados do texto: "${payload.text}"
        Data de referência (Hoje): ${hoje}

        Regras:
        1. Identifique 'amount' (número), 'description' (resumo), 'category' (Alimentação, Transporte, Compras, Saúde, Lazer, Outro, Investimento) e 'date' (YYYY-MM-DD).
        2. Se a data não for dita, assuma ${hoje}.
        3. 'type': Se parecer gasto = "expense". Se parecer ganho/salário = "income".
        
        Responda JSON: { "amount": 0.00, "description": "", "category": "", "date": "", "type": "" }
      `;
    }

    // --- CENÁRIO 2: CONSULTOR (Viabilidade) ---
    else if (action === "check_viability") {
      prompt = `
        Você é um consultor financeiro sincero.
        Contexto:
        - Saldo/Renda Livre Estimada: R$ ${payload.remainingBalance}
        - Total já gasto no mês: R$ ${payload.totalSpent}
        
        O usuário quer: "${payload.item}"
        
        Analise a viabilidade. Se for > 30% do que sobra, dê alerta.
        Responda JSON:
        { 
          "status": "APROVADO" | "CUIDADO" | "NEGADO",
          "message": "Explicação curta e direta (max 2 frases).",
          "viabilityScore": 0 a 100
        }
      `;
    }

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Limpeza de segurança para garantir JSON puro
    const json = JSON.parse(text.replace(/```json|```/g, "").trim());

    return NextResponse.json(json);

  } catch (error) {
    console.error("Erro IA:", error);
    return NextResponse.json({ error: "Falha na IA" }, { status: 500 });
  }
}