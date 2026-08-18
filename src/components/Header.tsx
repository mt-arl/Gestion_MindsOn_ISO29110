'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  GraduationCap, 
  ShieldCheck, 
  Calendar, 
  Sparkles, 
  Users, 
  BookOpen, 
  LayoutDashboard,
  CalendarDays
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { GenerateTuitionsModal } from './GenerateTuitionsModal';

export function Header() {
  const pathname = usePathname();
  const today = new Date();
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const navLinks = [
    {
      href: '/',
      label: 'Dashboard / Finanzas',
      icon: LayoutDashboard,
      isActive: pathname === '/',
    },
    {
      href: '/students',
      label: 'Estudiantes',
      icon: Users,
      isActive: pathname.startsWith('/students'),
    },
    {
      href: '/classes',
      label: 'Clases & Horarios',
      icon: BookOpen,
      isActive: pathname.startsWith('/classes'),
    },
    {
      href: '/teachers',
      label: 'Docentes',
      icon: GraduationCap,
      isActive: pathname.startsWith('/teachers'),
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/50 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          
          {/* Brand & Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-all duration-200">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                  Minds<span className="text-indigo-600 bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">On</span>
                </span>
                <span className="rounded-full bg-indigo-50/60 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-100 hidden sm:inline-block">
                  Instituto de Inglés
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Gestión Académica & Cobranzas
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 rounded-2xl bg-slate-100/50 p-1 border border-slate-200/40 text-xs font-semibold text-slate-600">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 transition-all duration-200 ${
                    link.isActive
                      ? 'bg-white text-indigo-600 shadow-[0_2px_8px_-1px_rgba(79,70,229,0.08)] border border-slate-200/50 font-bold scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/30'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${link.isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Section: Emitir Cuotas + Perfil */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Action Button: Emitir Cuotas */}
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/80 px-3.5 py-1.5 text-xs font-bold text-indigo-700 border border-indigo-200/40 transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              title="Generar masivamente las mensualidades del mes"
            >
              <CalendarDays className="h-3.5 w-3.5 text-indigo-600" />
              <span className="hidden md:inline">Emitir Cuotas</span>
            </button>

            {/* Date Badge */}
            <div className="hidden lg:flex items-center gap-2 rounded-xl bg-slate-50/80 px-3.5 py-1.5 text-xs text-slate-600 border border-slate-200/40">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span className="capitalize font-medium">{formatDate(today)}</span>
            </div>

            {/* Admin Badge */}
            <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 hover:bg-slate-900 px-3.5 py-1.5 text-white shadow-md shadow-slate-900/10 border border-slate-800 transition-all duration-200 hover:scale-[1.02]">
              <div className="h-2 w-2 rounded-full bg-emerald-400 glow-active" />
              <div className="text-left hidden sm:block">
                <p className="text-[10px] font-extrabold tracking-wider leading-none text-slate-300">ADMIN</p>
                <p className="text-[9px] font-bold text-slate-500 tracking-tight leading-none mt-0.5">SUPERADMIN</p>
              </div>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
        </div>
      </header>

      {/* Modal de emisión masiva */}
      <GenerateTuitionsModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
      />
    </>
  );
}
