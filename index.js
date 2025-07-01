const { app, BrowserWindow, ipcMain } = require("electron")
const path = require("path")
const fs = require("fs")
const { authenticator } = require("otplib")

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
