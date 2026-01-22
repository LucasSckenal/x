"use client";

import { useState, useEffect, useRef } from "react";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  BrainCircuit,
  Receipt,
  SendHorizontal,
  Mic,
  MicOff,
  Volume2,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Bot,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";

import { Sidebar } from "../components/Sidebar/Sidebar";
import Header from "../components/Header/Header";
import styles from "./AI.module.scss";

type TransactionType = {
  description: string;
  category: string;
  type: "income" | "expense";
  amount: number;
  confidence: number;
};

type AdviceType = {
  message: string;
  viabilityScore: number;
  status: "APROVADO" | "ALERTA" | "REJEITADO";
  suggestions: string[];
};

type AIMessageType = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export default function AIPage() {
  const [user, setUser] = useState<User | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechResult, setSpeechResult] = useState("");

  const [draftTransaction, setDraftTransaction] =
    useState<TransactionType | null>(null);
  const [advice, setAdvice] = useState<AdviceType | null>(null);
  const [aiMessages, setAiMessages] = useState<AIMessageType[]>([]);
  const [aiResponse, setAiResponse] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);

    // Inicializar Web Speech API se disponível
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "pt-BR";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join("");
        setSpeechResult(transcript);
        setInput(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          toast.error("Permissão de microfone negada");
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => unsub();
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      toast.error("Reconhecimento de voz não suportado no seu navegador");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (speechResult) {
        handleProcessWithAI(speechResult);
      }
    } else {
      setSpeechResult("");
      setInput("");
      recognitionRef.current.start();
      setIsListening(true);
      toast.success("Ouvindo... Fale agora!");
    }
  };

  const handleProcessTransaction = async () => {
    if (!input.trim()) {
      toast.error("Descreva sua transação para análise");
      textareaRef.current?.focus();
      return;
    }

    setLoading(true);
    setDraftTransaction(null);
    setAdvice(null);
    setAiMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: input,
        timestamp: new Date(),
      },
    ]);

    try {
      // Extrair transação
      const transactionRes = await fetch("/api/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "extract_transaction",
          payload: { text: input },
        }),
      });

      if (!transactionRes.ok) throw new Error("Erro ao extrair transação");
      const transactionData = await transactionRes.json();

      if (transactionData.transaction) {
        setDraftTransaction(transactionData.transaction);
      }

      // Obter conselho financeiro
      const adviceRes = await fetch("/api/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "get_financial_advice",
          payload: {
            transaction: transactionData.transaction,
            userHistory: {},
          },
        }),
      });

      if (!adviceRes.ok) throw new Error("Erro ao obter conselho");
      const adviceData = await adviceRes.json();

      if (adviceData.advice) {
        setAdvice(adviceData.advice);
      }

      // Obter resposta conversacional da IA
      const aiRes = await fetch("/api/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "chat_with_ai",
          payload: {
            message: input,
            context: {
              transaction: transactionData.transaction,
              advice: adviceData.advice,
            },
          },
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        setAiResponse(aiData.response);
        setAiMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: aiData.response,
            timestamp: new Date(),
          },
        ]);
      }

      toast.success("Análise completa!");
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Erro:", err);
      toast.error("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTransaction = async () => {
    if (!user) {
      toast.error("Faça login para salvar transações");
      return;
    }

    if (!draftTransaction) {
      toast.error("Nenhuma transação para salvar");
      return;
    }

    try {
      await addDoc(collection(db, `users/${user.uid}/transactions`), {
        ...draftTransaction,
        date: Timestamp.now(),
        createdAt: Timestamp.now(),
        processedByAI: true,
        originalText: input,
        aiAdvice: advice,
        status: "confirmed",
      });

      toast.success("Transação salva com sucesso!");
      setDraftTransaction(null);
      setAdvice(null);
      setAiResponse("");
      setInput("");

      textareaRef.current?.focus();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      toast.error("Erro ao salvar no banco de dados");
    }
  };

  const handleCancel = () => {
    setDraftTransaction(null);
    setAdvice(null);
    setAiResponse("");
    textareaRef.current?.focus();
  };

  const handleQuickExamples = (example: string) => {
    setInput(example);
    textareaRef.current?.focus();
  };

  return (
    <div className={styles.layoutContainer}>
      <Sidebar />

      <div className={styles.mainContent}>
        <Header />

        <main className={styles.contentScroll}>
          {/* Cabeçalho Moderno */}
          <div className={styles.pageHeader}>
            <h1>
              <Sparkles size={32} />
              Assistente Financeiro IA
            </h1>
            <p>
              Descreva ou fale sobre suas finanças. A IA analisa, classifica e
              oferece conselhos personalizados em tempo real.
            </p>
          </div>

          {/* Área de Input com Glass Effect */}
          <div className={styles.inputSection}>
            <div className={styles.inputWrapper}>
              <textarea
                ref={textareaRef}
                placeholder={
                  isListening
                    ? "Fale agora... A IA está ouvindo..."
                    : "Ex: 'Acabei de gastar R$ 250 no supermercado para compras semanais'"
                }
                value={isListening ? speechResult : input}
                onChange={(e) => !isListening && setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !loading) {
                    e.preventDefault();
                    handleProcessTransaction();
                  }
                }}
                disabled={loading || isListening}
                rows={4}
              />

              {/* Visualizador de Áudio */}
              {isListening && (
                <div className={styles.audioVisualizer}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={styles.bar} />
                  ))}
                  <span>Fale sobre sua transação...</span>
                </div>
              )}

              {/* Controles de Ação */}
              <div className={styles.actionControls}>
                <button
                  className={`${styles.micBtn} ${isListening ? styles.listening : ""}`}
                  onClick={toggleSpeechRecognition}
                  disabled={loading}
                  aria-label={
                    isListening ? "Parar gravação" : "Iniciar gravação de voz"
                  }
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                <button
                  className={`${styles.actionBtn} ${styles.primaryBtn}`}
                  onClick={handleProcessTransaction}
                  disabled={loading || !input.trim()}
                >
                  {loading ? (
                    <>
                      <Sparkles className={styles.spin} size={20} />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <BrainCircuit size={20} />
                      Analisar com IA
                    </>
                  )}
                </button>

                <button
                  className={`${styles.actionBtn} ${styles.secondaryBtn}`}
                  onClick={() =>
                    handleQuickExamples("Recebi R$ 1.500 de freelancer hoje")
                  }
                >
                  <MessageSquare size={20} />
                  Exemplo
                </button>
              </div>
            </div>
          </div>

          {/* Exemplos Rápidos */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginTop: "1.5rem",
            }}
          >
            <button
              onClick={() => handleQuickExamples("Paguei R$ 89,90 na Netflix")}
              style={{
                padding: "0.5rem 1rem",
                background: "rgba(103, 126, 234, 0.1)",
                border: "1px solid rgba(103, 126, 234, 0.2)",
                borderRadius: "20px",
                color: "#a78bfa",
                fontSize: "0.875rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "rgba(103, 126, 234, 0.2)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "rgba(103, 126, 234, 0.1)")
              }
            >
              📺 Assinatura
            </button>
            <button
              onClick={() =>
                handleQuickExamples("Salário de R$ 4.200 recebido")
              }
              style={{
                padding: "0.5rem 1rem",
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: "20px",
                color: "#10b981",
                fontSize: "0.875rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "rgba(16, 185, 129, 0.2)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "rgba(16, 185, 129, 0.1)")
              }
            >
              💰 Receita
            </button>
            <button
              onClick={() => handleQuickExamples("Gasolina do carro: R$ 200")}
              style={{
                padding: "0.5rem 1rem",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "20px",
                color: "#ef4444",
                fontSize: "0.875rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)")
              }
            >
              ⛽ Transporte
            </button>
          </div>

          {/* Resultados da IA */}
          {(draftTransaction || advice || aiResponse) && (
            <div className={styles.resultsGrid} ref={resultsRef}>
              {/* Card da Transação */}
              {draftTransaction && (
                <div className={`${styles.card} ${styles.transactionCard}`}>
                  <h3>
                    <Receipt size={24} />
                    Transação Identificada
                  </h3>

                  <div className={styles.ticketInfo}>
                    <div>
                      <span>Descrição</span>
                      <strong>{draftTransaction.description}</strong>
                    </div>
                    <div>
                      <span>Categoria</span>
                      <strong>{draftTransaction.category}</strong>
                    </div>
                    <div>
                      <span>Tipo</span>
                      <strong
                        className={
                          draftTransaction.type === "expense"
                            ? styles.expense
                            : styles.income
                        }
                      >
                        {draftTransaction.type === "income"
                          ? "Entrada"
                          : "Saída"}
                      </strong>
                    </div>
                    <div>
                      <span>Valor</span>
                      <strong className={styles.amount}>
                        R$ {Number(draftTransaction.amount).toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <button className={styles.cancel} onClick={handleCancel}>
                      <XCircle size={18} />
                      Cancelar
                    </button>
                    <button
                      className={styles.confirm}
                      onClick={handleConfirmTransaction}
                    >
                      <CheckCircle2 size={18} />
                      Confirmar
                    </button>
                  </div>
                </div>
              )}

              {/* Análise da IA */}
              {advice && (
                <div className={`${styles.card} ${styles.aiAnalysisCard}`}>
                  <h3>
                    <BrainCircuit size={24} />
                    Análise Financeira IA
                  </h3>

                  <p className={styles.adviceText}>"{advice.message}"</p>

                  <div className={styles.score}>
                    <div className={styles.scoreHeader}>
                      <span>Score de Viabilidade</span>
                      <strong>{advice.viabilityScore}%</strong>
                    </div>

                    <div className={styles.bar}>
                      <div
                        className={styles.progress}
                        style={{
                          width: `${advice.viabilityScore}%`,
                          background:
                            advice.status === "APROVADO"
                              ? "linear-gradient(90deg, #10b981, #34d399)"
                              : advice.status === "ALERTA"
                                ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                                : "linear-gradient(90deg, #ef4444, #f87171)",
                        }}
                      />
                    </div>

                    <div
                      className={`${styles.statusBadge} ${
                        advice.status === "APROVADO"
                          ? styles.approved
                          : advice.status === "ALERTA"
                            ? styles.warning
                            : styles.rejected
                      }`}
                    >
                      {advice.status === "APROVADO" && <ThumbsUp size={16} />}
                      {advice.status === "ALERTA" && (
                        <AlertTriangle size={16} />
                      )}
                      {advice.status === "REJEITADO" && (
                        <ThumbsDown size={16} />
                      )}
                      {advice.status}
                    </div>

                    {advice.suggestions && advice.suggestions.length > 0 && (
                      <div style={{ marginTop: "1.5rem" }}>
                        <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                          Sugestões:
                        </span>
                        <ul
                          style={{
                            marginTop: "0.5rem",
                            paddingLeft: "1.5rem",
                            color: "#e2e8f0",
                            fontSize: "0.95rem",
                            lineHeight: "1.6",
                          }}
                        >
                          {advice.suggestions.map((suggestion, idx) => (
                            <li key={idx}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resposta Conversacional da IA */}
              {aiResponse && (
                <div className={styles.aiMessage}>
                  <div className={styles.messageHeader}>
                    <div className={styles.aiAvatar}>
                      <Bot size={20} />
                    </div>
                    <div className={styles.messageMeta}>
                      <h4>Assistente Financeiro</h4>
                      <span>Análise em tempo real</span>
                    </div>
                  </div>
                  <div className={styles.messageContent}>{aiResponse}</div>
                </div>
              )}
            </div>
          )}

          {/* Histórico de Mensagens */}
          {aiMessages.length > 0 && (
            <div style={{ marginTop: "3rem" }}>
              <h3
                style={{
                  color: "#fff",
                  fontSize: "1.25rem",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <MessageSquare size={20} />
                Conversa com a IA
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {aiMessages.slice(-5).map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      background:
                        msg.role === "user"
                          ? "rgba(103, 126, 234, 0.1)"
                          : "rgba(255, 255, 255, 0.05)",
                      border: `1px solid ${
                        msg.role === "user"
                          ? "rgba(103, 126, 234, 0.2)"
                          : "rgba(255, 255, 255, 0.1)"
                      }`,
                      borderRadius: "12px",
                      padding: "1rem 1.25rem",
                      animation: `${styles.fadeIn} 0.3s ease-out`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          color: msg.role === "user" ? "#a78bfa" : "#10b981",
                          fontWeight: "600",
                          fontSize: "0.9rem",
                        }}
                      >
                        {msg.role === "user" ? "Você" : "Assistente IA"}
                      </span>
                      <span
                        style={{
                          color: "#64748b",
                          fontSize: "0.8rem",
                        }}
                      >
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p
                      style={{
                        color: "#e2e8f0",
                        lineHeight: "1.6",
                        margin: 0,
                      }}
                    >
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
