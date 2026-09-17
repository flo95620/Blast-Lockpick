fx_version 'cerulean'
game 'gta5'

name 'blast_lockpick'
author 'Blast'
description 'Mini-jeu de crochetage de serrure style Skyrim pour FiveM et external-iframe'
version '1.0.0'

lua54 'yes'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/api.js',
    'html/audio.js',
    'html/script.js',
    'html/sounds/*.wav'
}

client_scripts {
    'client/main.lua'
}

server_scripts {
    'server/main.lua'
}

exports {
    'startLockpick'
}
