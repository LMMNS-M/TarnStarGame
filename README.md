# TarnStarGame · Shooting Wishes

Mini-jeu tactile portrait 9:16, sans dépendance applicative ni étape de compilation. Les images, la vidéo et les sons originaux restent inchangés.

## Lancer

Depuis ce dossier :

```bash
python3 -m http.server 8080
```

Ouvrir http://localhost:8080. Sur un téléphone connecté au même Wi-Fi, ouvrir `http://ADRESSE_IP_DU_PC:8080` (le pare-feu doit permettre la connexion). Un serveur HTTP est nécessaire pour les modules JavaScript et le préchargement audio ; ne pas ouvrir directement le fichier HTML en `file://`.

## Jouer

Toucher START GAME. Après 3 / 2 / 1 / GO, attraper les étoiles blanches et dorées, éviter les rouges. Deux doigts sont acceptés. Trois captures positives successives activent le combo ; la troisième capture garde sa valeur normale, les suivantes sont doublées. Une rouge touchée ou une positive ratée remet la série à zéro. Une rouge retire un point, avec un score minimum de 0 ; le record initial est 0.

La vidéo, avec sa propre musique, démarre au début du compte à rebours. Le gameplay dure 60 secondes à partir de GO, TIME UP arrive donc vers 63 secondes de vidéo. La vidéo continue naturellement jusqu’à 70,27 secondes. Le résultat apparaît 1,25 seconde après TIME UP, et le nouveau record 0,6 seconde plus tard.

Si l’onglet est masqué, le temps réel continue de s’écouler ; au retour, la vidéo est recalée et les étoiles expirées ne sont plus capturables. Le bouton ♪ coupe ensemble la musique intégrée et les effets.

## Configuration et intégration

- `js/config.js` : durées, quantités, multiplicateur de hitbox, URL suivante.
- `js/assets.js` : chemins réels et rectangles de contenu visible des PNG.
- `js/timeline.js` : séquence et règles de score pures.
- `js/audio.js` : sons préchargés, AudioContext activé au premier geste, lectures superposées sans limite artificielle.
- `js/game.js` : horloge unique, vidéo, UI, étoiles, Replay et `onNext()`.
- `css/game.css` : proportions, positionnement, animations et zones tactiles.

Pour NEXT, renseigner `NEXT_URL` dans `js/config.js`. Une application hôte peut lancer le jeu avec `window.startStarsGame()` ou `window.tarnStarGame.start()`. À la validation de NEXT, elle peut définir `window.onStarsGameComplete(result)`, écouter `stars-game-complete`, ou conserver l’événement annulable `tarn:next`. Le résultat contient `{ score, best, attempts, replays }`. Sans destination, un message « À suivre… » s’affiche.

Le classement Supabase utilise exclusivement `public.tarn_star_scores`, sans cache localStorage. Configurez les accès propres à TarnStarGame et la table avec [SUPABASE_SETUP.md](SUPABASE_SETUP.md). Ce document contient aussi **RESET TEST SCORES**, la commande de remise à zéro réservée à l’administrateur. Aucun accès ni donnée de KimiGame2 n’est repris.

## Audit des assets

L’arborescence réelle est `assets/`, `css/`, `js/` en minuscules. 18 PNG, 19 MP3 et une vidéo ont été trouvés. Aucune image ni aucun son d’origine n’a été modifié ou renommé.

Correspondances particulières :

| Attendu | Fichier réel |
| --- | --- |
| countdown-go.mp3 | assets/audio/game-events/countown-go.mp3 |
| red-star-catch.mp3 | assets/audio/star-catch/red-star-cach.mp3 |
| hurry-up.png | Ajouté au dossier pendant le développement, intégré et utilisé |

Les deux encadrés Best Score sont distincts et employés dans leurs écrans respectifs. Les grandes marges transparentes sont compensées par un conteneur CSS ; les fichiers PNG sont utilisés directement avec leurs transparences et couleurs originales. Tous les éléments graphiques attendus sont disponibles.

## Vérifier

```bash
npm test
```

Les tests de logique vérifient 1 000 séquences : pool exact, phases 12/17/21/30, réserve finale d’or, espacement, durée, randomisation et règles de combo.

Pour le scénario navigateur, ouvrir `http://localhost:8080/?test`, puis cliquer START. Deux parties de 60 secondes sont jouées automatiquement, avec deux pointerId tactiles, contrôle anti-double comptage, sons du countdown, combo, fin, vidéo, record et Replay. Le rapport s’affiche dans la page. Les captures sont synthétiques : un essai sur de vrais appareils iOS/Android reste utile pour valider le ressenti des pouces et le mix sonore des haut-parleurs.

Le mode de test utilise un classement en mémoire sans contacter Supabase afin de préserver les vrais records. Le mode normal ne charge pas ce scénario de test. `window.tarnStarGame.snapshot()` permet une inspection en lecture seule, sans changer le temps ou le score.
