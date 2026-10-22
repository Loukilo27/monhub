# Prompt — Dashboard personnel « MonHub »

> À coller dans Claude Code, à la racine d'un dossier vide. Tu peux aussi enregistrer ce fichier sous le nom `SPEC.md` dans le projet et dire à Claude Code : « Lis SPEC.md et réalise le projet phase par phase ».

---

## 0. Rôle et méthode de travail

Tu es un développeur full-stack senior. Tu vas construire avec moi une application web personnelle (PWA) appelée **MonHub** : un tableau de bord privé qui regroupe mes outils du quotidien sous forme de mini-applications, à la manière de l'écran d'accueil d'un téléphone Android.

Règles de travail :
- Avance **phase par phase** (section 12). À la fin de chaque phase : lance l'app, vérifie qu'elle compile, que les tests passent, puis fais un commit git clair et résume-moi ce qui a été fait.
- Quand une étape demande une action manuelle de ma part (créer un compte, copier une clé, régler un paramètre dans un tableau de bord externe), **arrête-toi et donne-moi des instructions pas à pas en français**, avec les liens exacts, puis attends ma confirmation.
- Avant d'utiliser une API externe (Supabase, Gemini, Last.fm, Spotify), **vérifie sa documentation actuelle** : les noms de modèles, endpoints et quotas gratuits changent souvent.
- Ne mets **jamais** de clé secrète dans le code ou dans git. Le dépôt sera public (GitHub Pages gratuit).
- Toute l'interface est **en français**, fuseau horaire par défaut `Europe/Paris`, format 24 h, semaine commençant le lundi.

---

## 1. Contexte et contraintes

- **Utilisateur unique** : moi. Personne d'autre ne doit pouvoir accéder aux données ni utiliser l'app.
- **Appareils** : PC sous **Windows** (Chrome ou Edge) et téléphone **Android** (Chrome).
- **Synchronisation** : mes données doivent être identiques sur PC et téléphone, même sur des réseaux différents (4G, Wi-Fi ailleurs, etc.).
- **Coût** : tout doit rester **gratuit** (offres gratuites uniquement).
- **Démarrage** : l'app doit s'ouvrir automatiquement à chaque démarrage de mon PC Windows.

---

## 2. Architecture technique imposée

| Élément | Choix |
|---|---|
| Front-end | React + TypeScript + Vite |
| Style | Tailwind CSS, variables CSS pour les thèmes |
| PWA | `vite-plugin-pwa` (installable, hors-ligne basique, notifications push) |
| Hébergement | **GitHub Pages**, déployé par une GitHub Action à chaque push sur `main` |
| Routage | `HashRouter` (ou astuce `404.html`) pour compatibilité GitHub Pages, `base` Vite = `/<nom-du-repo>/` |
| Back-end / données | **Supabase** (offre gratuite) : Auth, PostgreSQL, Realtime, Storage, Edge Functions, `pg_cron` |
| État / requêtes | TanStack Query + mises à jour optimistes ; abonnement Supabase Realtime pour la synchro instantanée entre appareils |
| Tests | Vitest pour la logique (récurrences, rappels, parsing), Playwright pour 2-3 parcours clés |

### Sécurité (point critique, le code étant public)
1. Authentification Supabase par **e-mail + mot de passe**, avec **2FA TOTP** (Supabase MFA) activée sur mon compte.
2. Une fois mon compte créé, **désactiver les inscriptions** (« Allow new users to sign up » = off) — donne-moi la marche à suivre.
3. **Row Level Security activée sur toutes les tables**, politique `user_id = auth.uid()` pour select/insert/update/delete. Bucket Storage privé avec la même règle.
4. Seules l'URL Supabase et la clé `anon` (publiques par nature) vont dans le front, via les secrets GitHub Actions. Les clés secrètes (Gemini, Last.fm, clés VAPID privées, `service_role`) vivent **uniquement** dans les secrets des Edge Functions.
5. Les Edge Functions vérifient le JWT et refusent tout autre utilisateur que le mien (comparaison avec un `OWNER_USER_ID` en secret).
6. Session persistante (je ne veux pas me reconnecter à chaque démarrage), déconnexion possible dans les réglages.
7. Ajoute un fichier `SECURITY.md` expliquant pourquoi un dépôt public ne met pas mes données en danger.

---

## 3. Page d'accueil : la grille

- Page d'accueil **vide par défaut**, composée d'emplacements invisibles organisés en grille.
- **PC plein écran : 10 colonnes × 6 lignes**. **Téléphone : 4 colonnes × 6 lignes**, avec **plusieurs pages** qu'on fait défiler par balayage horizontal (indicateur de pages en points en bas). Tablette / fenêtre réduite : nombre de colonnes adapté automatiquement.
- La disposition PC et la disposition mobile sont **enregistrées séparément** dans Supabase (deux layouts indépendants).
- Deux types d'éléments posables :
  - **Raccourci** (1×1) : icône + nom, ouvre la mini-appli en pleine page.
  - **Widget** de taille variable (1×1, 2×1, 2×2, 4×2, 4×3…) affichant des infos en direct : heure et fuseaux, tâches du jour, prochains rendez-vous, aperçu d'une note, titre en cours d'écoute, dernier dessin.
- **Mode édition** (appui long sur mobile, clic droit ou bouton « Modifier » sur PC) : les éléments tremblent légèrement, je peux les **glisser-déposer**, les **redimensionner** (widgets), les **supprimer**, et un bouton « + » ouvre un **tiroir d'applications** listant toutes les mini-applis et leurs widgets disponibles.
- Pas de chevauchement ; si une case est occupée, l'élément se place au plus près. Bibliothèque suggérée : `react-grid-layout` ou `dnd-kit`.
- Fond d'écran personnalisable (couleur unie, dégradé ou image importée), stocké dans les réglages.
- En haut : barre d'état discrète avec l'heure, la **cloche de notifications** (avec compteur), l'accès aux réglages et le bouton du mode IA.

### Navigation
- Clic sur une mini-appli → nouvelle page plein écran avec toutes ses fonctionnalités, transition animée depuis l'icône.
- Bouton retour / geste retour Android → retour à l'accueil. Chaque mini-appli a sa propre URL (lien direct possible).

---

## 4. Thème et design

- Thèmes **Clair**, **Sombre** et **Automatique** (suit le système), commutables en un clic, mémorisés et synchronisés.
- Style moderne, épuré, coins arrondis, ombres douces, icônes cohérentes (Lucide), animations sobres (`prefers-reduced-motion` respecté).
- Lisible au doigt sur mobile (zones tactiles ≥ 44 px), utilisable au clavier sur PC.
- Raccourcis clavier PC : `Échap` = retour accueil, `Ctrl+K` = ouvrir le mode IA / recherche rapide.

---

## 5. Système de notifications

Un **centre de notifications commun** à toutes les mini-applis :
- Table `notifications` (source, titre, message, date, lu/non lu, lien vers l'élément concerné).
- Cloche avec badge du nombre de non-lues, panneau listant l'historique, actions « marquer comme lu », « tout effacer », clic = ouvre l'élément concerné.
- **Notifications push Web** (Android + Windows), y compris **app fermée** :
  - Clés VAPID, abonnement push stocké dans Supabase (un par appareil).
  - Une Edge Function appelée **chaque minute par `pg_cron`** vérifie les échéances (alarmes, minuteurs, rappels de tâches et d'événements) et envoie les push.
  - Boutons d'action dans la notification quand c'est pertinent : « Reporter 10 min », « Marquer comme fait ».
- Réglages : activer/désactiver par mini-appli, plage « Ne pas déranger ».
- Toasts dans l'app quand elle est ouverte. Son pour les alarmes uniquement.
- Explique-moi comment autoriser les notifications sur Android (PWA installée) et sur Windows.

---

## 6. Les mini-applications

### 6.1 Horloge
- **Horloge** principale (analogique et numérique au choix), date complète.
- **Fuseaux horaires** : ajouter / supprimer / réordonner des villes, décalage affiché par rapport à Paris, jour/nuit indiqué.
- **Alarmes** : heure, nom, jours de répétition, son au choix, activer/désactiver, reporter (snooze). Déclenchement par notification push même app fermée ; sonnerie complète si l'app est ouverte.
- **Chronomètre** : démarrer, pause, reprendre, tours (laps) avec meilleur/pire tour, réinitialiser. Continue de tourner si je change de page.
- **Minuteur** : durée réglable, préréglages rapides (1, 5, 10, 25 min), plusieurs minuteurs simultanés, notification à la fin.
- Widgets : horloge 2×2, fuseaux 4×2, prochaine alarme 2×1.

### 6.2 Notes
- Liste des notes (vue grille ou liste), recherche plein texte, tri (date, titre), **épingler** une note, dossiers ou étiquettes.
- Chaque note : **titre** + contenu en **texte enrichi** avec l'éditeur TipTap :
  - **police** (5-6 polices au choix), **taille**, **gras**, *italique*, **souligné**, barré,
  - **couleur du texte**, **surlignage** (plusieurs couleurs),
  - listes à puces / numérotées / cases à cocher, titres, citations, liens,
  - **couleur de fond de la note**.
- Sauvegarde automatique (debounce) avec indicateur « Enregistré ». Corbeille avec restauration pendant 30 jours.
- Widget : aperçu d'une note choisie (2×2).

### 6.3 To-do list (complète)
- **Listes multiples** (Perso, Travail, Courses…) avec couleur et icône.
- Tâche : titre, description, **date/heure d'échéance**, **priorité** (4 niveaux, code couleur), **étiquettes** colorées, **sous-tâches** avec progression, **rappel** (à l'heure ou X min/h/jours avant).
- **Tâches récurrentes** : quotidienne, jours de la semaine choisis, mensuelle (ex. chaque 1er), annuelle, personnalisée (tous les N jours). Cocher une occurrence crée la suivante.
- Vues : Aujourd'hui, À venir, En retard, Toutes, Terminées.
- **Recherche**, **filtres** (liste, priorité, étiquette, date) et **tri** ; **glisser-déposer** pour réordonner et déplacer entre listes.
- Les tâches avec échéance **apparaissent automatiquement dans le calendrier** (et inversement, une tâche peut être créée depuis le calendrier).
- Widget : tâches du jour avec case à cocher directe (2×2 ou 4×2).

### 6.4 Calendrier
- Vues **mois**, **semaine**, **jour** et **agenda** (liste). Bibliothèque suggérée : FullCalendar (modules gratuits).
- Événements : titre, début/fin ou journée entière, lieu, description, couleur, **récurrence**, **rappels multiples** (ex. 1 jour avant + 15 min avant) → notifications push.
- **Connexion à la to-do** : les tâches datées s'affichent (style distinct) et peuvent être cochées depuis le calendrier ; glisser une tâche dans le calendrier change son échéance.
- Créer un événement en cliquant / glissant sur une plage horaire.
- Widget : prochains rendez-vous (2×2 / 4×2).

### 6.5 Musique (contrainte Spotify importante)
**Contexte :** depuis février 2026, l'API Web de Spotify exige que le propriétaire de l'application développeur ait un abonnement **Premium**. Je n'ai **pas** Premium, donc l'API Spotify est inutilisable pour l'instant. Construis la mini-appli ainsi :

- **Statistiques via Last.fm (gratuit)** : je relie mon compte Spotify à Last.fm (scrobbling automatique — guide-moi). L'app utilise l'API Last.fm (clé gérée dans une Edge Function) pour afficher :
  - mes **titres, artistes et albums favoris** du **mois** en cours, du mois précédent, de l'**année** civile en cours et de l'année précédente (périodes calendaires réelles, avec pochettes),
  - le nombre d'écoutes, un petit graphique d'écoute par jour/mois,
  - le **titre en cours d'écoute** (lecture seule) et l'historique récent.
- **Lecteur intégré** : un lecteur Spotify embarqué (iframe officielle `open.spotify.com/embed`) pour mes playlists favorites que j'enregistre par lien. Il ne permet pas de piloter l'app Spotify de mon PC, c'est normal.
- **Prévoir l'évolution** : isoler un module `spotifyPlayback` désactivé, prêt à activer (pause, suivant, précédent, volume via l'API Spotify + PKCE) si je passe un jour à Premium.
- Widget : « En écoute » (2×1 / 4×2) et top artistes du mois (2×2).

### 6.6 Mini Paint
- Canevas de dessin (bibliothèque suggérée : `perfect-freehand` sur canvas, ou Konva) : pinceau (taille, opacité), gomme, pipette, pot de peinture, formes (ligne, rectangle, cercle), texte, palette de couleurs + sélecteur libre, **annuler / rétablir** (Ctrl+Z / Ctrl+Y), zoom, fond de couleur.
- Fonctionne à la souris, au doigt et au stylet (pression si disponible).
- **Galerie** de mes dessins (miniatures, date, titre) : **ouvrir pour modifier**, **dupliquer**, **renommer**, **supprimer** (avec confirmation), **exporter en PNG**.
- Stockage : image PNG + données vectorielles/JSON de l'historique des traits dans Supabase Storage (bucket privé), pour pouvoir **reprendre l'édition** fidèlement.
- Sauvegarde automatique pendant le dessin.
- Widget : dernier dessin (2×2).

### 6.7 Assistant IA (Google Gemini, offre gratuite)
- Bouton IA flottant sur toutes les pages + `Ctrl+K`. Panneau de discussion.
- Modèle : le modèle **Gemini « Flash » le plus récent disponible en offre gratuite** (vérifie le nom exact et les quotas dans la doc). Appels **uniquement via une Edge Function** (clé jamais exposée).
- **Function calling** : l'IA peut exécuter des actions dans l'app, avec un récapitulatif à confirmer pour les actions qui créent/suppriment :
  - `creer_evenement`, `modifier_evenement`, `supprimer_evenement`
  - `ajouter_tache`, `cocher_tache`, `lister_taches`
  - `creer_alarme`, `lancer_minuteur`, `lancer_chronometre`
  - `creer_note`, `rechercher_notes`
  - `ouvrir_appli`, `changer_theme`
  - Exemples à faire fonctionner : « ajoute-moi un rendez-vous mardi prochain de 8 h à 10 h », « lance une alarme dans dix minutes », « qu'est-ce que j'ai demain ? ».
- Les dates relatives sont résolues côté serveur avec la date/heure actuelle et le fuseau `Europe/Paris` transmis dans le contexte.
- **Recherche web** : activer l'ancrage Google Search de Gemini pour les questions d'actualité, avec sources affichées.
- **Mode vocal (gratuit)** : reconnaissance vocale via la Web Speech API du navigateur (`fr-FR`, fonctionne sur Chrome PC et Android), bouton micro maintenu ou clic pour parler, et réponse lue à voix haute (`speechSynthesis`, activable/désactivable).
- Historique des conversations conservé (effaçable). Gérer proprement l'erreur de quota dépassé avec un message clair.

---

## 7. Réglages
- Compte (déconnexion, 2FA), thème, fond d'écran, notifications par appli, « Ne pas déranger », sons, voix de l'IA, fuseau horaire, format d'heure.
- **Export / import** de toutes mes données (JSON + ZIP des dessins) pour sauvegarde.
- Liste des appareils abonnés aux notifications (avec suppression).

---

## 8. Hors-ligne et synchronisation
- L'interface se charge même sans réseau (service worker).
- Les modifications faites hors-ligne sont mises en file d'attente et envoyées au retour de la connexion ; en cas de conflit, la dernière modification gagne.
- Synchronisation en temps réel : une tâche cochée sur le téléphone apparaît cochée sur le PC en quelques secondes.

---

## 9. Lancement au démarrage de Windows
1. Rendre l'app **installable** (manifest, icônes 192/512 px, maskable, nom « MonHub »).
2. Me guider pour l'installer comme application depuis Chrome ou Edge.
3. Me guider pour activer le lancement automatique à la connexion (option native du navigateur pour les apps installées). En solution de secours, fournir un script ou un raccourci à placer dans le dossier `shell:startup`, ouvrant l'app installée en mode application (plein écran si possible).
4. Me guider pour l'installer aussi sur Android (« Ajouter à l'écran d'accueil »).

---

## 10. Modèle de données (Supabase)
Propose puis crée les migrations SQL pour au minimum : `settings`, `layouts` (par type d'appareil), `notifications`, `push_subscriptions`, `world_clocks`, `alarms`, `timers`, `notes`, `note_tags`, `todo_lists`, `tasks` (avec `parent_id` pour les sous-tâches et `recurrence_rule` RRULE), `tags`, `events` (RRULE), `reminders` (liés aux tâches/événements, avec `send_at` et `sent_at`), `drawings`, `music_playlists`, `ai_conversations`, `ai_messages`. Chaque table a `user_id`, `created_at`, `updated_at` et la RLS activée.

---

## 11. Qualité
- Code organisé par mini-appli (`src/apps/clock`, `src/apps/notes`…), chaque mini-appli déclarant son icône, sa page, ses widgets et ses actions IA dans un **registre** central, pour pouvoir en ajouter facilement de nouvelles plus tard.
- Accessibilité de base (contrastes, labels, focus visible).
- `README.md` en français : installation locale, variables d'environnement, déploiement, ajout d'une nouvelle mini-appli.

---

## 12. Plan de réalisation par phases
1. **Socle** : projet Vite/React/TS, Tailwind, thèmes clair/sombre/auto, PWA, déploiement GitHub Pages via Action. *(Pause : création du dépôt GitHub.)*
2. **Supabase & sécurité** : projet, auth + 2FA, RLS, désactivation des inscriptions, écran de connexion. *(Pause : création du projet Supabase.)*
3. **Accueil** : grille 10×6 / 4×6 multipages, mode édition, tiroir d'applications, widgets, layouts synchronisés.
4. **Notifications** : centre de notifications, push VAPID, Edge Function + `pg_cron`.
5. **Horloge** (horloge, fuseaux, alarmes, chrono, minuteur).
6. **To-do** puis **Calendrier** (avec liaison et rappels).
7. **Notes**.
8. **Mini Paint**.
9. **Musique** (Last.fm + lecteur embarqué). *(Pause : compte Last.fm et clé API.)*
10. **Assistant IA** + mode vocal. *(Pause : clé Gemini via Google AI Studio.)*
11. **Réglages, export/import, hors-ligne**.
12. **Démarrage Windows + installation Android**, tests finaux sur les deux appareils.

Commence par la phase 1. Si quelque chose dans ce document te semble irréalisable gratuitement ou contradictoire, dis-le-moi avant de coder et propose une alternative.
