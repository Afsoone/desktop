const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("minimize"),
  maximize: () => ipcRenderer.send("maximize"),
  close: () => ipcRenderer.send("close"),
  goHome: () => ipcRenderer.send("go-home"),
  onLoadUrl: (callback) => ipcRenderer.on("load-url", callback),
  cacheData: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
  getCachedData: (key) => JSON.parse(localStorage.getItem(key)),
});
