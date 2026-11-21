const interfaceMessages = new Map(
  `
Langue de l’interface|Interface language
Outils de création|Creation tools
Affiche de match|Match graphic
Score en direct|Live score
Bandeau buteur|Goalscorer banner
Score format court|Short-form score
Lineup|Lineup|Composition
Goal Scoreboard|Goalscorer banner|Bandeau buteur
Live Score|Live score|Score en direct
Shorts|Short-form score|Score format court
Showdown|Match graphic|Affiche de match
Miniature vidéo|Video thumbnail
Exporter toutes les données locales (sauvegardes, préférences, ordre des sections) en JSON|Export local saves, preferences and section order as JSON
📤 Export|📤 Export|📤 Exporter
Importer un fichier JSON de sauvegardes|Import a JSON backup file
📥 Import|📥 Import|📥 Importer
Supprimer les sauvegardes locales par section|Delete local saves by section
🗑️ Clear|🗑️ Clear|🗑️ Supprimer
Supprimer les sauvegardes locales|Delete local saves
Sélectionne les sections à effacer. Cette action est définitive et rechargera la page.|Select the sections to delete. This action is permanent and will reload the page.
Préférences (ordre, couleurs)|Preferences (order, colors)
Tout cocher / décocher|Select / deselect all
Annuler|Cancel
Supprimer|Delete
Exporter en JSON|Export as JSON
Sélectionne les sections à exporter. Seules les données des sections cochées seront incluses dans le fichier.|Select sections to export. The file will include the selected sections.
Exporter l’onglet actif|Export the active tab
Exporter|Export
Importer depuis le fichier|Import from file
Sélectionne les sections à importer. Les données existantes des sections cochées seront remplacées.|Select sections to import. Existing data in those sections will be replaced.
Importer|Import
Rechercher un réglage|Find a setting
Ex. espacement, chrono…|E.g. spacing, clock…
Bannière joueur|Goalscorer banner|Bandeau buteur
Buteur et club|Goalscorer and club
Buteur et minute du but|Goalscorer and goal minute
Numéro (optionnel)|Number (optional)
ex: 7|e.g. 7|Ex. 7
Prénom (optionnel)|First name (optional)
ex: Lionel|e.g. Lionel|Ex. Lionel
Nom|Name
Minute|Minute
ex: 45'|e.g. 45'|Ex. 45'
Photo du buteur (fichier dans ./Goalscorers/)|Goalscorer photo (file in ./Goalscorers/)
Retirer la photo|Remove photo
Nom et logo du club|Club name and logo
Nom du club|Club name
Logo du club (fichier dans ./Logos/)|Club logo (file in ./Logos/)
Retirer le logo|Remove logo
Habillage du bandeau|Banner styling
Largeur de la zone gauche|Left area width
Largeur des zones de texte|Text area width
Largeur des zones de texte en pixels|Text area width in pixels
Fond de la zone gauche|Left area background
Couleur 1|Color 1
Couleur 2|Color 2
Direction du gradient|Gradient direction|Direction du dégradé
↓ Vertical (haut → bas)|↓ Vertical (top → bottom)
↑ Vertical inverse|↑ Reverse vertical
→ Horizontal|→ Horizontal
← Horizontal inverse|← Reverse horizontal
Fond du nom et de la minute|Name and minute background
Fond du nom du club|Club name background
Image de fond du bandeau|Banner background image
Activer l'image de fond|Enable background image
Choix de l'image (préréglages)|Preset image
Aucune image|No image
Background 01|Background 01|Fond 01
Background 02|Background 02|Fond 02
Background 03|Background 03|Fond 03
Background 04|Background 04|Fond 04
Background 05|Background 05|Fond 05
Background 06|Background 06|Fond 06
Importer une image personnalisée|Upload a custom image
Retirer l'image personnalisée|Remove custom image
Opacité de l'image|Image opacity
Dégradé d'opacité sur l'image|Image opacity gradient
Direction du dégradé|Gradient direction
→ vers droite|→ Right|→ Vers la droite
← vers gauche|← Left|← Vers la gauche
↓ vers bas|↓ Down|↓ Vers le bas
↑ vers haut|↑ Up|↑ Vers le haut
Opacité fin|End opacity|Opacité finale
Ombres du logo du club|Club logo shadows
Activer les ombres|Enable shadows
Couleur des ombres|Shadow color
Blanc|White
Noir|Black
Intensité des ombres|Shadow intensity
Typographie|Typography
Couleur du texte|Text color
Prénom (haut)|First name (top)
Capitaliser (MAJUSCULES)|Use uppercase|Mettre en majuscules
Police|Font
Cinzel (serif)|Cinzel (serif)|Cinzel (avec empattements)
Système|System
Monospace|Monospace|Chasse fixe
Taille|Size
Poids|Weight|Graisse
Nom (haut)|Last name (top)
Minute (haut, à droite)|Minute (top right)
Nom du club (bas)|Club name (bottom)
Sauvegardes|Saved presets
Charger|Load
Nom de la bannière…|Banner name…|Nom du bandeau…
💾 Enregistrer|💾 Save
Composition d'équipe|Team lineup
Équipe et match|Team and match
Nom et logo|Name and logo
Nom de l'équipe|Team name
Logo de l'équipe (PNG)|Team logo (PNG)
Entraîneur|Coach
Prénom|First name
Nom (gras)|Last name (bold)
Tour, manche et sous-texte|Round, leg and subtitle
Tour|Round
Group phase|Group stage|Phase de groupes
Round of 32|Round of 32|Seizièmes de finale
Round of 16|Round of 16|Huitièmes de finale
Quarter Finals|Quarter-finals|Quarts de finale
Semi Finals|Semi-finals|Demi-finales
Final|Final|Finale
Manche|Leg
Game 1|Game 1|Match 1
Game 2|Game 2|Match 2
Game 3|Game 3|Match 3
First Leg|First leg|Match aller
Second Leg|Second leg|Match retour
Replay|Replay|Match rejoué
— Aucune —|— None —
Extra (année, lieu…)|Additional details (year, venue…)|Complément (année, lieu…)
ex: 1956|e.g. 1956|Ex. 1956
Joueurs et placement|Players and positioning
Coller la liste des joueurs|Paste the player list
Colle la liste (numéro puis nom, une info par ligne). Les marqueurs|Paste the list (number, then name, one item per line). The markers
= gardien et|= goalkeeper and
ou un|or a
collé au numéro = capitaine sont reconnus puis retirés du nom.|next to the number = captain are recognized and removed from the name.
Composition|Lineup
Remplir les joueurs|Fill player slots
Afficher la grille d'alignement|Show alignment grid
💾 Sauvegarde automatique activée|💾 Autosave enabled
Réinitialiser la composition|Reset lineup
Maillots et numéros|Shirts and numbers
Maillots|Shirts
Couleur maillot|Shirt color|Couleur du maillot
Couleur maillot GK|Goalkeeper shirt color|Couleur du maillot du gardien
Style maillot (joueurs de champ)|Shirt style (outfield players)|Style du maillot (joueurs de champ)
Uni|Solid
Manches d'une autre couleur|Contrast sleeves
Rayures verticales|Vertical stripes
Bande verticale|Vertical band
Couleur manches (si applicable)|Sleeve color (if applicable)
Couleur rayures / bande centrale (si applicable)|Stripe / center band color (if applicable)
Numéros|Numbers
Couleur numéro|Number color|Couleur du numéro
Couleur numéro GK|Goalkeeper number color|Couleur du numéro du gardien
Largeur du fond|Background width
Hauteur du fond|Background height
Police des numéros|Number font
Barlow Condensed (par défaut)|Barlow Condensed (default)
Système (San Francisco / Segoe)|System (San Francisco / Segoe)
Couleur du carré derrière le numéro|Color of the square behind the number
Ombres des maillots et du logo|Shirt and logo shadows
Activer les ombres sur les maillots|Enable shirt shadows
Activer les ombres sur le logo de l'équipe|Enable team logo shadows
Intensité|Intensity
Terrain et fond|Pitch and background
Couleurs du fond|Background colors
Couleur fond (haut)|Background color (top)|Couleur du fond (haut)
Couleur fond (bas)|Background color (bottom)|Couleur du fond (bas)
Opacité du fond|Background opacity
Image de fond|Background image
Image de fond du terrain|Pitch background image
Choix de l'image (PNG dans le dossier projet)|Image (PNG in the project folder)
Direction du fade|Fade direction|Direction du fondu
Rayures du terrain|Pitch stripes
Terrain rayé (10 bandes)|Striped pitch (10 bands)
Largeur des rayures|Stripe width
Lignes du terrain|Pitch markings
Ligne médiane + surface de réparation (teal)|Halfway line and penalty area (teal)|Ligne médiane et surface de réparation (bleu-vert)
Épaisseur des lignes teal|Teal line thickness|Épaisseur des lignes bleu-vert
Couleur ligne (début)|Line color (start)|Couleur de ligne (début)
Couleur ligne (fin)|Line color (end)|Couleur de ligne (fin)
Couleur des textes|Text colors
Couleur (équipe, joueurs, coach, sous-texte)|Color (team, players, coach, subtitle)|Couleur (équipe, joueurs, entraîneur, sous-texte)
Nom des joueurs|Player names
Nom de l’entraîneur|Coach name
Poids (prénom)|Weight (first name)|Graisse (prénom)
Sous-texte du match|Match subtitle
Poids (normal)|Weight (regular)|Graisse (normale)
Équipes|Teams
Nom de la sauvegarde…|Preset name…
Formations (positions)|Formations (positions)
Appliquer|Apply
Nom de la formation (ex: 4-3-3)…|Formation name (e.g. 4-3-3)…
💾 Enregistrer formation|💾 Save formation|💾 Enregistrer la formation
Kits (maillots et couleurs)|Kits (shirts and colors)|Tenues (maillots et couleurs)
Nom du kit…|Kit name…|Nom de la tenue…
💾 Enregistrer kit|💾 Save kit|💾 Enregistrer la tenue
Styles de fond|Background styles
Nom du style (ex: Bleu nuit)…|Style name (e.g. Midnight blue)…
💾 Enregistrer style|💾 Save style|💾 Enregistrer le style
Typographies|Typography presets
Nom de la typographie…|Typography preset name…
💾 Enregistrer typographie|💾 Save typography|💾 Enregistrer la typographie
Bandeau score live|Live score banner|Bandeau de score en direct
Équipes et score|Teams and score
Équipe domicile|Home team|Équipe à domicile
Code (3 lettres)|Code (3 letters)
Score|Score
Diminuer|Decrease
Augmenter|Increase
Couleur haute|Top color
Couleur basse|Bottom color
Équipe extérieure|Away team|Équipe à l’extérieur
Largeur des bandeaux d'équipe|Team banner width
Espacement avec le score|Gap around the score
Inverser les équipes, reporter le résultat à l’agrégé et remettre le score du match à zéro|Swap teams, carry the result into the aggregate and reset the match score
⇄ Inverser domicile / extérieur|⇄ Swap home and away
Scores complémentaires|Additional scores
Score agrégé|Aggregate score|Score cumulé
Afficher le score agrégé à droite|Show the aggregate score on the right|Afficher le score cumulé à droite
Domicile|Home
Extérieur|Away
Tirs au but en direct|Live penalty shootout
Afficher les tirs au but sous le score|Show penalties below the score
Ajoute chaque tir au fur et à mesure. Le cumul est calculé automatiquement.|Add each attempt as it happens. The total updates automatically.
Couleur du fond des cases|Cell background color
✓ Réussi|✓ Scored
× Manqué|× Missed
Annuler le dernier tir|Undo the last kick
Réinitialiser les tirs|Reset penalties
Fond du score et chevrons|Score background and chevrons
Couleur centrale|Center color
Opacité commune|Shared opacity
Motif à chevrons|Chevron pattern
Couleur des côtés du dégradé|Gradient edge color
Couleur des chevrons|Chevron color
Chrono|Clock
Afficher la case du chrono|Show the clock box
Couleur du fond du chrono|Clock background color
Logo à gauche|Left logo
Ligue des Champions (ballon)|Champions League (ball)
Taille du logo|Logo size
Couleur du fond|Background color
Couleur du ballon|Ball color
Trophée (séparateur)|Trophy (separator)
Logo du séparateur|Separator logo
Trophée classique|Classic trophy
Trophée Ligue des Champions|Champions League trophy
Trophée Supercoupe de l'UEFA|UEFA Super Cup trophy
Coupe intercontinentale FIFA 2025|2025 FIFA Intercontinental Cup
Trophée Euro|Euro trophy
Trophée en blanc|White trophy
Couleur du trophée|Trophy color
Taille du trophée|Trophy size
Codes équipe|Team codes|Codes des équipes
Tableau de tournoi|Tournament bracket
Titre du tournoi|Tournament title
Lieu et année finale|Final venue and year|Lieu et année de la finale
Logo central (PNG officiel)|Center logo (official PNG)
Réinitialiser le logo|Reset logo
Couleur fond|Background color|Couleur du fond
Bandeau horizontal à placer en haut du Short. Pour les logos, choisis les fichiers dans|Place this horizontal banner at the top of the short video. For logos, choose files from|Bandeau horizontal à placer en haut de la vidéo courte. Pour les logos, choisis les fichiers dans
. Les tirs au but se règlent indépendamment dans leur section dédiée.|. Use the penalty shootout section to set penalties separately.
Équipes et match|Teams and match
Tour et saison|Round and season
Saison / année|Season / year
Quart de finale|Quarter-final
Demi-finales|Semi-finals
Finale|Final
Logo de l'équipe|Team logo
Score (laisser vide pour un espace blanc)|Score (leave empty for a blank space)
Tirs au but|Penalty shootout
Afficher les tirs au but dans le bandeau Shorts|Show penalties in the short-form banner|Afficher les tirs au but dans le bandeau de la vidéo courte
Saisis les tentatives indépendamment de l’onglet Live Score.|Enter penalty attempts separately from the Live score tab.|Saisis les tentatives indépendamment de l’onglet Score en direct.
Couleur de fond des cases|Cell background color
Largeur des fonds des tirs|Penalty cell width|Largeur des cases de tirs
La largeur minimale permet d’afficher cinq tirs sur une ligne. À partir du sixième, ils passent à la ligne suivante.|The minimum width fits five kicks per row. Further kicks wrap to the next row.
Réinitialiser les tirs Shorts|Reset the short-form penalties|Réinitialiser les tirs au but
Dimensions du bloc central|Center block dimensions
Largeur du bloc central|Center block width
Position verticale du bloc tour / saison (− haut / + bas)|Round / season block vertical position (− up / + down)
Largeur des cases de score|Score cell width
Couleurs et bordure du bloc central|Center block colors and border
Bordure du bloc score — couleur de départ|Score block border — start color
Bordure du bloc score — couleur de fin|Score block border — end color
Épaisseur de la bordure du bloc score|Score block border thickness
Fond de la case tour / saison|Round / season cell background
Typographie du tour et de la saison|Round and season typography
Police du tour et de la saison|Round and season font
System|System|Système
Taille de la police du tour et de la saison|Round and season font size
Taille et espacement des logos d’équipe|Team logo size and spacing
Taille des logos des clubs|Club logo size
Espace entre les logos et le bloc central|Gap between logos and the center block
Compétition|Competition
Choix et position du logo|Logo selection and position
Logo de la compétition|Competition logo
Aucun logo|No logo
UEFA Champions League|UEFA Champions League|Ligue des champions de l’UEFA
UEFA Super Cup|UEFA Super Cup|Supercoupe de l’UEFA
FIFA Intercontinental Cup|FIFA Intercontinental Cup|Coupe intercontinentale de la FIFA
Logo de trophée|Trophy logo
Logo personnalisé (optionnel)|Custom logo (optional)
Convertir le logo en blanc|Make the logo white
Taille du logo de la compétition|Competition logo size
Position verticale du logo de compétition (− haut / + bas)|Competition logo vertical position (− up / + down)
Fond et bordure du cadre|Frame background and border
Fond du cadre du logo de compétition|Competition logo frame background
Bordure du logo — couleur de départ|Logo border — start color
Bordure du logo — couleur de fin|Logo border — end color
Épaisseur de la bordure du logo|Logo border thickness
Showdown (panel match)|Match graphic|Affiche de match
⇄ Intervertir les équipes|⇄ Swap teams
Équipe 1 (gauche)|Team 1 (left)
Nom équipe 1|Team 1 name|Nom de l’équipe 1
Logo équipe 1 (PNG)|Team 1 logo (PNG)|Logo de l’équipe 1 (PNG)
Équipe 2 (droite)|Team 2 (right)
Nom équipe 2|Team 2 name|Nom de l’équipe 2
Logo équipe 2 (PNG)|Team 2 logo (PNG)|Logo de l’équipe 2 (PNG)
Informations du match|Match details
Lieu|Venue
Date|Date
ex: 12 MAR 2026|e.g. 12 MAR 2026|Ex. 12 MAR 2026
Arbitre|Referee
Nationalité de l’arbitre|Referee nationality
Ex. FRA|E.g. FRA
Score et buteurs|Score and goalscorers
Score du match|Match score
Afficher le score au centre|Show the score in the center
Score équipe 1|Team 1 score|Score de l’équipe 1
Score équipe 2|Team 2 score|Score de l’équipe 2
Afficher le score des tirs au but|Show the penalty shootout score
Tirs au but équipe 1|Team 1 penalties|Tirs au but de l’équipe 1
Tirs au but équipe 2|Team 2 penalties|Tirs au but de l’équipe 2
Buteurs équipe 1 (gauche)|Team 1 goalscorers (left)|Buteurs de l’équipe 1 (gauche)
Buteurs équipe 2 (droite)|Team 2 goalscorers (right)|Buteurs de l’équipe 2 (droite)
Un buteur par ligne, format :|One goalscorer per line, using this format:
Nom § minute|Name § minute
Ex :|E.g.
Liste des buteurs|Goalscorer list
Habillage|Styling
Dégradé de fond|Background gradient
Choix de l'image|Image selection
Result|Result|Résultat
Euro 1984 (avec logo)|Euro 1984 (with logo)
Euro 1984 (sans logo)|Euro 1984 (without logo)
Bordure supérieure|Top border
Afficher la ligne du haut|Show the top line
Épaisseur|Thickness
Couleur début|Start color|Couleur de départ
Couleur fin|End color|Couleur de fin
Logos et espacement|Logos and spacing
Afficher le logo central|Show the center logo
Logo central|Center logo
Logos d'équipe|Team logos
Écart entre les équipes|Gap between teams
Ombres des logos|Logo shadows
Ombre du logo équipe 1|Team 1 logo shadow|Ombre du logo de l’équipe 1
Ombre du logo équipe 2|Team 2 logo shadow|Ombre du logo de l’équipe 2
Couleur et ombre du texte|Text color and shadow
Ombres du texte|Text shadows
Tour (haut)|Round (top)
Noms d'équipes|Team names
Lieu, date et arbitre|Venue, date and referee
Couleur|Color
Buteurs|Goalscorers
Showdown complet|Full match graphic|Affiche de match complète
Nom du showdown…|Match graphic name…|Nom de l’affiche…
Fonds|Backgrounds
Nom du fond…|Background name…
💾 Enregistrer fond|💾 Save background|💾 Enregistrer le fond
Nom de la typo…|Typography preset name…|Nom de la typographie…
Équipe et joueur|Team and player
Année|Year
Couleurs du club|Club colors
Stade|Stadium
Rendu en temps réel|Live preview
Fond + équipe|Background + team
Fond seul|Background only
Équipe seule|Team only
Fond et équipe séparés (ZIP)|Separate background and team (ZIP)
Fond + texte|Background + text
Équipes seules|Teams only
Fond et équipes séparés (ZIP)|Separate background and teams (ZIP)
Résolution|Resolution
Exporter l’aperçu|Export preview
Exporter les rendus sauvegardés|Export saved graphics
— Aucune bannière sauvegardée —|— No saved banners —|— Aucun bandeau sauvegardé —
— Aucune équipe sauvegardée —|— No saved teams —
— Aucune formation sauvegardée —|— No saved formations —
— Aucun style sauvegardé —|— No saved styles —
— Aucune typographie sauvegardée —|— No saved typography presets —
— Aucun kit sauvegardé —|— No saved kits —|— Aucune tenue sauvegardée —
— Aucune sauvegarde —|— No saved presets —
— Aucune affiche sauvegardée —|— No saved match graphics —
— Aucun fond sauvegardé —|— No saved backgrounds —
Choisir une sauvegarde…|Select a preset…
Donne un nom à la bannière.|Enter a name for the banner.|Donne un nom au bandeau.
Donne un nom à la sauvegarde.|Enter a name for the preset.
Donne un nom à la formation.|Enter a name for the formation.
Donne un nom au style.|Enter a name for the style.
Donne un nom à la typographie.|Enter a name for the typography preset.
Donne un nom au kit.|Enter a name for the kit.|Donne un nom à la tenue.
Donne un nom au showdown.|Enter a name for the match graphic.|Donne un nom à l’affiche.
Donne un nom au fond.|Enter a name for the background.
Image trop volumineuse pour être sauvegardée localement. Elle reste active pour la session.|The image is too large to save locally. It will remain active for this session.
Réinitialiser la composition aux valeurs par défaut ?|Reset the lineup to its defaults?
Sélectionne au moins une section à exporter.|Select at least one section to export.
Sélectionne au moins une section à importer.|Select at least one section to import.
Sélectionne au moins une section à supprimer.|Select at least one section to delete.
Fichier JSON invalide :|Invalid JSON file:
Aucune donnée trouvée dans le fichier.|No data found in the file.
Préférences|Preferences
Aucun réglage trouvé dans cet onglet.|No settings found in this tab.
{count} résultat|{count} result
{count} résultats|{count} results
Sauvegarde enregistrée.|Preset saved.
Aucun joueur détecté.|No players found.
{n} joueur(s) appliqué(s).|{n} player(s) added.|{n} joueur(s) ajouté(s).
{n} ignoré(s) (max {max}).|{n} skipped (max {max}).
{n} emplacement(s) inchangé(s).|{n} slot(s) unchanged.
Supprimer toutes les sauvegardes locales de : {names} ?|Delete all local saves for {names}?
Cette action est irréversible. La page sera rechargée.|This is permanent. The page will reload.
Importer {teams} équipe(s), {formations} formation(s), {styles} style(s), {banners} bandeau(x), {typos} typographie(s), {graphics} affiche(s), {graphicTypos} typographie(s) d’affiche et {backgrounds} fond(s) d’affiche ?|Import {teams} team(s), {formations} formation(s), {styles} style(s), {banners} banner(s), {typos} typography preset(s), {graphics} match graphic(s), {graphicTypos} match typography preset(s) and {backgrounds} match background(s)?
Les entrées avec le même nom seront écrasées par celles du fichier.|Entries with the same name will be replaced by the ones from the file.
Import terminé : {teams} équipe(s), {formations} formation(s), {styles} style(s), {banners} bandeau(x), {typos} typographie(s), {graphics} affiche(s), {graphicTypos} typographie(s) d’affiche et {backgrounds} fond(s) d’affiche.|Import complete: {teams} team(s), {formations} formation(s), {styles} style(s), {banners} banner(s), {typos} typography preset(s), {graphics} match graphic(s), {graphicTypos} match typography preset(s) and {backgrounds} match background(s).
Capitaine|Captain
GK|GK|GA
QF1 — Haut Gauche|QF1 — Top left|Quart 1 — Haut gauche
QF2 — Bas Gauche|QF2 — Bottom left|Quart 2 — Bas gauche
QF3 — Haut Droite|QF3 — Top right|Quart 3 — Haut droite
QF4 — Bas Droite|QF4 — Bottom right|Quart 4 — Bas droite
Nom équipe|Team name|Nom de l’équipe
Initiales|Initials
Affiché si pas de PNG|Shown when there is no PNG|Affiché en l’absence de PNG
Couleur de secours|Fallback color
Importer un PNG|Upload a PNG
Supprimer le logo|Remove logo
Personnalisé — {file}|Custom — {file}
{requested} px (réduit à {actual} px)|{requested} px (reduced to {actual} px)
{requested} px (limité à {actual} px)|{requested} px (limited to {actual} px)
Saisis un nom pour cette sauvegarde.|Enter a name for this preset.
La sauvegarde Shorts n'a pas pu être enregistrée.|Could not save the short-form preset.|Impossible d’enregistrer le préréglage de score format court.
La sauvegarde Shorts n'a pas pu être chargée.|Could not load the short-form preset.|Impossible de charger le préréglage de score format court.
La sauvegarde Shorts n'a pas pu être supprimée.|Could not delete the short-form preset.|Impossible de supprimer le préréglage de score format court.
Quota localStorage atteint : {n} logo(s) intégré(s) dans d’anciennes sauvegardes ont été retirés pour libérer de l’espace. Sélectionne-les de nouveau dans ./Logos/ si nécessaire.|Browser storage is full. Removed {n} embedded logo(s) from older presets to free space. Select them again from ./Logos/ if needed.
Impossible de sauvegarder : quota localStorage toujours dépassé. Supprime quelques showdowns sauvegardés et réessaie.|Browser storage is still full. Delete some saved match graphics and try again.|L’espace de stockage local est toujours plein. Supprime quelques affiches sauvegardées et réessaie.
Failed to load|Failed to load|Échec du chargement de
Image load failed:|Image load failed:|Échec du chargement de l’image :
Impossible de générer le PNG.|Could not generate the PNG.
Export échoué :|Export failed:
Export des rendus échoué :|Could not export saved graphics:
Aucune sauvegarde complète à exporter dans cet onglet.|There are no complete presets to export from this tab.
Préparation de l’export…|Preparing export…
Export {position}/{total}…|Exporting {position}/{total}…|Exportation {position}/{total}…
{color} — clic pour appliquer, clic droit pour retirer|{color} — click to apply, right-click to remove
Sauvegarder cette couleur dans la palette|Save this color to the palette
↘ Diagonal|↘ Diagonal|↘ Diagonale
↗ Diagonal|↗ Diagonal|↗ Diagonale
100 Thin|100 Thin|100 Très fin
300 Light|300 Light|300 Léger
400 Regular|400 Regular|400 Normal
500 Medium|500 Medium|500 Moyen
600 Semibold|600 Semibold|600 Demi-gras
700 Bold|700 Bold|700 Gras
800 Extra-Bold|800 Extra-Bold|800 Extra-gras
900 Black|900 Black|900 Très gras
8 équipes (quart de finale)|8 teams (quarter-finals)|8 équipes (quarts de finale)
Composants de la miniature|Thumbnail layers
Joueur de gauche|Left player
Joueur de droite|Right player
Logo du club de gauche|Left club logo
Logo du club de droite|Right club logo
Afficher le logo de la compétition en blanc|Show the competition logo in white
Texte de la miniature|Thumbnail text
Titre (en anglais)|Title (in English)
Ajuster le placement|Adjust placement
Élément à ajuster|Layer to adjust
Décalage X (%)|X offset (%)
Décalage Y (%)|Y offset (%)
Échelle (%)|Scale (%)
Rétablir le placement|Reset placement
Impossible d’ouvrir l’image {file}.|Could not open the image {file}.
Patiente jusqu’à la fin du chargement des images.|Wait for the images to finish loading.
Ombres et éclairage|Shadows and lighting
Ombre sur les joueurs|Shading on players
Ombre derrière les joueurs|Shadows behind players
Ombre sur les écussons|Shading on club logos
Ombre derrière les écussons|Shadows behind club logos
Composition sauvegardée|Saved composition
Composition chargée.|Composition loaded.
Impossible d’enregistrer la composition.|Could not save the composition.
Impossible de charger la composition.|Could not load the composition.
Impossible d’accéder aux compositions sauvegardées.|Could not access saved compositions.
Supprimer la sauvegarde|Delete preset
Impossible de supprimer la composition.|Could not delete the composition.
Typographie et barres|Typography and bars
Taille (px)|Size (px)
Italique|Italic
Réduire automatiquement les titres longs|Automatically shrink long titles
Barres de l’année|Year bars
Afficher les barres|Show bars
Couleur supérieure|Top color
Couleur inférieure|Bottom color
Longueur (px)|Length (px)
Épaisseur (px)|Thickness (px)
Écart avec l’année (px)|Gap from year (px)
Écart entre les barres (px)|Gap between bars (px)
Miniatures sauvegardées|Saved thumbnails
Styles de miniature|Thumbnail styles
Nom du préréglage…|Preset name…
Couleur de l’ombre des joueurs|Player shadow color
Couleur de l’ombre de l’écusson gauche|Left club logo shadow color
Couleur de l’ombre de l’écusson droit|Right club logo shadow color
Dossier de sauvegarde|Backup folder
Réautorise le dossier de sauvegarde pour reprendre la copie automatique.|Grant access to the backup folder to resume automatic backups.
Ce navigateur ne permet pas d’écrire dans un dossier. Ouvre l’éditeur dans Chrome ou Edge.|This browser cannot write to a folder. Open the editor in Chrome or Edge.
Impossible d’écrire dans le dossier de sauvegarde. Vérifie son accès.|Could not write to the backup folder. Check its permissions.
Sauvegarde copiée dans « {folder} ».|Backup written to “{folder}”.
Bibliothèque|Library
Campagne|Campaign
Nouvelle campagne|New campaign
Équipe|Team
Saison|Season
Créer la campagne|Create campaign
Classer la sélection|File selected items
Match|Match
Type de visuel|Graphic type
Vues de la bibliothèque|Library views
Actualiser|Refresh
Tout replier|Collapse all
Tout déplier|Expand all
Toutes les campagnes|All campaigns
À classer|Unfiled
Tous les types|All types
Archiver la campagne|Archive campaign
Réactiver la campagne|Restore campaign
Archiver le match|Archive match
Réactiver le match|Restore match
Archiver|Archive
Campagne archivée.|Campaign archived.
Match archivé.|Match archived.
Match réactivé.|Match restored.
Ce match est dans les archives. Réactive-le pour l’utiliser.|This match is archived. Restore it to use it.
Réactiver|Restore
Supprimer la campagne|Delete campaign
Supprimer le match|Delete match
Supprimer le match {name}|Delete match {name}
Le match contient de nouvelles sauvegardes. Vérifie son contenu avant de le supprimer.|The match has new saved items. Review its contents before deleting it.
Match supprimé.|Match deleted.
Supprimer définitivement « {name} » et ses {count} sauvegarde(s) ?|Permanently delete “{name}” and its {count} saved item(s)?
La campagne contient de nouvelles sauvegardes. Vérifie son contenu avant de la supprimer.|The campaign has new saved items. Review its contents before deleting it.
Campagne réactivée.|Campaign restored.
Campagne supprimée.|Campaign deleted.
Ouvrir|Open
Dupliquer|Duplicate
(copie)|(copy)
Sélectionner {name}|Select {name}
Connecte le dossier de sauvegarde pour afficher la bibliothèque.|Connect the backup folder to view the library.
Aucune sauvegarde dans cette vue.|No saved items in this view.
Impossible de lire ou d’écrire dans la bibliothèque.|Could not read or write to the library.
Impossible d’ouvrir cette sauvegarde.|Could not open this saved item.
Style de miniature|Thumbnail style
Fond d’affiche|Showdown background|Fond de Showdown
Typographie d’affiche|Showdown typography|Typographie de Showdown
Préréglages|Presets
Tenue|Kit
Formation|Formation
Style de fond|Background style
Depuis la bibliothèque|From the library
Aucun média disponible pour cet emplacement.|No media available for this layer.
Choisir un média|Choose a media file
Bibliothèque connectée à « {folder} ».|Library connected to “{folder}”.
Choisir un tour|Choose a round
Média|Media
Utiliser|Use
Nouveau match|New match
Équipe adverse|Opponent
Créer et activer le match|Create and activate match
Match de destination|Destination match
Effacer les copies du navigateur|Clear browser copies
Fermer le match actif|Close active match
Importer des sauvegardes|Import saved items
Importer {count} sauvegarde(s) ?|Import {count} saved item(s)?
Import terminé. Les styles déjà présents ont été ignorés.|Import complete. Existing styles were skipped.
Campagnes|Campaigns
Match actif|Active match
Match actif : {name}|Active match: {name}
Activer le match|Activate match
Activer|Activate
Activé|Activated
Styles globaux|Global styles
Archives|Archives
Les sauvegardes en attente seront copiées dès que le dossier sera accessible.|Pending saves will be written when the folder is accessible.
Fichier JSON invalide.|Invalid JSON file.
Enregistrement dans la bibliothèque en attente.|Waiting to save to the library.
Sauvegarde enregistrée dans la bibliothèque.|Saved to the library.
Organisation|Organization
Déposer dans…|Drop into…
Glisser pour déplacer|Drag to move
Déplacement enregistré.|Move saved.
Supprimer {name}|Delete {name}
Supprimer définitivement « {name} » de la bibliothèque ?|Permanently delete “{name}” from the library?
Sauvegarde supprimée de la bibliothèque.|Saved item deleted from the library.
Renommer|Rename
Actions pour {name}|Actions for {name}
Renommer la campagne|Rename campaign
Renommer le match|Rename match
Nouveau nom de la campagne|New campaign name
Nouveau nom affiché pour le match|New display name for the match
Campagne renommée.|Campaign renamed.
Match renommé.|Match renamed.
Un match porte déjà ce nom pour ce tour.|A match with that name already exists for this round.
Nouveau nom de la sauvegarde|New name for the saved item
Nommer la sauvegarde|Name the saved item
Équipe du Lineup|Lineup team
Choisir…|Choose…
Version du Showdown|Showdown version
Enregistrer|Save
Indique l’équipe du Lineup.|Enter the lineup team.
Remplacer la sauvegarde « {name} » ?|Replace the saved item “{name}”?
Une sauvegarde porte déjà ce nom dans ce dossier.|A saved item with that name already exists in this folder.
Sauvegarde renommée.|Saved item renamed.
  `.trim().split("\n").map((line) => {
    const [source, en, fr = source] = line.split("|").map((part) => part.replaceAll("§", "|"));
    return [source, { fr, en }];
  }),
);

const languageControl = document.getElementById("app-language");
let interfaceLanguage = "fr";
try {
  if (localStorage.getItem("ucl-interface-language") === "en") interfaceLanguage = "en";
} catch {
  // The selector still works when storage is unavailable.
}

function translate(source, variables = {}) {
  const message = interfaceMessages.get(source)?.[interfaceLanguage] ?? source;
  return message.replace(/\{(\w+)\}/g, (token, key) => variables[key] ?? token);
}

// Bind only markup present at startup. User-entered text and preset names stay intact.
const interfaceBindings = [];
const originalSectionNames = new WeakMap();
for (const summary of document.querySelectorAll(".collapsible > summary")) {
  originalSectionNames.set(summary, summary.textContent);
}
function bindInterfaceMessage(read, write) {
  const original = read();
  const source = original.trim().replace(/\s+/g, " ");
  if (!interfaceMessages.has(source)) return;
  const before = original.match(/^\s*/)[0];
  const after = original.match(/\s*$/)[0];
  interfaceBindings.push(() => write(before + translate(source) + after));
}

const interfaceText = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
while (interfaceText.nextNode()) {
  const node = interfaceText.currentNode;
  if (node.parentElement.closest('script, style, textarea, .tab[lang="en"], option[lang="en"], .preview-container[lang="en"]')) continue;
  bindInterfaceMessage(() => node.data, (value) => { node.data = value; });
}
for (const element of document.querySelectorAll("[title], [placeholder], [aria-label], [alt]")) {
  if (element.closest('.preview-container[lang="en"]')) continue;
  for (const attribute of ["title", "placeholder", "aria-label", "alt"]) {
    if (element.hasAttribute(attribute)) {
      bindInterfaceMessage(
        () => element.getAttribute(attribute),
        (value) => element.setAttribute(attribute, value),
      );
    }
  }
}

function updateInterfaceLanguage() {
  document.documentElement.lang = interfaceLanguage;
  languageControl.value = interfaceLanguage;
  interfaceBindings.forEach((update) => update());
}

updateInterfaceLanguage();
languageControl.addEventListener("change", () => {
  interfaceLanguage = languageControl.value;
  try {
    localStorage.setItem("ucl-interface-language", interfaceLanguage);
  } catch {
    // Keep the current choice for this session.
  }
  updateInterfaceLanguage();
  document.dispatchEvent(new Event("interface-language-change"));
});
