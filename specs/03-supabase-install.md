# 03 - Supabase (instalación)

**Estado:** Implementado
**Dependencias:** Ninguna
**Fecha:** 2026-08-03

**Objetivo:** Instalar y configurar el SDK de Supabase (`@supabase/supabase-js` + `@supabase/ssr`) en el proyecto, con un cliente de navegador y un cliente de servidor y las variables de entorno necesarias, sin crear tablas, migraciones, ni consumir Supabase desde ninguna pantalla todavía.

## Alcance

### Incluye

- Instalar los paquetes `@supabase/supabase-js` y `@supabase/ssr` como dependencias en `package.json`.
- Crear `lib/supabase/client.ts` — cliente de navegador (`createBrowserClient`) para Client Components.
- Crear `lib/supabase/server.ts` — cliente de servidor (`createServerClient`, usando `cookies()` de `next/headers`) para Server Components.
- Agregar a `.env.local` las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, con los valores reales del proyecto Supabase ya provisto (obtenidos vía el MCP de Supabase: URL del proyecto y la publishable key `sb_publishable_...`).

### No incluye

- Ninguna tabla, esquema o migración SQL — queda para un spec futuro.
- `proxy.ts` ni ninguna lógica de refresco de sesión de auth — queda para el spec que implemente autenticación real.
- Autenticación real: `lib/user-context.tsx` sigue igual que hoy (mock vía `localStorage`).
- Consumo de Supabase desde ninguna pantalla o componente existente (Biblioteca, Detalle, Reproductor, Auth, Salón, Home) — ninguno de esos archivos se toca en este spec.
- Lógica de redirect en rutas protegidas / flujo de login.
- Supabase CLI local (`supabase init`, `supabase/config.toml`) — se descartó explícitamente al definir el alcance.

## Modelo de datos

No aplica. Este spec no introduce datos nuevos (no hay tablas, esquemas ni tipos de dominio).

## Plan de implementación

Cada paso deja la app funcional y compilable (`npm run dev` / `npm run build` sin errores).

1. **Instalar dependencias.** `npm install @supabase/supabase-js @supabase/ssr`.

2. **Variables de entorno.** Agregar a `.env.local` (que ya existe con `SUPABASE_DB_PASSWORD`):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://sfifdojgcfvdnadojqmq.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   (valores reales del proyecto ya provisto, obtenidos vía el MCP de Supabase).

3. **Cliente de navegador (`lib/supabase/client.ts`).** Función `createClient()` que llama a `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)`, siguiendo el patrón oficial de la guía SSR de Supabase.

4. **Cliente de servidor (`lib/supabase/server.ts`).** Función async `createClient()` que llama a `createServerClient(...)` leyendo/escribiendo cookies vía `cookies()` de `next/headers`, con el `try/catch` en `setAll` documentado por Supabase (silencioso porque no hay proxy de refresco en este spec).

5. **Verificación.** Correr `npm run build` y `npm run lint`; confirmar que ambos archivos de cliente compilan sin errores de tipos y que ninguna otra pantalla quedó afectada (no debería haber diffs fuera de `package.json`, `package-lock.json`, `.env.local`, y los dos archivos nuevos en `lib/supabase/`).

## Criterios de aceptación

- [ ] `@supabase/supabase-js` y `@supabase/ssr` figuran en `package.json` como dependencias.
- [ ] `lib/supabase/client.ts` existe y exporta una función que crea un cliente de navegador con `createBrowserClient`.
- [ ] `lib/supabase/server.ts` existe y exporta una función async que crea un cliente de servidor con `createServerClient`, usando `cookies()` de `next/headers`.
- [ ] `.env.local` contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con los valores reales del proyecto Supabase ya provisto.
- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] Ninguna pantalla o componente existente (`app/**`, `components/**`, `lib/games-data.ts`, `lib/user-context.tsx`) queda modificado — el único cambio funcional es la disponibilidad de los dos clientes en `lib/supabase/`.
- [ ] No existe ningún archivo `proxy.ts`, ninguna migración SQL, ni ninguna tabla creada en Supabase como parte de este spec.

## Decisiones tomadas y descartadas

- **Alcance acotado a solo instalación (paquete + env vars), sin migraciones ni tablas.** Se descartó expandir a esquema de datos o persistencia de puntuaciones — quedan para specs futuros, cuando se decida qué parte de la app pasa a usar datos reales.

- **`@supabase/ssr` (cliente de navegador + servidor) en vez de `@supabase/supabase-js` simple.** Se eligió pensando en que probablemente se agregue autenticación real más adelante, evitando tener que migrar de patrón de cliente en ese momento.

- **Publishable key moderna (`sb_publishable_...`) en vez de anon key legacy (JWT).** Es el formato que Supabase recomienda actualmente para proyectos nuevos; la legacy sigue funcionando pero está marcada como en camino de deprecación.

- **`proxy.ts` (refresco de sesión) queda fuera de este spec.** Su única función es refrescar tokens de auth existentes; como todavía no hay ningún flujo de autenticación real que genere sesiones, no cumpliría ninguna función hoy. Se agrega en el spec que implemente auth real.

- **Verificación solo por build/lint + chequeo de tipos, sin llamada real de conectividad a Supabase.** No hay funcionalidad que probar todavía, así que se descartó agregar código temporal solo para confirmar la conexión.

- **Sin Supabase CLI local (`supabase init`).** El proyecto real ya vive en la nube y ya está conectado vía el MCP de Supabase; no hace falta un stack local para este alcance.

## Riesgos identificados

- **Usar por error la `secret key` o `SUPABASE_DB_PASSWORD` en una variable `NEXT_PUBLIC_*`.** Cualquier variable con ese prefijo termina en el bundle del cliente. Mitigación: usar únicamente la `publishable key` (diseñada para ser pública) en `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `SUPABASE_DB_PASSWORD` no debe tocarse ni exponerse con ese prefijo.
