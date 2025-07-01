const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  loadTokens: () => ipcRenderer.invoke("load-tokens"),
  saveTokens: (tokens) => ipcRenderer.invoke("save-tokens", tokens),
  generateCode: (secret) => ipcRenderer.invoke("generate-code", secret),
  minimizeWindow: () => ipcRenderer.invoke("minimize-window"),
  closeWindow: () => ipcRenderer.invoke("close-window"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
})
