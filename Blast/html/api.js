/**
 * Blast Lockpick - API external-iframe & FiveM NUI bridge
 * Compatible avec https://external-iframe et NUI standard FiveM
 */

const API_BASE = "https://external-iframe";

// Détection du nom de ressource FiveM (si présent en mode NUI direct)
const RESOURCE_NAME = (typeof window.GetParentResourceName === "function") 
    ? window.GetParentResourceName() 
    : "blast_lockpick";

// Paramètres de l'URL
const params = new URLSearchParams(window.location.search);
const token = params.get("token"); // Jeton JWT RS256 éventuel

/**
 * Ferme la page et rend la main au joueur.
 * { success: true } est optionnel (utile pour un mini-jeu de hack réussi/raté).
 */
function fermer(success) {
    const payload = { success: !!success };

    // 1. Appel API external-iframe
    fetch(API_BASE + "/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    }).catch(() => {});

    // 2. Appel fallback NUI FiveM direct
    fetch(`https://${RESOURCE_NAME}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    }).catch(() => {});

    fetch(`https://${RESOURCE_NAME}/lockpickResult`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    }).catch(() => {});
}

/**
 * À appeler au focus/blur d'un champ de saisie pour libérer le clavier du jeu
 * le temps que le joueur tape (le push-to-talk est rétabli au blur).
 */
function saisie(actif) {
    fetch(API_BASE + "/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typing: !!actif }),
    }).catch(() => {});
}

/**
 * Masque le curseur souris tout en gardant le focus clavier de la page
 * (ex: mini-jeu qui se joue au clavier et gêné par le curseur).
 */
function curseur(masque) {
    fetch(API_BASE + "/cursor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: !!masque }),
    }).catch(() => {});
}

/**
 * Verrouiller/déverrouiller une OU plusieurs portes, ou activer/désactiver
 * une ou plusieurs zones, en une seule fois (une seule action limitée).
 * Seuls les ids configurés sur le point sont autorisés, et le joueur doit
 * rester proche du point. Renvoie { ok } ou { ok: false, retryAfterMs }.
 */
async function controler(kind, ids, state, opts = {}) {
    try {
        const res = await fetch(API_BASE + "/control", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind, ids: [].concat(ids), state, ...opts }),
        });
        return await res.json();
    } catch (err) {
        console.warn("[Lockpick API] controler failed:", err);
        return { ok: false, error: err.message };
    }
}

/**
 * État courant des portes/zones autorisées sur ce point.
 * { ok: true, doors: [{ id, locked }], zones: [{ id, active }] }
 */
async function statut() {
    try {
        const res = await fetch(API_BASE + "/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
        });
        return await res.json();
    } catch (err) {
        console.warn("[Lockpick API] statut failed:", err);
        return { ok: false, doors: [], zones: [] };
    }
}

/**
 * Gestionnaire intelligent de fin de mini-jeu :
 * - Si succès et que des portes/zones sont paramétrées dans l'URL, les déverrouille automatiquement
 * - Puis ferme la page proprement
 */
async function terminerMiniJeu(success) {
    if (success) {
        // Déverrouillage automatique de porte(s) si spécifié dans l'URL
        const doorsParam = params.get("doors") || params.get("door");
        const zoneParam = params.get("zone") || params.get("zones");
        const autoClose = params.get("autoCloseAfter") ? parseInt(params.get("autoCloseAfter"), 10) : undefined;

        const promises = [];

        if (doorsParam) {
            const doorIds = doorsParam.split(",")
                .map(id => parseInt(id.trim(), 10))
                .filter(id => !isNaN(id));
            if (doorIds.length > 0) {
                const opts = autoClose ? { autoCloseAfter: autoClose } : {};
                // state = false pour déverrouiller
                promises.push(controler("doorlock", doorIds, false, opts));
            }
        }

        if (zoneParam) {
            const zoneIds = zoneParam.split(",")
                .map(id => parseInt(id.trim(), 10))
                .filter(id => !isNaN(id));
            if (zoneIds.length > 0) {
                // state = false pour désactiver la zone
                promises.push(controler("zone", zoneIds, false));
            }
        }

        if (promises.length > 0) {
            try {
                await Promise.all(promises);
            } catch (e) {
                console.error("[Lockpick] Erreur lors du contrôle des portes/zones :", e);
            }
        }
    }

    // Petite temporisation pour laisser le joueur apprécier le son et l'animation de fin
    setTimeout(() => {
        fermer(success);
    }, 600);
}

// Initialisation des écouteurs de saisie sur tous les inputs / textarea
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("input, textarea").forEach((el) => {
        el.addEventListener("focus", () => saisie(true));
        el.addEventListener("blur", () => saisie(false));
    });
});

// Export sur l'objet global window
window.fermer = fermer;
window.saisie = saisie;
window.curseur = curseur;
window.controler = controler;
window.statut = statut;
window.terminerMiniJeu = terminerMiniJeu;
window.params = params;
window.token = token;
