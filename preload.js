const { app, contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    'miner',
    {
        isPresent() { return ipcRenderer.sendSync('miner:is-present') },
        getVersion() { return ipcRenderer.sendSync('miner:get-version') },
        getLatestVersion() { return ipcRenderer.sendSync('miner:get-latest-version') },
        download() { return ipcRenderer.send('miner:download') }
    }
)