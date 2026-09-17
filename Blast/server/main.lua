--[[
    Blast Lockpick - Script Serveur FiveM
    Mini-jeu de crochetage de serrure style Skyrim
]]

AddEventHandler('onResourceStart', function(resourceName)
    if (GetCurrentResourceName() ~= resourceName) then
        return
    end
    print('^2[blast_lockpick]^7 Ressource demarree avec succes ! Mini-jeu style Skyrim pret.')
end)

-- Événement serveur pour synchroniser ou logger le résultat si nécessaire
RegisterNetEvent('blast_lockpick:server:logResult', function(success, difficulty)
    local src = source
    local playerName = GetPlayerName(src)
    if success then
        print(("[blast_lockpick] Joueur %s (%s) a reussi un crochetage [%s]"):format(playerName, src, difficulty or "inconnu"))
    else
        print(("[blast_lockpick] Joueur %s (%s) a echoue un crochetage [%s]"):format(playerName, src, difficulty or "inconnu"))
    end
end)
