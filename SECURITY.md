# Sécurité de MonHub

Le code de MonHub est public (c'est la condition pour héberger gratuitement sur GitHub Pages). Ce document explique pourquoi **mes données, elles, ne sont pas publiques**.

## Ce qui est public, et pourquoi ce n'est pas grave

| Élément public | Pourquoi c'est sans danger |
|---|---|
| Le code source | Il décrit *comment* l'app fonctionne, pas *ce qu'elle contient*. Aucune donnée personnelle n'est dans le dépôt. |
| L'URL du projet Supabase | Elle dit seulement où se trouve la base. Sans compte autorisé, elle ne donne accès à rien. |
| La clé publique (`publishable` / `anon`) | Elle est faite pour être vue : elle finit dans le JavaScript que télécharge n'importe quel visiteur. Elle identifie l'app auprès de Supabase mais **n'accorde aucun droit sur les données** : ces droits sont décidés par la Row Level Security (ci-dessous). |
| Le site sur GitHub Pages | Sans connexion, il n'affiche que l'écran de connexion. |

## Ce qui protège les données

1. **Un seul compte, inscriptions fermées.** Mon compte a été créé depuis le tableau de bord Supabase et l'option « Allow new users to sign up » est désactivée : personne ne peut se créer de compte, même en appelant directement l'API.
2. **Mot de passe + double authentification (TOTP).** À la première connexion, l'app impose la configuration d'une application d'authentification.
3. **Row Level Security (RLS) sur chaque table**, appliquée par PostgreSQL lui-même, pas par l'app :
   - une ligne n'est lisible, créable, modifiable ou supprimable que si son `user_id` est celui de l'utilisateur connecté ;
   - une politique **restrictive** supplémentaire exige une session de niveau `aal2`, c'est-à-dire validée par le code 2FA. **Un mot de passe volé ne suffit donc pas** à lire la moindre donnée ;
   - le rôle `anon` (visiteur non connecté) n'a aucun droit.

   Ce modèle est appliqué à chaque nouvelle table par la fonction `private.secure_table()` (voir `supabase/migrations/`).
4. **Stockage de fichiers privé.** Les dessins et images sont dans un bucket privé soumis à la même règle.
5. **Les clés secrètes ne quittent jamais le serveur.** Gemini, Last.fm, la clé VAPID privée et la clé `service_role` sont stockées uniquement dans les secrets des Edge Functions Supabase. Elles ne sont ni dans le code, ni dans git, ni dans le navigateur.
6. **Edge Functions verrouillées.** Chaque fonction vérifie qui l'appelle et refuse tout le reste :
   - appel par l'app : jeton de connexion vérifié (signature, expiration), qui doit appartenir au propriétaire (`OWNER_USER_ID`, stocké en secret) **et** être de niveau `aal2` (2FA) ;
   - appel par `pg_cron` (envoi des rappels chaque minute) : secret partagé (`CRON_SECRET`), stocké dans les secrets des fonctions et dans **Supabase Vault** côté base, jamais dans le dépôt ;
   - boutons des notifications (« Reporter », « Marquer comme fait ») : le service worker n'a pas de session ; chaque rappel porte un **jeton aléatoire de 192 bits** qui n'autorise que ces deux actions, sur ce seul rappel. Il ne permet de lire aucune donnée.
7. **Last.fm et Spotify.** La clé API Last.fm est un secret des Edge Functions (`LASTFM_API_KEY`) : l'app passe par la fonction `lastfm`, réservée au propriétaire. Le module de contrôle Spotify (désactivé tant qu'il n'y a pas d'abonnement Premium) utilise OAuth PKCE : aucune clé secrète n'est nécessaire dans le navigateur.
8. **Notifications push chiffrées.** Le contenu est chiffré de bout en bout (Web Push, RFC 8291) avec les clés de chaque appareil : le service de push du navigateur (Google, Microsoft) ne peut pas le lire. La clé VAPID privée qui signe les envois n'existe que dans les secrets des fonctions.

## Ce qu'il ne faut jamais faire

- Committer un fichier `.env` / `.env.local` contenant autre chose que l'URL et la clé publique (ils sont de toute façon ignorés par git).
- Mettre la clé `service_role` ou une « secret key » Supabase côté front ou dans les secrets GitHub Actions.
- Désactiver la RLS sur une table, ou créer une table sans appeler `private.secure_table()`.
- Réactiver les inscriptions.

## Si je perds mon téléphone (application 2FA)

Dans le tableau de bord Supabase : **Authentication → Users → mon compte → supprimer le facteur MFA**. À la connexion suivante, l'app proposera d'en configurer un nouveau. Penser à changer aussi le mot de passe.

## En cas de doute

Le **Security Advisor** du tableau de bord Supabase (Advisors → Security) signale toute table sans RLS ou politique trop permissive.
