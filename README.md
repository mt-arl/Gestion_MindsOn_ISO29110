# 🎓 MindsOn — Sistema Integral de Gestión Académica y Financiera

Plataforma web empresarial diseñada para la administración académica, control de horarios, facturación SRI, cobranza de colegiaturas, control de morosidad y balance contable (Ingresos vs. Egresos) del instituto de inglés **MindsOn** (Quito, Ecuador).

> **🤖 NOTA PARA AGENTES DE IA / DESARROLLADORES**
>
> Este documento actúa como **fuente de verdad histórica y arquitectónica (Context Handoff)**. Contiene el mapa completo de archivos, reglas de negocio, esquema de base de datos, modelo de seguridad, decisiones técnicas tomadas y el estado de los ciclos de mejora continua **PDCA** (Plan-Do-Check-Act). **Lee las reglas de producción antes de ejecutar cualquier comando de base de datos.**

---

## ⚠️ REGLAS CRÍTICAS DE PRODUCCIÓN (LEER ANTES DE MODIFICAR)

1. **Base de Datos en Producción Viva (Supabase):**
   - El archivo `.env` apunta a la base de datos PostgreSQL de producción en Supabase con datos reales de alumnos, cursos y contabilidad.
   - **PROHIBIDO** ejecutar `prisma migrate reset`, `prisma db push --force-reset` o `--accept-data-loss`.
   - Todo cambio en `prisma/schema.prisma` debe ser **100% ADITIVO** (agregar columnas opcionales `NULL` o con `@default(...)`, o crear tablas nuevas sin destruir las existentes).
2. **Restricción de Archivos `'use server'` en Next.js 15:**
   - En cualquier archivo dentro de `src/actions/` que inicie con `'use server';`, **SOLO se pueden exportar funciones asíncronas (`export async function`)**.
   - **NUNCA** exportes constantes, objetos, esquemas Zod ni funciones síncronas desde un archivo `'use server'` (causa error 500 en runtime: `A "use server" file can only export async functions`). Coloca constantes y helpers compartidos en `src/lib/`.
3. **Despliegue en Vercel y Prisma Client:**
   - `package.json` incluye `"postinstall": "prisma generate"` y `"build": "prisma generate && next build"`. No elimines `prisma generate` del script de build, ya que Vercel cachea `node_modules` y fallará la verificación de tipos TypeScript si el esquema cambia.
4. **Protección Obligatoria de Server Actions:**
   - Toda nueva función exportada en `src/actions/` (excepto `loginAction` y `getSessionAction`) **debe** invocar `await requireAuth();` (de `@/lib/require-auth`) en su primera línea.

---

## 🛠️ 1. Stack Tecnológico

| Capa | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Framework Fullstack** | Next.js (App Router) | `15.5.x` (Server Components + Server Actions + Route Handlers) |
| **Librería UI** | React | `19.0.0` |
| **Lenguaje** | TypeScript | `5.8.x` (Tipado estricto, alias `@/* -> ./src/*`) |
| **Estilos** | Tailwind CSS | Diseño responsivo institucional con soporte de temas dinámicos |
| **Iconografía** | Lucide React | `lucide-react` |
| **ORM** | Prisma ORM | `6.4.x` / `6.19.x` |
| **Base de Datos** | PostgreSQL (Supabase) | Pooler transaccional PgBouncer (puerto `6543`) + Direct URL (puerto `5432`) |
| **Autenticación & Cripto** | `jose` + Web Crypto API | JWT `HS256` compatible con Edge Runtime + Hashing `SHA-256` con salt |
| **Testing de Carga** | Apache JMeter + Postman | Plan `.jmx` automatizado contra `/api/auth/login` |

---

## 📂 2. Arquitectura y Mapa Completo del Proyecto

```text
Gestion_MindsOn/
├── prisma/
│   ├── schema.prisma                    # Esquema relacional completo (10 modelos y 9 enums)
│   └── seed.ts                          # Script de semilla inicial
├── src/
│   ├── middleware.ts                    # Protección global de rutas en Edge Runtime
│   ├── app/                             # Rutas del App Router de Next.js 15
│   │   ├── layout.tsx                   # Layout raíz (Fuente Plus Jakarta Sans + Header)
│   │   ├── globals.css                  # Estilos globales y utilidades CSS
│   │   ├── page.tsx                     # Dashboard Principal (KPIs, Cobranzas, Balance Financiero)
│   │   ├── login/
│   │   │   └── page.tsx                 # Pantalla de Login institucional con "Recordarme"
│   │   ├── students/
│   │   │   └── page.tsx                 # Gestión de Estudiantes y Kardex Financiero
│   │   ├── classes/
│   │   │   └── page.tsx                 # Gestión de Cursos Grupales, Libros y Aulas
│   │   ├── schedule/
│   │   │   └── page.tsx                 # Calendario Semanal de Horarios y Clases Privadas
│   │   ├── teachers/
│   │   │   └── page.tsx                 # Directorio y Carga Horaria de Profesores
│   │   └── api/
│   │       └── auth/
│   │           └── login/
│   │               └── route.ts         # Endpoint HTTP REST (POST/GET) para Postman y JMeter
│   ├── actions/                         # Server Actions (Capa de Negocio y Persistencia)
│   │   ├── auth.ts                      # Login, Logout y consulta de sesión por cookies
│   │   ├── academic.ts                  # CRUD Alumnos, Cursos, Recesos y Generación de Cuotas
│   │   ├── finance.ts                   # Cobros, Recibos, Kardex, Mora, Desglose y Flujo de Caja
│   │   ├── expenses.ts                  # Egresos Fijos/Variables, Plantillas Recurrentes y Balance
│   │   ├── teachers.ts                  # CRUD Docentes y validación de asignaciones activas
│   │   ├── classrooms.ts                # CRUD Aulas físicas y virtuales
│   │   ├── books.ts                     # CRUD Libros dinámicos y auto-vinculación legacy
│   │   └── schedule.ts                  # Calendario semanal unificado y CRUD Clases Privadas
│   ├── components/                      # Componentes React (Vistas y Modales Interactivos)
│   │   ├── Header.tsx                   # Barra de navegación superior + Cierre de sesión
│   │   ├── MetricCards.tsx              # Tarjetas KPI financieras del Dashboard
│   │   ├── TuitionControlSection.tsx    # Tabla principal de cobros y control de morosidad
│   │   ├── PaymentModal.tsx             # Modal de cobro con datos fiscales SRI copiables
│   │   ├── PaymentReceiptModal.tsx      # Comprobante/Recibo digital imprimible y envío WhatsApp
│   │   ├── CourseFinanceBreakdown.tsx   # Desglose de recaudación por curso, libro y aula
│   │   ├── MonthlyCollectionHistorySection.tsx # Historial mensual de pagos recibidos
│   │   ├── FinancialBalanceSection.tsx  # Módulo P&G (Ingresos vs Egresos y Utilidad Neta)
│   │   ├── CreateExpenseModal.tsx       # Registro de gastos operativos
│   │   ├── EditExpenseModal.tsx         # Edición de gastos operativos
│   │   ├── RecurringExpensesModal.tsx   # Gestión de plantillas de gastos fijos mensuales
│   │   ├── StudentsView.tsx             # Vista general del directorio estudiantil
│   │   ├── CreateStudentModal.tsx       # Matrícula de estudiante + datos fiscales SRI
│   │   ├── EditStudentModal.tsx         # Edición de datos del alumno
│   │   ├── StudentFinancialHistoryModal.tsx # Kardex financiero histórico del estudiante
│   │   ├── ClassesView.tsx              # Vista de cursos grupales con filtros y estados
│   │   ├── CreateClassModal.tsx         # Creación de curso (Presencial solo Unit / Virtual Unit+Speaking)
│   │   ├── EditClassModal.tsx           # Edición de curso y horarios
│   │   ├── ClassDetailsModal.tsx        # Ficha detallada de curso y nómina de inscritos
│   │   ├── BooksModal.tsx               # Gestión CRUD de Libros y temas de color
│   │   ├── ClassroomsModal.tsx          # Gestión CRUD de Aulas y capacidades
│   │   ├── ScheduleView.tsx             # Grilla horaria semanal (07:00 - 21:00, Lun-Sáb)
│   │   ├── CreatePrivateClassModal.tsx  # Agendamiento de clase privada 1-a-1
│   │   ├── PrivateClassDetailsModal.tsx # Detalle y cambio de estado de clase privada
│   │   ├── TeachersView.tsx             # Vista de profesores y métricas de carga
│   │   ├── CreateTeacherModal.tsx       # Registro de docente con validador de cédula
│   │   └── EditTeacherModal.tsx         # Edición de docente
│   └── lib/                             # Utilidades, Criptografía, Validadores y Constantes
│       ├── prisma.ts                    # Cliente Singleton de Prisma ORM
│       ├── auth-token.ts                # Firma y verificación JWT (jose) para Edge y Node
│       ├── auth-service.ts              # Hashing SHA-256 con salt y auto-seed de Admin
│       ├── require-auth.ts              # Guardián de autorización para Server Actions
│       ├── classroom-conflicts.ts       # Detector de choques de horario en aulas físicas
│       ├── calendar-utils.ts            # Parser de cadenas de horario a bloques de calendario
│       ├── book-colors.ts               # Paletas visuales dinámicas para chips de libros
│       ├── ecuador-validators.ts        # Algoritmo Módulo 10 (Cédula EC) y links WhatsApp (+593)
│       ├── expense-constants.ts         # Etiquetas en español para categorías y métodos de pago
│       ├── tuition-billing.ts           # Emisión automática y control de mora
│       ├── tuition-dates.ts             # Calendario de vencimientos de Ecuador
│       └── utils.ts                     # Formateo USD, fechas es-EC y plantillas de cobro WhatsApp
```

---

## 🗄️ 3. Modelo de Datos (`prisma/schema.prisma`)

El esquema gestiona **10 entidades principales** en PostgreSQL:

```mermaid
erDiagram
    Classroom ||--o{ Class : "aloja"
    Classroom ||--o{ PrivateClass : "aloja"
    Book ||--o{ Class : "asigna nivel"
    Book ||--o{ PrivateClass : "asigna nivel"
    Teacher ||--o{ Class : "dicta Unit Class"
    Teacher ||--o{ Class : "dicta Speaking"
    Teacher ||--o{ PrivateClass : "dicta"
    Class ||--o{ Student : "tiene inscritos"
    Class ||--o{ TuitionFee : "genera cuotas"
    Student ||--o{ TuitionFee : "adeuda/paga"
    Student ||--o{ PrivateClass : "toma"
    TuitionFee ||--o{ Payment : "se liquida con"
    RecurringExpense ||--o{ Expense : "genera mensualmente"
```

### Detalle de Modelos Clave:
1. **`AdminUser` (`admin_users`)**: Usuarios administrativos con `email`, `passwordHash` (SHA-256 + salt) y `role` (`ADMIN`, `SUPERADMIN`).
2. **`Classroom` (`classrooms`)**: Aulas dinámicas (`name`, `capacity`, `location`, `isVirtual`, `isActive`). Las aulas virtuales (`isVirtual: true`) están exentas de bloqueos por cruce de horario.
3. **`Book` (`books`)**: Catálogo dinámico de libros/niveles (`name`, `shortName`, `levelsLabel`, `colorTheme`, `sortOrder`, `isActive`). Mantiene compatibilidad hacia atrás con el enum legacy `CourseBook`.
4. **`Teacher` (`teachers`)**: Profesores con `ci` única, datos de contacto y relaciones separadas para clases de gramática (`unitClasses`), conversación (`speakingClasses`) y clases particulares (`privateClasses`).
5. **`Class` (`classes`)**: Cursos regulares.
   - Modalidades (`ClassModality`): `VIRTUAL`, `PRESENCIAL`, `HIBRIDA`.
   - **Regla de negocio presencial:** Los cursos `PRESENCIAL` solo requieren profesor y horario de **Unit Class** (`speakingSchedule` y `speakingTeacherId` son opcionales). Los cursos `VIRTUAL` e `HIBRIDA` requieren tanto Unit Class como Speaking.
   - **Estados (`ClassStatus`)**: `ACTIVE`, `IN_RECESS` (en receso/pausa), `FINISHED`.
6. **`Student` (`students`)**:
   - Datos personales (`ci` opcional, `firstName`, `lastName`, `email`, `phone`, `guardianPhone1`, `guardianPhone2`, `age`, `gender`, `hasDisability`).
   - Datos académicos y arancelarios (`currentClassId`, `monthlyFee Decimal(10,2)`, `enrollmentDate`, `nextPaymentDate`, `status`).
   - **Módulo Fiscal SRI (Facturación Manual):** `invoiceIdType` (`CEDULA`, `RUC`, `PASAPORTE`, `CONSUMIDOR_FINAL`), `invoiceIdNumber`, `invoiceName`, `invoiceEmail`, `invoiceAddress`, `invoicePhone`.
7. **`PrivateClass` (`private_classes`)**: Clases personalizadas por hora con `studentId` (o nombre libre), `teacherId`, `date`, `startTime`, `endTime`, `classroomId`, `bookId`, `topic`, `chargeAmount` y `status` (`PROGRAMADA`, `COMPLETADA`, `CANCELADA`).
8. **`TuitionFee` (`tuition_fees`)**: Cuentas por cobrar mensuales. Restricción única `@@unique([studentId, classId, month, year])`. Estados: `PENDING`, `PAID`, `OVERDUE`.
9. **`Payment` (`payments`)**: Transacciones de cobro asociadas a un `TuitionFee`. Registra `amountPaid`, `paymentDate`, `registeredBy`, `notes` y `invoiceNumber` (N° de factura emitida en el portal del SRI).
10. **`RecurringExpense` (`recurring_expenses`) & `Expense` (`expenses`)**:
    - `RecurringExpense`: Plantillas de gastos fijos mensuales (`title`, `amount`, `category`, `dayOfMonth`, `paymentMethod`, `supplier`, `isActive`).
    - `Expense`: Desembolsos reales clasificados en `FIXED` o `VARIABLE` y por categoría (`RENT`, `UTILITIES`, `TEACHER_PAYROLL`, `MARKETING`, `SUPPLIES`, `SOFTWARE`, `MAINTENANCE`, `OTHER`).

---

## ⚙️ 4. Lógica de Negocio y Flujos Principales

### 4.1. Sistema de Autenticación y Seguridad
- **Auto-aprovisionamiento (`ensureAdminUserExists`):** Si se configuran `ADMIN_EMAIL` y `ADMIN_PASSWORD`, el sistema crea el usuario al iniciar sesión si todavía no existe. Se puede desactivar con `ADMIN_AUTO_PROVISION=false`.
- **Persistencia de Sesión:** Cookie HTTP-Only llamada `mindson_session`. Si el usuario marca *"Recordarme"*, el JWT y la cookie duran **30 días**; de lo contrario, **12 horas**.
- **Protección en 2 Capas:**
  1. `src/middleware.ts`: Protege todas las rutas visuales redirigiendo a `/login` si el token no es válido. Excluye `/api/*` y archivos estáticos.
  2. `src/lib/require-auth.ts`: Verifica la sesión dentro de las **43 funciones exportadas** en `src/actions/*` para impedir invocaciones RPC no autorizadas.
- **Endpoint REST para Pruebas (`/api/auth/login`):** Habilitado específicamente para pruebas funcionales en Postman y pruebas de carga/estrés en Apache JMeter. Recibe `{ email, password, rememberMe }` por `POST` y retorna código `200` con `{ success, token, user }` o `401` ante credenciales inválidas.

### 4.2. Emisión automática de mensualidades y recesos

- La primera cuota vence un mes después de la matrícula. Las siguientes vencen el mismo día de cada mes, en hora de Ecuador. Si el mes es más corto, se usa su último día.
- Al abrir cobranzas o el directorio de estudiantes, el sistema emite las cuotas del mes para estudiantes activos en cursos activos. Si pasan varios meses entre visitas, completa los periodos desde la última sincronización. Las cuotas se registran por separado y el saldo suma todas las impagas.
- Al incorporar estudiantes existentes, se empieza a emitir desde el mes en curso. Las cuotas anteriores se conservan y los vencimientos de cuotas abiertas del mes actual o posteriores se ajustan al día de matrícula.
- Durante el receso se suspende la emisión. Al reactivar el curso se retoma el calendario individual y se conservan las cuotas anteriores.

### 4.3. Detección de Conflictos de Aula (`src/lib/classroom-conflicts.ts`)
- Antes de crear o editar un curso regular (`Class`) o una clase privada (`PrivateClass`), el sistema parsea los días y rangos de horas (`src/lib/calendar-utils.ts`) y verifica que el aula física seleccionada no esté ocupada en ese mismo bloque horario.
- Si el aula tiene `isVirtual: true` (ej. Zoom), permite múltiples clases simultáneas sin restricción.

### 4.4. Facturación Manual SRI y Cobranzas (`src/actions/finance.ts`)
- Los administradores emiten las facturas electrónicas en el portal web del SRI de Ecuador.
- Al abrir `PaymentModal.tsx`, el sistema muestra una tarjeta destacada con los datos fiscales del alumno o su representante (RUC/Cédula, Razón Social, Correo, Dirección) y un botón de **"Copiar rápido"** para pegarlos en el portal del SRI, permitiendo registrar el `invoiceNumber` resultante junto con el pago.
- Al confirmar el cobro, se abre automáticamente `PaymentReceiptModal.tsx`, generando un recibo digital foliado (`REC-YYYY-XXXXXX`) listo para imprimir en PDF o enviar por WhatsApp al estudiante.

### 4.5. Gastos Fijos Recurrentes y Balance P&G (`src/actions/expenses.ts`)
- El módulo financiero compara en tiempo real lo recaudado por colegiaturas (`Payment`) frente a los gastos operativos (`Expense`).
- La función `syncMonthlyRecurringExpenses(month, year)` revisa las plantillas activas en `RecurringExpense` y crea automáticamente los registros de gasto del mes correspondiente si aún no han sido generados, evitando duplicados mediante la clave foránea `recurringExpenseId`.

---

## 🔄 5. Historial del Ciclo PDCA y Estado de Mejoras

El proyecto ha sido sometido a una auditoría integral de calidad de software (53 archivos inspeccionados) bajo la metodología **PDCA (Planificar, Hacer, Verificar, Actuar)**:

### ✅ Completado en el Código Actual:
1. **PDCA Ciclo 1 — Seguridad y Control de Acceso (Prioridad P0):**
   - Extracción de credenciales maestras a variables de entorno (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
   - Inicialización *lazy* de `JWT_SECRET` en `src/lib/auth-token.ts` para evitar fallos en tiempo de compilación (`next build`).
   - Corrección de validación en `verifySessionToken` para rechazar payloads con `id` o `email` vacíos (prevención de bypass *truthy*).
   - Eliminación del fallback de contraseñas en texto plano en `verifyPassword`.
   - Creación e inyección de `await requireAuth()` en el **100% de las Server Actions (43 funciones en 7 archivos)**.
2. **Pruebas de Capacidad y Confiabilidad (JMeter / Postman):**
   - Creación del servicio compartido `src/lib/auth-service.ts` y del endpoint `POST /api/auth/login`.
   - El plan local `Gestion_MindsOn_Plan.jmx` y su archivo `credentials.csv` se mantienen fuera del repositorio junto con los resultados de carga.

### 📋 Pendiente de Aplicar en Próximos Ciclos (Backlog para Siguientes Agentes):
1. **PDCA Ciclo 2 — Integridad Financiera (Documentado, pendiente de aplicar en código):**
   - **Método de pago estructurado en `Payment`:** Actualmente `PaymentModal.tsx` concatena el método de pago entre corchetes dentro de `notes` (ej. `"[Transferencia Bancaria / QR] nota"`) y `src/actions/finance.ts` lo extrae con expresiones regulares (`/\[(.*?)\]/`). Se debe agregar la columna `paymentMethod PaymentMethod @default(TRANSFER)` al modelo `Payment`, migrar los datos históricos con SQL y eliminar el uso de regex en `registerPaymentAction`, `getPaymentReceiptDataAction` y `getMonthlyCollectionHistoryAction`.
   - **Precisión Decimal en Gastos:** Cambiar `amount Float` a `Decimal(10, 2)` en `Expense` y `RecurringExpense` para homologarlo con `Payment` y evitar errores de redondeo IEEE 754.
   - **Soporte de Pagos Parciales (Abonos):** Agregar el estado `PARTIAL` a `TuitionFeeStatus` para que abonos menores al total de la cuota no la marquen como `PAID` inmediatamente, sino que calculen el saldo pendiente (`amount - SUM(payments.amountPaid)`).
   - **Desacoplar sincronización de lectura:** Separar `syncMonthlyRecurringExpenses` de `getMonthlyFinancialBalanceAction` para que una consulta de lectura no mute la base de datos en llamadas concurrentes.
2. **PDCA Ciclo 3 — Rendimiento y Zona Horaria:**
   - Estandarizar el manejo de fechas con zona horaria de Ecuador (`America/Guayaquil` / `UTC-5`) para evitar desfases de 1 día cuando se parsean cadenas `YYYY-MM-DD` en medianoche UTC.
   - Añadir validación de cruce de horarios para docentes (actualmente solo se valida colisión de aulas físicas).

---

## 🚀 6. Instalación, Variables de Entorno y Comandos

### Variables de Entorno (`.env`)
```env
# Conexión Pooler de Supabase (Puerto 6543 - Usado por la app en runtime)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Conexión Directa de Supabase (Puerto 5432 - Usado por Prisma para migraciones/esquema)
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:5432/postgres"

# Seguridad y Autenticación (Recomendado en Producción / Vercel)
JWT_SECRET="reemplazar-con-clave-secreta-segura-de-32-bytes"
ADMIN_EMAIL="admin@example.test"
ADMIN_PASSWORD="reemplazar-con-una-contraseña-única"
ADMIN_NAME="Administrador MindsOn"
```

### Comandos Disponibles
```bash
# Instalar dependencias (ejecuta automáticamente 'prisma generate' vía postinstall)
npm install

# Iniciar servidor de desarrollo en http://localhost:3000
npm run dev

# Verificar tipos de TypeScript sin emitir archivos
npx tsc --noEmit

# Compilar para producción (ejecuta 'prisma generate && next build')
npm run build

# Sincronizar cambios aditivos del esquema con Supabase
npm run db:push

# Abrir explorador visual de base de datos en http://localhost:5555
npm run db:studio

# Ejecutar pruebas de carga con Apache JMeter (con el servidor corriendo en puerto 3000)
jmeter -n -t Gestion_MindsOn_Plan.jmx -l resultados.jtl -e -o reporte_dashboard_html
```
