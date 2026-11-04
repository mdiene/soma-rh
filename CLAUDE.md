# SOMA-RH — consignes pour Claude Code

Application RH et paie de la Société Minière Africaine (Sénégal). Interface et données en **français**.

## Structure
- `web/` : React 18 + Vite + TypeScript + Tailwind + TanStack Query/Table. Pages dans `web/src/pages`, composants partagés dans `web/src/components`.
- `supabase/migrations/` : schéma, RLS, moteur de paie PL/pgSQL, vues d'états. Projet Supabase `mzhdwdpesbggxtjxxgab`.
- `docs/` : documentation du projet (Mintlify, `docs/docs.json`), rapports de tests (`docs/qa/`), cas d'usage et registre des règles légales. `docs/ANALYSE_EXCEL.md` est **historique** : le classeur Excel n'est plus une référence.

## Règles
- Base légale de la paie : **Code du travail du Sénégal** (loi 97-17), conventions collectives applicables, Code général des impôts, règles IPRES et CSS. Le moteur de paie (`compute_salary_slip`) doit être conforme au registre des règles légales (`docs/regles-de-paie/registre-legal.md`, article et source pour chaque règle) ; toute modification passe les tests de l'oracle indépendant et les tests de référence. En cas de conflit entre sources, la règle la plus favorable au salarié s'applique. En cas de doute sur un texte : noter « à confirmer », ne rien inventer.
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
- `xlsx` : import et export de fichiers tableur.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
