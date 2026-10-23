import React from 'react';
import {
  Building2,
  Calendar,
  Sparkles,
  Download,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { TaxProfile } from '../../types';

interface NavbarProps {
  profile: TaxProfile;
  activeYear: number;
  onYearChange: (year: number) => void;
  onResetDemoData: () => void;
  hasCustomData: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  activeYear,
  onYearChange,
  onResetDemoData,
  hasCustomData,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-slate-900 tracking-tight">
                  Mi Control Fiscal
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  México
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Control financiero y fiscal para Personas Físicas
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Fiscal Year Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500 ml-2" />
              <select
                value={activeYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="bg-transparent text-sm font-semibold text-slate-800 px-2 py-1 focus:outline-none cursor-pointer"
                aria-label="Seleccionar ejercicio fiscal"
              >
                <option value={2024}>Ejercicio 2024</option>
                <option value={2025}>Ejercicio 2025</option>
                <option value={2026}>Ejercicio 2026</option>
              </select>
            </div>

            {/* Profile badge */}
            <div className="hidden md:flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {profile.taxName || 'Contribuyente'}
                </p>
                <p className="text-[11px] font-mono text-slate-500">
                  {profile.rfc ? `RFC: ${profile.rfc}` : 'Sin RFC registrado'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold border border-blue-200">
                {profile.taxName ? profile.taxName.charAt(0).toUpperCase() : 'C'}
              </div>
            </div>

            {/* Reset Demo Button */}
            <button
              onClick={onResetDemoData}
              title="Restablecer datos de demostración"
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restablecer Demo</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
