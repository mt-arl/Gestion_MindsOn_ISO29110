# MindsOn - Sistema de Gestión Académica y Control de Pagos / Morosidad

Sistema web para el instituto de inglés **MindsOn**, desarrollado con **Next.js (App Router, TypeScript, Tailwind CSS)** y **Prisma ORM** sobre **PostgreSQL (Supabase)**.

---

## 📖 Documentación

Para ver el desglose completo de la arquitectura, decisiones de diseño, modelos de base de datos y scripts de inicialización, consulta el archivo:
- 👉 [**`SETUP_SUMMARY.md`**](./SETUP_SUMMARY.md)

---

## 🚀 Inicio Rápido

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   # Configura DATABASE_URL (puerto 6543) y DIRECT_URL (puerto 5432) de Supabase
   ```

3. **Ejecutar migraciones y semilla:**
   ```bash
   npm run db:migrate -- --name init
   npm run db:seed
   ```

4. **Iniciar en desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.