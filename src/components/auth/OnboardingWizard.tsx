import React, { useState } from 'react';
import { FISCAL_REGIMES, FiscalRegimeCode, TaxProfile } from '../../types';
import { ShieldCheck, CheckCircle2, Building2, UserCheck, HelpCircle } from 'lucide-react';

interface OnboardingWizardProps {
  userId: string;
  userEmail: string;
  defaultName: string;
  onSave: (profile: TaxProfile) => Promise<void>;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  userId,
  userEmail,
  defaultName,
  onSave,
}) => {
  const [step, setStep] = useState<number>(1);
  const [taxName, setTaxName] = useState(defaultName || '');
  const [rfc, setRfc] = useState('');
  const [fiscalYear, setFiscalYear] = useState<number>(2025);
  const [selectedRegimes, setSelectedRegimes] = useState<FiscalRegimeCode[]>(['605']);
  const [hasPayroll, setHasPayroll] = useState(true);
  const [issuesInvoices, setIssuesInvoices] = useState(false);
  const [makesProvisionalPayments, setMakesProvisionalPayments] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleRegime = (code: FiscalRegimeCode) => {
    if (selectedRegimes.includes(code)) {
      if (selectedRegimes.length > 1) {
        setSelectedRegimes(selectedRegimes.filter(c => c !== code));
      }
    } else {
      setSelectedRegimes([...selectedRegimes, code]);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const profile: TaxProfile = {
        id: 'default',
        userId,
        taxName: taxName.trim() || defaultName || 'Contribuyente',
        rfc: rfc.trim().toUpperCase(),
        fiscalYear,
        regimes: selectedRegimes,
        hasPayroll,
        issuesInvoices,
        makesProvisionalPayments,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await onSave(profile);
    } catch (e) {
      console.error('Error saving tax profile:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-blue-500/20 p-2 rounded-xl border border-blue-400/30">
              <ShieldCheck className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Configuración de tu Perfil Fiscal</h2>
              <p className="text-xs text-blue-200">Personaliza Mi Control Fiscal a tu situación particular ante el SAT</p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-blue-700/50">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-emerald-400' : 'bg-blue-950/60'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-emerald-400' : 'bg-blue-950/60'}`} />
            <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-emerald-400' : 'bg-blue-950/60'}`} />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  Datos del Contribuyente
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esta información se usará para identificar tus facturas, recibos de nómina y reportes.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre completo del contribuyente *
                </label>
                <input
                  type="text"
                  value={taxName}
                  onChange={e => setTaxName(e.target.value)}
                  placeholder="Ej. Juan Pérez López"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RFC (Registro Federal de Contribuyentes)
                    <span className="text-slate-400 font-normal ml-1">(Opcional ahora)</span>
                  </label>
                  <input
                    type="text"
                    value={rfc}
                    onChange={e => setRfc(e.target.value.toUpperCase())}
                    maxLength={13}
                    placeholder="Ej. PELJ900101XYZ"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono uppercase"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Nos ayuda a clasificar automáticamente tus facturas en ingresos emitidos o gastos recibidos.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ejercicio fiscal que deseas controlar *
                  </label>
                  <select
                    value={fiscalYear}
                    onChange={e => setFiscalYear(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value={2026}>2026 (Año en curso)</option>
                    <option value={2025}>2025 (Ejercicio fiscal activo)</option>
                    <option value={2024}>2024 (Declaración anual previa)</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  <strong>País: México.</strong> Todos los cálculos se adaptan a la legislación fiscal mexicana (Ley del ISR, Código Fiscal de la Federación y miscelánea vigente).
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Régimen o Regímenes Fiscales ante el SAT
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Puedes seleccionar más de uno si tienes múltiples fuentes de ingresos (ej. Empleo + Honorarios o RESICO).
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {FISCAL_REGIMES.map(regime => {
                  const isSelected = selectedRegimes.includes(regime.code);
                  return (
                    <div
                      key={regime.code}
                      onClick={() => toggleRegime(regime.code)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900">{regime.shortName}</span>
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              Clave {regime.code}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{regime.description}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Tus Obligaciones y Comprobantes Habituales</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ayúdanos a preparar los filtros y módulos que más utilizarás.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPayroll}
                    onChange={e => setHasPayroll(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 mt-0.5 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-800 block">
                      Recibo comprobantes de nómina de un empleador
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      Activa el análisis detallado de sueldos brutos, deducciones del IMSS e ISR retenido quincenal o mensual.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={issuesInvoices}
                    onChange={e => setIssuesInvoices(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 mt-0.5 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-800 block">
                      Emito facturas CFDI por mis servicios, rentas o actividades
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      Permite registrar ingresos cobrados, métodos PUE / PPD y complementos de pago.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={makesProvisionalPayments}
                    onChange={e => setMakesProvisionalPayments(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 mt-0.5 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-800 block">
                      Presento pagos provisionales mensuales de ISR o declaraciones de IVA
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      Para acreditar pagos anticipados en tu declaración anual.
                    </span>
                  </div>
                </label>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <strong>Nota de transparencia:</strong> Mi Control Fiscal es un asistente informativo y de organización financiera. No sustituye la asesoría de un contador ni envía declaraciones automáticas sin tu validación ante el portal del SAT.
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition"
            >
              Atrás
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !taxName.trim()}
              className="px-5 py-2.5 bg-blue-700 text-white rounded-xl text-xs font-semibold hover:bg-blue-800 transition disabled:opacity-50"
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Guardando...' : 'Comenzar a controlar mis finanzas'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
