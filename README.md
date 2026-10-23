# Rami Mora — Preguntas para el encuentro

Interfaz pública y panel de anfitrión, alojables en Render con Node.js 22 o superior. No requiere dependencias para ejecutar. `app.js` contiene la interfaz compilada; `Home.tsx`, `Admin.tsx` y `main.tsx` son sus fuentes React.

## Despliegue

- Runtime: Node
- Build: `node --check server.mjs`
- Start: `node server.mjs`
- Health: `/healthz`
- Variable de entorno obligatoria: `QUESTIONS_BACKEND_URL` (origen HTTPS del servicio existente de preguntas).

La interfaz usa exclusivamente rutas del mismo dominio. El servidor contacta la API existente, que conserva su base de datos durable y verifica la clave de administración. Esta publicación no migra la base de datos ni almacena preguntas en el disco efímero de Render. No se incluyen claves, consultas ni la dirección de almacenamiento en este repositorio.

La instancia gratuita de Render puede suspenderse tras inactividad y tardar en arrancar. Las cuotas de uso se comparten con los otros servicios del espacio.

Para recompilar la interfaz, usar React 19, React DOM 19 y esbuild con entrada `main.tsx`, bundle de navegador IIFE, JSX automático, salida `app.js` y NODE_ENV=production.
