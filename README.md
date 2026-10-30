# SOMA-RH — Gestion du personnel et de la paie

Application web de gestion RH et de paie de la **Société Minière Africaine (SOMA)**, construite à partir du
classeur Excel « GESTION DE LA PAIE DES CONGES » et sur le modèle fonctionnel de
[Frappe HR](https://github.com/frappe/hrms).

* **Frontend** : React 18 + Vite + TypeScript + Tailwind CSS + TanStack Query / Table + Lucide (`web/`)
* **Backend** : Supabase (PostgreSQL 17, Auth, RLS) — projet `mzhdwdpesbggxtjxxgab` (`supabase/`)
* **Moteur de paie** : fonctions PL/pgSQL qui reproduisent les formules Excel au centime près
  (25 bulletins d'août 2026 identiques, voir [docs/ANALYSE_EXCEL.md](docs/ANALYSE_EXCEL.md))

## Démarrer (Windows)

```powershell
cd C:\IT-Mozaic\SOMA-RH\web
npm install
npm run dev                    # http://localhost:5173
```

`web/.env.local` contient déjà l'URL du projet et sa clé publique (publishable key). Modèle : `web/.env.example`.

1. Ouvrez l'application, cliquez sur **Créer un compte** (adresse e-mail + mot de passe).
   Si la confirmation par e-mail est activée dans Supabase (Authentication › Providers › Email), validez le lien reçu.
2. Connectez-vous, allez dans **Paramètres › Accès** et cliquez sur **Me déclarer administrateur**
   (possible uniquement tant qu'aucun administrateur n'existe).
3. Créez les comptes des autres utilisateurs, puis attribuez-leur les rôles **RH**, **Paie** ou **Salarié**.
   Reliez un compte à une fiche pour que le salarié consulte ses bulletins.

La paie d'**août 2026** est déjà chargée et calculée (statut « Calculée ») : ouvrez **Traitements de paie**.

## Mise en ligne sur Vercel

Le dépôt est prêt : `vercel.json` (racine) construit l'application de `web/` et redirige toutes les routes vers
`index.html` ; `web/.env.production` fournit l'URL Supabase et la clé publique au build.

1. Sur [vercel.com/new](https://vercel.com/new), importez le dépôt GitHub `mdiene/soma-rh`.
   Laissez **Root Directory** à la racine (`./`) : `vercel.json` fixe les commandes et le dossier `web/dist`.
2. Cliquez sur **Deploy**. Aucune variable d'environnement n'est obligatoire ; pour changer de projet Supabase,
   définissez `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` dans Settings › Environment Variables.
3. Dans Supabase › Authentication › URL Configuration, mettez l'adresse Vercel (ex. `https://soma-rh.vercel.app`)
   en **Site URL** et ajoutez-la aux **Redirect URLs** : les liens de confirmation d'e-mail pointeront vers l'application en ligne.

Chaque `git push` sur `main` redéploie automatiquement. Dans Claude Code, le plugin officiel **Vercel**
(activé dans `.claude/settings.json`) ajoute les commandes `/deploy`, `/env` et `/status`.

## Modules

| Écran | Rôle | Feuille Excel d'origine |
|---|---|---|
| Tableau de bord | vue mensuelle (masse salariale, IPRES, CSS, CFCE, TRIMF, provisions, alertes) et vue annuelle ; « Synthèse annuelle » des traitements validés | TDB |
| Salariés | fiche complète, matricule attribué automatiquement (S0027…) et verrouillé, classification conventionnelle, structure salariale, solveur « net à simuler » | FICHE DE PERSONNEL |
| Congés | demandes, validation, attribution et soldes | — |
| Présences | grille journalière (un salarié par ligne, enregistrement groupé sans doublon) : heures travaillées, absence, maladie, HS par taux ; report dans les variables de paie | — |
| Mes bulletins | bulletins validés filtrés par salarié, matricule et période, regroupés par salarié ; impression et export | BULLETIN |
| Variables du mois | saisie en grille des heures, primes et retenues | élements de salaires (colonnes de saisie) |
| Traitements de paie | calcul par lot, contrôle, validation, impression de tous les bulletins | BULLETIN + macros VBA |
| Bulletin | maquette fidèle, cumuls période/année, montant en lettres, impression / PDF | BULLETIN |
| Simulateur net / brut | simulation sans enregistrement, recherche du sursalaire pour un net cible | macro Valeur_Cible |
| États et déclarations | livre de paie en 7 blocs avec cumuls annuels validés (TRIMF, IPRES RG/RC, provisions congé et précarité), cotisations, charges patronales, écritures comptables ; en-têtes figés, sous-totaux, contrôles de cohérence, export CSV, impression paysage | livre de paie, états, compta |
| Paramètres | rôles, taux et plafonds, barèmes IR/TRIMF, rubriques, grilles conventionnelles, société ; référentiels RH (emploi, type de contrat, convention, catégorie, mode de paiement) avec activation et journal | PARAMETRES |

## Base de données

Migrations dans `supabase/migrations/` (déjà appliquées sur le projet) :

| Fichier | Contenu |
|---|---|
| `…170000_core_hr.sql` | sociétés, départements, emplois, conventions, grilles, salariés, congés, présences |
| `…170100_payroll_schema.sql` | paramètres, barèmes IR/TRIMF, rubriques, structures, affectations, variables, traitements, bulletins |
| `…170200_security_rls.sql` | rôles `admin / rh / paie / salarie`, RLS sur toutes les tables |
| `…170300_payroll_engine.sql` | `compute_salary_slip`, `calculate_salary_slip`, `run_payroll_entry`, `solve_sursalaire_for_net`, IR, TRIMF, indemnités |
| `…170400_reference_data.sql` | taux, barèmes, 39 rubriques, 11 conventions et 254 catégories issus de PARAMETRES |
| `…170500_reports.sql` | vues livre de paie, cotisations, journal comptable, cumuls, soldes de congés ; `hr_dashboard` |
| `…170600_service_context.sql` | traitements serveur (clé service / console SQL) |
| `…170700_admin_users.sql` | gestion des comptes par l'administrateur |
| `…180000_delete_payroll_entry.sql` | suppression d'une paie mensuelle (validée : administrateur uniquement) |
| `…29090000_lot1_provisions_cumuls.sql` | provision précarité du mois ; cumuls annuels validés dans `v_payroll_register` et `v_salary_slip_ytd` |
| `…29120000_lot2_dashboard_annuel.sql` | `hr_dashboard` enrichi ; `hr_dashboard_year` (traitements validés, 12 mois) |
| `…29140000_lot3_presences.sql` | heures de maladie, contrôle 24 h par jour, traçabilité, report dans la paie |
| `…29160000_lot6_matricule.sql` | séquence et déclencheurs du matricule, `preview_employee_number`, `admin_change_employee_number`, `audit_log` |
| `…29180000_lot7_referentiels.sql` | `contract_types`, `payment_modes`, activation / journal des référentiels ; le moteur lit la nature du contrat dans le référentiel |
| `…30100000_durcissement_triggers.sql` | fonctions de déclencheur retirées de l'API |

Après chaque modification du moteur, le contrôle de non-régression recalcule les 25 bulletins d'août 2026
avec les valeurs du classeur (voir [l'analyse](docs/ANALYSE_EXCEL.md#3-validation-du-moteur-soma-rh)).

`supabase/seed/` contient la reprise des 26 salariés et des variables d'août 2026 (données personnelles :
exclu de Git par `.gitignore`).

### Correspondance avec Frappe HR

| Frappe HR (DocType) | SOMA-RH (table) |
|---|---|
| Company, Department, Designation | `companies`, `departments`, `designations` |
| Employee Grade | `employee_grades` (+ `collective_agreements`) |
| Employee | `employees` |
| Leave Type, Leave Allocation, Leave Application | `leave_types`, `leave_allocations`, `leave_applications` |
| Attendance | `attendance` |
| Salary Component | `salary_components` |
| Salary Structure, Salary Structure Assignment | `salary_structures`, `salary_structure_components`, `salary_structure_assignments` |
| Income Tax Slab | `tax_slabs`, `tax_slab_brackets`, `ir_family_reductions`, `trimf_brackets` |
| Additional Salary | `additional_salaries` (+ `payroll_inputs` pour les heures) |
| Payroll Entry | `payroll_entries` |
| Salary Slip (+ Salary Detail) | `salary_slips`, `salary_slip_details` |

## Outils pour Claude Code

* `.mcp.json` : serveur MCP Supabase du projet. Lancez `claude /mcp` dans un terminal, choisissez **supabase**
  puis **Authenticate**.
* `.claude/skills/` : skills installés pour ce projet — `supabase`, `supabase-postgres-best-practices`,
  `graphify`, `frontend-design`, `ui-ux-pro-max`, `ui-styling`, `design-system`, `web-design-guidelines`,
  `vercel-react-best-practices`, `vercel-composition-patterns`, `deploy-to-vercel`, `vercel-cli-with-tokens`,
  `webapp-testing`, `xlsx`.
* `.claude/settings.json` : active le plugin officiel `vercel@claude-plugins-official` (Claude Code propose de
  l'installer à l'ouverture du projet ; sinon `/plugin install vercel@claude-plugins-official`).
* Graphify a besoin de son outil en ligne de commande sous Windows : `scripts\setup-skills.ps1`, puis
  `/graphify .` dans Claude Code pour générer la carte du code (`graphify-out/`).

## Documentation

* [Analyse du classeur Excel](docs/ANALYSE_EXCEL.md) : feuilles, formules, barèmes, macros, validation, anomalies.
