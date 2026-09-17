/**
 * Blast Lockpick - Script Principal de Crochetage (Skyrim Style)
 */

document.addEventListener("DOMContentLoaded", () => {
    // --- Éléments DOM ---
    const appEl = document.getElementById("lockpick-app");
    const containerEl = document.getElementById("lock-container");
    const cylinderEl = document.getElementById("lock-cylinder");
    const pickAssemblyEl = document.getElementById("pick-assembly");
    const pickBodyEl = document.getElementById("pick-body");
    const pickBrokenTipEl = document.getElementById("pick-broken-tip");
    const tensionWrenchEl = document.getElementById("tension-wrench");
    const sparkContainerEl = document.getElementById("spark-container");
    const difficultyLabelEl = document.getElementById("difficulty-label");
    const picksCountEl = document.getElementById("picks-count");
    const picksIconsEl = document.getElementById("picks-icons");
    const statusBannerEl = document.getElementById("status-banner");
    const statusTextEl = document.getElementById("status-text");
    const quitterBtn = document.getElementById("quitter");

    // --- Configuration des Difficultés (Calibrées pour un défi exigeant) ---
    const DIFFICULTIES = {
        "tres_facile": { label: "SERRURE : TRÈS FACILE", tolerance: 7.0, maxHealth: 180, damageRate: 80 },
        "tresfacile": { label: "SERRURE : TRÈS FACILE", tolerance: 7.0, maxHealth: 180, damageRate: 80 },
        "facile": { label: "SERRURE : FACILE", tolerance: 4.5, maxHealth: 150, damageRate: 95 },
        "moyen": { label: "SERRURE : MOYENNE", tolerance: 2.8, maxHealth: 110, damageRate: 115 },
        "moyenne": { label: "SERRURE : MOYENNE", tolerance: 2.8, maxHealth: 110, damageRate: 115 },
        "difficile": { label: "SERRURE : DIFFICILE", tolerance: 1.8, maxHealth: 85, damageRate: 135 },
        "expert": { label: "SERRURE : EXPERT", tolerance: 1.1, maxHealth: 65, damageRate: 155 },
        "maitre": { label: "SERRURE : MAÎTRE", tolerance: 0.65, maxHealth: 45, damageRate: 180 }
    };

    // --- État du Jeu ---
    let config = DIFFICULTIES["maitre"];
    let remainingPicks = 3;
    let initialPicks = 3;
    let sweetSpotAngle = 0; // Entre -82° et +82°
    let currentPickAngle = 0; // Entre -90° et +90°
    let targetPickAngle = 0;
    let currentCylinderAngle = 0; // Entre 0° et 90°
    let isTurning = false;
    let isStuck = false;
    let isBroken = false;
    let isUnlocked = false;
    let isGameOver = false;
    let pickHealth = 150;
    let lastTime = performance.now();
    let lastClickAngle = 0;
    let audioInitialized = false;

    // Touches pressées
    const activeKeys = new Set();

    // Initialisation depuis l'URL (si external-iframe ou navigateur direct)
    function initFromURL() {
        const urlParams = window.params || new URLSearchParams(window.location.search);
        const diffParam = (urlParams.get("difficulty") || urlParams.get("diff") || "moyen").toLowerCase();
        const picksParam = parseInt(urlParams.get("picks") || urlParams.get("crochets") || "3", 10);

        if (DIFFICULTIES[diffParam]) {
            config = DIFFICULTIES[diffParam];
        } else {
            config = DIFFICULTIES["moyen"];
        }

        if (!isNaN(picksParam) && picksParam > 0) {
            remainingPicks = picksParam;
            initialPicks = picksParam;
        }

        startNewGame(config, remainingPicks);
    }

    // Démarrage ou réinitialisation d'une session
    function startNewGame(difficultyConfig, picks) {
        config = difficultyConfig || DIFFICULTIES["moyen"];
        remainingPicks = (typeof picks === "number") ? picks : remainingPicks;
        initialPicks = remainingPicks;

        // Choix du sweet spot aléatoire (entre -82° et +82°)
        sweetSpotAngle = (Math.random() * 164) - 82;

        currentPickAngle = 0;
        targetPickAngle = 0;
        currentCylinderAngle = 0;
        isTurning = false;
        isStuck = false;
        isBroken = false;
        isUnlocked = false;
        isGameOver = false;
        pickHealth = config.maxHealth;

        // Mise à jour de l'UI
        difficultyLabelEl.textContent = config.label;
        statusBannerEl.classList.add("hidden");
        statusBannerEl.classList.remove("error");
        cylinderEl.classList.remove("unlocked-glow");
        renderPicksUI();
        resetPickVisual();

        // Réactivation curseur
        if (typeof window.curseur === "function") {
            window.curseur(false);
        }
    }

    // Affichage des crochets restants et des icônes
    function renderPicksUI() {
        picksCountEl.textContent = remainingPicks;
        picksIconsEl.innerHTML = "";

        const totalIcons = Math.max(initialPicks, remainingPicks);
        for (let i = 0; i < totalIcons; i++) {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.classList.add("pick-icon-svg");
            if (i >= remainingPicks) {
                svg.classList.add("lost");
            }
            svg.innerHTML = `<path fill="currentColor" d="M19 3l-4 4h-2l-7 7v4l4-4 7-7V5l2-2z"/>`;
            picksIconsEl.appendChild(svg);
        }
    }

    // Remettre le crochet en place après casse ou démarrage
    function resetPickVisual() {
        pickBodyEl.style.display = "block";
        pickBodyEl.classList.remove("pick-snapped", "pick-stuck-shake");
        pickBrokenTipEl.style.display = "none";
        pickBrokenTipEl.classList.remove("pick-snapped");
        pickAssemblyEl.style.transform = `translate(0px, 0px) rotate(${currentPickAngle - 90}deg)`;
        cylinderEl.style.transform = `rotate(0deg)`;
        currentCylinderAngle = 0;
        isBroken = false;
        isStuck = false;
        pickHealth = config.maxHealth;
    }

    // Gestion de l'orientation du crochet à la souris
    function handleMouseMove(e) {
        if (isBroken || isUnlocked || isGameOver) return;

        // Initialiser l'audio dès la première interaction
        if (!audioInitialized && window.lockAudio) {
            window.lockAudio.init();
            audioInitialized = true;
        }

        // Si la serrure est déjà tournée, on empêche de déplacer le crochet (comme dans Skyrim)
        if (currentCylinderAngle > 2) return;

        const rect = containerEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;

        // Calcul de l'angle par rapport au haut (12h = 0°)
        // dx > 0 -> angle positif (vers la droite)
        // dx < 0 -> angle négatif (vers la gauche)
        let angleDeg = Math.atan2(dx, -dy) * (180 / Math.PI);

        // Si le curseur passe sous la serrure, on bride à -90° ou +90°
        if (-dy < 0) {
            angleDeg = dx < 0 ? -90 : 90;
        }

        // Clamping strict entre -90° et +90°
        targetPickAngle = Math.max(-90, Math.min(90, angleDeg));

        // Détection de petits clics de goupille lors du balayage
        if (Math.abs(targetPickAngle - lastClickAngle) > 8) {
            if (window.lockAudio) {
                window.lockAudio.playPinClick(0.6);
            }
            lastClickAngle = targetPickAngle;
        }
    }

    // Gestion du clavier (Touches de rotation et d'abandon)
    function handleKeyDown(e) {
        if (!audioInitialized && window.lockAudio) {
            window.lockAudio.init();
            audioInitialized = true;
        }

        if (e.code === "Escape" || e.code === "Backspace") {
            handleAbandon();
            return;
        }

        // Touches pour tourner la serrure : Z, W, D, Espace, Flèches
        if (
            e.code === "KeyW" || 
            e.code === "KeyZ" || 
            e.code === "KeyD" || 
            e.code === "Space" || 
            e.code === "ArrowUp" || 
            e.code === "ArrowRight"
        ) {
            activeKeys.add(e.code);
            isTurning = true;
        }
    }

    function handleKeyUp(e) {
        activeKeys.delete(e.code);
        // S'il n'y a plus de touche de rotation active
        const hasTurnKey = ["KeyW", "KeyZ", "KeyD", "Space", "ArrowUp", "ArrowRight"].some(k => activeKeys.has(k));
        if (!hasTurnKey) {
            isTurning = false;
        }
    }

    // Calcul de la rotation maximale autorisée en fonction de l'angle du crochet
    function calculateMaxCylinderAngle() {
        const diff = Math.abs(currentPickAngle - sweetSpotAngle);
        const tolerance = config.tolerance;

        if (diff <= tolerance) {
            // Dans la zone parfaite : rotation totale à 90°
            return 90;
        }

        // Fenêtre de détection resserrée : la serrure ne commence à tourner que si on est dans un rayon de 30°
        const detectionRadius = 30;
        if (diff > detectionRadius) {
            // Loin du sweet spot : blocage quasi immédiat (0° à 2°)
            return Math.min(2, Math.max(0, 2 * (1 - (diff - detectionRadius) / 60)));
        }

        // Plus on s'approche de la tolérance, plus la serrure tourne, avec une courbe exponentielle abrupte
        const proximity = (detectionRadius - diff) / (detectionRadius - tolerance);
        return Math.max(2, Math.min(84, 2 + Math.pow(proximity, 2.8) * 82));
    }

    // Cassure du crochet
    function triggerPickBreak() {
        if (isBroken) return;
        isBroken = true;
        isStuck = false;
        remainingPicks--;

        if (window.lockAudio) {
            window.lockAudio.stopAll();
            window.lockAudio.playPickBreak();
        }

        // Animation de casse
        pickBodyEl.classList.remove("pick-stuck-shake");
        pickBodyEl.classList.add("pick-snapped");
        pickBrokenTipEl.style.display = "block";
        pickBrokenTipEl.classList.add("pick-snapped");

        renderPicksUI();

        // Si aucun crochet restant : Échec définitif
        if (remainingPicks <= 0) {
            isGameOver = true;
            statusTextEl.textContent = "AUCUN CROCHET RESTANT";
            statusBannerEl.classList.add("error");
            statusBannerEl.classList.remove("hidden");

            setTimeout(() => {
                if (window.terminerMiniJeu) {
                    window.terminerMiniJeu(false);
                } else if (window.fermer) {
                    window.fermer(false);
                }
            }, 1200);
            return;
        }

        // Sinon, réinitialiser avec un nouveau crochet après 750ms
        setTimeout(() => {
            if (window.lockAudio) {
                window.lockAudio.playPickInsert();
            }
            resetPickVisual();
        }, 750);
    }

    // Déverrouillage réussi (Victoire)
    function triggerUnlockSuccess() {
        if (isUnlocked) return;
        isUnlocked = true;
        isStuck = false;
        currentCylinderAngle = 90;

        if (window.lockAudio) {
            window.lockAudio.stopAll();
            window.lockAudio.playUnlockSuccess();
        }

        cylinderEl.classList.add("unlocked-glow");
        statusTextEl.textContent = "SERRURE DÉVERROUILLÉE";
        statusBannerEl.classList.remove("error");
        statusBannerEl.classList.remove("hidden");

        if (window.terminerMiniJeu) {
            window.terminerMiniJeu(true);
        } else if (window.fermer) {
            window.fermer(true);
        }
    }

    // Génération de petites étincelles de frottement métallique
    function spawnSparks() {
        if (Math.random() > 0.4) return;
        const spark = document.createElement("div");
        spark.classList.add("spark-dot");

        const rect = cylinderEl.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();
        const originX = rect.left - containerRect.left + rect.width / 2;
        const originY = rect.top - containerRect.top + rect.height / 2;

        const angle = Math.random() * Math.PI * 2;
        const dist = 10 + Math.random() * 25;
        const dx = Math.cos(angle) * dist + "px";
        const dy = Math.sin(angle) * dist + "px";

        spark.style.left = `${originX + (Math.random() - 0.5) * 16}px`;
        spark.style.top = `${originY + (Math.random() - 0.5) * 16}px`;
        spark.style.setProperty("--dx", dx);
        spark.style.setProperty("--dy", dy);

        sparkContainerEl.appendChild(spark);
        setTimeout(() => spark.remove(), 350);
    }

    // Abandon
    function handleAbandon() {
        if (window.lockAudio) window.lockAudio.stopAll();
        if (window.terminerMiniJeu) {
            window.terminerMiniJeu(false);
        } else if (window.fermer) {
            window.fermer(false);
        }
    }

    // --- Boucle d'Animation et de Physique (60 FPS) ---
    function update(time) {
        const dt = Math.min(0.1, (time - lastTime) / 1000);
        lastTime = time;

        if (!isBroken && !isUnlocked && !isGameOver) {
            // 1. Suivi fluide du crochet vers la cible (interpolation)
            if (currentCylinderAngle < 1) {
                currentPickAngle += (targetPickAngle - currentPickAngle) * Math.min(1, dt * 18);
            }

            // 2. Gestion de la rotation du barillet
            const maxTurn = calculateMaxCylinderAngle();

            if (isTurning) {
                // Tourner vers maxTurn
                const turnSpeed = 135; // degrés par seconde
                if (currentCylinderAngle < maxTurn) {
                    currentCylinderAngle = Math.min(maxTurn, currentCylinderAngle + turnSpeed * dt);
                    if (window.lockAudio) {
                        window.lockAudio.updateRotationScrape(1.2);
                    }
                }

                // Si le barillet atteint le blocage (et n'a pas atteint 90°)
                if (currentCylinderAngle >= maxTurn && maxTurn < 90) {
                    isStuck = true;
                    // Vibration et tension
                    const stressIntensity = Math.min(1, (90 - maxTurn) / 45);
                    if (window.lockAudio) {
                        window.lockAudio.updateTensionSound(0.5 + stressIntensity * 0.5);
                    }

                    // Dégradation de la durabilité
                    pickHealth -= config.damageRate * dt;
                    spawnSparks();

                    if (pickHealth <= 0) {
                        triggerPickBreak();
                    }
                } else {
                    isStuck = false;
                    if (window.lockAudio) {
                        window.lockAudio.updateTensionSound(0);
                    }
                }

                // Condition de victoire
                if (currentCylinderAngle >= 89.5) {
                    currentCylinderAngle = 90;
                    triggerUnlockSuccess();
                }
            } else {
                // Relâchement : retour élastique du barillet vers 0°
                isStuck = false;
                if (currentCylinderAngle > 0) {
                    const returnSpeed = 240; // degrés par seconde
                    currentCylinderAngle = Math.max(0, currentCylinderAngle - returnSpeed * dt);
                    if (window.lockAudio) {
                        window.lockAudio.updateRotationScrape(currentCylinderAngle > 2 ? 0.6 : 0);
                        window.lockAudio.updateTensionSound(0);
                    }
                } else {
                    if (window.lockAudio) {
                        window.lockAudio.stopAll();
                    }
                }
            }

            // 3. Application des transformations visuelles
            // Le crochet pivote également légèrement avec le barillet quand celui-ci tourne
            const combinedPickAngle = currentPickAngle + (currentCylinderAngle * 0.15);
            
            let shakeX = 0;
            let shakeY = 0;
            let shakeRot = 0;

            if (isStuck) {
                const shakeAmp = 1.8;
                shakeX = (Math.random() - 0.5) * shakeAmp;
                shakeY = (Math.random() - 0.5) * shakeAmp;
                shakeRot = (Math.random() - 0.5) * 1.5;
            }

            pickAssemblyEl.style.transform = `translate(${shakeX}px, ${shakeY}px) rotate(${combinedPickAngle - 90 + shakeRot}deg)`;
            cylinderEl.style.transform = `rotate(${currentCylinderAngle}deg)`;
        }

        requestAnimationFrame(update);
    }

    // --- Événements et Listeners ---
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    if (quitterBtn) {
        quitterBtn.addEventListener("click", handleAbandon);
    }

    // Réception des messages NUI FiveM
    window.addEventListener("message", (event) => {
        const data = event.data;
        if (!data) return;

        if (data.action === "open" || data.action === "start") {
            const diff = data.difficulty || "moyen";
            const picks = data.picks || 3;
            appEl.style.display = "flex";
            startNewGame(DIFFICULTIES[diff] || DIFFICULTIES["moyen"], picks);
        } else if (data.action === "close") {
            appEl.style.display = "none";
            if (window.lockAudio) window.lockAudio.stopAll();
        }
    });

    // Lancement automatique
    initFromURL();
    requestAnimationFrame(update);
});
