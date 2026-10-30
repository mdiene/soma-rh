# Analyse du classeur « GESTION DE LA PAIE DES CONGES EN AOUT 2026.xlsm »

Classeur de paie de la **Société Minière Africaine (SOMA SARL)** : 13 feuilles, 1 table centrale de calcul,
4 tableaux croisés dynamiques et 6 modules VBA. Période traitée : août 2026, 25 salariés payés (26 fiches).

## 1. Cartographie des feuilles

| Feuille | Rôle | Équivalent SOMA-RH |
|---|---|---|
| `PARAMETRES` | Taux et plafonds (CFCE, BRS, IPRES RG/RC, CSS AF/AT, IPM, transport, SMIG, panier, indemnité km), grille des salaires minima par convention collective (table `CC`, 254 catégories, 11 conventions), listes (mois, contrats, motifs de départ, situations matrimoniales) | `payroll_settings`, `collective_agreements`, `employee_grades` |
| `FICHE DE PERSONNEL` | Fiche salarié (table `FICHE_PERSONNEL`, 39 colonnes : identité, CNI, IPRES, famille, parts TRIMF/IR, convention, catégorie, contrat, dates) | `employees`, `designations` |
| `élements de salaires` | **Moteur de calcul** (table `TABLEAU`, 114 colonnes A→DJ) : une ligne par salarié, saisies variables + toutes les formules de paie | `salary_structure_assignments`, `payroll_inputs`, `additional_salaries`, fonction `compute_salary_slip` |
| `BULLETIN` | Maquette du bulletin, alimentée par `RECHERCHEV` sur `TABLEAU` à partir du matricule (H5) | `salary_slips`, `salary_slip_details`, composant `SalarySlipDocument` |
| `livre de paie` | Transposition de `TABLEAU` (un salarié par colonne) | vue `v_payroll_register` |
| `ETAT RESUME COTISATIONS` | Synthèse des cotisations par rubrique | vue `v_contribution_summary` |
| `Etat cotisations` | TCD des cotisations par salarié | vue `v_payroll_register` (export) |
| `Etat Charges Patronales` | TCD charges patronales par salarié | onglet « Charges patronales » des États |
| `compta ` | Deux journaux comptables (salaires 661/663/6057 ↔ 422/401 ; retenues 422 ↔ 421/4313/4314/4331/4471/4472) | vue `v_accounting_journal` (+ journal des charges patronales) |
| `TDB` | TCD effectif et net par type de contrat | fonction `hr_dashboard` |
| `FACTURE` | Facture des prestataires (brut − BRS 5 %) | à développer (voir § 6) |
| `Envoyer les bulletins` | Liste nom / e-mail / fichier PDF pour l'envoi | à développer (voir § 6) |
| `TABLE CONVENTION` | Feuille masquée, vide | — |

## 2. Règles de calcul (colonnes de `TABLEAU`)

Notation : `H = 173,33` heures ; *situation* = « TRAVAIL » si contrat CDI ou CDD, sinon le type de contrat (STAGE, APPRENTISSAGE, PRESTATION).

### 2.1 Éléments du brut
| Rubrique | Formule Excel transposée |
|---|---|
| Salaire de base (AG) | salaire minimum de la catégorie (table `CC`) |
| Sursalaire (AH) | valeur saisie — **obtenue par la macro `Valeur_Cible`** (voir § 4) |
| Taux horaire TH (AF) | (base + sursalaire + honoraires + autre fixe) ÷ (40 × 52 ÷ 12) |
| Ancienneté (O) | DATEDIF(date d'entrée ; fin de période + 1 ; "y") |
| Prime d'ancienneté (AK) | 0 si ancienneté < 2 ans et situation TRAVAIL ; sinon base ÷ H × (H − h. absence + HS) × ancienneté % |
| Retenue absences (AL) | − (base + sursalaire + honoraires + autre fixe) ÷ H × heures d'absence |
| Indemnité maladie (AM) | (base + sursalaire + honoraires + autre fixe) ÷ H × heures maladie |
| Primes variables (AN→AX) | performance, Tabaski, forfait heures sup, divers |
| Allocation congé (AY) | montant saisi |
| Précarité (AZ) | CDD/COD sorti au plus tard en fin de période : (base…prime anc. + Tabaski) × mois de présence × 7 % |
| Heures sup (BA→BD) | heures × TH × 115 % / 140 % / 160 % / 200 % |
| **BRUT (BE)** | somme de AG à BD |

### 2.2 Impôts et cotisations
| Rubrique | Règle |
|---|---|
| **IR (BF)** | R = ARRONDI.INF(brut × 12 − MIN(30 % × brut × 12 ; 900 000) ; −3). Barème : 0 % jusqu'à 630 000 ; 20 % → 1 500 000 ; 30 % → 4 000 000 ; 35 % → 8 000 000 ; 37 % → 13 500 000 ; 40 % au-delà. Réduction familiale = MIN(plafond ; MAX(impôt × taux ; plancher)) selon les parts (1,5 : 10 % [100 000 ; 300 000] … 5 : 45 % [800 000 ; 3 180 000]). IR mensuel = MAX(0 ; impôt − réduction) ÷ 12. Uniquement si situation TRAVAIL |
| **TRIMF (BG)** | brut annuel ≥ 12 M : 36 000 × parts ; ≥ 7 M : 18 000 ; ≥ 2 M : 12 000 ; ≥ 1 M : 4 800 ; ≥ 600 000 : 3 600 ; sinon 900 forfaitaires ; ÷ 12 |
| CFCE (BH) | 3 % du brut, patronal, situation TRAVAIL |
| BRS (BI) | 5 % du brut, prestataires uniquement |
| IPRES RG (BK→BN) | base MIN(brut ; 432 000) ; 14 % dont 5,6 % salarié / 8,4 % patronal |
| IPRES RC (BO→BR) | cadres uniquement ; base MIN(brut ; 1 296 000) ; 6 % dont 2,4 % / 3,6 % |
| CSS (BT→BW) | base MIN(brut ; 63 000) ; allocations familiales 7 % (TRAVAIL) ; accident du travail 5 % |
| IPM (BX→CA) | base MIN(brut ; 10 000) ; 50 % salarié / 50 % patronal |
| Total retenues (CB) | IR + TRIMF + BRS + IPRES RG sal. + IPRES RC sal. + IPM sal. |
| Charges patronales (CC) | CFCE + IPRES RG pat. + IPRES RC pat. + CSS + IPM pat. |

### 2.3 Du brut au net à payer
| Rubrique | Règle |
|---|---|
| Rémunération nette (CE) | brut − total retenues |
| Indemnité de transport (CF) | 26 000 ÷ H × (H − heures d'absence ÷ 8) |
| Indemnité de panier (CG) | nombre de paniers × SMIG horaire (370,526) × 3 |
| Indemnité kilométrique (CH) | 50 000 ÷ H × (H − heures d'absence ÷ 8) |
| Licenciement (CI) / retraite (CJ) | CDI sorti : coefficient par tranche d'ancienneté (25 % / 30 % / 40 % ; retraite 25 / 30 / 45 / 50 %) × (base + sursalaire + prime d'ancienneté) |
| Retenues sur net (CK→CP) | avance Korité, avance caisse, avance financière, coopérative, frais médicaux, caisse commune |
| **NET A PAYER (CS = CT)** | rémunération nette + indemnités + retenues (saisies en négatif) + appoint M-1 |
| Masse salariale (CY) | brut + charges patronales + indemnités + appoints |
| Provision congé (DD) | brut ÷ 12 si « congé à payer » = NON |
| Provision précarité du mois (ajout SOMA-RH) | CDD/COD en cours : (salaire fixe + prime d'ancienneté + Tabaski) × 7 % ; 0 le mois de sortie, où l'indemnité AZ est payée dans le brut. N'entre ni dans le brut ni dans le net. Le classeur prévoit la colonne « cumul provision précarité » (DC) sans formule. |
| Cumuls (CZ, DA, DB, DC, DE — vides dans le classeur) | du 1er janvier au mois affiché, bulletins validés uniquement ; IPRES = parts salariale + patronale |

## 3. Validation du moteur SOMA-RH

* **Bulletins d'août 2026** : les 25 bulletins recalculés par `compute_salary_slip` ont été comparés à Excel sur 17 montants (brut, IR, TRIMF, retenues, charges patronales, nets, masse salariale, prime d'ancienneté, CFCE, IPRES, CSS, IPM, transport, provision congé). **Écart maximal : 0,0000000001 F**, c'est-à-dire le bruit d'arrondi en virgule flottante d'Excel.
* **Totaux** : brut 4 929 179,09 ; IR 527 429,79 ; TRIMF 31 600 ; retenues 916 439,21 ; charges patronales 810 489,50 ; net 4 662 739,89. Les journaux comptables sont équilibrés (5 579 179,09 et 916 439,21, identiques à la feuille `compta`).
* **Barèmes IR et TRIMF** : 720 cas (brut mensuel de 20 000 à 2 982 500 F × parts de 1 à 5) comparés à une réécriture littérale des formules Excel : empreintes MD5 identiques.
* **Après les lots 1 à 7 (30/10/2026)** : nouveau contrôle sur les 25 bulletins d'août, avec le sursalaire du classeur passé au moteur : écart brut 0,00000000002 F, écart net 0,00000000007 F, provision congé identique ; brut 4 929 179,09, net 4 662 739,89. La date d'entrée de S0021 ayant été modifiée dans l'application après la reprise (ancienneté 5 ans au lieu de 2), le contrôle remet celle du classeur dans une transaction annulée.
* **Cumuls** : scénario exécuté puis annulé — un mois en brouillon n'entre pas dans les cumuls, un mois validé y entre, un mois annulé ou supprimé en sort.

## 4. Macros VBA (`vbaProject.bin`)

| Module | Macro | Rôle | Remplacement |
|---|---|---|---|
| Module1 | `Valeur_Cible` | Valeur cible (GoalSeek) : fait varier le **sursalaire** (AH) jusqu'à ce que le net réel (CT) atteigne le « Net à simuler » (CU). C'est ainsi que les sursalaires du classeur ont été obtenus (nets ronds : 100 000, 250 000, 400 000…) | fonction `solve_sursalaire_for_net` (dichotomie, précision 10⁻⁶ F), écran Simulateur et fiche salarié |
| Module2 | `Export_BulletinSalaire` | Parcourt la liste de validation des matricules et exporte un PDF par salarié dans le dossier de PARAMETRES!M4 | page « Imprimer les bulletins » (un bulletin par page A4, enregistrement PDF par le navigateur) |
| Module3 | `envoyerBulletin` | Envoi Outlook de chaque PDF à l'adresse de la feuille « Envoyer les bulletins » | à développer : Edge Function d'envoi (voir § 6) |
| Module5 | `FACTURE` | Export PDF des factures prestataires | à développer |
| Module4, Module6, feuilles | vides | — | — |

## 5. Anomalies relevées dans le classeur

Le moteur SOMA-RH reproduit le **tableau de calcul** (source du brut et du net). Les écarts ci-dessous sont soit reproduits à l'identique (R), soit corrigés et signalés (C) :

1. **Indemnité maladie** (C) : le TABLEAU ignore la colonne « taux maladie » (Z), alors que le BULLETIN l'applique et ajoute la prime d'ancienneté à la base. Le contrôle BULLETIN!L6 signale alors un écart. SOMA-RH applique le taux (100 % par défaut) sur la base du TABLEAU.
2. **Retenue absences** (R) : base du TABLEAU = base + sursalaire + honoraires + autre fixe ; le BULLETIN n'affiche que base + sursalaire.
3. **Masse salariale** (C) : la plage `CF2:CK2` inclut par erreur la retenue « avance Korité ». SOMA-RH n'additionne que les indemnités (aucun impact en août : retenue nulle).
4. **Transport et indemnité km** (C, D10 : voir ARBITRAGES_PAIE.md ; ancien calcul = R) : on retire « heures d'absence ÷ 8 » (des jours) de 173,33 (des heures). Probablement une confusion jours/heures ; à valider avec la direction avant correction.
5. **Réduction IR au-delà de 5 parts** (C) : la formule rend 0 si les parts dépassent 5. SOMA-RH plafonne à 5 parts (règle fiscale).
6. **Appoint du mois** (R) : toujours nul (CR = CS − CT et CS = CT). Aucun arrondi n'est appliqué au net ; les montants sont affichés au franc près.
7. **IPM** (C, D10 : exclue pour les prestataires) : cotisation appliquée à tous les contrats, prestataires compris.
8. **Indemnité de licenciement** (C, D10 : moyenne des 12 derniers mois) : calculée sur le salaire du mois et non sur la moyenne des 12 derniers mois prévue par le Code du travail ; à faire valider.
9. **Feuilles d'états** : les en-têtes « Période du … » affichent `#VALEUR!` (format `"dd/mm/yyy"` erroné).
10. **Matricule S0026** : présent dans la fiche de personnel mais absent du TABLEAU (pas de paie en août). SOMA-RH le signale lors du calcul (« aucune structure salariale affectée »).
11. **Données personnelles** : CNI, téléphones et filiations figurent en clair. Dans SOMA-RH, elles sont protégées par la RLS (rôles RH/paie uniquement ; chaque salarié ne voit que sa fiche).

## 6. Évolutions proposées

* Envoi des bulletins par e-mail (macro `envoyerBulletin`) : Edge Function Supabase + service d'e-mail, PDF généré côté serveur.
* Facturation des prestataires (feuille FACTURE) : réutiliser le BRS déjà calculé.
* Déclarations sociales et fiscales périodiques (IPRES, CSS, IR/TRIMF) à partir de `v_contribution_summary`.
* Historisation des grilles conventionnelles (champ `effective_from` déjà présent) lors des revalorisations du SMIG.
