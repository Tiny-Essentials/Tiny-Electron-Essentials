import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { app, Tray, ipcMain } from 'electron';
import { TinyDb, TinyElectronNotification, TinyElectronRoot } from '../main/index.mjs';
import { RootEvents } from '../global/Events.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start Electron root
const root = new TinyElectronRoot({
  minimizeOnClose: false,
  pathBase: path.join(__dirname, 'renderer'),
  iconFolder: path.join(__dirname, 'icons'),
  icon: 'favicon',
  appId: 'tiny-electron-essentials',
  appDataName: 'tiny-electron-essentials',
  title: 'Tiny Electron Essentials',
});

// Fix windows OS
root.installWinProtection();

// Init appData
root.initAppDataDir();
root.initAppDataDir('temp');
root.initAppDataSubdir('tiny-test');
const appDataPrivate = root.getAppDataSubdir('tiny-test');
const initFile = path.join(appDataPrivate, 'init.json');

const notifications = new TinyElectronNotification({
  folderPath: root.initAppDataSubdir('notifications', 'temp'),
});

notifications.deleteAllFilesInDir();

console.log(root.getAppDataDir());
console.log(appDataPrivate);
console.log(initFile);

// Tray
root.on(RootEvents.Ready, () => {
  const tray = new Tray(root.getIcon());
  tray.setToolTip(root.getTitle());
  tray.setTitle(root.getTitle());
  root.registerTray('main', tray);
  root.onTrayClick('main', () => root.getWinInstance().toggleVisible());
});

// Ready to first window
root.on(RootEvents.CreateFirstWindow, () => {
  console.log(`gotTheLock: ${root.gotTheLock()}`);
  console.log(`getAppId: ${root.getAppId()}`);
  console.log(`getTitle: ${root.getTitle()}`);
  console.log(`getIconFolder: ${root.getIconFolder()}`);
  console.log(`getIcon: ${root.getIcon()}`);
  console.log(`getAppDataName: ${root.getAppDataName()}`);
  console.log(`getUnpackedFolder: ${JSON.stringify(root.getUnpackedFolder(), null, 2)}`);

  const instance = root.createWindow({
    config: {
      frame: false,
      transparent: true,
      titleBarStyle: 'hidden',
      autoHideMenuBar: true,
      width: 800,
      height: 600,
      icon: root.getIcon(),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
        nodeIntegration: true,
        contextIsolation: true,
      },
    },
    fileId: initFile,
    isMain: true,
  });

  root.setRequestCache(() => ({
    isQuiting: root.isQuiting(),
    appStarted: instance.isReady(),
    firstTime: root.isFirstTime(),
    appReady: root.isAppReady(),
  }));

  root.on(RootEvents.ReadyToShow, () => {
    const tinyPing = () =>
      instance.ping({
        exe: app.getPath('exe'),
        icon: root.getIcon(),
        title: root.getTitle(),
      });

    tinyPing();
    root.on(RootEvents.DOMContentLoaded, (_e, { type } = {}) => {
      if (type === 'reload') tinyPing();
    });
  });

  console.log(`Instance index: ${instance.getIndex()}`);

  ipcMain.handle('get-user-data', async (_event, payload) => {
    try {
      const user = { result: 'pudding', time: Date.now(), ...payload };
      return user;
    } catch (err) {
      throw err;
    }
  });

  instance.loadPath('index.html');
  instance.openDevTools({ mode: 'detach' }); // ou 'bottom', 'right', etc.
});

// Init app
root.init();

// Tiny Db
const tinyDb = new TinyDb('db');

// Mock database functions
tinyDb.setGet(async (query, params) => {
  console.log('DB get:', query, params);
  return { id: 1, name: 'Test Row' };
});

tinyDb.setAll(async (query, params) => {
  console.log('DB all:', query, params);
  return [
    { id: 1, name: 'Row 1' },
    { id: 2, name: 'Row 2' },
  ];
});

tinyDb.setRun(async (query, params) => {
  console.log('DB run:', query, params);
  return { success: true };
});

tinyDb.setQuery(async (query, params) => {
  console.log('DB query:', query, params);
  return { result: 'Some result' };
});
