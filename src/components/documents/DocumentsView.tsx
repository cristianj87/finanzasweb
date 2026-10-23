import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  Search,
  ExternalLink,
  Trash2,
  Eye,
  ShieldAlert,
  HelpCircle,
  FileCode,
  Tag,
  DollarSign,
  Calendar,
  Building,
} from 'lucide-react';
import { DocumentRecord, Transaction, TaxProfile, DocumentType, FiscalClassification } from '../../types';
import { parseCFDIXML } from '../../lib/cfdi-parser';

interface DocumentsViewProps {
  documents: DocumentRecord[];
  transactions: Transaction[];
  profile: TaxProfile;
  activeYear: number;
  onAddDocument: (doc: DocumentRecord, tx?: Transaction) => void;
  onDeleteDocument: (id: string) => void;
  onUpdateDocument: (doc: DocumentRecord) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  transactions,
  profile,
  activeYear,
  onAddDocument,
  onDeleteDocument,
  onUpdateDocument,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    const isXml = file.name.toLowerCase().endsWith('.xml');
    if (!isXml) {
      setUploadError('Por el momento el análisis estructurado directo procesa archivos XML de CFDI (versiones 3.3 y 4.0).');
      return;
    }

    try {
      const text = await file.text();
      const parseResult = parseCFDIXML(text, profile.userId, profile.rfc);

      if (!parseResult.isValid || !parseResult.document.uuid) {
        setUploadError(parseResult.error || 'El archivo XML no pudo ser procesado como CFDI válido.');
        return;
      }

      // Duplicate check by UUID
      const existing = documents.find((d) => d.uuid === parseResult.document.uuid);
      if (existing) {
        setUploadError(`El comprobante fiscal con UUID ${parseResult.document.uuid} ya se encuentra registrado en el sistema.`);
        return;
      }

      const newDoc: DocumentRecord = {
        ...(parseResult.document as DocumentRecord),
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: file.name,
        fileType: 'xml',
        status: parseResult.suggestedFiscalClassification === 'needs_review' ? 'needs_review' : 'processed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Create linked transaction
      let newTx: Transaction | undefined;
      if (parseResult.suggestedTransactionType !== 'neutral') {
        newTx = {
          id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          userId: profile.userId,
          type: parseResult.suggestedTransactionType,
          date: (newDoc.paymentDate || newDoc.issueDate || new Date().toISOString()).slice(0, 10),
          concept: newDoc.description || file.name,
          category: newDoc.suggestedCategory || 'General',
          amountGross: newDoc.subtotal || newDoc.total,
          amountNet: newDoc.total,
          iva: newDoc.taxIva || 0,
          ivaRetained: newDoc.taxIvaRetained || 0,
          isrRetained: newDoc.taxIsrRetained || 0,
          fiscalClassification: parseResult.suggestedFiscalClassification,
          fiscalExplanation: parseResult.explanation,
          documentId: newDoc.id,
          documentUuid: newDoc.uuid,
          paymentMethod: newDoc.paymentMethod,
          paymentForm: newDoc.paymentForm,
          status: 'verified',
          isPaid: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      onAddDocument(newDoc, newTx);
      setUploadSuccess(`Archivo ${file.name} procesado y clasificado exitosamente.`);
    } catch (err) {
      setUploadError(`Error leyendo el archivo: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      Array.from(e.dataTransfer.files).forEach((file) => processFile(file));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      Array.from(e.target.files).forEach((file) => processFile(file));
      e.target.value = '';
    }
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    if (filterType !== 'all' && doc.category !== filterType) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = doc.name.toLowerCase().includes(q);
      const matchIssuer = doc.nameIssuer?.toLowerCase().includes(q) || false;
      const matchRfc = doc.rfcIssuer?.toLowerCase().includes(q) || false;
      const matchDesc = doc.description.toLowerCase().includes(q);
      return matchName || matchIssuer || matchRfc || matchDesc;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Bóveda de Documentos Fiscales
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Carga y organiza tus facturas CFDI (XML) y recibos de nómina emitidos o recibidos.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 transition-colors shadow-xs"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Seleccionar Archivos XML</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xml"
            multiple
            className="hidden"
          />
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-50/60'
            : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400'
        }`}
      >
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Arrastra y suelta tus facturas XML del SAT aquí
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Compatible con CFDI 4.0, 3.3, Nómina 1.2 y Pagos REP. Extracción automática de RFC, impuestos y deducciones.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2"
          >
            o explora en tu computadora
          </button>
        </div>
      </div>

      {/* Notifications */}
      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="font-semibold">Aviso de carga</p>
            <p className="mt-0.5">{uploadError}</p>
          </div>
        </div>
      )}
      {uploadSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-emerald-800 text-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="font-semibold">Procesamiento exitoso</p>
            <p className="mt-0.5">{uploadSuccess}</p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por emisor, RFC o descripción..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Tipo:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los documentos ({documents.length})</option>
            <option value="payroll">Recibos de Nómina</option>
            <option value="invoice_received">Facturas Recibidas (Gastos)</option>
            <option value="invoice_issued">Facturas Emitidas (Ingresos)</option>
            <option value="expense_receipt">Notas y Comprobantes</option>
            <option value="payment_complement">Complementos de Pago</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Documento</th>
                <th className="py-3 px-4">Emisor / Receptor</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Tipo & Clasificación</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No se encontraron documentos en esta vista. Carga tus archivos XML arriba.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const isPersonalDeduction = doc.cfdiUsage?.startsWith('D');
                  const isCashWarning = doc.paymentForm === '01' && isPersonalDeduction;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div className="flex items-center space-x-2">
                          <FileCode className="w-4 h-4 text-blue-600 shrink-0" />
                          <div>
                            <p className="truncate max-w-[200px]" title={doc.name}>
                              {doc.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {doc.uuid ? `${doc.uuid.slice(0, 18)}...` : 'Sin UUID'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800 truncate max-w-[180px]">
                          {doc.nameIssuer || doc.rfcIssuer || 'Emisor no especificado'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          RFC: {doc.rfcIssuer || 'N/A'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {(doc.issueDate || doc.createdAt).slice(0, 10)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              doc.category === 'payroll'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : doc.category === 'invoice_issued'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : isPersonalDeduction
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {doc.category === 'payroll'
                              ? 'Nómina Quincenal'
                              : doc.category === 'invoice_issued'
                              ? 'Ingreso Emitido'
                              : isPersonalDeduction
                              ? `Deducción Art. 151 (${doc.cfdiUsage})`
                              : 'Gasto Recibido'}
                          </span>
                          {isCashWarning && (
                            <span className="flex items-center space-x-1 text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              <ShieldAlert className="w-3 h-3" />
                              <span>Efectivo (01) No Deducible</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        ${doc.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ${doc.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setSelectedDoc(doc)}
                            title="Ver detalles fiscales"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteDocument(doc.id)}
                            title="Eliminar documento"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

      {/* Document Detail & Tax Explanation Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Detalles del Comprobante Fiscal
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  UUID: {selectedDoc.uuid || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-500 font-semibold">Emisor</p>
                <p className="font-bold text-slate-900 mt-0.5">{selectedDoc.nameIssuer}</p>
                <p className="font-mono text-slate-600">{selectedDoc.rfcIssuer}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-500 font-semibold">Receptor</p>
                <p className="font-bold text-slate-900 mt-0.5">{selectedDoc.nameReceiver || profile.taxName}</p>
                <p className="font-mono text-slate-600">{selectedDoc.rfcReceiver || profile.rfc}</p>
              </div>
            </div>

            {/* Concept and Description */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <p className="text-slate-500 font-semibold">Conceptos / Descripción</p>
              <p className="text-slate-800 mt-1 leading-relaxed">{selectedDoc.description}</p>
            </div>

            {/* Tax Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-500 font-medium">Subtotal</p>
                <p className="text-sm font-bold text-slate-900 mt-1 font-mono">
                  ${selectedDoc.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-500 font-medium">IVA Trasladado</p>
                <p className="text-sm font-bold text-slate-900 mt-1 font-mono">
                  ${selectedDoc.taxIva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-500 font-medium">ISR Retenido</p>
                <p className="text-sm font-bold text-amber-700 mt-1 font-mono">
                  ${selectedDoc.taxIsrRetained.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-blue-700 font-medium">Total Factura</p>
                <p className="text-sm font-bold text-blue-900 mt-1 font-mono">
                  ${selectedDoc.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Payroll specific details if applicable */}
            {selectedDoc.payrollDetails && (
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-2">
                <p className="font-bold text-indigo-900">Complemento de Nómina Oficial</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-indigo-800">
                  <p>Días pagados: <span className="font-semibold">{selectedDoc.payrollDetails.daysPaid}</span></p>
                  <p>Percepciones: <span className="font-semibold">${selectedDoc.payrollDetails.totalPerceptions.toLocaleString('es-MX')}</span></p>
                  <p>Deducciones patronales: <span className="font-semibold">${selectedDoc.payrollDetails.totalDeductions.toLocaleString('es-MX')}</span></p>
                  <p>ISR Retenido: <span className="font-semibold">${selectedDoc.payrollDetails.isrRetained.toLocaleString('es-MX')}</span></p>
                  <p>Neto pagado: <span className="font-semibold">${selectedDoc.payrollDetails.netPaid.toLocaleString('es-MX')}</span></p>
                </div>
              </div>
            )}

            {/* SAT Fiscal Analysis */}
            <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center space-x-2 text-blue-900 font-bold">
                <ShieldAlert className="w-4 h-4 text-blue-700" />
                <span>Análisis Fiscal & Requisitos del SAT</span>
              </div>
              <p className="text-blue-800 leading-relaxed">
                {selectedDoc.confidenceExplanation || 'Comprobante verificado con estructura oficial CFDI.'}
              </p>
              <div className="flex items-center space-x-4 pt-1 text-[11px] text-blue-700 font-medium">
                <span>Método de pago: <strong>{selectedDoc.paymentMethod || 'PUE'}</strong></span>
                <span>Forma de pago: <strong>{selectedDoc.paymentForm || '03'}</strong></span>
                <span>Uso CFDI: <strong>{selectedDoc.cfdiUsage || 'G03'}</strong></span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
