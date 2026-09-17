/**
 * Blast Lockpick - Moteur Audio Hybride Haute Fidélité
 * Utilise les enregistrements audio Foley WAV réels (inspirés de la référence YouTube)
 * avec bruit de tension mécanique feutré/non-strident et rotation silencieuse.
 */

class RealisticLockAudio {
    constructor() {
        this.ctx = null;
        this.isInitialized = false;

        // Éléments audio préchargés
        this.audioElements = {
            pickMoves: [
                new Audio("sounds/pick_move_1.wav"),
                new Audio("sounds/pick_move_2.wav"),
                new Audio("sounds/pick_move_3.wav"),
                new Audio("sounds/pick_move_4.wav")
            ],
            strain: new Audio("sounds/tension_strain.wav"),
            break: new Audio("sounds/pick_break.wav"),
            open: new Audio("sounds/lock_open.wav")
        };

        // Configuration de la boucle de tension (non-stridente)
        this.audioElements.strain.loop = true;
        this.audioElements.strain.volume = 0;

        this.lastPickVariant = -1;
        this.lastPickTime = 0;
    }

    init() {
        if (this.isInitialized) return;

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            this.ctx = new AudioCtx();
            if (this.ctx.state === "suspended") {
                this.ctx.resume();
            }
        }

        // Préchargement de tous les sons
        Object.values(this.audioElements).forEach(item => {
            if (Array.isArray(item)) {
                item.forEach(a => {
                    a.load();
                    a.volume = 0.55;
                });
            } else if (item) {
                item.load();
            }
        });

        this.isInitialized = true;
    }

    /**
     * 1. MANIPULATION DU CROCHET (Pick Move / Jiggle)
     * Micro-cliquetis de goupille ultra-feutré, doux et discret (anti-agression auditive)
     */
    playPinClick(intensity = 0.5) {
        const now = performance.now();
        // Cooldown de 120ms pour éviter toute mitraillette de clics
        if (now - this.lastPickTime < 120) return;
        this.lastPickTime = now;

        const moves = this.audioElements.pickMoves;
        if (!moves || moves.length === 0) return;

        let variant = Math.floor(Math.random() * moves.length);
        if (variant === this.lastPickVariant) {
            variant = (variant + 1) % moves.length;
        }
        this.lastPickVariant = variant;

        const snd = moves[variant].cloneNode();
        // Volume très doux, discret et feutré
        snd.volume = Math.max(0.04, Math.min(0.18, 0.12 * intensity));
        snd.playbackRate = 0.98 + Math.random() * 0.05;
        snd.play().catch(() => {});
    }

    /**
     * 2. ROTATION DU BARILLET
     * Retiré selon la demande de l'utilisateur (silencieux)
     */
    updateRotationScrape(velocity) {
        // Silencieux
    }

    /**
     * 3. VIBRATION SOUS TENSION (Quand le barillet bloque)
     * Son mécanique sourd, feutré et non-strident (vibration basse fréquence)
     */
    updateTensionSound(intensity) {
        const strainSnd = this.audioElements.strain;
        if (!strainSnd) return;
        const clamped = Math.max(0, Math.min(1, intensity));

        if (clamped > 0.05) {
            // Volume progressif doux sans agressivité
            strainSnd.volume = Math.min(0.65, 0.12 + clamped * 0.45);
            strainSnd.playbackRate = 1.0; // Vitesse constante et stable, pas de montée stridente
            if (strainSnd.paused) {
                strainSnd.play().catch(() => {});
            }
        } else {
            strainSnd.volume = 0;
            if (!strainSnd.paused) {
                strainSnd.pause();
                strainSnd.currentTime = 0;
            }
        }
    }

    /**
     * 4. CASSE DU CROCHET (Pick Break)
     * Rupture sèche de l'acier avec tintement métallique
     */
    playPickBreak() {
        this.stopAll();
        const breakSnd = this.audioElements.break.cloneNode();
        breakSnd.volume = 0.85;
        breakSnd.play().catch(() => {});
    }

    /**
     * 5. DÉVERROUILLAGE LOURD (Lock Open)
     * Déclic franc et pêne massif qui saute
     */
    playUnlockSuccess() {
        this.stopAll();
        const openSnd = this.audioElements.open.cloneNode();
        openSnd.volume = 0.9;
        openSnd.play().catch(() => {});
    }

    /**
     * 6. INSERTION D'UN NOUVEAU CROCHET
     */
    playPickInsert() {
        if (this.audioElements.pickMoves.length > 0) {
            const snd = this.audioElements.pickMoves[0].cloneNode();
            snd.volume = 0.35;
            snd.playbackRate = 1.1;
            snd.play().catch(() => {});
        }
    }

    stopAll() {
        const strainSnd = this.audioElements.strain;
        if (strainSnd) {
            strainSnd.volume = 0;
            if (!strainSnd.paused) {
                strainSnd.pause();
                strainSnd.currentTime = 0;
            }
        }
    }
}

window.lockAudio = new RealisticLockAudio();
