# 🗝️ Blast Lockpick — Mini-jeu de Crochetage Style Skyrim (FiveM & external-iframe)

Mini-jeu de crochetage ultra-réaliste inspiré de **The Elder Scrolls V: Skyrim** et **Fallout**, optimisé pour **FiveM** et nativement compatible avec le protocole **`https://external-iframe`**.

---

## ✨ Fonctionnalités

- **Mécanique authentique Skyrim** :
  - La souris oriente le crochet (-90° à +90°).
  - Maintenir **`Z`**, **`W`**, **`Espace`** ou **`Flèche Haut`** fait tourner le barillet avec la clé de tension.
  - "Sweet spot" aléatoire généré à chaque tentative.
  - Résistance progressive : plus vous êtes proche de l'angle idéal, plus la serrure tourne loin avant de bloquer.
  - Tremblement violent du crochet lorsqu'il est bloqué sous tension.
  - Usure du crochet et bris spectaculaire en deux morceaux avec animation et sons métalliques.
- **Bruitages Foley Réalistes (Inspirés de la référence YouTube)** :
  - **Fichiers audio WAV réels** intégrés dans `html/sounds/` : cliquetis métallique de fouille du crochet (`pick_move_1` à `4`), vibration mécanique feutrée et non-stridente sous contrainte (`tension_strain`), rupture nette du crochet (`pick_break`) et déverrouillage massif du pêne (`lock_open`). Rotation du barillet rendue silencieuse.
- **Design Visuel Haute Fidélité** :
  - Barillet en laiton, fente réaliste, plaque en fer forgé avec rivets, clé de tension synchronisée.
  - Interface Skyrim avec typographie cinématique, indication de difficulté et compteur de crochets restants.
- **Double Compatibilité Totale** :
  - **1. Mode `external-iframe`** : Support natif des routes `https://external-iframe/leave`, `/cursor`, `/typing`, `/control` et `/status`.
  - **2. Mode Ressource FiveM Standard** : Intégration via exports Lua (`startLockpick`), animation du joueur, blocage des contrôles et commande `/lockpick`.

---

## 🚀 1. Utilisation via `external-iframe` (Web / Points d'Interaction)

Si votre serveur utilise un système de fenêtres web externes (`https://external-iframe`), la page prend directement en charge toutes les routes fournies.

### Paramètres d'URL supportés :
| Paramètre | Description | Exemple |
|---|---|---|
| `difficulty` | Difficulté (`tres_facile`, `facile`, `moyen`, `difficile`, `expert`, `maitre`) | `?difficulty=difficile` |
| `picks` | Nombre de crochets accordés au joueur (défaut: 3) | `?picks=4` |
| `door` / `doors` | ID(s) de porte(s) à déverrouiller automatiquement en cas de succès | `?door=42` ou `?doors=42,43` |
| `autoCloseAfter` | Durée en secondes avant reverrouillage automatique | `?autoCloseAfter=30` |
| `zone` | ID de zone à désactiver en cas de succès | `?zone=7` |
| `token` | Jeton JWT RS256 éventuel | `?token=eyJhbGci...` |

### Exemple d'URL :
```
https://votre-domaine.com/blast_lockpick/html/index.html?difficulty=moyen&picks=3&door=42&autoCloseAfter=30
```

### Comportement automatique :
1. À l'ouverture, `curseur(false)` est appelé pour afficher la souris.
2. Le joueur crochète la serrure.
3. En cas de succès :
   - Si des `doors` ou `zone` ont été passés dans l'URL, l'API appelle automatiquement `controler("doorlock", ids, false, { autoCloseAfter })`.
   - L'API envoie ensuite `fermer(true)`.
4. En cas d'abandon (touche **Échap** ou bouton **Quitter**) ou si tous les crochets cassent, l'API envoie `fermer(false)`.

---

## 🎮 2. Installation en Ressource FiveM Standard

### Installation :
1. Déposez le dossier `blast_lockpick` (ou le contenu de `Blast`) dans votre dossier `resources/[scripts]/`.
2. Ajoutez la ligne suivante dans votre fichier `server.cfg` :
```cfg
ensure blast_lockpick
```

### Commande de test en jeu :
Dans le chat ou la console F8 :
```
/lockpick [facile|moyen|difficile|expert|maitre] [nombre_crochets]
```
*Exemples :*
- `/lockpick` *(Difficulté moyenne, 3 crochets)*
- `/lockpick facile 5`
- `/lockpick maitre 2`

---

## 💻 3. Intégration dans vos Scripts FiveM (Lua)

### A. Méthode avec Callback (Universelle) :
```lua
exports['blast_lockpick']:startLockpick('moyen', 3, function(success)
    if success then
        print("^2Serrure crochetee avec succes !^7")
        -- Donner l'objet, ouvrir la porte, crocheter le coffre, etc.
    else
        print("^1Echec du crochetage.^7")
    end
end)
```

### B. Méthode Synchrone / Promesse (Style ox_lib) :
```lua
local success = exports['blast_lockpick']:startLockpick('difficile', 2)
if success then
    print("Porte deverrouillee !")
else
    print("Crochetage rate.")
end
```

### C. Exemple d'item utilisable ESX / QBCore :
```lua
-- Exemple d'utilisation d'un item "lockpick" dans votre inventaire :
ESX.RegisterUsableItem('lockpick', function(source)
    local xPlayer = ESX.GetPlayerFromId(source)
    TriggerClientEvent('mon_script:startLockpick', source)
end)

-- Côté Client :
RegisterNetEvent('mon_script:startLockpick', function()
    exports['blast_lockpick']:startLockpick('moyen', 1, function(success)
        if success then
            ESX.ShowNotification("Vous avez réussi à crocheter la serrure !")
        else
            ESX.ShowNotification("Le crochet s'est brisé dans la serrure...")
            TriggerServerEvent('mon_script:removeLockpick')
        end
    end)
end)
```

---

## ⌨️ Commandes & Contrôles Joueur

| Action | Contrôle |
|---|---|
| **Orienter le crochet** | Déplacer la souris |
| **Tourner la serrure** | Maintenir **`Z`** (AZERTY) / **`W`** (QWERTY) / **`Espace`** / **`Flèche Haut`** |
| **Abandonner** | Touche **`Échap`** ou clic sur le bouton **Quitter** |

---

## 🎚️ Niveaux de Difficulté

| Difficulté | Tolérance angulaire | Résistance du crochet |
|---|---|---|
| **Très Facile** | 7.0° | Élevée |
| **Facile** | 4.5° | Moyenne |
| **Moyen** | 2.8° | Exigeant (recherche fine nécessaire) |
| **Difficile** | 1.8° | Faible (très précis, casse rapide sous tension) |
| **Expert** | 1.1° | Très faible (extrême précision requise) |
| **Maître** | 0.65° | Millimétrique (défi ultime) |

---

## 📁 Structure des Fichiers

```
blast_lockpick/
├── fxmanifest.lua           # Manifeste FiveM
├── client/
│   └── main.lua             # Animation joueur, contrôles et exports
├── server/
│   └── main.lua             # Démarrage et logs
├── html/
│   ├── index.html           # Structure NUI Skyrim
│   ├── style.css            # Rendu graphique en laiton/acier forgé et animations
│   ├── audio.js             # Moteur Web Audio procédural (clics, grincements, casse)
│   ├── api.js               # Passerelle https://external-iframe et NUI FiveM
│   └── script.js            # Moteur physique, sweet-spot et boucle de jeu
└── README.md                # Documentation complète
```
