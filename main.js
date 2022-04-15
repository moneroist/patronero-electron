const { app, BrowserWindow, Menu, Tray, ipcMain } = require('electron')
const { execFileSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const download = require('download')
const tar = require('tar')

const USER_DATA_PATH = app.getPath('userData')
const MINER_PATH = path.join(USER_DATA_PATH, 'xmrig')
const LATEST_MINER_VERSION_URL = 'https://api.github.com/repos/xmrig/xmrig/releases/latest'

let browserWindow, tray
  
const quitApp = () => {
  app.isQuit = true
  app.quit()
}

const trayContextMenuTemplate = [
  { label: 'Hide', click: () => { browserWindow.hide() } },
  { label: 'Quit', click: () => { quitApp() } }
]

const createTray = () => {
  tray = new Tray('logo.png')
  let trayContextMenu = Menu.buildFromTemplate(trayContextMenuTemplate)
  tray.setContextMenu(trayContextMenu)
}

const updateTray = (args) => {
  let { visible } = args

  if (visible != null) {
    if (visible) {
      trayContextMenuTemplate[0] = { label: 'Hide', click: () => { browserWindow.hide() } }
    } else {
      trayContextMenuTemplate[0] = { label: 'Show', click: () => { browserWindow.show() } }
    }
  }

  let trayContextMenu = Menu.buildFromTemplate(trayContextMenuTemplate)
  tray.setContextMenu(trayContextMenu)
}

const createWindow = () => {
  browserWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  browserWindow.loadFile('src/index.html')

  browserWindow.on('minimize', (event) => {
    event.preventDefault()
    browserWindow.hide()
  })

  browserWindow.on('close', (event) => {
    if (!app.isQuit) {
      event.preventDefault()
      browserWindow.hide()
    }
  })

  browserWindow.on('show', () => {
    updateTray({ visible: true })
  })

  browserWindow.on('hide', (event) => {
    updateTray({ visible: false })
  })
}

app.whenReady().then(() => {
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('miner:is-present', (event) => {
  try {
    fs.accessSync(MINER_PATH, fs.constants.F_OK)
    event.returnValue = true 
  } catch {
    event.returnValue = false
  }
})

ipcMain.on('miner:get-version', (event) => {
  try {
    let output =  execFileSync(MINER_PATH, ['--version'], { encoding: 'utf8' })
    let regex = /XMRig \d+\.\d+\.\d+/
    let version = output.match(regex)
    if (version) {
      event.returnValue = version[0].split(' ').pop()
    } else {
      event.returnValue = null
    }
  } catch {
    event.returnValue = null
  }
})

ipcMain.on('miner:get-latest-version', (event) => {
  axios.get(LATEST_MINER_VERSION_URL).then((response) => { 
    try {
      let regex = /\d+\.\d+\.\d+/
      let latestVersion = response.data.tag_name.match(regex)
      if (latestVersion) {
        event.returnValue = latestVersion[0]
      } else {
        event.returnValue = null
      }
    } catch {
      event.returnValue = null
    }
  })
})

ipcMain.on('miner:download', (event) => {
  const findDownloadUrlByPlatform = (assets, platform) => {
    return assets.find((asset) => { return asset.name.includes(platform) } ).browser_download_url
  }

  try {
    axios.get(LATEST_MINER_VERSION_URL).then((response) => {
      let downloadUrl
      let assets = response.data.assets
      switch (process.platform) {
        case 'linux':
          downloadUrl =  findDownloadUrlByPlatform(assets, 'linux-x64')
          break
        case 'win32':
          downloadUrl = findDownloadUrlByPlatform(assets, 'gcc-win64')
          break
        case 'darwin':
          downloadUrl = findDownloadUrlByPlatform(assets, 'macos-x64')
          break
        defualt:
          event.reply('miner:download', false)
          return
      }

      download(downloadUrl, USER_DATA_PATH).then(() => {
        let tarFileName = downloadUrl.split('/').pop()
        let tarFilePath = path.join(USER_DATA_PATH, tarFileName)
        tar.extract({ file: tarFilePath, cwd: USER_DATA_PATH }, null, () => {
          let extractedFolderName = tarFileName.split('-').slice(0, 2).join('-')          
          fs.rename(path.join(USER_DATA_PATH, extractedFolderName, 'xmrig'), path.join(USER_DATA_PATH, 'xmrig'), function (error) {
            if (error) {
                throw error
            } else {
              fs.rmSync(path.join(USER_DATA_PATH, extractedFolderName), { recursive: true, force: true });
              fs.rmSync(path.join(USER_DATA_PATH, tarFileName))
              event.reply('miner:download', true)
            }
        });
        })
      });
    })
  } catch {
    event.reply('miner:download', false)
  }
})