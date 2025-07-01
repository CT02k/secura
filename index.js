const { app, BrowserWindow, ipcMain, dialog } = require("electron")
const path = require("path")
const fs = require("fs")
const { authenticator } = require("otplib")
const { autoUpdater } = require("electron-updater")

const dataPath = path.join(app.getPath("userData"), "data.json")

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(dataPath, "utf8"))
  } catch {
    return []
  }
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2))
}

function createWindow() {
  const win = new BrowserWindow({
    width: 500,
    height: 700,
    icon: path.join(__dirname, "/assets/icon.png"),
    frame: false,
    resizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    }
  })

  win.loadFile("index.html")
  
  // Check for updates after window is created
  checkForUpdates(win)
}

// Auto-updater configuration
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

function checkForUpdates(window) {
  // Only check for updates in production
  if (process.env.NODE_ENV === 'development') {
    return
  }
  
  autoUpdater.checkForUpdatesAndNotify()
  
  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(window, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available!`,
      detail: 'Would you like to download it now? The app will restart after the update.',
      buttons: ['Download', 'Later'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate()
      }
    })
  })
  
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(window, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. The application will restart to apply the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
  })
  
  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error)
  })
}

app.whenReady().then(createWindow)

ipcMain.handle("load-tokens", () => loadData())
ipcMain.handle("save-tokens", (event, tokens) => saveData(tokens))
ipcMain.handle("generate-code", (event, secret) => {
  if (!secret) {
    return "000000"
  }
  try {
    return authenticator.generate(secret)
  } catch (error) {
    return "000000"
  }
})
ipcMain.handle("minimize-window", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.minimize()
})
ipcMain.handle("close-window", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.close()
})
ipcMain.handle("check-for-updates", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  checkForUpdates(win)
  return true
})
ipcMain.handle("get-app-version", () => {
  return app.getVersion()
})
