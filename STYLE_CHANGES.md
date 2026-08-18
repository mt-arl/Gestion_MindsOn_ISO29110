# Resumen de Cambios de Estilos - MindsOn

Este documento detalla todas las modificaciones y mejoras estéticas realizadas en el sistema de gestión de **MindsOn** para lograr una interfaz moderna, limpia y de nivel profesional.

---

## 1. Tipografía y Estilo Base

### [layout.tsx](file:///Users/matt/Desktop/Gestion_MindsOn/src/app/layout.tsx)
- **Tipografía principal:** Se sustituyó la fuente del sistema por **Plus Jakarta Sans**, cargando los pesos del `400` al `800` (Regular, Medium, SemiBold, Bold, ExtraBold).
- Se configuró la variable CSS `--font-sans` en el elemento HTML base para propagar la tipografía a todo el árbol DOM de forma óptima.

### [tailwind.config.ts](file:///Users/matt/Desktop/Gestion_MindsOn/tailwind.config.ts)
- **Extensión del tema:** Se configuró el valor `sans` de `fontFamily` para usar prioritariamente la variable `--font-sans` antes del fallback estándar de `sans-serif`. Esto permite usar la clase `font-sans` de Tailwind de forma transparente.

### [globals.css](file:///Users/matt/Desktop/Gestion_MindsOn/src/app/globals.css)
- **Modificación del color base de texto:** Se cambió el tono de la tipografía general de `#0f172a` (Slate 900) a un azul marino oscuro `#0d1527` para darle mayor profundidad y elegancia al texto.
- **Scrollbar personalizado:** Se implementaron barras de desplazamiento más delgadas (8px) y semitransparentes en colores grisáceos (`rgba(148, 163, 184, 0.3)`) para evitar el scrollbar tosco predeterminado por el navegador Chrome/Safari.
- **Efecto de Pulso LED (glow-active):** Se creó una animación mediante keyframes en CSS (`glow-pulse`) que genera un destello luminoso alrededor del elemento. Esto se utiliza principalmente en el indicador de "Super Admin" y en las etiquetas de alerta por mora.

---

## 2. Rediseño del Header ([Header.tsx](file:///Users/matt/Desktop/Gestion_MindsOn/src/components/Header.tsx))
- **Efecto cristalino:** Se añadió `bg-white/70 backdrop-blur-md` junto con un borde inferior muy difuso (`border-slate-200/50`), permitiendo ver el contenido flotando detrás al hacer scroll.
- **Navegación tipo píldora:** Se encapsularon los enlaces del menú dentro de un contenedor con fondo gris atenuado (`bg-slate-100/50`) y esquinas redondeadas (`rounded-2xl`).
- **Estados activos animados:** Los enlaces activos ahora tienen un fondo blanco sólido, tipografía en color azul añil y una sombra difusa que da sensación de relieve (`shadow-[0_2px_8px_-1px_rgba(79,70,229,0.08)]`).
- **Botón masivo "Emitir Cuotas":** Se cambió el color azul estándar por un tono añil pastel refinado (`bg-indigo-50/70 text-indigo-700 border-indigo-200/40`) con micro-interacciones de escala (`hover:scale-[1.02] active:scale-[0.98]`).

---

## 3. Tarjetas e Indicadores del Dashboard ([MetricCards.tsx](file:///Users/matt/Desktop/Gestion_MindsOn/src/components/MetricCards.tsx))
- **Efecto de profundidad:** Las tarjetas de métricas pasaron de tener bordes planos a bordes con degradados internos y sombras muy suaves basadas en su estado.
- **Colores acentuados:**
  - **Recaudado:** Contenedor y bordes con tintes esmeralda (`border-emerald-100` y sombras verdes sutiles).
  - **Pendiente:** Contenedor y bordes en color añil.
  - **Mora:** Borde destacado en color rosa coral (`border-rose-200`) y sombra difusa roja (`shadow-[0_4px_20px_rgba(244,63,94,0.06)]`).
- **Hovers dinámicos:** Al pasar el cursor por encima de cualquier tarjeta, esta se eleva suavemente hacia arriba (`hover:-translate-y-1`) y expande su sombra paralela para denotar interactividad.

---

## 4. Tabla de Cuotas y Filtros ([TuitionControlSection.tsx](file:///Users/matt/Desktop/Gestion_MindsOn/src/components/TuitionControlSection.tsx))
- **Botones de filtro:** Se cambiaron los botones cuadrados por píldoras con un diseño más espaciado y dinámico. Al estar activos, cuentan con una sombra tridimensional suave de su respectivo color (ej. `shadow-rose-600/15`).
- **Estructura de la tabla:** Se encapsuló la tabla en un contenedor redondeado con sombra difusa perimetral (`shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] border-slate-200/80`).
- **Avatares LED:** Los avatares con las iniciales de los alumnos cuentan ahora con un punto circular absoluto en la esquina inferior derecha que actúa como indicador de estado lumínico (Verde = Al día, Amarillo = Pendiente, Rojo = Mora).
- **Botones de Pago:** El botón principal para registrar cobros cuenta ahora con un degradado dinámico (`from-emerald-500 to-emerald-600`) y sombra luminosa verde.

---

## 5. Vista de Estudiantes ([StudentsView.tsx](file:///Users/matt/Desktop/Gestion_MindsOn/src/components/StudentsView.tsx))
- **Selects Premium:** El selector de clases tiene ahora un borde más definido, tipografía en negrita y un estado de enfoque brillante (`focus:ring-4 focus:ring-indigo-500/10`).
- **Botones de acción:** Los botones "Kardex" y "Editar" se convirtieron en elementos con esquinas suavizadas (`rounded-xl`), fondo de color de baja saturación y cambios de escala instantáneos al hacer click.

---

## 6. Vista de Clases ([ClassesView.tsx](file:///Users/matt/Desktop/Gestion_MindsOn/src/components/ClassesView.tsx))
- **Tarjetas de clases:** Se reorganizaron los elementos de información en las tarjetas para maximizar la legibilidad:
  - **Modo de clase:** Las etiquetas de modalidad (Virtual, Híbrido, Presencial) ahora tienen bordes de colores pastel y un pequeño icono alusivo al lado.
  - **Capacidad:** El contador de alumnos activos se rediseñó dentro de una pequeña burbuja gris con bordes definidos en la parte inferior.
  - **Precios:** El monto mensual ahora destaca en negrita extrema (`font-black`) y tono verde esmeralda.

---

## 7. Modales de Formulario ([PaymentModal.tsx](file:///Users/matt/Desktop/Gestion_MindsOn/src/components/PaymentModal.tsx))
- **Fondo de desenfoque denso:** Se oscureció el fondo translúcido del modal a un tono antracita (`bg-slate-950/45`) y se aumentó el desenfoque (`backdrop-blur-md`) para aislar visualmente el formulario.
- **Resumen en tarjetas:** La información del estudiante se estructuró dentro de un panel interno con textura gris suave y bordes translúcidos.
- **Campos de formulario:** Las áreas de texto y selectores se pulieron con esquinas más redondeadas (`rounded-xl`) y enfoque animado.
