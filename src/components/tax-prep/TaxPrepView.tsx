import React, { useState, useMemo } from 'react';
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Scale,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Download,
  Info,
  DollarSign,
  FileCheck2,
  ExternalLink,
  Percent,
} from 'lucide-react';
import { Transaction, TaxProfile } from '../../types';
import { calculateAnnualTax } from '../../lib/tax-engine';

interface TaxPrepViewProps {
  transactions: Transaction[];
  profile: TaxProfile;
  activeYear: number;
}

export const TaxPrepView: React.FC<TaxPrepViewProps> = ({
  transactions,
  profile,
  activeYear,
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);

  // Run calculation
  const taxCalc = useMemo(() => {
    return calculateAnnualTax(transactions, profile);
  }, [transactions, profile]);

  const steps = [
    { number: 1, title: 'Ingresos Acumulables' },
    { number: 2, title: 'Deducciones de Actividad' },
    { number: 3, title: 'Deducciones Personales (Art. 151)' },
    { number: 4, title: 'Retenciones de ISR' },
    { number: 5, title: 'Cálculo LISR Art. 152' },
    { number: 6, title: 'Checklist SAT' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Simulador & Preparación Fiscal Anual {activeYear}
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
              LISR Art. 151 & 152
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Revisa tus ingresos, aplica el tope legal de deducciones y calcula tu posible saldo ante el SAT.
          </p>
        </div>
      </div>

      {/* Step Navigation Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto gap-2 py-1">
          {steps.map((s) => (
            <button
              key={s.number}
              onClick={() => setActiveStep(s.number)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeStep === s.number
                  ? 'bg-blue-600 text-white shadow-xs'
                  : activeStep > s.number
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  activeStep === s.number
                    ? 'bg-white text-blue-600'
                    : activeStep > s.number
                    ? 'bg-blue-200 text-blue-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {activeStep > s.number ? '✓' : s.number}
              </span>
              <span>{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        {/* STEP 1: Ingresos Acumulables */}
        {activeStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Paso 1: Ingresos Acumulables del Ejercicio
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conforme a la Ley del ISR, todos los ingresos percibidos en el año por los regímenes aplicables se suman para formar el total de ingresos.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-semibold">Total Ingresos Brutos</span>
                <p className="text-xl font-bold text-slate-900 font-mono">
                  ${taxCalc.grossIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <p className="font-bold text-slate-900">Tus Regímenes Registrados</p>
                <div className="space-y-1">
                  {profile.regimes.map((reg) => (
                    <div key={reg} className="flex items-center space-x-2 text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      <span>
                        {reg === '605'
                          ? '605 - Sueldos y Salarios (Nómina)'
                          : reg === '612'
                          ? '612 - Servicios Profesionales / Actividades Empresariales'
                          : reg === '626'
                          ? '626 - Régimen Simplificado de Confianza (RESICO)'
                          : `Régimen ${reg}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 text-xs space-y-2 text-blue-900">
                <p className="font-bold">Información relevante del SAT</p>
                <p className="leading-relaxed">
                  Si durante el año tributaste bajo el régimen de Sueldos y Salarios y tus ingresos no superaron los $400,000 MXN con un solo patrón, la declaración anual puede ser opcional, salvo que cuentes con deducciones personales y desees solicitar una devolución de saldo a favor.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Deducciones de Actividad */}
        {activeStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Paso 2: Deducciones Autorizadas de la Actividad (Art. 103 LISR)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gastos estrictamente indispensables para llevar a cabo tu profesión o actividad comercial (renta de oficina, internet, papelería, tecnología).
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-semibold">Total Deducciones Actividad</span>
                <p className="text-xl font-bold text-blue-700 font-mono">
                  ${taxCalc.authorizedDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <p className="font-bold text-slate-800">Resultado Intermedio:</p>
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-600">Total Ingresos:</span>
                <span className="font-mono font-semibold">${taxCalc.grossIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-600">Menos Deducciones de la Actividad:</span>
                <span className="font-mono font-semibold text-rose-600">-${taxCalc.authorizedDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center py-1 font-bold text-slate-900">
                <span>Ingreso Gravable Previo a Deducciones Personales:</span>
                <span className="font-mono">${taxCalc.taxableIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Deducciones Personales Art. 151 */}
        {activeStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Paso 3: Deducciones Personales Anuales (Art. 151 LISR) & Tope Legal
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gastos de salud, seguros médicos, educación, gastos funerarios y donativos que reducen tu base gravable.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-semibold">Deducciones Aplicables</span>
                <p className="text-xl font-bold text-emerald-700 font-mono">
                  ${taxCalc.netPersonalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Legal Cap Comparison Box */}
            <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 rounded-xl border border-emerald-200 text-xs space-y-3">
              <div className="flex items-center space-x-2 font-bold text-emerald-900">
                <Scale className="w-4 h-4 text-emerald-700" />
                <span>Tope Legal de Deducciones Personales (Art. 151 último párrafo)</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                El monto total de las deducciones personales no puede exceder de la cantidad que resulte <strong>menor</strong> entre cinco veces el valor anual de la UMA o el 15% del total de tus ingresos del ejercicio.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-white rounded-lg border border-emerald-200">
                  <p className="text-slate-500">Tope 5 UMAs Anuales ({activeYear})</p>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-1">
                    ${taxCalc.umaLimit5x.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-emerald-200">
                  <p className="text-slate-500">Tope 15% de tus Ingresos</p>
                  <p className="text-sm font-bold text-slate-900 font-mono mt-1">
                    ${taxCalc.percentageLimit15.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-emerald-100/70 rounded-lg border border-emerald-300">
                  <p className="text-emerald-900 font-semibold">Tope Máximo Permitido</p>
                  <p className="text-sm font-bold text-emerald-900 font-mono mt-1">
                    ${taxCalc.applicablePersonalDeductionsLimit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                <span className="text-slate-700">Deducciones Personales Registradas:</span>
                <span className="font-mono font-bold text-slate-900">
                  ${taxCalc.grossPersonalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-800 font-bold">
                <span>Deducciones Personales Efectivas a Deducir:</span>
                <span className="font-mono">
                  ${taxCalc.netPersonalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {taxCalc.grossPersonalDeductions > taxCalc.applicablePersonalDeductionsLimit && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Tus gastos personales superaron el tope legal del 15% de tus ingresos. El cálculo aplicará automáticamente el límite permitido por la ley.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Retenciones de ISR */}
        {activeStep === 4 && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Paso 4: Pagos Anticipados y Retenciones de ISR
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Impuestos que ya fueron descontados por tus patrones o personas morales retenedoras durante el ejercicio.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-semibold">Total ISR a Favor Registrado</span>
                <p className="text-xl font-bold text-amber-700 font-mono">
                  ${taxCalc.isrWithheld.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <p className="font-bold text-slate-900">Desglose de retenciones identificadas:</p>
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-600">ISR Retenido en Recibos de Nómina:</span>
                <span className="font-mono font-semibold">
                  $
                  {transactions
                    .filter((t) => t.category === 'Sueldos y Salarios')
                    .reduce((acc, curr) => acc + (curr.isrRetained || 0), 0)
                    .toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-600">ISR Retenido en Facturas de Honorarios (10%):</span>
                <span className="font-mono font-semibold">
                  $
                  {transactions
                    .filter((t) => t.category !== 'Sueldos y Salarios' && t.type === 'income')
                    .reduce((acc, curr) => acc + (curr.isrRetained || 0), 0)
                    .toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Cálculo LISR Art. 152 */}
        {activeStep === 5 && (
          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Paso 5: Determinación del Impuesto Anual (Art. 152 LISR)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aplicación de la tarifa progresiva de personas físicas sobre la base gravable final.
                </p>
              </div>
            </div>

            {/* Final Calculation Table */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Ingresos Acumulables Totales:</span>
                <span className="font-mono font-semibold">${taxCalc.grossIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 text-rose-600">
                <span>(-) Deducciones Autorizadas:</span>
                <span className="font-mono font-semibold">-${taxCalc.authorizedDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 text-emerald-700">
                <span>(-) Deducciones Personales Aplicables:</span>
                <span className="font-mono font-semibold">-${taxCalc.netPersonalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b-2 border-slate-300 font-bold text-slate-900">
                <span>(=) Base Gravable del Impuesto:</span>
                <span className="font-mono text-sm">${taxCalc.taxBase.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 font-medium">
                <span className="text-slate-700">ISR Causado del Ejercicio (Tarifa Art. 152):</span>
                <span className="font-mono">${taxCalc.estimatedAnnualTax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200 text-blue-700 font-medium">
                <span>(-) Pagos Provisionales & Retenciones de ISR:</span>
                <span className="font-mono">-${taxCalc.isrWithheld.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Final Balance Box */}
              <div
                className={`p-4 rounded-xl mt-3 flex items-center justify-between border ${
                  taxCalc.isRefundEstimated
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {taxCalc.isRefundEstimated ? 'Saldo a Favor Estimado' : 'Impuesto a Pagar Estimado'}
                  </p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {taxCalc.isRefundEstimated
                      ? 'Puedes solicitar la devolución de este importe al presentar tu declaración anual en abril.'
                      : 'Monto estimado a liquidar en ventanilla bancaria o portal del SAT.'}
                  </p>
                </div>
                <p className="text-2xl font-bold font-mono">
                  ${Math.abs(taxCalc.estimatedBalance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Checklist SAT */}
        {activeStep === 6 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Paso 6: Lista de Verificación Oficial para la Declaración Anual en el SAT
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Asegúrate de tener listos todos los elementos requeridos por el SAT antes de ingresar a sat.gob.mx en el mes de abril.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>1. Acceso al Portal del SAT</span>
                </div>
                <p className="text-slate-600">
                  Contar con tu Contraseña CIEC de 8 caracteres activa o tus archivos de e.firma (certificado .cer, llave privada .key y clave de acceso).
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>2. Cuenta CLABE para Devolución</span>
                </div>
                <p className="text-slate-600">
                  Tener a la mano tu CLABE interbancaria (18 dígitos) de una cuenta activa a tu nombre en una institución financiera autorizada en México.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>3. Cotejar con el Visor de Nómina y Deducciones</span>
                </div>
                <p className="text-slate-600">
                  Ingresar al Visor de Nómina para Trabajadores y al Visor de Deducciones Personales del SAT para constatar que el patrón timbró todos los recibos.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>4. Constancia de Situación Fiscal</span>
                </div>
                <p className="text-slate-600">
                  Verificar que tu domicilio fiscal, código postal y regímenes tributarios se encuentren debidamente actualizados.
                </p>
              </div>
            </div>

            {/* SAT portal direct link */}
            <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-900">¿Listo para presentar tu declaración?</p>
                <p className="text-[11px] text-blue-700">
                  Ingresa al portal oficial del Servicio de Administración Tributaria (SAT).
                </p>
              </div>
              <a
                href="https://www.sat.gob.mx"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
              >
                <span>Ir al portal sat.gob.mx</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Step Navigation Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
            disabled={activeStep === 1}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center space-x-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Paso Anterior</span>
          </button>

          <span className="text-xs text-slate-400 font-medium">
            Paso {activeStep} de {steps.length}
          </span>

          <button
            onClick={() => setActiveStep((prev) => Math.min(steps.length, prev + 1))}
            disabled={activeStep === steps.length}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center space-x-1.5 transition-colors"
          >
            <span>Siguiente Paso</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
