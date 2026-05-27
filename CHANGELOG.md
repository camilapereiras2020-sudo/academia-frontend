# Changelog — academia_frontend

## 2026-05-27

### Broken import fixes (Vite module resolution errors)
- `features/alumnos/pages/AlumnosPage.tsx` — `from "../api"` → `from "../alumnos_api"` (file is `alumnos_api.ts`, not `api.ts`)
- `features/asistencia/pages/AsistenciaPage.tsx` — same fix for `@/features/alumnos/api`
- `features/pagos/pages/NuevoPagoPage.tsx` — same fix for `@/features/alumnos/api`
- `features/cumpleanos/pages/CumpleanosPage.tsx` — same fix for `@/features/alumnos/api`

### TypeScript errors fixed
- `features/alumnos/alumnos_api.ts` — removed unused `PaginatedResponse` import
- `features/pagadores/api.ts` — removed unused `PaginatedResponse` import
- `features/grupos/api.ts` — removed unused `PaginatedResponse` import
- `features/alumnos/pages/AlumnosPage.tsx` — removed unused `Pagador`, `Grupo` type imports and unused `NIVELES` constant
- `features/asistencia/pages/AsistenciaPage.tsx` — removed unused `DIAS` constant
- `features/games/pages/VocabGame.tsx` and `features/games/VocabGame.tsx` — fixed `typeof WORDS[]` → `typeof WORDS` in `getOptions` signature
- `features/pagos/pages/NuevoPagoPage.tsx` — typed `estado` state as `"pagado" | "pendiente" | "parcial"` literal union; cast select `e.target.value` to match
- Multiple pages (`AlumnosPage`, `GruposPage`, `PagadoresPage`) — removed invalid `.results` access on non-paginated API responses (`Alumno[]`, `Grupo[]`, `Pagador[]`)

### tsconfig.json
- Added `"types": ["vite/client"]` — fixes `import.meta.env` usage in `lib/axios.ts` and CSS side-effect imports in `main.tsx`
- Added `"ignoreDeprecations": "6.0"` — silences TypeScript 6 deprecation warning on `baseUrl`
- Removed broken `"references"` entry pointing to `tsconfig.node.json` (which lacked `"composite": true`)

### App.tsx
- Fixed CRM import casing: `@/features/crm/pages/CRMPage` → `@/features/crm/Pages/CRMPage` to match the actual directory name

### Runtime crash fixes
- `features/alumnos/pages/AlumnosPage.tsx` — guarded `a.grupos_detalle` accesses with `?? []` (API can return alumno without this field)
- `features/asistencia/pages/AsistenciaPage.tsx` — same guard on `a.grupos_detalle.some(...)` in `grupoAlumnos` filter
