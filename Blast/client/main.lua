--[[
    Blast Lockpick - Script Client FiveM
    Mini-jeu de crochetage de serrure style Skyrim
]]

local isLockpicking = false
local currentPromise = nil
local currentCallback = nil

-- Animation de crochetage
local function playLockpickAnim()
    local ped = PlayerPedId()
    local animDict = "anim@amb@clubhouse@tutorial@bkr_tut_ig3@"
    local animName = "machinic_loop_mechandplayer"

    RequestAnimDict(animDict)
    local timeout = 2000
    while not HasAnimDictLoaded(animDict) and timeout > 0 do
        Wait(50)
        timeout = timeout - 50
    end

    if HasAnimDictLoaded(animDict) then
        TaskPlayAnim(ped, animDict, animName, 3.0, 3.0, -1, 49, 0, false, false, false)
    else
        -- Fallback animation si le dictionnaire échoue
        TaskStartScenarioInPlace(ped, "PROP_HUMAN_BUM_BIN", 0, true)
    end
end

local function stopLockpickAnim()
    local ped = PlayerPedId()
    ClearPedTasks(ped)
end

-- Désactivation des contrôles pendant le crochetage
local function startControlDisabler()
    CreateThread(function()
        while isLockpicking do
            Wait(0)
            DisableControlAction(0, 1, true)   -- Regard horizontal
            DisableControlAction(0, 2, true)   -- Regard vertical
            DisableControlAction(0, 24, true)  -- Tir / Attaque
            DisableControlAction(0, 25, true)  -- Viser
            DisableControlAction(0, 30, true)  -- Déplacement gauche/droite
            DisableControlAction(0, 31, true)  -- Déplacement avant/arrière
            DisableControlAction(0, 21, true)  -- Sprint
            DisableControlAction(0, 22, true)  -- Saut
            DisableControlAction(0, 23, true)  -- Entrer dans véhicule
            DisableControlAction(0, 75, true)  -- Sortir véhicule
            DisableControlAction(0, 140, true) -- Attaque corps à corps
            DisableControlAction(0, 141, true)
            DisableControlAction(0, 142, true)
            DisableControlAction(0, 257, true)
            DisableControlAction(0, 263, true)
            DisableControlAction(0, 264, true)
        end
    end)
end

-- Clôture du mini-jeu côté FiveM
local function finishLockpick(success)
    if not isLockpicking then return end

    isLockpicking = false
    SetNuiFocus(false, false)
    stopLockpickAnim()

    -- Fermer l'interface web
    SendNUIMessage({
        action = "close"
    })

    -- Résolution de la promesse ou appel du callback
    if currentPromise then
        currentPromise:resolve(success)
        currentPromise = nil
    end

    if currentCallback then
        currentCallback(success)
        currentCallback = nil
    end

    TriggerEvent('blast_lockpick:client:completed', success)
end

-- Démarrage du mini-jeu
local function startLockpick(difficulty, picks, cb)
    if isLockpicking then
        if cb then cb(false) end
        return false
    end

    difficulty = difficulty or "moyen"
    picks = tonumber(picks) or 3

    isLockpicking = true
    currentCallback = cb

    -- Si aucun callback n'est fourni, on crée une promesse (style ox_lib / moderne)
    local p = nil
    if not cb then
        p = promise.new()
        currentPromise = p
    end

    playLockpickAnim()
    startControlDisabler()

    SetNuiFocus(true, true)
    SendNUIMessage({
        action = "open",
        difficulty = difficulty,
        picks = picks
    })

    if p then
        return Citizen.Await(p)
    end
    return true
end

-- Callbacks NUI
RegisterNUICallback('lockpickResult', function(data, cb)
    local success = data and data.success or false
    finishLockpick(success)
    cb('ok')
end)

RegisterNUICallback('leave', function(data, cb)
    local success = data and data.success or false
    finishLockpick(success)
    cb('ok')
end)

-- Exports FiveM
exports('startLockpick', startLockpick)

-- Événements client
RegisterNetEvent('blast_lockpick:client:start', function(difficulty, picks, cb)
    startLockpick(difficulty, picks, cb)
end)

-- Commande de test en jeu : /lockpick [difficulte] [crochets]
RegisterCommand('lockpick', function(source, args)
    local difficulty = args[1] or "moyen"
    local picks = tonumber(args[2]) or 3

    TriggerEvent('chat:addMessage', {
        color = { 226, 192, 121 },
        multiline = true,
        args = { "Crochetage", ("Lancement du mini-jeu (Difficulté: %s, Crochets: %s)..."):format(difficulty, picks) }
    })

    startLockpick(difficulty, picks, function(success)
        if success then
            TriggerEvent('chat:addMessage', {
                color = { 76, 209, 55 },
                multiline = true,
                args = { "Crochetage", "^2Succès ! Vous avez déverrouillé la serrure." }
            })
        else
            TriggerEvent('chat:addMessage', {
                color = { 232, 65, 24 },
                multiline = true,
                args = { "Crochetage", "^1Échec ! La serrure reste verrouillée." }
            })
        end
    end)
end, false)
