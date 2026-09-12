# TarnStarGame — Supabase

TarnStarGame est indépendant de KimiGame2. Ne réutilisez ni sa table, ni sa configuration, ni ses données. Créez de préférence un projet Supabase dédié à TarnStarGame, puis exécutez le SQL ci-dessous dans son **SQL Editor** avec le rôle administrateur `postgres`.

## Installation

```sql
begin;
create table public.tarn_star_scores (
  id uuid primary key default gen_random_uuid(),
  score integer not null check (score between 0 and 216),
  nickname text not null check (char_length(btrim(nickname)) between 1 and 24),
  created_at timestamptz not null default now()
);
create index tarn_star_scores_ranking
  on public.tarn_star_scores (score desc, created_at asc, id asc);
alter table public.tarn_star_scores enable row level security;
revoke all on table public.tarn_star_scores from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on table public.tarn_star_scores to anon, authenticated;
grant insert (score, nickname) on public.tarn_star_scores to anon, authenticated;
create policy tarn_scores_read on public.tarn_star_scores
  for select to anon, authenticated using (true);
create policy tarn_scores_insert on public.tarn_star_scores
  for insert to anon, authenticated with check (true);
commit;
```

Ce script d'installation est à exécuter une seule fois sur une table neuve. Les visiteurs peuvent lire et ajouter un score, mais n'ont aucun droit UPDATE, DELETE ou TRUNCATE. Aucune politique de suppression n'est créée. Ces permissions suivent la [documentation Supabase sur la sécurisation de l'API](https://supabase.com/docs/guides/api/securing-your-api) et la [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

Dans `js/supabase-config.js`, renseignez l'URL du projet dédié et sa clé publique **publishable** (ou `anon`) :

```js
export const SUPABASE = Object.freeze({
 URL: 'https://VOTRE-PROJET-TARN.supabase.co',
 PUBLIC_KEY: 'VOTRE-CLE-PUBLIQUE-TARN',
});
```

Ne publiez jamais une clé `service_role` ou une clé secrète. GitHub Pages sert directement ces fichiers ; aucun build ni SDK n'est nécessaire. Vérifiez que l'API Data est activée et expose le schéma `public`.

Le jeu lit et affiche les cinq meilleurs scores (à égalité, le plus ancien gagne). Il propose de sauvegarder un pseudo lorsque le score entre dans le TOP 5 ; seuls les scores validés par le joueur sont enregistrés. Une table vide affiche **BEST SCORE / 0**, sans pseudo. La première partie, même à zéro, permet de saisir un pseudo et d'établir le premier record. Un score de zéro déjà enregistré n'est pas considéré comme une table vide.

Le classement distant ne possède aucun cache local persistant. En cas d'erreur réseau, le jeu reste jouable, affiche un message et propose de réessayer la lecture. Il ne traite pas une erreur comme un classement vide. Sans URL/clé, le classement n'est pas opérationnel. Les scores sont calculés dans le navigateur : ces permissions empêchent la suppression par les visiteurs, mais ne constituent pas un système anti-triche.

## RESET TEST SCORES

Juste avant d'envoyer le jeu à Tarn, ouvrez **le projet Supabase de TarnStarGame → SQL Editor**, avec le rôle administrateur `postgres`, puis exécutez exactement :

```sql
TRUNCATE TABLE public.tarn_star_scores;
```

Cette commande supprime définitivement **tous les scores** de cette seule table et conserve sa structure, son index et ses permissions. Aucun bouton public de reset n'existe dans le jeu. Aucun visiteur ne dispose du droit de supprimer les scores : la remise à zéro se fait uniquement depuis l'interface administrateur Supabase / SQL Editor.

Vérification facultative dans SQL Editor :

```sql
SELECT count(*) AS remaining_scores FROM public.tarn_star_scores;
```

Le résultat doit être `0`. Fermez les parties de test encore ouvertes, puis rechargez la page GitHub Pages normale (sans `?test`) : le jeu relit la table et affiche automatiquement **BEST SCORE / 0**, sans pseudo, y compris dans un navigateur utilisé pour les tests. Il ne récupère aucun record de localStorage. Tarn pourra établir le premier vrai record et saisir son pseudo après sa partie.

Les essais manuels sur la page normale écrivent dans `tarn_star_scores` et sont effacés par la commande ci-dessus. Le scénario automatisé `?test` utilise uniquement un classement en mémoire, perdu au rechargement, et ne contacte jamais Supabase.

## Vérification avant publication

1. Charger la page normale avec une table vide : record 0, aucun pseudo.
2. Terminer une partie sans attraper d'étoile : la saisie du premier pseudo est proposée à 0 point.
3. Enregistrer le pseudo puis recharger sur un autre navigateur : le record et le pseudo sont identiques.
4. Avec les accès publics, vérifier que PATCH et DELETE sur la table sont refusés et qu'aucune ligne ne disparaît.
5. Exécuter RESET TEST SCORES comme administrateur, puis recharger dans les deux navigateurs : retour à 0 sans pseudo.
6. Tester une coupure réseau : erreur visible, aucune confirmation de sauvegarde fictive ; réessayer après reconnexion.
