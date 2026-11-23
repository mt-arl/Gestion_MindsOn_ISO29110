# 🔄 Ciclo PDCA — Plataforma MindsOn English Institute

**Proyecto:** Sistema de Gestión Académica y Financiera MindsOn  
**Stack:** Next.js 15 (App Router) · React 19 · Prisma ORM · PostgreSQL (Supabase) · Tailwind CSS  
**Fecha de Auditoría:** 19 de octubre de 2026  
**Archivos Auditados:** 53 de 53 (100%)  

---

## 📊 Calificación Global del Sistema: **2.88 / 5.00**

| Categoría | Calificación | Estado | Impacto |
| :--- | :---: | :---: | :--- |
| **Seguridad & Autenticación** | **1.5 / 5** | 🚨 CRÍTICO (P0) | Credenciales en texto plano; JWT bypass; Server Actions sin verificación de sesión |
| **Integridad de Datos & Finanzas** | **2.5 / 5** | ⚠️ ALTO (P1) | `Float` vs `Decimal` en egresos; pagos parciales corrompen cuotas; regex frágil |
| **Rendimiento & Concurrencia** | **2.8 / 5** | ⚠️ ALTO (P1) | N+1 en cuotas masivas; race conditions en aulas; desfases UTC-5 |
| **UX & Accesibilidad (a11y)** | **3.2 / 5** | 🟡 MODERADO (P2) | Cero `error.tsx`/`loading.tsx`; filtros hardcodeados; sin focus trap en modales |
| **Calidad de Código** | **3.5 / 5** | 🟡 MODERADO (P2) | Colisión Tailwind v3/v4; placeholder Bolivia (+591); cédulas consulares rechazadas |
| **Funcionalidades Faltantes** | **2.8 / 5** | 🟡 MODERADO (P2) | Sin RBAC; sin abonos/saldos parciales; sin validador RUC; sin cruce docentes |

---

## 🟢 DO (Hacer) — Ciclo 1 Completado: Seguridad (P0)

| # | Acción | Estado | Archivo(s) | Detalle |
|---|--------|:---:|-----------|---------|
| 1 | Mover credenciales a variables de entorno | ✅ | `src/lib/auth-service.ts` | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` leídos de env vars con defaults seguros |
| 2 | JWT Secret con lazy init + warning en producción | ✅ | `src/lib/auth-token.ts` | Inicialización lazy para no romper build; warning en consola si falta en prod |
| 3 | Corregir `verifySessionToken` | ✅ | `src/lib/auth-token.ts` | Retorna `null` si `id` o `email` están vacíos → elimina bypass truthy |
| 4 | Crear helper `requireAuth()` | ✅ | `src/lib/require-auth.ts` | Verifica cookie HTTP-Only, retorna `SessionPayload` o lanza error `NO_AUTH` |
| 5 | Proteger las 7 Server Actions (43 funciones) | ✅ | Todos en `src/actions/` | **43/43 funciones** con `await requireAuth()` verificado; `npm run build` ✓ |
| 6 | Eliminar fallback de texto plano en contraseñas | ✅ | `src/lib/auth-service.ts` | Solo SHA-256 (salted + unsalted legacy). Sin comparación directa |
| 7 | Suite de Pruebas Unitarias ISO/IEC 29110 | ✅ | `src/__tests__/iso29110-security-auth.test.ts` | 11 pruebas unitarias y de integración (`11 pass, 0 fail`) |
