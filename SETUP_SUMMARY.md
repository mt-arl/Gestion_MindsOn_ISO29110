# 📘 MindsOn - Documentación de Inicialización y Arquitectura

Este documento detalla todas las configuraciones, decisiones de arquitectura, modelado de base de datos y scripts implementados durante la fase de inicialización del sistema de **Gestión Académica y Control de Pagos / Morosidad** del instituto de inglés **MindsOn**.

---

## 1. 🚀 Stack Tecnológico y Entorno

- **Framework Web:** [Next.js 15](https://nextjs.org/) (App Router, React 19, Server Components).
- **Lenguaje:** [TypeScript 5.8](https://www.typescriptlang.org/) con tipado estricto y alias de rutas `@/*`.
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/) + estructura compatible con componentes Shadcn/ui.
- **ORM:** [Prisma ORM v6](https://www.prisma.io/) con soporte nativo de TypeScript.
- **Base de Datos:** [PostgreSQL en Supabase](https://supabase.com/) con arquitectura dual de conexiones (Pooler + Direct).
- **Ejecución de Scripts:** [tsx](https://github.com/privatenumber/tsx) para ejecutar scripts TypeScript sin compilación previa.

---

## 2. 🗂️ Estructura del Proyecto Creada

```text
Gestion_MindsOn/
├── .env                  # Variables de entorno locales (protegido por .gitignore)
├── .env.example          # Plantilla documentada de variables de conexión
├── .gitignore            # Exclusión de credenciales, node_modules y artefactos
├── package.json          # Dependencias, scripts de Prisma y configuración de seed
├── tsconfig.json         # Configuración estricta de TypeScript con paths "@/*"
├── prisma/
│   ├── schema.prisma     # Modelos, enums, índices y relaciones relacionales
│   └── seed.ts           # Script de datos iniciales con 3 casos de mensualidad
└── src/
    ├── app/
    │   ├── globals.css   # Importación y temas de Tailwind CSS
    │   ├── layout.tsx    # Root layout con metadatos y configuración de idioma
    │   └── page.tsx      # Landing/Dashboard inicial de MindsOn
    └── lib/
        └── prisma.ts     # Cliente singleton de Prisma para Next.js (Fast Refresh)
```

---

## 3. ⚙️ Configuraciones de Conexión (Supabase + Prisma)

Se implementó el soporte para la arquitectura de conexión recomendada por Supabase en entornos Serverless / Next.js:

1. **`DATABASE_URL` (Puerto 6543 / PgBouncer - Supavisor):**
   - Utilizado en runtime por Next.js para gestionar conexiones eficientes con pooling transaccional (`?pgbouncer=true`).
2. **`DIRECT_URL` (Puerto 5432 / PostgreSQL Directo):**
   - Utilizado exclusivamente por `prisma migrate` para operaciones DDL (Data Definition Language), creación de tablas, índices y enums que requieren conexión directa.

---

## 4. 🗄️ Modelado de Entidades (`prisma/schema.prisma`)

### Enums
- **`AdminRole`**: `ADMIN`, `SUPERADMIN`.
- **`StudentStatus`**: `ACTIVE`, `INACTIVE`, `DROPPED`, `GRADUATED`.
- **`ClassModality`**: `VIRTUAL`, `PRESENCIAL`.
- **`TuitionFeeStatus`**: `PENDING`, `PAID`, `OVERDUE`.

### Entidades y Relaciones
1. **`AdminUser`**:
   - `id` (cuid), `name`, `email` (único), `passwordHash`, `role`, timestamps.
2. **`Teacher`**:
   - `id` (cuid), `ci` (único, indexado), `firstName`, `lastName`, `email` (único), `phone`.
   - Relación 1:N como profesor titular (`PrimaryTeacherClasses`).
   - Relación 1:N como profesor asistente (`AssistantTeacherClasses`).
3. **`Class`**:
   - `id` (cuid), `code` (único, ej. `ENG-A1-VIRTUAL`), `name`, `modality`, `schedule`, `monthlyPrice` (`Decimal(10,2)`).
   - `primaryTeacherId` (obligatorio, `onDelete: Restrict`).
   - `assistantTeacherId` (opcional, `onDelete: SetNull`).
4. **`Student`**:
   - `id` (cuid), `ci` (único, indexado), `firstName`, `lastName`, `email` (único), `phone`.
   - `guardianPhone1`, `guardianPhone2` (contactos de emergencia/tutores).
   - `age`, `gender`, `address`, `status` (indexado).
   - `currentClassId` (relación N:1 con `Class`, `onDelete: SetNull`).
5. **`TuitionFee` (Mensualidades / Cuentas por Cobrar)**:
   - `id` (cuid), `studentId`, `classId`, `month` (1-12), `year`, `dueDate`, `amount` (`Decimal(10,2)`), `status`.
   - Restricción de unicidad: `@@unique([studentId, classId, month, year])` para evitar duplicación de cobro por periodo.
6. **`Payment` (Registro de Transacciones)**:
   - `id` (cuid), `tuitionFeeId` (`onDelete: Cascade`), `amountPaid` (`Decimal(10,2)`), `paymentDate` (`now()`), `registeredBy`, `notes`.

---

## 5. 🛡️ Patrón Singleton de Prisma (`src/lib/prisma.ts`)

Para evitar que Next.js agote el pool de conexiones durante el desarrollo debido a Hot Module Replacement (HMR), se configuró una instancia global reutilizable en `globalThis`:

```typescript
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
```

---

## 6. 🌱 Script de Semilla (`prisma/seed.ts`)

El script puebla la base de datos de manera limpia e idempotente con los siguientes datos:

| Tipo | Registro | Detalle |
| :--- | :--- | :--- |
| **Admin** | `admin@mindson.edu` | Rol: `SUPERADMIN` |
| **Profesor 1** | Lic. Roberto Gómez | Titular en clase Virtual |
| **Profesor 2** | Prof. Diana Mendoza | Titular en clase Presencial |
| **Clase 1** | `ENG-A1-VIRTUAL` | Modalidad Virtual, Precio: **$50.00** |
| **Clase 2** | `ENG-B2-PRESENCIAL` | Modalidad Presencial, Precio: **$70.00** |
| **Estudiante 1** | Carlos Mendoza | Mensualidad mes actual **PAID** (pago de $50.00 registrado por transferencia). |
| **Estudiante 2** | Valeria Rojas | Mensualidad mes actual **PENDING** (vence en fecha futura). |
| **Estudiante 3** | Mateo Fernández | Mensualidad **OVERDUE** (fecha vencida para validar alertas de morosidad). |

---

## 7. 💻 Comandos del Proyecto

| Comando | Acción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo en `http://localhost:3000` |
| `npm run build` | Compila la aplicación Next.js para producción |
| `npm run db:migrate` | Crea y ejecuta migraciones de base de datos (`prisma migrate dev`) |
| `npm run db:seed` | Ejecuta el script de semilla con `tsx prisma/seed.ts` |
| `npm run db:generate` | Genera y actualiza los tipos del cliente Prisma (`prisma generate`) |
| `npm run db:studio` | Abre la interfaz visual de Prisma Studio en `http://localhost:5555` |
| `npm run db:push` | Aplica el esquema directamente a la BD sin crear historial de migración |

---

## 8. 📋 Guía Rápida de Puesta en Marcha

1. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   # Editar .env con tus credenciales reales de Supabase
   ```

2. **Aplicar la migración inicial:**
   ```bash
   npm run db:migrate -- --name init
   ```

3. **Cargar datos de prueba:**
   ```bash
   npm run db:seed
   ```

4. **Verificar en Prisma Studio:**
   ```bash
   npm run db:studio
   ```

5. **Lanzar la aplicación:**
   ```bash
   npm run dev
   ```
