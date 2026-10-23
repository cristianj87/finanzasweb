import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: AI Document Analysis (PDF and Images)
app.post('/api/gemini/analyze-document', async (req: Request, res: Response) => {
  try {
    const { base64Data, mimeType, filename, userRfc } = req.body;

    if (!base64Data || !mimeType) {
      return res.status(400).json({ error: 'Se requiere el contenido del archivo en base64 y el mimeType.' });
    }

    const prompt = `Analiza este documento fiscal o financiero de México (recibo de nómina, factura CFDI, ticket de gasto o comprobante de pago).
Nombre de archivo: ${filename || 'desconocido'}.
RFC del usuario contribuyente registrado: ${userRfc || 'No especificado'}.

Extrae de forma precisa y estructurada todos los datos fiscales, montos, impuestos, retenciones y clasificaciones.
Distingue claramente entre sueldo bruto y sueldo neto en recibos de nómina.
Evalúa si puede ser una deducción personal del Artículo 151 LISR (gastos médicos, colegiaturas, gastos funerarios, intereses hipotecarios) y revisa la forma de pago (si fue en efectivo '01', no cumple requisitos para gastos médicos/colegiaturas).
Proporciona una explicación clara en español de México para una persona sin conocimientos contables.`;

    const filePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [filePart, { text: prompt }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            documentType: {
              type: Type.STRING,
              description: 'payroll, invoice_received, invoice_issued, expense_receipt, payment_receipt, payment_complement, bank_statement, other',
            },
            nameIssuer: { type: Type.STRING, description: 'Nombre o razón social del emisor / patrón / proveedor' },
            rfcIssuer: { type: Type.STRING, description: 'RFC del emisor' },
            nameReceiver: { type: Type.STRING, description: 'Nombre del receptor / empleado' },
            rfcReceiver: { type: Type.STRING, description: 'RFC del receptor' },
            uuid: { type: Type.STRING, description: 'Folio Fiscal UUID del SAT si aparece en el documento' },
            issueDate: { type: Type.STRING, description: 'Fecha de emisión en formato YYYY-MM-DD' },
            paymentDate: { type: Type.STRING, description: 'Fecha de pago si se indica' },
            subtotal: { type: Type.NUMBER, description: 'Subtotal antes de impuestos y descuentos' },
            discount: { type: Type.NUMBER, description: 'Descuento si aplica' },
            taxIva: { type: Type.NUMBER, description: 'IVA trasladado 16% u 8%' },
            taxIvaRetained: { type: Type.NUMBER, description: 'IVA retenido si aplica' },
            taxIsrRetained: { type: Type.NUMBER, description: 'ISR retenido' },
            total: { type: Type.NUMBER, description: 'Importe total a pagar o pagado' },
            currency: { type: Type.STRING, description: 'MXN, USD, etc.' },
            paymentMethod: { type: Type.STRING, description: 'PUE (Pago en una sola exhibición) o PPD (Pago en parcialidades o diferido)' },
            paymentForm: { type: Type.STRING, description: '01 Efectivo, 03 Transferencia, 04 Tarjeta de crédito, 28 Tarjeta de débito, etc.' },
            cfdiUsage: { type: Type.STRING, description: 'Uso del CFDI: G03, D01, D02, D04, etc.' },
            description: { type: Type.STRING, description: 'Resumen claro de conceptos o productos incluidos' },
            suggestedCategory: { type: Type.STRING, description: 'Categoría como Salud y Gastos Médicos, Combustible, Alimentación, etc.' },
            suggestedFiscalClassification: {
              type: Type.STRING,
              description: 'personal_expense, personal_deduction, business_deduction, non_deducible, needs_review',
            },
            confidence: { type: Type.NUMBER, description: 'Nivel de confianza de la extracción entre 0 y 100' },
            explanation: { type: Type.STRING, description: 'Explicación en lenguaje sencillo de por qué tiene esta clasificación y cómo le afecta' },
            payrollDetails: {
              type: Type.OBJECT,
              properties: {
                employerName: { type: Type.STRING },
                employerRfc: { type: Type.STRING },
                periodStart: { type: Type.STRING },
                periodEnd: { type: Type.STRING },
                paymentDate: { type: Type.STRING },
                daysPaid: { type: Type.NUMBER },
                totalPerceptions: { type: Type.NUMBER, description: 'Sueldo bruto / percepciones' },
                taxedPerceptions: { type: Type.NUMBER },
                exemptPerceptions: { type: Type.NUMBER },
                totalDeductions: { type: Type.NUMBER },
                isrRetained: { type: Type.NUMBER },
                employmentSubsidy: { type: Type.NUMBER },
                netPaid: { type: Type.NUMBER, description: 'Sueldo neto depositado' },
              },
            },
          },
          required: ['documentType', 'total', 'suggestedFiscalClassification', 'explanation'],
        },
      },
    });

    const resultText = response.text || '{}';
    const parsed = JSON.parse(resultText);
    return res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Error in analyze-document:', error);
    return res.status(500).json({
      error: 'Error al analizar el documento con Gemini.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Endpoint: AI Financial & Tax Assistant Chat
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { message, userContext, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'El mensaje es requerido.' });
    }

    const systemInstruction = `Eres "Mi Asistente Financiero", el copiloto contable y fiscal personal para personas físicas en México dentro de la aplicación "Mi Control Fiscal".
Tu misión es ayudar al usuario a comprender sus movimientos, documentos, ingresos, deducciones y preparación para el SAT en un lenguaje sencillo, claro y sin jerga contable inaccesible.

Reglas fundamentales:
1. Habla en español de México, con tono profesional, amable, paciente y transparente.
2. Basate ESTRICTAMENTE en los datos reales del contribuyente proporcionados en el contexto (no inventes números).
3. Si el usuario te pregunta cosas como cuánto ganó, cuánto gastó o cuánto ISR le retuvieron, dale las cifras exactas del contexto y el período correspondiente.
4. Explica siempre el significado de términos como "ISR retenido" (impuesto retenido por tu patrón o clientes a cuenta de tu declaración), "PUE vs PPD", "Deducciones personales del Artículo 151" y cómo pueden generar un saldo a favor.
5. Adviérteles con honestidad: la aplicación es una herramienta de organización y preparación, no somos un contador certificado ni garantizamos devoluciones mágicas ante el SAT.
6. Si hace falta información para dar una respuesta definitiva, dilo claramente.

Contexto actual del usuario:
${JSON.stringify(userContext || {}, null, 2)}`;

    // Build chat contents from history
    const contents: any[] = [];
    if (Array.isArray(history)) {
      history.slice(-8).forEach(h => {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.text }],
        });
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return res.json({ reply: response.text });
  } catch (error) {
    console.error('Error in chat assistant:', error);
    return res.status(500).json({
      error: 'Error al consultar al asistente financiero.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Endpoint: Plain-language Dashboard Summary
app.post('/api/gemini/dashboard-summary', async (req: Request, res: Response) => {
  try {
    const { monthName, monthIncome, monthExpense, yearIncome, yearExpense, personalDeductionsCount, pendingReviewCount } = req.body;

    const prompt = `Genera un breve resumen financiero y fiscal en lenguaje amigable y natural (máximo 3 oraciones cortas) para el dashboard del usuario.
Datos:
- Mes: ${monthName || 'el mes actual'}
- Ingresos del mes: $${(monthIncome || 0).toLocaleString('es-MX')}
- Gastos del mes: $${(monthExpense || 0).toLocaleString('es-MX')}
- Ingresos acumulados del año: $${(yearIncome || 0).toLocaleString('es-MX')}
- Posibles deducciones personales identificadas: ${personalDeductionsCount || 0}
- Documentos o gastos pendientes de revisión: ${pendingReviewCount || 0}

Sigue el estilo de este ejemplo:
"Durante septiembre recibiste $28,500 de ingresos y registraste $9,300 de gastos. Tus ingresos acumulados del año son de $285,000. Hemos identificado 5 facturas que podrían corresponder a deducciones personales. Hay 2 documentos pendientes de revisión."`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return res.json({ summary: response.text?.trim() });
  } catch (error) {
    console.error('Error in dashboard-summary:', error);
    // Fallback safe deterministic summary
    const { monthName, monthIncome, monthExpense, yearIncome, personalDeductionsCount, pendingReviewCount } = req.body;
    return res.json({
      summary: `Durante ${monthName || 'este período'} recibiste $${(monthIncome || 0).toLocaleString('es-MX')} de ingresos y registraste $${(monthExpense || 0).toLocaleString('es-MX')} de gastos. Tus ingresos acumulados del año son de $${(yearIncome || 0).toLocaleString('es-MX')}. Tienes ${personalDeductionsCount || 0} posibles deducciones personales y ${pendingReviewCount || 0} comprobantes pendientes de validar.`,
    });
  }
});

// Setup Vite middleware in dev or static serve in production
const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mi Control Fiscal server running on http://0.0.0.0:${PORT}`);
});
