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
