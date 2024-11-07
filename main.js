const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");
const fs = require("fs");

let win;
let persistentSession;

function createWindow() {
  win = new BrowserWindow({
    width: 1550,
    height: 880,
    frame: false,
    resizable: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, "preload.js"),
      partition: "persist:afsoone",
    },
    icon: path.join(__dirname, "afsoone.ico"),
  });

  win.loadFile("index.html");

  win.webContents.on("did-attach-webview", (event, webContents) => {
    webContents.session = persistentSession;

    webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
      console.error("Webview failed to load:", errorCode, errorDescription);
      webContents.loadURL("about:blank");
      webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif; background-color: #4B0082; color: #FFD700;"><div style="text-align: center; background-color: #FFD700; color: #4B0082; border-radius: 12px; padding: 30px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);"><h1>خطا در بارگذاری</h1><p>${errorDescription}</p><p style="font-size: 1.1em; font-weight: bold;">اگر از فیلتر شکن استفاده میکنید آن را قطع کنید.</p><button onclick="location.reload()" style="padding: 10px 20px; background-color: #4B0082; color: #FFD700; border: none; border-radius: 5px; cursor: pointer; font-size: 1em; transition: background-color 0.3s ease;">تلاش مجدد</button></div></div>';
      `);
    });

    webContents.on("will-navigate", (event, url) => {
      console.log("Navigating to:", url);
    });

    webContents.setWindowOpenHandler(({ url }) => {
      webContents.loadURL(url);
      return { action: "deny" };
    });
  });

  ipcMain.on("minimize", () => win.minimize());
  ipcMain.on("maximize", () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
  ipcMain.on("close", () => {
    saveSessionCookies();
    win.close();
  });
  ipcMain.on("go-home", () => {
    win.webContents.send("load-url", "https://afsoone.com");
  });
}

function saveSessionCookies() {
  const cookiesPath = path.join(app.getPath("userData"), "cookies.json");
  session.defaultSession.cookies
    .get({})
    .then((cookies) => {
      fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
      console.log("Cookies saved to", cookiesPath);
    })
    .catch((error) => {
      console.error("Failed to save cookies", error);
    });
}

function loadSessionCookies() {
  const cookiesPath = path.join(app.getPath("userData"), "cookies.json");
  if (fs.existsSync(cookiesPath)) {
    const cookies = JSON.parse(fs.readFileSync(cookiesPath));
    cookies.forEach((cookie) => {
      if (!cookie.url) {
        cookie.url = `https://${
          cookie.domain.startsWith(".")
            ? cookie.domain.substring(1)
            : cookie.domain
        }${cookie.path}`;
      }

      // Fix domain if it's invalid
      if (cookie.domain && !cookie.domain.startsWith(".")) {
        cookie.domain = `.${cookie.domain}`;
      }

      session.defaultSession.cookies
        .set(cookie)
        .then(() => {
          console.log("Cookie restored:", cookie);
        })
        .catch((error) => {
          console.error("Failed to restore cookie", error.message);
        });
    });
  }
}

app.whenReady().then(() => {
  loadSessionCookies();
  persistentSession = session.fromPartition("persist:afsoone", { cache: true });

  persistentSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders["Cookie"] = details.requestHeaders["Cookie"] || "";
    callback({ requestHeaders: details.requestHeaders });
  });

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
