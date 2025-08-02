const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  toggleStealth: () => ipcRenderer.send("toggle-stealth"),
});
