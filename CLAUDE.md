# SOMA-RH — consignes pour Claude Code

Application RH et paie de la Société Minière Africaine (Sénégal). Interface et données en **français**.

## Structure
- `web/` : React 18 + Vite + TypeScript + Tailwind + TanStack Query/Table. Pages dans `web/src/pages`, composants partagés dans `web/src/components`.
- `supabase/migrations/` : schéma, RLS, moteur de paie PL/pgSQL, vues d'états. Projet Supabase `mzhdwdpesbggxtjxxgab`.
- `docs/ANALYSE_EXCEL.md` : règles de paie issues du classeur Excel (référence fonctionnelle).

## Règles
- Le moteur de paie (`compute_salary_slip`) doit rester identique au classeur Excel : après toute modification, recalculer août 2026 et comparer (écart attendu < 0,000001 F sur les 25 bulletins ; brut total 4 929 179,09 ; net total 4 662 739,89).
- Toujours passer par une migration (`supabase/migrations/AAAAMMJJHHMMSS_nom.sql`) puis l'appliquer via le MCP Supabase ; régénérer `web/src/lib/database.types.ts` ensuite.
- Toute nouvelle table : RLS activée + politiques par rôle (`has_role(array['rh'|'paie'])`), index sur les clés étrangères.
- Montants en pleine précision (`numeric`) en base ; arrondi uniquement à l'affichage (`fcfa()` de `web/src/lib/format.ts`).
- Design : palette `ink / paper / river / phosphate / signal` (voir `web/tailwind.config.js`), police Archivo, chiffres tabulaires.
- Données personnelles des salariés : ne jamais les copier dans des fichiers suivis par Git.

## Skills utiles
- `supabase`, `supabase-postgres-best-practices` : schéma, RLS, performances.
- `frontend-design`, `ui-ux-pro-max`, `ui-styling`, `web-design-guidelines` : interface.
- `vercel-react-best-practices`, `vercel-composition-patterns` : code React.
- `graphify` : carte du code (`/graphify .`, résultat dans `graphify-out/`).
- `xlsx` : lecture des classeurs Excel de paie.
