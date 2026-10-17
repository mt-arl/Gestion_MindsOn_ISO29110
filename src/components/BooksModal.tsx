'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  BookOpen, 
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  Palette,
  ArrowUpDown
} from 'lucide-react';
import { 
  getBooksAction, 
  createBookAction, 
  updateBookAction, 
  deleteBookAction, 
  SerializedBook 
} from '@/actions/books';
import { 
  BOOK_COLOR_PALETTES, 
  AVAILABLE_BOOK_COLOR_THEMES, 
  getBookColorStyles 
} from '@/lib/book-colors';

interface BooksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBooksUpdated?: () => void;
}

export function BooksModal({ isOpen, onClose, onBooksUpdated }: BooksModalProps) {
  const [books, setBooks] = useState<SerializedBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [levelsLabel, setLevelsLabel] = useState('');
  const [colorTheme, setColorTheme] = useState('yellow');
  const [sortOrder, setSortOrder] = useState<number | string>(0);
  const [isActive, setIsActive] = useState(true);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadBooks = async () => {
    setIsLoading(true);
    try {
      const data = await getBooksAction(true);
      setBooks(data);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'No se pudieron cargar los libros.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBooks();
      setMessage(null);
      setIsFormOpen(false);
      setEditingId(null);
      setDeleteConfirmId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setShortName('');
    setLevelsLabel('');
    setColorTheme('yellow');
    setSortOrder(books.length + 1);
    setIsActive(true);
    setIsFormOpen(false);
    setDeleteConfirmId(null);
  };

  const handleStartCreate = () => {
    resetForm();
    setSortOrder(books.length + 1);
    setIsFormOpen(true);
    setMessage(null);
  };

  const handleStartEdit = (book: SerializedBook) => {
    setEditingId(book.id);
    setName(book.name);
    setShortName(book.shortName);
    setLevelsLabel(book.levelsLabel || '');
    setColorTheme(book.colorTheme || 'yellow');
    setSortOrder(book.sortOrder);
    setIsActive(book.isActive);
    setIsFormOpen(true);
    setDeleteConfirmId(null);
    setMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const cleanName = name.trim();
    const cleanShortName = shortName.trim();

    if (!cleanName || !cleanShortName) {
      setMessage({ type: 'error', text: 'El nombre completo y el nombre corto del libro son obligatorios.' });
      return;
    }

    startTransition(async () => {
      if (editingId) {
        // Actualizar
        const res = await updateBookAction(editingId, {
          name: cleanName,
          shortName: cleanShortName,
          levelsLabel: levelsLabel.trim() || null,
          colorTheme,
          sortOrder: Number(sortOrder) || 0,
          isActive,
        });

        if (res.success) {
          setMessage({ type: 'success', text: res.message });
          resetForm();
          await loadBooks();
          onBooksUpdated?.();
        } else {
          setMessage({ type: 'error', text: res.message });
        }
      } else {
        // Crear
        const res = await createBookAction({
          name: cleanName,
          shortName: cleanShortName,
          levelsLabel: levelsLabel.trim() || null,
          colorTheme,
          sortOrder: Number(sortOrder) || 0,
        });

        if (res.success) {
          setMessage({ type: 'success', text: res.message });
          resetForm();
          await loadBooks();
          onBooksUpdated?.();
        } else {
          setMessage({ type: 'error', text: res.message });
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    setMessage(null);
    startTransition(async () => {
      const res = await deleteBookAction(id);
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        setDeleteConfirmId(null);
        await loadBooks();
        onBooksUpdated?.();
      } else {
        setMessage({ type: 'error', text: res.message });
        setDeleteConfirmId(null);
      }
    });
  };

  const previewPalette = getBookColorStyles(colorTheme);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-xs">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                Gestión de Libros & Niveles
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Configura los libros académicos y su identidad visual
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Mensajes de Alerta */}
          {message && (
            <div className={`flex items-center gap-2.5 rounded-2xl p-3.5 text-xs font-bold border shadow-xs animate-in fade-in duration-150 ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span className="flex-1">{message.text}</span>
              <button 
                onClick={() => setMessage(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Botón para Abrir Formulario o Botón Cancelar */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Libros Registrados ({books.length})
            </p>

            {!isFormOpen ? (
              <button
                type="button"
                onClick={handleStartCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-sm shadow-indigo-600/20 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nuevo Libro</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar edición
              </button>
            )}
          </div>

          {/* Formulario Desplegable */}
          {isFormOpen && (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4.5 space-y-4 shadow-xs animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-indigo-100/70 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-extrabold text-indigo-950">
                    {editingId ? 'Editar Libro' : 'Crear Nuevo Libro'}
                  </span>
                </div>

                {/* Live Preview Chip */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Vista previa:</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-black border shadow-2xs ${previewPalette.badgeBg} ${previewPalette.badgeText} ${previewPalette.badgeBorder}`}>
                    <span className={`h-2 w-2 rounded-full shrink-0 ${previewPalette.dotColor}`} />
                    <span>{shortName.trim() || 'Ejemplo'}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Nombre Completo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre del Libro *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Libro Verde, Libro Kids A"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>

                {/* Nombre Corto / Chip */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Corto (Etiqueta Chip) *
                  </label>
                  <input
                    type="text"
                    required
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="Ej. Verde, Kids A"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Niveles que abarca */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Niveles que abarca (Opcional)
                  </label>
                  <input
                    type="text"
                    value={levelsLabel}
                    onChange={(e) => setLevelsLabel(e.target.value)}
                    placeholder="Ej. Level 3A / Level 3B, B1+"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>

                {/* Orden de Clasificación */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    <span>Orden</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Selector Visual de ColorTheme */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Color e Identidad Visual</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {AVAILABLE_BOOK_COLOR_THEMES.map((themeItem) => {
                    const isSelected = colorTheme === themeItem.theme;
                    return (
                      <button
                        key={themeItem.theme}
                        type="button"
                        onClick={() => setColorTheme(themeItem.theme)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all text-left ${
                          isSelected
                            ? 'border-indigo-600 bg-white shadow-xs ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className={`h-4 w-4 rounded-full shrink-0 shadow-2xs ${themeItem.dotColor}`} />
                        <span className={`truncate text-[11px] ${isSelected ? 'text-indigo-950 font-black' : 'text-slate-700'}`}>
                          {themeItem.label.split('/')[0].trim()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botones del Formulario */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-indigo-100/70">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isPending}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-black shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>{editingId ? 'Guardar Cambios' : 'Crear Libro'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Listado de Libros */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs font-bold text-slate-600">Cargando libros registrados...</p>
            </div>
          ) : books.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-8 text-center border border-slate-200">
              <BookOpen className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-700">No hay libros registrados</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Haz clic en &ldquo;Nuevo Libro&rdquo; para registrar el primero.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
              {books.map((b) => {
                const palette = getBookColorStyles(b.colorTheme);
                const isConfirmingDelete = deleteConfirmId === b.id;

                return (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Info Libro */}
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-2xs ${palette.badgeBg} ${palette.badgeBorder}`}>
                        <span className={`h-3.5 w-3.5 rounded-full ${palette.dotColor}`} />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900">
                            {b.name}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.2 text-[10px] font-black border ${palette.badgeBg} ${palette.badgeText} ${palette.badgeBorder}`}>
                            {b.shortName}
                          </span>
                          {!b.isActive && (
                            <span className="rounded-md bg-slate-100 text-slate-500 px-1.5 py-0.2 text-[10px] font-bold">
                              Inactivo
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                          {b.levelsLabel && (
                            <span>{b.levelsLabel}</span>
                          )}
                          {b.levelsLabel && <span>•</span>}
                          <span className={`font-semibold ${b.classesCount > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {b.classesCount} {b.classesCount === 1 ? 'curso asignado' : 'cursos asignados'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 sm:self-center self-end">
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-xl p-1 animate-in fade-in duration-150">
                          <span className="text-[10px] font-bold text-rose-800 px-1.5">¿Eliminar?</span>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDelete(b.id)}
                            className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 text-[10px] font-black transition-colors"
                          >
                            Sí, eliminar
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="rounded-lg bg-white border border-slate-200 text-slate-600 px-2 py-1 text-[10px] font-bold hover:bg-slate-100 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(b)}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 px-2.5 py-1.5 text-xs font-bold transition-all shadow-2xs"
                            title="Editar libro"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(b.id)}
                            className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Eliminar libro"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-3 shrink-0 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
