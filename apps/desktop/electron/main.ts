import { app, BrowserWindow, shell } from "electron";
import path from "path";

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#05060c",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServer = process.env.OVM_DEV_SERVER_URL;
  if (devServer) {
    win.loadURL(devServer).catch(() => undefined);
  } else {
    const pwaPath = process.env.OVM_PWA_PATH
      ?? path.join(process.resourcesPath, "pwa", "index.html");
    win.loadFile(pwaPath).catch(() => undefined);
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => undefined);
    return { action: "deny" };
  });
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
