const { app, BrowserWindow, Menu, Tray } = require('electron')
const path = require('path')

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
  const trayContextMenu = Menu.buildFromTemplate(trayContextMenuTemplate)
  tray.setContextMenu(trayContextMenu)
}

const updateTray = (args) => {
  const { visible } = args

  if (visible != null) {
    if (visible) {
      trayContextMenuTemplate[0] = { label: 'Hide', click: () => { browserWindow.hide() } }
    } else {
      trayContextMenuTemplate[0] = { label: 'Show', click: () => { browserWindow.show() } }
    }
  }

  const trayContextMenu = Menu.buildFromTemplate(trayContextMenuTemplate)
  tray.setContextMenu(trayContextMenu)
}

const createWindow = () => {
  browserWindow = new BrowserWindow({
    width: 800,
    height: 600
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