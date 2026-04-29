const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const { contextBridge, ipcRenderer } = require('electron');

const {
  TinyElectronClient,
  TinyDb,
  TinyElectronNotification,
  TinyWindowFrameManager,
} = require('../preload/index.cjs');
const { RootEvents } = require('../global/Events.cjs');

// Init
const client = new TinyElectronClient();
client.installWinScript();
client.requestCache();
const electronLoading = client.installLoadingPage();

const createRootEvent = (eventName) =>
  client.on(eventName, (value) => console.log(eventName, value));
for (const name in RootEvents) createRootEvent(RootEvents[name]);

// Idle time test
setTimeout(async () => {
  const idle = await client.systemIdleTime();
  console.log(idle);
  if (idle > 0) console.log(await client.systemIdleState(idle));
}, 1000);

// Tiny Db
const tinyDb = new TinyDb('db');
tinyDb.exposeInMainWorld('tinyDb');

// Notifications
const notifications = new TinyElectronNotification();
notifications.installWinScript();

// Test
const tinyNotiActions = (tinyNoti) => {
  tinyNoti.on('show', () => console.log('yay! Tiny notification show!'));
  tinyNoti.on('click', () => console.log('yay! Tiny notification clicked!'));
  tinyNoti.on('close', () => console.log('yay! Tiny notification closed!'));
  tinyNoti.on('failed', (errMsg) => console.log('yay! Tiny notification error!', errMsg));
  tinyNoti.on('reply', (reply) => console.log('yay! Tiny notification reply!', reply));
  tinyNoti.on('click', (index) => console.log('yay! Tiny notification action!', index));

  tinyNoti.on('all', (arg) => console.log(arg));

  tinyNoti.show();
};

contextBridge.exposeInMainWorld('api', {
  getUser: () => ipcRenderer.invoke('get-user-data', { userId: 123 }),
  notiTest: async () => {
    const tinyNoti = await notifications.create({
      icon: path.join(__dirname, './icons/favicon.png'),
      tag: 'yay',
      title: 'Test Notification',
      body: 'Click, reply, or press an action button!',
      actions: [
        { type: 'button', text: 'Action 1' },
        { type: 'button', text: 'Action 2' },
      ],
      closeButtonText: 'Close it',
      hasReply: true,
      replyPlaceholder: 'Type your reply here...',
    });
    tinyNotiActions(tinyNoti);
  },
  notiTest2: async () => {
    const filePath = path.join(__dirname, './icons/tiny-pixel-pudding.png');
    const base64 = fs.readFileSync(filePath).toString('base64');
    const mimeType = mime.lookup(filePath);
    console.log(mimeType, base64);

    const tinyNoti = await notifications.create({
      icon: `data:${mimeType};base64,${base64}`,
      tag: 'yay2',
      title: 'Test Notification 2',
      body: 'Click, reply, or press an action button!',
      actions: [
        { type: 'button', text: 'Action 1' },
        { type: 'button', text: 'Action 2' },
      ],
      closeButtonText: 'Close it',
      hasReply: true,
      replyPlaceholder: 'Type your reply here...',
    });
    tinyNotiActions(tinyNoti);
  },
});

client.on(RootEvents.ReadyToShow, () => client.requestCache());
client.on(RootEvents.Ready, () => {
  electronLoading.remove();
  client.requestCache();
  const win = new TinyWindowFrameManager({
    client,
    buttonsPosition: 'right',
    titlePosition: 'center',
  });

  win.setTitle('My Pudding App');
  win.setIcon('../icons/favicon.png');
  setTimeout(() => {
    win.removeIcon();
    setTimeout(() => win.setIcon('../icons/favicon.png'), 5000);
  }, 10000);

  win.addMenuButton('Home', { onClick: () => console.log('Home') });
  win.addMenuButton('Settings', { onClick: () => console.log('Settings') });
});
