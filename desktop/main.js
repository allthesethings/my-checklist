// «Ночные записи» для Windows: окно приложения, которое открывает опубликованный сайт.
// Обновления приходят сами (вместе с сайтом), без интернета работает из кэша service worker.
const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

const APP_URL = "https://allthesethings.github.io/my-checklist/";

// не открываем второе окно, если приложение уже запущено
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 860,
    minWidth: 380,
    minHeight: 520,
    backgroundColor: "#0b0e15",
    title: "Ночные записи",
    icon: path.join(__dirname, "icon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadURL(APP_URL);

  // всё, что ведёт за пределы приложения, открываем в обычном браузере
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(APP_URL) && !url.startsWith("file:")) {
      e.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });

  // самый первый запуск без интернета — показываем заглушку с кнопкой «Повторить»
  win.webContents.on("did-fail-load", (_e, code, _desc, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && url.startsWith(APP_URL)) {
      win.loadFile(path.join(__dirname, "offline.html"));
    }
  });
}

app.on("second-instance", () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});
app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
