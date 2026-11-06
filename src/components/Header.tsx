'use client';
import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  GraduationCap, 
  ShieldCheck, 
  Calendar, 
  Sparkles, 
  Users, 
  BookOpen, 
  LayoutDashboard,
  Menu,
  X,
  Clock,
  Layers,
  LogOut,
  Loader2
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { logoutAction } from '@/actions/auth';

export function Header() {
  const pathname = usePathname();
  const today = new Date();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, startLogoutTransition] = useTransition();

  if (pathname === '/login') return null;

  const navLinks = [
    {
      href: '/',
      label: 'Cobranzas & Finanzas',
      shortLabel: 'Cobranzas',
      icon: LayoutDashboard,
      isActive: pathname === '/',
    },
    {
      href: '/students',
      label: 'Estudiantes',
      shortLabel: 'Estudiantes',
      icon: Users,
      isActive: pathname.startsWith('/students'),
    },
    {
      href: '/classes',
      label: 'Cursos & Grupos',
      shortLabel: 'Cursos',
      icon: BookOpen,
      isActive: pathname.startsWith('/classes'),
    },
    {
      href: '/schedule',
      label: 'Horarios & Agenda',
      shortLabel: 'Horarios',
      icon: Calendar,
      isActive: pathname.startsWith('/schedule'),
    },
    {
      href: '/teachers',
      label: 'Docentes',
      shortLabel: 'Docentes',
      icon: GraduationCap,
      isActive: pathname.startsWith('/teachers'),
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 py-2.5 sm:px-6 lg:px-8">
          
          {/* 1. Official Brand Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="relative h-8 sm:h-9 w-32 sm:w-40 transition-transform duration-200 group-hover:scale-[1.02]">
              <Image
                src="/logo.png"
                alt="MindsOn Instituto de Inglés"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          {/* 2. Desktop Navigation Links (Visible on md+) */}
          <nav className="hidden md:flex items-center gap-1 rounded-2xl bg-slate-100/60 p-1 border border-slate-200/50 text-xs font-semibold text-slate-600">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all duration-150 ${
                    link.isActive
                      ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/60 font-bold scale-[1.01]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${link.isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{link.shortLabel}</span>
                </Link>
              );
            })}
          </nav>

          {/* 3. Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Date Badge (Hidden on mobile) */}
            <div className="hidden lg:flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-1.5 text-xs text-slate-600 border border-slate-200/60 font-medium">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span className="capitalize">{formatDate(today)}</span>
            </div>

            {/* Admin Badge & Logout */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-xl bg-slate-900 pl-2.5 pr-1 py-1 text-white shadow-xs border border-slate-800">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[10px] font-black uppercase text-slate-300">ADMIN</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 mr-0.5 shrink-0" />
              <button
                type="button"
                onClick={() => {
                  startLogoutTransition(async () => {
                    await logoutAction();
                  });
                }}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 text-slate-300 px-2 py-1 text-[10px] font-bold transition-all border border-slate-700/60 hover:border-rose-500/40 cursor-pointer disabled:opacity-60"
                title="Cerrar sesión"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-3 w-3 animate-spin text-rose-400" />
                ) : (
                  <LogOut className="h-3 w-3 text-slate-400 group-hover:text-rose-400" />
                )}
                <span>Salir</span>
              </button>
            </div>

            {/* Mobile Hamburger Button (Visible on < md) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden flex items-center justify-center rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60 transition-colors"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 4. Mobile Navigation Drawer / Slide-Over */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-4/5 max-w-xs bg-white shadow-2xl p-5 flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-250">
            
            <div className="space-y-5">
              {/* Drawer Header with Logo & Close */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="relative h-7 w-32">
                  <Image
                    src="/logo.png"
                    alt="MindsOn Logo"
                    fill
                    className="object-contain object-left"
                  />
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                        link.isActive
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${link.isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>

            </div>

            {/* Drawer Bottom Info & Logout */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  {formatDate(today)}
                </span>
                <span className="flex items-center gap-1 font-bold text-slate-700">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Admin
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  startLogoutTransition(async () => {
                    await logoutAction();
                  });
                }}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 py-2.5 text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                <span>Cerrar Sesión</span>
              </button>

              <p className="text-[10px] text-slate-400 text-center font-medium">
                MindsOn Instituto de Inglés • v1.0
              </p>
            </div>

          </div>
        </div>
      )}

    </>
  );
}
