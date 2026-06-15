# Plan d'implémentation — 8 demandes

Travail organisé par zone pour éviter les régressions. Tout reste en frontend, sauf la soumission email qui utilise déjà le serverFn `submitForm` (table `form_submissions`).

## 1. Tableau de bord Admin vs User
- Ajouter "Tableau de Bord" comme premier item du menu latéral (`src/lib/menu.ts` + `app-sidebar.tsx`).
- Dans `src/routes/index.tsx`, brancher sur `useAuth()` :
  - **Admin** → vue actuelle inchangée.
  - **User** → nouveau composant `UserDashboard` avec 3 KPI : total docs, docs lus, docs restants.
- Témoin rouge clignotant (animate-pulse + ring rouge) sur la carte "restants".
- Hover → `HoverCard` listant les documents non lus.
- Click sur un item → modale `ReaderDialog` qui ouvre les documents un par un (navigation "Suivant", marque comme lu via `acknowledgements.ts`).

## 2. Soumission email réellement fonctionnelle
- `submit.functions.ts` existe déjà et enregistre dans `form_submissions`. Garder l'enregistrement.
- Ajouter une simulation d'envoi crédible : délai 600 ms, retour `{ id, emailSent: true, deliveredAt }`, et une page `/admin/submissions` (admin only) listant les soumissions (lecture via serverFn) pour vérification.
- Les 3 formulaires (`ahm-650`, `dg-incident`, `ios-428-01`) appellent déjà `SubmitEmailDialog` → vérifier que chacun passe un payload complet ; sinon corriger.

## 3. Cloche de notifications dynamique
- Dans `top-header.tsx`, remplacer la cloche statique par un `Popover` listant :
  - nouveaux docs (depuis `documents.ts` filtrés par `createdAt` récent),
  - docs mis à jour (`updatedAt`),
  - docs non lus pour l'utilisateur courant.
- Badge rouge dynamique = nb non lus + nouveautés. Point clignote tant qu'il y a >0.

## 4. DG Incident — sous-titre IATA dynamique
- Helper `iataEdition()` : édition 65 = année 2024 ⇒ `edition = 65 + (year - 2024)`. Donc 2026 → "IATA 67th Ed, Jan2026", 2027 → "68th Ed, Jan2027". Remplacer le sous-titre `PageShell` dans `dg-incident.tsx`.

## 5. Checklist IOS 428-01
- Ajouter sous le titre la référence "IOS428-02#a5".
- En-tête : remplacer le visuel actuel par un vrai logo Tunisair (asset SVG officiel). Je téléverserai un asset via `lovable-assets` (logo Tunisair public).
- "Synthesis and Findings" : zone calculée — `items.filter(r => r.answer === 'no').map(...)` rendu en liste à puces.
- Corriger le calcul du taux : actuellement basé sur `yes/(yes+no)` mais reste à 100 % → revoir pour inclure tous les items répondus et exclure les `n/a`.

## 6. i18n total
- Auditer `i18n.tsx` : ajouter toutes les clés manquantes (KPI, dashboard, cloche, toasts, alerts, sous-titres formulaires, boutons admin).
- Remplacer les chaînes en dur dans `index.tsx`, `top-header.tsx`, dashboards, formulaires, `safety/*`.
- Toasts (`sonner`) traduits via `t()`.

## 7. Animation header Tunisair
- Dans `top-header.tsx`, ajouter une bande décorative au-dessus ou derrière le titre : nuages SVG en arrière-plan + avion (icône `Plane` ou SVG) traversant de gauche à droite via animation CSS keyframes (`@keyframes fly`) ajoutée dans `styles.css`. Boucle infinie ~12 s.

## 8. Admin — événements & indicateurs
- Sur `safety/events.tsx` et `safety/spi.tsx`, si `user.role === 'admin'` :
  - bouton "Modifier statut" (Select inline EN COURS/CLÔTURÉ/À TRAITER),
  - bouton "Modifier catégorie" (Select),
  - bouton "Ajouter une année" qui ajoute une nouvelle archive annuelle dans le store local.
- Persistance : `users-store.ts` style (localStorage) — un nouveau `safety-store.ts` qui hydrate depuis `safety-data.ts` et mémorise les modifs.

## Notes techniques
- Aucun changement de schéma DB (table `form_submissions` suffit).
- Pas de toucher aux fichiers auto-générés (`routeTree.gen.ts`, `integrations/supabase/*`).
- Tous les nouveaux textes passent par `dict` dans `i18n.tsx`.
- Vérification finale : build, navigation Admin vs User, soumission d'un formulaire de test.

Estimation : ~15 fichiers touchés, 2 nouveaux composants, 1 nouvel asset logo.