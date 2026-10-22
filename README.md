# MonHub

Tableau de bord personnel (PWA) : mes outils du quotidien sous forme de mini-applis, à la manière de l'écran d'accueil d'un téléphone Android. Fonctionne sur PC Windows (Chrome / Edge) et Android (Chrome), synchronisé via Supabase.

Spécification complète : [`SPEC.md`](SPEC.md).

## Stack

React + TypeScript + Vite · Tailwind CSS v4 · `vite-plugin-pwa` (service worker `src/sw.ts`) · `react-router` (HashRouter) · Vitest · hébergement GitHub Pages · données Supabase (à partir de la phase 2).

## Installation locale

Prérequis : Node.js 22 ou plus récent.

```bash
npm install
npm run dev        # http://localhost:5173
```

Autres commandes :

| Commande | Rôle |
|---|---|
| `npm run dev:demo` | app en **mode démo** : sans connexion, données factices dans le navigateur |
| `npm test` | tests unitaires et d'intégration (Vitest) |
| `npm run e2e` | tests de bout en bout (Playwright, mode démo, Edge en local) |
| `npm run typecheck` | vérification TypeScript |
| `npm run lint` | analyse statique (oxlint) |
| `npm run build` | build de production dans `dist/` |
| `npm run preview` | sert le build (service worker actif, comme en ligne) |
| `npm run icons` | régénère les icônes PWA depuis `public/favicon.svg` et `assets/maskable.svg` |

## Variables d'environnement

Copier `.env.example` en `.env.local`. Seules des valeurs **publiques** vont côté front :

| Variable | Où la trouver |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (clé `anon` / publishable) |

Les clés secrètes (Gemini, Last.fm, VAPID privée, `service_role`) ne vont **jamais** dans ce dépôt : elles sont stockées dans les secrets des Edge Functions Supabase.

## Déploiement

Chaque push sur `main` déclenche `.github/workflows/deploy.yml` : vérification des types, tests, build, puis publication sur GitHub Pages à l'adresse `https://<utilisateur>.github.io/<nom-du-repo>/`. Le chemin de base est déduit automatiquement du nom du dépôt.

Secrets du dépôt à créer (Settings → Secrets and variables → Actions) : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Supabase : base, fonctions et secrets

L'outil en ligne de commande Supabase est installé avec le projet (`npx supabase …`). Une fois connecté (`npx supabase login`) et relié au projet (`npx supabase link --project-ref <ref>`) :

| Commande | Rôle |
|---|---|
| `npx supabase db push` | applique les nouvelles migrations de `supabase/migrations/` |
| `npx supabase functions deploy --use-api` | déploie les Edge Functions de `supabase/functions/` |
| `npx supabase secrets set NOM=valeur` | définit un secret des Edge Functions |
| `npx supabase config push` | applique les réglages d'authentification de `supabase/config.toml` |

Secrets des Edge Functions (jamais dans le dépôt) : `OWNER_USER_ID`, `CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `ALLOWED_ORIGINS`, `LASTFM_API_KEY`.
Secrets du Vault (lus par `pg_cron`) : `project_url`, `cron_secret` (même valeur que `CRON_SECRET`).

### Notifications

Les mini-applis programment des **rappels** (table `reminders`). Chaque minute, `pg_cron` vérifie s'il y en a d'échus et, seulement dans ce cas, appelle l'Edge Function `dispatch-reminders`. Elle les inscrit dans l'historique (`notifications`, la cloche) et envoie les push aux appareils abonnés, en respectant les réglages (applis coupées, « Ne pas déranger »). Les boutons des notifications appellent `notification-action`.

### Logique partagée app / serveur

`supabase/functions/_shared/` contient du code pur (sans dépendance Deno), utilisé à la fois par l'app et par les Edge Functions, et testé par Vitest :

| Fichier | Rôle |
|---|---|
| `zonedTime.ts` | heures dans un fuseau, prochaine sonnerie d'une alarme (heure d'été comprise) |
| `recurrence.ts` | récurrences RRULE (quotidienne, jours choisis, mensuelle, annuelle, tous les N, fin) |
| `events.ts` | occurrences d'événements récurrents, prochain rappel « X min avant » |
| `notificationRules.ts` | « Ne pas déranger », applis coupées |

## Ajouter une mini-appli

1. Créer `src/apps/<id>/` avec :
   - `<Nom>Page.tsx` : la page plein écran (export par défaut) ;
   - `index.ts` : la définition (`MiniApp`) — nom, icône Lucide, couleur, page chargée à la demande, widgets, actions IA.
2. L'ajouter au tableau `APPS` de `src/apps/registry.ts`.

Elle apparaît alors dans le tiroir d'applications et devient accessible à l'adresse `#/app/<id>`.

## Organisation

```
src/
  apps/          une mini-appli par dossier + registre central
  components/    composants partagés (barre d'état, tiroir, en-têtes…)
  lib/           utilitaires (dates, raccourcis clavier…)
  pages/         accueil, page de mini-appli, réglages
  theme/         thèmes clair / sombre / automatique
  sw.ts          service worker (cache hors-ligne, push à la phase 4)
```
