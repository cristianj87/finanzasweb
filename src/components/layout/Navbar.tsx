import React from 'react';
import { TaxProfile } from '../../types';
import {
  FileText,
  User,
  LogOut,
  Calendar,
  Sparkles,
  Database,
  Trash2,
  CheckCircle,
} from 'lucide-react';

interface NavbarProps {
  profile: TaxProfile | null;
  activeYear: number;
  onYearChange: (year: number) => void;
  userEmail?: string | null;
  onLogout: () => void;
  isDemoActive: boolean;
  onLoadDemo: () => void;
  onClearDemo: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  activeYear,
  onYearChange,
  userEmail,
  onLogout,
  isDemoActive,
  onLoadDemo,
  onClearDemo,
  onOpenSettings,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-900 via-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-900/10">
            <FileText className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">Mi Control Fiscal</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                México
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Control contable y preparación fiscal personal</p>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-3">
          {/* Fiscal Year Selector */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
            <select
              value={activeYear}
              onChange={e => onYearChange(Number(e.target.value))}
              aria-label="Seleccionar ejercicio fiscal"
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value={2026}>Ejercicio 2026</option>
              <option value={2025}>Ejercicio 2025</option>
              <option value={2024}>Ejercicio 2024</option>
            </select>
          </div>

          {/* Demo Data button */}
          {isDemoActive ? (
            <button
              onClick={onClearDemo}
              title="Eliminar los datos de demostración cargados"
              className="hidden md:flex items-center gap-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl hover:bg-rose-100 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar datos DEMO</span>
            </button>
          ) : (
            <button
              onClick={onLoadDemo}
              title="Cargar un contribuyente de ejemplo para probar la app"
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Cargar datos DEMO</span>
            </button>
          )}

          {/* User profile dropdown pill */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-2 text-left p-1.5 rounded-xl hover:bg-slate-100 transition"
              title="Ver configuración fiscal"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-800 flex items-center justify-center font-bold text-xs">
                {profile?.taxName ? profile.taxName.slice(0, 2).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="hidden lg:block">
                <span className="text-xs font-bold text-slate-800 block truncate max-w-[130px]">
                  {profile?.taxName || 'Mi Perfil'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  {profile?.rfc || 'Sin RFC registrado'}
                </span>
              </div>
            </button>

            {userEmail ? (
              <button
                onClick={onLogout}
                title="Cerrar sesión de Google"
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
