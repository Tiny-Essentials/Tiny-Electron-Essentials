import { existsSync, lstatSync, writeFileSync } from 'node:fs';
import { readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import { BrowserWindow, Notification, ipcMain } from 'electron';

import { NotificationEvents } from '../global/Events.mjs';
import { checkEventsList } from '../global/Utils.mjs';

/**
 * @typedef {Object} IconCacheData
 * @property {string} tag - The unique tag identifying the notification.
 * @property {string} iconFile - The filename of the cached icon.
 * @property {boolean} isBase64 - Indicates if the icon was generated from a base64 string.
 */

/**
 * @typedef {Object} NotificationResult
 * @property {string|null} tag - The notification tag.
 * @property {boolean} isSupported - Whether the system supports notifications.
 */

/**
 * Provides an interface to manage notifications with event handling
 * through Electron's native IPC. Each notification instance supports lifecycle
 * management (create, show, close) and full event listener control.
 *
 * @beta This API is experimental and may change in future versions.
 */
class TinyElectronNotification {
  #folderPath;
  #Events = NotificationEvents;

  /** @type {Map<string, Electron.Notification>} */
  #notifications = new Map();

  /**
   * Handles the IPC request to create a new notification.
   *
   * @param {Electron.IpcMainInvokeEvent} event - The IPC invoke event.
   * @param {Electron.NotificationConstructorOptions & { tag?: string; }} data - Notification options.
   * @returns {NotificationResult} The creation result.
   */
  #handleCreate(event, data) {
    const win = this.#getWin(event);
    if (!win || typeof data !== 'object' || typeof data.tag !== 'string') {
      return { tag: null, isSupported: false };
    }

    const { tag, ...notificationOptions } = data;
    const iconCache = this.#processIcon(tag, notificationOptions.icon);

    if (iconCache.isBase64) {
      notificationOptions.icon = join(this.#folderPath, `./${iconCache.iconFile}`);
    }

    return this.#setupNotification(win, notificationOptions, iconCache);
  }

  /**
   * Shows an existing notification.
   *
   * @param {string} tag - The notification identifier.
   * @returns {null} Always returns null.
   */
  #handleShow(tag) {
    const noti = this.#notifications.get(tag);
    if (noti) noti.show();
    return null;
  }

  /**
   * Closes an existing notification.
   *
   * @param {string} tag - The notification identifier.
   * @returns {null} Always returns null.
   */
  #handleClose(tag) {
    const noti = this.#notifications.get(tag);
    if (noti) noti.close();
    return null;
  }

  /**
   * Processes the notification icon, saving base64 data to a file if necessary.
   *
   * @param {string} tag - The notification tag.
   * @param {string|Electron.NativeImage} [icon] - The icon data.
   * @returns {IconCacheData} Information about the processed icon.
   */
  #processIcon(tag, icon) {
    const iconCache = { tag, iconFile: '', isBase64: false };

    if (typeof icon === 'string' && icon.startsWith('data:image/')) {
      const [header, base64Data] = icon.split(';base64,');
      const ext = header.replace('data:image/', '');
      const filename = `${tag.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;
      const tempFile = join(this.#folderPath, `./${filename}`);

      const binaryString = atob(base64Data);
      writeFileSync(tempFile, binaryString, 'binary');

      iconCache.iconFile = filename;
      iconCache.isBase64 = true;
    }

    return iconCache;
  }

  /**
   * Creates the notification instance and sets up its event listeners.
   *
   * @param {BrowserWindow} win - The browser window to send IPC events to.
   * @param {Electron.NotificationConstructorOptions} options - Electron notification options.
   * @param {IconCacheData} iconCache - Information about the cached icon.
   * @returns {NotificationResult} The initialization result.
   */
  #setupNotification(win, options, iconCache) {
    const { tag } = iconCache;
    const noti = new Notification(options);
    this.#notifications.set(tag, noti);

    // Clear
    let isCleared = false;
    const clearNotification = async () => {
      if (isCleared) return;
      isCleared = true;
      try {
        if (this.#notifications.has(tag) && iconCache.isBase64 && iconCache.iconFile) {
          const filePath = join(this.#folderPath, `./${iconCache.iconFile}`);
          if (existsSync(filePath)) await unlink(filePath);
        }
      } catch (err) {
        console.error(err);
      }
      this.#notifications.delete(tag);
    };

    /**
     * @param {string} eventName
     * @param {string} eventType
     * @param {Record<string|number|symbol, any>} extraData
     */
    const sendEvent = (eventName, eventType, extraData = {}) => {
      if (win && !win.isDestroyed() && win.webContents) {
        const eventPayload = { tag, ...extraData };
        win.webContents.send(eventName, { arg: eventPayload, time: Date.now() });
        win.webContents.send(this.#Events.All, {
          type: eventType,
          arg: eventPayload,
          time: Date.now(),
        });
      }
    };

    // Show
    noti.on('show', () => sendEvent(this.#Events.Show, 'show'));

    // Click
    noti.on('click', () => {
      sendEvent(this.#Events.Click, 'click');
      clearNotification();
    });

    // Reply
    noti.on('reply', (_e, reply) => {
      sendEvent(this.#Events.Reply, 'reply', { reply });
      clearNotification();
    });

    // Action
    noti.on('action', (_e, index) => {
      sendEvent(this.#Events.Action, 'action', { index });
      clearNotification();
    });

    // Failed
    noti.on('failed', (_e, error) => {
      sendEvent(this.#Events.Failed, 'failed', { error });
      clearNotification();
    });

    // Close
    noti.on('close', () => {
      sendEvent(this.#Events.Close, 'close');
      clearNotification();
    });

    // Complete
    return { tag, isSupported: Notification.isSupported() };
  }

  /**
   * Retrieves the corresponding BrowserWindow from an IPC event.
   *
   * @param {Electron.IpcMainInvokeEvent} event - The IPC event.
   * @returns {BrowserWindow|null} The browser window, or null if not found.
   */
  #getWin(event) {
    const webContents = event.sender;
    if (!event.senderFrame) return null;
    return BrowserWindow.fromWebContents(webContents) || null;
  }

  /**
   * Deletes all files inside the configured folder path.
   *
   * @async
   * @returns {Promise<void>} Resolves when all files are deleted.
   */
  async deleteAllFilesInDir() {
    const files = await readdir(this.#folderPath);
    const deleteTasks = files.map((file) => unlink(join(this.#folderPath, file)));
    await Promise.all(deleteTasks);
  }

  /**
   * Initializes the notification manager and registers native IPC handlers.
   *
   * @param {Object} [settings={}] - Configuration settings for the notifications.
   * @param {NotificationEvents} [settings.eventNames=this.#Events] - Set of event names for internal messaging.
   * @param {string} [settings.folderPath] - Directory path to store temporary notification icons.
   */
  constructor({ folderPath, eventNames = this.#Events } = {}) {
    if (typeof folderPath !== 'string') throw new Error('folderPath must be a string.');
    if (!existsSync(folderPath) || !lstatSync(folderPath).isDirectory())
      throw new Error(`The folderPath "${folderPath}" does not exist or is not a directory.`);

    this.#folderPath = folderPath;
    checkEventsList(eventNames, this.#Events);

    // Register native IPC handlers
    ipcMain.handle(this.#Events.Create, (event, data) => this.#handleCreate(event, data));
    ipcMain.handle(this.#Events.Show, (_event, tag) => this.#handleShow(tag));
    ipcMain.handle(this.#Events.Close, (_event, tag) => this.#handleClose(tag));
  }
}

export default TinyElectronNotification;
