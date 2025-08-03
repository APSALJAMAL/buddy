const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu } = require("electron");
const path = require("path");

require("electron-reload")(__dirname, {
  electron: require(`${__dirname}/node_modules/electron`),
});

let mainWindow;
let isStealth = true;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 500,
    minWidth: 500,
    minHeight: 500,
    maxWidth: 500,
    maxHeight: 500,
    frame: false,
    transparent: false,
    resizable: false, // 🚫 disable resizing
    movable: true,
    focusable: true,
    skipTaskbar: false,
    fullscreenable: false, // 🚫 disable fullscreen
    autoHideMenuBar: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL("https://chat.openai.com/");

  mainWindow.webContents.on("did-finish-load", () => {
    if (isStealth) enableStealthMode();

    // Inject draggable area CSS
    mainWindow.webContents.insertCSS(`
      body { margin-top: 30px; }
      #drag-region {
        -webkit-app-region: drag;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 30px;
        background: rgba(0,0,0,0.2);
        z-index: 999998;
      }
      #stealth-indicator {
        position: fixed;
        top: 5px;
        right: 10px;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 12px;
        font-family: Arial, sans-serif;
        z-index: 999999;
        color: white;
        background: ${isStealth ? "green" : "red"};
        pointer-events: none;
      }
    `);

    // Add drag bar + stealth indicator
    mainWindow.webContents.executeJavaScript(`
      if (!document.getElementById("drag-region")) {
        const dragBar = document.createElement("div");
        dragBar.id = "drag-region";
        document.body.appendChild(dragBar);
      }
      if (!document.getElementById("stealth-indicator")) {
        const el = document.createElement("div");
        el.id = "stealth-indicator";
        el.innerText = "${isStealth ? "STEALTH ON" : "STEALTH OFF"}";
        document.body.appendChild(el);
      }
    `);
  });

  // Hotkeys
  globalShortcut.register("CommandOrControl+Shift+S", toggleStealth);
  globalShortcut.register("CommandOrControl+Shift+X", () => {
    if (mainWindow.isVisible()) mainWindow.hide();
    else mainWindow.show();
  });

  // Tray menu
  const iconPath = path.join(__dirname, process.platform === "win32" ? "icon.ico" : "icon.png");
  tray = new Tray(iconPath);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Toggle Stealth Mode", click: toggleStealth },
      { label: "Quit", click: () => app.quit() },
    ])
  );
}

function updateIndicator() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mainWindow.webContents.executeJavaScript(`
    (() => {
      let ind = document.getElementById("stealth-indicator");
      if (!ind) {
        ind = document.createElement("div");
        ind.id = "stealth-indicator";
        ind.style.position = "fixed";
        ind.style.top = "10px";
        ind.style.right = "10px";
        ind.style.padding = "6px 10px";
        ind.style.borderRadius = "8px";
        ind.style.fontSize = "12px";
        ind.style.fontFamily = "Arial, sans-serif";
        ind.style.zIndex = "999999";
        ind.style.color = "white";
        ind.style.pointerEvents = "none";
        document.body.appendChild(ind);
      }
      ind.style.background = "${isStealth ? "green" : "red"}";
      ind.innerText = "${isStealth ? "STEALTH ON" : "STEALTH OFF"}";
    })();
  `, true);
}

function enableStealthMode() {
  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.setContentProtection(true);
  if (typeof mainWindow.setExcludedFromCapture === "function") {
    mainWindow.setExcludedFromCapture(true);
  }
  isStealth = true;
  updateIndicator();
}

function disableStealthMode() {
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setContentProtection(false);
  if (typeof mainWindow.setExcludedFromCapture === "function") {
    mainWindow.setExcludedFromCapture(false);
  }
  isStealth = false;
  updateIndicator();
}

function toggleStealth() {
  if (isStealth) {
    disableStealthMode();
  } else {
    enableStealthMode();
  }
  updateIndicator();
}

ipcMain.on("toggle-stealth", toggleStealth);

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
