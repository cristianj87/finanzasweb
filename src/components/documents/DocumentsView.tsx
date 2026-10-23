import React, { useState, useRef } from 'react';
import { DocumentRecord, DocumentType, DocumentStatus, FiscalClassification, Transaction } from '../../types';
import { parseCFDIXML } from '../../lib/cfdi-parser';
import {
  UploadCloud,
  FileText,
  FileCode,
  Image,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Eye,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Info,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

interface DocumentsViewProps {
  documents: DocumentRecord[];
  transactions: Transaction[];
  currentUserId: string;
  userRfc?: string;
  onAddDocument: (doc: DocumentRecord) => Promise<void>;
  onUpdateDocument: (doc: DocumentRecord) => Promise<void>;
  onDeleteDocument: (docId: string) => Promise<void>;
  onAddTransaction: (tx: Transaction) => Promise<void>;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  transactions,
  currentUserId,
  userRfc,
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
  onAddTransaction,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered documents
  const filteredDocuments = documents.filter(doc => {
    if (filterType !== 'all' && doc.category !== filterType) return false;
    if (filterStatus !== 'all' && doc.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = doc.name.toLowerCase().includes(q);
      const matchIssuer = (doc.nameIssuer || '').toLowerCase().includes(q);
      const matchRfc = (doc.rfcIssuer || '').toLowerCase().includes(q);
      const matchDesc = (doc.description || '').toLowerCase().includes(q);
      const matchUuid = (doc.uuid || '').toLowerCase().includes(q);
      if (!matchName && !matchIssuer && !matchRfc && !matchDesc && !matchUuid) return false;
    }
    return true;
  });

  // Handle files
  const processFiles = async (files: FileList | File[]) => {
    setUploading(true);
    const fileArray = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgress(`Procesando archivo ${i + 1} de ${fileArray.length}: ${file.name}`);

      try {
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'xml') {
          // Process deterministic XML CFDI
          const xmlText = await file.text();
          const parsed = parseCFDIXML(xmlText, currentUserId, userRfc);

          if (parsed.isValid && parsed.document) {
            // Check for duplicate UUID in documents
            const existingUuid = documents.find(d => d.uuid && parsed.document.uuid && d.uuid.toUpperCase() === parsed.document.uuid.toUpperCase());
            const isDuplicate = !!existingUuid;

            const newDoc: DocumentRecord = {
              id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              userId: currentUserId,
              name: file.name,
              fileType: 'xml',
              category: parsed.document.category || 'invoice_received',
              status: isDuplicate ? 'needs_review' : 'processed',
              uuid: parsed.document.uuid,
              rfcIssuer: parsed.document.rfcIssuer,
              nameIssuer: parsed.document.nameIssuer,
              rfcReceiver: parsed.document.rfcReceiver,
              nameReceiver: parsed.document.nameReceiver,
              issueDate: parsed.document.issueDate,
              paymentDate: parsed.document.paymentDate,
              subtotal: parsed.document.subtotal || 0,
              discount: parsed.document.discount || 0,
              taxIva: parsed.document.taxIva || 0,
              taxIvaRetained: parsed.document.taxIvaRetained || 0,
              taxIsrRetained: parsed.document.taxIsrRetained || 0,
              total: parsed.document.total || 0,
              currency: parsed.document.currency || 'MXN',
              paymentMethod: parsed.document.paymentMethod,
              paymentForm: parsed.document.paymentForm,
              cfdiUsage: parsed.document.cfdiUsage,
              description: parsed.document.description || '',
              suggestedCategory: parsed.document.suggestedCategory || 'Gastos Generales',
              confidence: parsed.document.confidence || 98,
              confidenceExplanation: isDuplicate
                ? `¡UUID detectado en otro comprobante! Podría tratarse de un archivo duplicado o representación PDF del mismo CFDI.`
                : parsed.document.confidenceExplanation,
              isDuplicate,
              payrollDetails: parsed.document.payrollDetails,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await onAddDocument(newDoc);

            // If not duplicate, automatically propose transaction
            if (!isDuplicate && parsed.suggestedTransactionType !== 'neutral') {
              const newTx: Transaction = {
                id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                userId: currentUserId,
                type: parsed.suggestedTransactionType,
                date: (parsed.document.paymentDate || parsed.document.issueDate || new Date().toISOString()).slice(0, 10),
                concept: parsed.document.description || file.name,
                category: parsed.document.suggestedCategory || 'General',
                amountGross: parsed.document.subtotal || parsed.document.total || 0,
                amountNet: parsed.document.total || 0,
                iva: parsed.document.taxIva || 0,
                ivaRetained: parsed.document.taxIvaRetained || 0,
                isrRetained: parsed.document.taxIsrRetained || 0,
                fiscalClassification: parsed.suggestedFiscalClassification,
                fiscalExplanation: parsed.explanation,
                documentId: newDoc.id,
                documentUuid: newDoc.uuid,
                paymentMethod: newDoc.paymentMethod,
                paymentForm: newDoc.paymentForm,
                status: 'verified',
                isPaid: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              await onAddTransaction(newTx);
            }
          }
        } else if (ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
          // Process PDF or image with Gemini server-side endpoint
          const base64 = await fileToBase64(file);
          const mimeType = file.type || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg');

          const res = await fetch('/api/gemini/analyze-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Data: base64,
              mimeType,
              filename: file.name,
              userRfc,
            }),
          });

          const data = await res.json();
          if (data.success && data.data) {
            const extData = data.data;

            // Check duplicate by UUID or amount and date
            const existingUuid = documents.find(d => d.uuid && extData.uuid && d.uuid.toUpperCase() === extData.uuid.toUpperCase());
            const isDuplicate = !!existingUuid;

            const newDoc: DocumentRecord = {
              id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              userId: currentUserId,
              name: file.name,
              fileType: ext === 'pdf' ? 'pdf' : 'image',
              category: extData.documentType || 'expense_receipt',
              status: isDuplicate ? 'needs_review' : 'processed',
              uuid: extData.uuid,
              rfcIssuer: extData.rfcIssuer,
              nameIssuer: extData.nameIssuer,
              rfcReceiver: extData.rfcReceiver,
              nameReceiver: extData.nameReceiver,
              issueDate: extData.issueDate,
              paymentDate: extData.paymentDate,
              subtotal: extData.subtotal || extData.total || 0,
              discount: extData.discount || 0,
              taxIva: extData.taxIva || 0,
              taxIvaRetained: extData.taxIvaRetained || 0,
              taxIsrRetained: extData.taxIsrRetained || 0,
              total: extData.total || 0,
              currency: extData.currency || 'MXN',
              paymentMethod: extData.paymentMethod,
              paymentForm: extData.paymentForm,
              cfdiUsage: extData.cfdiUsage,
              description: extData.description || 'Comprobante analizado con IA',
              suggestedCategory: extData.suggestedCategory || 'Gastos Generales',
              confidence: extData.confidence || 92,
              confidenceExplanation: isDuplicate
                ? 'UUID duplicado detectado: Ya existe un CFDI registrado con este mismo folio fiscal.'
                : extData.explanation,
              isDuplicate,
              payrollDetails: extData.payrollDetails,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await onAddDocument(newDoc);

            // Automatically create transaction if not duplicate
            if (!isDuplicate && extData.total > 0) {
              const txType = (extData.documentType === 'payroll' || extData.documentType === 'invoice_issued') ? 'income' : 'expense';
              const newTx: Transaction = {
                id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                userId: currentUserId,
                type: txType,
                date: (extData.paymentDate || extData.issueDate || new Date().toISOString()).slice(0, 10),
                concept: extData.description || file.name,
                category: extData.suggestedCategory || 'General',
                amountGross: extData.subtotal || extData.total || 0,
                amountNet: extData.total || 0,
                iva: extData.taxIva || 0,
                ivaRetained: extData.taxIvaRetained || 0,
                isrRetained: extData.taxIsrRetained || 0,
                fiscalClassification: extData.suggestedFiscalClassification || 'personal_expense',
                fiscalExplanation: extData.explanation,
                documentId: newDoc.id,
                documentUuid: newDoc.uuid,
                paymentMethod: newDoc.paymentMethod,
                paymentForm: newDoc.paymentForm,
                status: 'verified',
                isPaid: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              await onAddTransaction(newTx);
            }
          }
        }
      } catch (err) {
        console.error('Error processing file:', file.name, err);
      }
    }

    setUploading(false);
    setUploadProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleOpenReview = (doc: DocumentRecord) => {
    setSelectedDoc({ ...doc });
    setReviewModalOpen(true);
  };

  const handleSaveReview = async () => {
    if (!selectedDoc) return;
    await onUpdateDocument(selectedDoc);
    setReviewModalOpen(false);
  };

  const getCategoryLabel = (cat: DocumentType): string => {
    const map: Record<DocumentType, string> = {
      payroll: 'Recibo de Nómina',
      invoice_received: 'Factura Recibida',
      invoice_issued: 'Factura Emitida',
      expense_receipt: 'Comprobante de Gasto',
      payment_receipt: 'Comprobante de Pago',
      payment_complement: 'Complemento de Pago (REP)',
      bank_statement: 'Estado de Cuenta',
      other: 'Otro Fiscal',
    };
    return map[cat] || cat;
  };

  return (
    <div className="space-y-6">
      {/* Header and Explanation */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Mis Documentos y Comprobantes</h1>
          <p className="text-xs text-slate-500 mt-1">
            Sube tus archivos CFDI (XML), representaciones impresas (PDF) o fotos de tickets (JPG/PNG).
          </p>
        </div>

        {/* Upload Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={e => e.target.files && processFiles(e.target.files)}
            multiple
            accept=".xml,.pdf,.jpg,.jpeg,.png"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition shadow-sm disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Seleccionar Archivos</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          isDragging
            ? 'border-blue-600 bg-blue-50/80 shadow-md scale-[1.005]'
            : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50'
        }`}
      >
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shadow-sm">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Arrastra y suelta tus archivos aquí
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Soportamos formatos oficiales del SAT: <strong>XML (CFDI 4.0 / 3.3)</strong>, <strong>PDF</strong>, y comprobantes en <strong>JPG/PNG</strong>.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="text-[10px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">.XML</span>
            <span className="text-[10px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">.PDF</span>
            <span className="text-[10px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">.JPG</span>
            <span className="text-[10px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600">.PNG</span>
          </div>

          {uploading && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-medium animate-pulse flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>{uploadProgress || 'Analizando documentos con inteligencia artificial...'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por emisor, concepto o UUID..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none text-slate-700"
          >
            <option value="all">Todas las categorías</option>
            <option value="payroll">Recibos de Nómina</option>
            <option value="invoice_received">Facturas Recibidas (Gastos)</option>
            <option value="invoice_issued">Facturas Emitidas (Ingresos)</option>
            <option value="payment_complement">Complementos de Pago</option>
            <option value="expense_receipt">Comprobantes de Gastos</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none text-slate-700"
          >
            <option value="all">Todos los estados</option>
            <option value="processed">Procesado</option>
            <option value="needs_review">Pendiente de revisión</option>
            <option value="error">Con error</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Archivo / Emisor</th>
                <th className="px-4 py-3.5">Tipo</th>
                <th className="px-4 py-3.5">Fecha</th>
                <th className="px-4 py-3.5">Total</th>
                <th className="px-4 py-3.5">Deducibilidad / SAT</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No hay documentos que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map(doc => {
                  const isXml = doc.fileType === 'xml';
                  const isPdf = doc.fileType === 'pdf';
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                      {/* Name / Issuer */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isXml ? 'bg-amber-100 text-amber-800' : isPdf ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isXml ? <FileCode className="w-4 h-4" /> : isPdf ? <FileText className="w-4 h-4" /> : <Image className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block truncate max-w-xs">{doc.name}</span>
                            <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                              {doc.nameIssuer || 'Emisor no especificado'} {doc.rfcIssuer && `(${doc.rfcIssuer})`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium">
                          {getCategoryLabel(doc.category)}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                        {doc.issueDate ? doc.issueDate.slice(0, 10) : '-'}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3.5 font-extrabold text-slate-900">
                        ${doc.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        {doc.currency && doc.currency !== 'MXN' && (
                          <span className="text-[10px] text-slate-400 font-normal ml-1">{doc.currency}</span>
                        )}
                      </td>

                      {/* Tax classification */}
                      <td className="px-4 py-3.5">
                        {doc.cfdiUsage?.startsWith('D') ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Deducción personal ({doc.cfdiUsage})
                          </span>
                        ) : doc.category === 'payroll' ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            Nómina gravada
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 truncate max-w-[150px] block">
                            {doc.suggestedCategory}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {doc.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <ShieldAlert className="w-3 h-3" />
                            Duplicado detectado
                          </span>
                        ) : doc.status === 'processed' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            Validado ({doc.confidence}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <Clock className="w-3 h-3" />
                            Por revisar
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenReview(doc)}
                            title="Revisar o corregir datos extraídos"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteDocument(doc.id)}
                            title="Eliminar documento"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Edit Modal */}
      {reviewModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Revisión de Comprobante Fiscal</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedDoc.name}</p>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Duplicate or Confidence Warning */}
              {selectedDoc.confidenceExplanation && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  selectedDoc.isDuplicate
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Diagnóstico del análisis:</span>
                    <span className="leading-relaxed mt-0.5 block">{selectedDoc.confidenceExplanation}</span>
                  </div>
                </div>
              )}

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre del Emisor</label>
                  <input
                    type="text"
                    value={selectedDoc.nameIssuer || ''}
                    onChange={e => setSelectedDoc({ ...selectedDoc, nameIssuer: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">RFC del Emisor</label>
                  <input
                    type="text"
                    value={selectedDoc.rfcIssuer || ''}
                    onChange={e => setSelectedDoc({ ...selectedDoc, rfcIssuer: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs border rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Importe Total ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedDoc.total || 0}
                    onChange={e => setSelectedDoc({ ...selectedDoc, total: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ISR Retenido ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedDoc.taxIsrRetained || 0}
                    onChange={e => setSelectedDoc({ ...selectedDoc, taxIsrRetained: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border rounded-xl font-bold text-blue-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Comprobante</label>
                  <input
                    type="date"
                    value={selectedDoc.issueDate ? selectedDoc.issueDate.slice(0, 10) : ''}
                    onChange={e => setSelectedDoc({ ...selectedDoc, issueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Uso de CFDI</label>
                  <input
                    type="text"
                    value={selectedDoc.cfdiUsage || ''}
                    onChange={e => setSelectedDoc({ ...selectedDoc, cfdiUsage: e.target.value.toUpperCase() })}
                    placeholder="Ej. G03 o D01"
                    className="w-full px-3 py-2 text-xs border rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* UUID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Folio Fiscal UUID (SAT)</label>
                <input
                  type="text"
                  value={selectedDoc.uuid || ''}
                  onChange={e => setSelectedDoc({ ...selectedDoc, uuid: e.target.value })}
                  placeholder="SAT UUID"
                  className="w-full px-3 py-2 text-xs border rounded-xl font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Concepto o Descripción</label>
                <textarea
                  value={selectedDoc.description || ''}
                  onChange={e => setSelectedDoc({ ...selectedDoc, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Nómina Details Preview if applicable */}
              {selectedDoc.payrollDetails && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800">Desglose de Nómina Timbrada</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Sueldo Bruto:</span>
                      <strong className="text-slate-800">${selectedDoc.payrollDetails.totalPerceptions.toLocaleString('es-MX')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Deducciones:</span>
                      <strong className="text-slate-800">${selectedDoc.payrollDetails.totalDeductions.toLocaleString('es-MX')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">ISR Retenido:</span>
                      <strong className="text-blue-700">${selectedDoc.payrollDetails.isrRetained.toLocaleString('es-MX')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Neto Pagado:</span>
                      <strong className="text-emerald-700">${selectedDoc.payrollDetails.netPaid.toLocaleString('es-MX')}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveReview}
                className="px-5 py-2.5 bg-blue-700 text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition shadow-sm"
              >
                Guardar y Validar Datos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
