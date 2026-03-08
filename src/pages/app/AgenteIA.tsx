import { useState } from "react";
import { Send, Brain, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Message = { role: "user" | "assistant"; content: string };

const initialMessages: Message[] = [
  {
    role: "assistant",
    content: "Olá! Sou o agente de IA jurídico imobiliário do Meu Contrato Online. Posso ajudar você a:\n\n• Escolher o melhor modelo de contrato\n• Orientar sobre documentos necessários\n• Explicar cláusulas em linguagem simples\n• Revisar contratos antes da finalização\n• Apontar inconsistências\n\nComo posso ajudar?",
  },
];

const quickActions = [
  "Qual modelo de contrato devo usar para compra à vista?",
  "Quais documentos preciso para um contrato de compra e venda?",
  "Explique a cláusula de alienação fiduciária",
  "Monte um checklist de documentos para venda financiada",
];

const AgenteIA = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "user" as const, content: text },
      {
        role: "assistant" as const,
        content: "Esta funcionalidade será integrada com o Supabase e o Lovable AI Gateway. No momento, o agente de IA está em modo de demonstração. Conecte o Supabase para habilitar as respostas inteligentes.",
      },
    ]);
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Agente IA</h1>
        <p className="text-sm text-muted-foreground">Assistente jurídico imobiliário inteligente</p>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Chat */}
        <Card className="flex flex-1 flex-col shadow-card">
          <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    msg.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {msg.role === "assistant" ? <Brain className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                    msg.role === "assistant" ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground"
                  }`}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-4">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Pergunte sobre contratos, cláusulas, documentos..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="hidden w-72 flex-shrink-0 space-y-3 lg:block">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> Ações rápidas
          </h3>
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => sendMessage(action)}
              className="w-full rounded-lg border border-border bg-card p-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AgenteIA;
