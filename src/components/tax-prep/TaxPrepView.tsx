import React, { useState } from 'react';
import { Transaction, DocumentRecord, TaxProfile, FISCAL_REGIMES } from '../../types';
import { calculateAnnualTax } from '../../lib/tax-engine';
import {
  ClipboardCheck,
  UserCheck,
  TrendingUp,
  Receipt,
  ShieldCheck,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  FileCheck,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';

interface TaxPrepViewProps {
  transactions: Transaction[];
  documents: DocumentRecord[];
  profile: TaxProfile | null;
  activeYear: number;
}

export const TaxPrepView: React.FC<TaxPrepViewProps> = ({
  transactions,
  documents,
  profile,
  activeYear,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    payrollVerified: true,
    deductionsChecked: false,
    rfcUpdated: true,
    bankAccountReady: false,
    satPasswordReady: false,
  });

  const toggleCheck = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const taxCalc = profile ? calculateAnnualTax(transactions, profile) : null;

  const personalDeductionItems = transactions.filter(
    t => t.type === 'expense' && t.fiscalClassification === 'personal_deduction'
  );

  const pendingReviewItems = transactions.filter(
    t => t.fiscalClassification === 'needs_review'
  );

  const cashDisallowedItems = transactions.filter(
    t => t.type === 'expense' && t.fiscalClassification === 'non_deducible' && t.paymentForm === '01'
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Preparar mi Declaración Anual {activeYear} (SAT)
            </h1>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
              Asistente en 6 Etapas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Revisa, organiza y valida todos los datos antes de ingresar al portal oficial del SAT.
          </p>
        </div>

        {/* Legal Disclaimer */}
        <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 max-w-sm">
          <strong>Aviso de seguridad:</strong> Mi Control Fiscal nunca solicita ni guarda tu contraseña del SAT, e.firma o llaves privadas.
        </div>
      </div>

      {/* Stepper Navigation */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[650px] gap-2">
          {[
            { step: 1, title: '1. Contribuyente', icon: UserCheck },
            { step: 2, title: '2. Ingresos', icon: TrendingUp },
            { step: 3, title: '3. Deducciones', icon: Receipt },
            { step: 4, title: '4. Impuestos', icon: ShieldCheck },
            { step: 5, title: '5. Resumen Anual', icon: Calculator },
            { step: 6, title: '6. Checklist SAT', icon: ClipboardCheck },
          ].map(s => {
            const Icon = s.icon;
            const isCurrent = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            return (
              <button
                key={s.step}
                onClick={() => setCurrentStep(s.step)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isCurrent
                    ? 'bg-blue-800 text-white shadow-sm shadow-blue-800/20'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent
                      ? 'bg-white text-blue-900'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? '✓' : s.step}
                </div>
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 min-h-[400px]">
        {/* ETAPA 1 */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-700" />
                Etapa 1: Información del Contribuyente y Regímenes SAT
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Verifica que tus datos fiscales coincidan con tu Constancia de Situación Fiscal ante el SAT.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div>
                  <span className="text-slate-400 block">Nombre del contribuyente:</span>
                  <strong className="text-slate-900 text-sm">{profile?.taxName || 'No definido'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">RFC:</span>
                  <strong className="font-mono text-slate-900">{profile?.rfc || 'Sin RFC'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Ejercicio fiscal a declarar:</span>
                  <strong className="text-slate-800">{activeYear}</strong>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-slate-400 block font-semibold">Regímenes Fiscales Activos:</span>
                <div className="space-y-1.5">
                  {profile?.regimes?.map(code => {
                    const r = FISCAL_REGIMES.find(item => item.code === code);
                    return (
                      <div key={code} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="text-slate-800 font-medium">
                          {r ? r.shortName : `Régimen ${code}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {taxCalc?.regimesNotes && taxCalc.regimesNotes.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold text-blue-900 block flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-700" />
                  Reglas fiscales aplicables a tus regímenes:
                </span>
                <ul className="list-disc list-inside text-xs text-blue-800 space-y-1">
                  {taxCalc.regimesNotes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ETAPA 2 */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-700" />
                Etapa 2: Ingresos Acumulables y Retenciones
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Total de ingresos gravados y exentos reportados en tus comprobantes del ejercicio {activeYear}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block">Sueldos y Salarios</span>
                <span className="text-lg font-extrabold text-slate-900 block mt-1">
                  ${(taxCalc?.grossIncome || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Nóminas acumuladas</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block">Ingresos Exentos (Estimado)</span>
                <span className="text-lg font-extrabold text-slate-900 block mt-1">
                  ${(taxCalc?.exemptIncome || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Aguinaldo / prima según límites</span>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-xs text-blue-900 block">ISR Retenido</span>
                <span className="text-lg font-extrabold text-blue-700 block mt-1">
                  ${(taxCalc?.isrWithheld || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-blue-600 block mt-0.5">Retenido en comprobantes timbrados</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Validación de nómina timbrada:</p>
              <p className="leading-relaxed">
                El SAT precarga en tu declaración anual los recibos de nómina que tu patrón emitió y timbró. Puedes contrastar este total con el <strong>Visor de Nómina para Trabajadores</strong> del SAT disponible en la etapa 6.
              </p>
            </div>
          </div>
        )}

        {/* ETAPA 3 */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-700" />
                Etapa 3: Gastos y Deducciones Personales (Art. 151 LISR)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Las deducciones personales reducen tu base gravable y pueden originar un saldo a favor de impuestos.
              </p>
            </div>

            {/* Limits Calculation Card */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Tope Legal de Deducciones Personales en México
              </h3>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Por ley, el total de deducciones personales (salvo excepciones como donativos y retiro) no puede superar el menor de dos límites:
                <strong> 5 veces la UMA anual</strong> (${taxCalc?.umaLimit5x.toLocaleString('es-MX', { minimumFractionDigits: 2 })}) o el <strong>15% del total de tus ingresos</strong> (${taxCalc?.percentageLimit15.toLocaleString('es-MX', { minimumFractionDigits: 2 })}).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-slate-500 block">Deducciones registradas:</span>
                  <strong className="text-slate-900 text-sm">
                    ${taxCalc?.grossPersonalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-slate-500 block">Tope máximo legal aplicable:</span>
                  <strong className="text-emerald-800 text-sm">
                    ${taxCalc?.applicablePersonalDeductionsLimit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-slate-500 block">Deducción personal efectiva:</span>
                  <strong className="text-emerald-700 text-sm">
                    ${taxCalc?.netPersonalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            </div>

            {/* List of identified personal deductions */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Comprobantes identificados como deducción personal:</span>
              <div className="space-y-2">
                {personalDeductionItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">No has registrado facturas con uso de deducción personal.</p>
                ) : (
                  personalDeductionItems.map(item => (
                    <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-900 block">{item.concept}</span>
                        <span className="text-[11px] text-slate-500">{item.date} • {item.category} • Pago: {item.paymentForm || 'Tarjeta/SPEI'}</span>
                      </div>
                      <span className="font-extrabold text-emerald-700 text-sm">
                        ${(item.amountGross || item.amountNet).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Disallowed cash warning */}
            {cashDisallowedItems.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-xs text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block">Gastos médicos o colegiaturas pagados en efectivo:</strong>
                  <p className="leading-relaxed mt-0.5">
                    Se detectaron {cashDisallowedItems.length} comprobantes con forma de pago en Efectivo (01). La ley del ISR expresamente prohíbe deducir estos conceptos si no fueron liquidados con cheque nominativo, transferencia o tarjetas bancarias.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ETAPA 4 */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-700" />
                Etapa 4: Impuestos Retenidos y Pagos Provisionales
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Impuestos pagados por adelantado que se restan del impuesto anual causado.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-5 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-2">
                <span className="font-bold text-blue-900 block text-sm">ISR Retenido Acreditable</span>
                <span className="text-2xl font-black text-blue-800 block">
                  ${(taxCalc?.isrWithheld || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Proveniente de tus recibos de nómina timbrados y retenciones en facturas profesionales emitidas a personas morales.
                </p>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="font-bold text-slate-800 block text-sm">Pagos Provisionales de ISR</span>
                <span className="text-2xl font-black text-slate-700 block">
                  ${(taxCalc?.isrProvisionalPayments || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Pagos anticipados mensuales presentados directamente ante el SAT por actividades profesionales o RESICO.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 5 */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-700" />
                Etapa 5: Resumen Anual Preliminar (Tarifa Art. 152 LISR)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Cálculo determinista estimado aplicando la tarifa anual oficial sobre tu base gravable.
              </p>
            </div>

            {taxCalc && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">Ingresos Acumulables Totales:</span>
                    <strong className="text-slate-900">${taxCalc.grossIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">(-) Deducciones Autorizadas de Actividad:</span>
                    <strong className="text-slate-800">-${taxCalc.authorizedDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">(-) Deducciones Personales Válidas (con tope):</span>
                    <strong className="text-emerald-700">-${taxCalc.netPersonalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-300 font-bold text-sm text-slate-900 bg-white p-2 rounded-lg">
                    <span>(=) Base Gravable del Impuesto:</span>
                    <span>${taxCalc.taxBase.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">ISR Anual Causado (Tarifa Art. 152):</span>
                    <strong className="text-slate-900">${taxCalc.estimatedAnnualTax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">(-) ISR Retenido por Patrón / Clientes:</span>
                    <strong className="text-blue-700">-${taxCalc.isrWithheld.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>

                {/* Final Estimated Balance Result */}
                <div className={`p-5 rounded-2xl border text-center ${
                  taxCalc.isRefundEstimated
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-blue-50 border-blue-300 text-blue-950'
                }`}>
                  <span className="text-xs font-bold uppercase tracking-wider block">
                    {taxCalc.isRefundEstimated ? 'Posible Saldo a Favor Estimado' : 'Resultado Estimado a Cargo'}
                  </span>
                  <span className="text-3xl font-black block my-1">
                    ${Math.abs(taxCalc.estimatedBalance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-xs max-w-lg mx-auto opacity-90 leading-relaxed">
                    {taxCalc.isRefundEstimated
                      ? 'Tus retenciones de nómina superaron el impuesto causado anual gracias a tus deducciones personales registradas. Este saldo puede solicitarse en devolución automática en abril.'
                      : 'De acuerdo con los datos actuales, el impuesto causado supera las retenciones preliminares registradas.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ETAPA 6 */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-700" />
                Etapa 6: Lista de Verificación y Visores Oficiales del SAT
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Marca cada elemento antes de entrar al portal oficial para presentar tu declaración anual.
              </p>
            </div>

            {/* Checklist items */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.payrollVerified}
                  onChange={() => toggleCheck('payrollVerified')}
                  className="w-4 h-4 text-blue-600 rounded mt-0.5"
                />
                <div className="text-xs">
                  <strong className="text-slate-900 block">Comprobé todos mis recibos de nómina timbrados</strong>
                  <span className="text-slate-500 block mt-0.5">
                    Verifiqué que no existan nóminas duplicadas o patrones desconocidos en el Visor de Nómina del SAT.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.deductionsChecked}
                  onChange={() => toggleCheck('deductionsChecked')}
                  className="w-4 h-4 text-blue-600 rounded mt-0.5"
                />
                <div className="text-xs">
                  <strong className="text-slate-900 block">Revisé mis facturas de deducciones personales</strong>
                  <span className="text-slate-500 block mt-0.5">
                    Confirmé que el uso de CFDI sea D01 a D10 y que los pagos se hayan realizado con tarjeta, transferencia o cheque.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.bankAccountReady}
                  onChange={() => toggleCheck('bankAccountReady')}
                  className="w-4 h-4 text-blue-600 rounded mt-0.5"
                />
                <div className="text-xs">
                  <strong className="text-slate-900 block">Tengo a la mano mi cuenta CLABE bancaria (18 dígitos)</strong>
                  <span className="text-slate-500 block mt-0.5">
                    La cuenta debe estar a mi nombre para recibir la devolución automática del SAT.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.satPasswordReady}
                  onChange={() => toggleCheck('satPasswordReady')}
                  className="w-4 h-4 text-blue-600 rounded mt-0.5"
                />
                <div className="text-xs">
                  <strong className="text-slate-900 block">Cuento con Contraseña del SAT o e.firma vigente</strong>
                  <span className="text-slate-500 block mt-0.5">
                    Para saldos a favor superiores a $10,000 MXN o cuando se modifica la cuenta CLABE precargada, el SAT exige e.firma portable o archivos .cer y .key.
                  </span>
                </div>
              </label>
            </div>

            {/* Official SAT Links */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Enlaces oficiales del Portal del SAT:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                  href="https://www.sat.gob.mx/declaracion/22616/declara-tus-impuestos-como-persona-fisica"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-500 text-xs text-blue-700 font-semibold flex items-center justify-between group"
                >
                  <span>Portal Declaración Anual</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </a>

                <a
                  href="https://www.sat.gob.mx/consulta/05237/consulta-el-visor-de-nomina-para-el-trabajador"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-500 text-xs text-blue-700 font-semibold flex items-center justify-between group"
                >
                  <span>Visor de Nómina SAT</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </a>

                <a
                  href="https://www.sat.gob.mx/declaracion/97720/consulta-el-visor-de-deducciones-personales"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-500 text-xs text-blue-700 font-semibold flex items-center justify-between group"
                >
                  <span>Visor de Deducciones SAT</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Etapa Anterior</span>
        </button>

        <button
          onClick={() => setCurrentStep(prev => Math.min(6, prev + 1))}
          disabled={currentStep === 6}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-40"
        >
          <span>Siguiente Etapa</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
