const { app, contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    'miner', {
        getMetadata() { return ipcRenderer.send('miner:get-metadata') },
        download() { return ipcRenderer.send('miner:download') }
    }
)

contextBridge.exposeInMainWorld(
    'ipcRenderer', {
       on: (event, callback) => { ipcRenderer.on(event, callback) }
    }
)