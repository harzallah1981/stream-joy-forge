Voici le plan détaillé. Confirmez avant que je code (beaucoup de changements indépendants).

## 1. User Management — bouton "Modifier" par user
- `src/routes/page.$slug.tsx` (vue users) : ajouter une icône crayon à gauche de "Supprimer" qui ouvre un dialog d'édition (email, username, type, modules, org, workplace, emails secondaires, adminScope). Persiste via `updateUser()`.
- Les comptes seed (TEST_CREDENTIALS) restent non-modifiables (déjà non-supprimables).

## 2. Limites de comptes
- Dans `addUser` (création) : bloquer si > 3 admins ou > 100 internal_manager. Toast d'erreur. Pas de limite pour les autres.
- Idem dans `updateUser` si on change le type vers admin/manager.

## 3. Read & Sign — séparé des documents
- `src/routes/read-sign.tsx` : ne plus lire les docs depuis `documents.ts`. Nouveau store `src/lib/read-sign-store.ts` (localStorage `tunisair_read_sign_v1`) :
  - `{ id, title, reference, fileBlobKey|url, requireSign, assignedEmails: string[], createdAt }`.
- Admin : bouton "Ajouter document Read&Sign" → dialog (titre, ref, fichier, cocher signature requise, multi-select users).
- Admin : bouton "Supprimer" par ligne → confirme + archive (voir §6).
- Users : ne voient que les documents où leur email ∈ assignedEmails.
- Notifications/reminders/acks branchés sur ce store (réutilise `acknowledgements`).

## 4. Forms — admin peut éditer/supprimer/refaire
- Liste persistée `src/lib/forms-store.ts` initialisée avec les 3 forms seed (ckl-ios-428-02, dg-incident, ahm-650). Chaque form : `{ id, slug, title, schema?, hidden?, recipients? }`.
- Sur la page Forms : si admin, boutons Modifier (titre/recipients), Supprimer (archive), Restaurer.
- `src/routes/admin/recipients.tsx` : lit la liste depuis ce store au lieu d'une constante, donc le nom suit automatiquement.
- (Refaire = remettre à zéro le schema/recipient à la valeur par défaut.)

## 5. Archives (sous Administration)
- Nouveau store `src/lib/archives-store.ts` (localStorage + IndexedDB pour blobs). Item : `{ id, kind: "document"|"read-sign"|"form", category, title, ref, payload, archivedAt, archivedBy }`.
- Toute suppression (docs internes/externes, R&S, forms) appelle `archive(item)` avant `delete`.
- Nouvelle route `src/routes/admin/archives.tsx` : table filtrable par type & catégorie, design Word-like (déjà utilisé ailleurs : header bleu, tableau).
- Lien dans la sidebar admin.

## 6. Dashboard — liens cliquables
- `AdminDashboard` dans `src/routes/index.tsx` :
  - "Sécurité — Événements" (titre) → navigate `/safety/events`
  - "Écarts SAFA D03" (titre) → navigate `/safety/safa-d03`
  - "Indicateurs Documentaires" (titre) → ouvre dialog plein-écran `DocIndicatorsDialog`.

## 7. Dialog Indicateurs Documentaires
- Nouveau composant `src/components/doc-indicators-dialog.tsx`.
- Source : acks Supabase (`acknowledgements`) + liste des docs.
- Filtres : Escale (workplace user), Manuel/catégorie, Document, Type (interne/externe), Période.
- Graphiques recharts : bar (lectures par escale), bar (par manuel/cat), pie (interne vs externe), bar (top docs).
- Bouton "Télécharger PDF" : via jsPDF (déjà dispo via events-pdf?) — capture chaque chart en image (recharts via `html-to-image`) puis assemble PDF avec header design app.
- Si `html-to-image` absent : `bun add html-to-image jspdf`.

## 8. Compteurs accusés/lectures (format X/Y, pas de %)
- Dans `UserDashboard` & `AdminDashboard` (KPIs) :
  - Calcul Y = Σ sur docs diffusés (avec accusé requis) du nombre d'users assignés.
  - X = nombre d'acks `action='sign'` côté admin / lectures `action='view'`.
  - Afficher "93 / 250" au lieu de "37%".
- Mettre à jour les libellés "Accusés enregistrés" et "Lectures effectuées".

## 9. Robustesse "supprimer tous les users"
- Vérifier les endroits qui assument la présence d'un user spécifique (dashboards, notifications). Garde-fous `?? []` et fallback "aucun user". Audit rapide de `loadUsers()`/`TEST_CREDENTIALS` usages.

## 10. Bilan final
- Je renvoie en fin un récap clair: fait / partiellement fait / non fait avec raisons.

---

## Précisions techniques
- Stockage : tout localStorage (pas de migration Cloud) sauf acks (déjà Supabase). Fichiers binaires : IndexedDB via `doc-blobs.ts` existant.
- PDF : header Tunisair + couleurs design tokens.
- Pas de modif des comptes seed.

## Questions avant de partir
1. **PDF Indicateurs** : OK pour utiliser `html-to-image` + `jspdf` (~50KB combinés) ? 
2. **Read&Sign existant** : on **vide** la liste actuelle (qui pointe vers docs internes) ou on migre les acks existants vers le nouveau store ?
3. **Compteur "lectures demandées"** : on compte 1 lecture demandée par (user assigné × document diffusé), correct ?

Répondez à ces 3 points et je lance l'implémentation séquentiellement avec un commit groupé par section.