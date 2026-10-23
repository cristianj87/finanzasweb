import React, { useState, useRef, useEffect } from 'react';
import { Transaction, DocumentRecord, TaxProfile } from '../../types';
import {
  Bot,
  Send,
  User,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';

interface AssistantViewProps {
  transactions: Transaction[];
  documents: DocumentRecord[];
  profile: TaxProfile | null;
  activeYear: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const QUICK_QUESTIONS = [
  '¿Cuánto dinero he ganado durante este año?',
  '¿Cuánto he gastado durante este mes?',
  '¿Cuánto ISR me han retenido en total?',
  '¿Cuáles de mis facturas son deducibles personales?',
  '¿Cuáles son mis gastos más elevados?',
  '¿Cómo voy financieramente y qué me recomiendas?',
];

export const AssistantView: React.FC<AssistantViewProps> = ({
  transactions,
  documents,
  profile,
  activeYear,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `¡Hola ${profile?.taxName ? profile.taxName.split(' ')[0] : ''}! Soy tu asistente financiero y fiscal personal para el ejercicio ${activeYear}. Tengo acceso a todos tus comprobantes, ingresos y deducciones registradas. ¿Qué te gustaría consultar hoy?`,
      timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build condensed real context to send to server
      const userContext = {
        taxProfile: profile,
        activeYear,
        metrics: {
          totalTransactions: transactions.length,
          totalDocuments: documents.length,
          incomes: transactions
            .filter(t => t.type === 'income')
            .map(t => ({ date: t.date, concept: t.concept, gross: t.amountGross, net: t.amountNet, isrWithheld: t.isrRetained })),
          expenses: transactions
            .filter(t => t.type === 'expense')
            .map(t => ({ date: t.date, concept: t.concept, amount: t.amountGross || t.amountNet, category: t.category, classification: t.fiscalClassification, paymentForm: t.paymentForm })),
          documentsSummary: documents.map(d => ({ name: d.name, category: d.category, total: d.total, uuid: d.uuid, status: d.status })),
        },
      };

      const history = messages.map(m => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          userContext,
        }),
      });

      const data = await res.json();
      const reply = data.reply || 'No pude procesar la respuesta en este momento. Por favor intenta de nuevo.';

      const assistantMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        role: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      console.error('Chat error:', e);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: 'Ocurrió un error al contactar al servidor. Por favor revisa tu conexión e intenta de nuevo.',
          timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 flex items-center justify-between border-b border-blue-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              Mi Asistente Financiero
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30">
                Gemini 3.8 Flash
              </span>
            </h2>
            <p className="text-[11px] text-blue-200">
              Consultas en lenguaje sencillo basadas en tus comprobantes del ejercicio {activeYear}
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages(messages.slice(0, 1))}
          title="Reiniciar conversación"
          className="p-1.5 text-blue-300 hover:text-white hover:bg-blue-800 rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-blue-700 text-white'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-blue-700 text-white rounded-tr-none'
                    : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-none space-y-2'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                <span
                  className={`block text-[10px] text-right mt-1.5 ${
                    isUser ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center justify-center text-xs font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-500 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
              <span>Consultando tus comprobantes y calculando respuesta...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/60 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
        <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 ml-1" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0 mr-1">
          Preguntas rápidas:
        </span>
        {QUICK_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => handleSendMessage(q)}
            disabled={isLoading}
            className="text-[11px] text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full whitespace-nowrap hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition flex-shrink-0 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Haz una pregunta sobre tus finanzas, facturas o impuestos..."
          className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          className="p-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl transition shadow-sm disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
