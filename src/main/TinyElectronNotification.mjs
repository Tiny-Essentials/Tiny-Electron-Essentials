import { existsSync, lstatSync, writeFileSync } from 'node:fs';
import { readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import { BrowserWindow, Notification } from 'electron';

import TinyIpcResponder from './TinyIpcResponder.mjs';
import { NotificationEvents } from '../global/Events.mjs';
import { checkEventsList } from '../global/Utils.mjs';

/**  @typedef {Electron.NotificationConstructorOptions & { tag?: string; }} NotificationConstructorOptions */

/**
 * Provides an interface to manage notifications with event handling
 * through Electron's IPC. Each notification instance supports lifecycle
 * management (create, show, close) and full event listener control based
 * on Node.js `EventEmitter`.
 *
 * This class acts as a bridge between the renderer and the main process,
 * allowing you to create persistent notification instances identified by tags.
 *
 * @beta This API is experimental and may change in future versions.
 */
class TinyElectronNotification {
  /** @typedef {import('./TinyIpcResponder.mjs').IPCRespondCallback} IPCRespondCallback */

  #ipcResponder;
  #folderPath;

  #Events = NotificationEvents;

  /** @type {Map<string, Electron.Notification>} */
  #notifications = new Map();

  /**
   * @param {BrowserWindow} win
   * @param {Electron.NotificationConstructorOptions} data
   * @param {{ iconFile: string; isBase64: boolean; tag: string; }} iconCache
   * @param {IPCRespondCallback} res
   */
  #createNotification(win, data, iconCache, res) {
    // Prepare Data
    const { tag } = iconCache;
    const noti = new Notification(data);
    this.#notifications.set(tag, noti);

    // Clear
    let clearEnabled = false;
    const clearNotification = async () => {
      if (clearEnabled) return;
      clearEnabled = true;
      try {
        if (
          this.#notifications.has(tag) &&
          iconCache.isBase64 &&
          typeof iconCache.iconFile === 'string'
        ) {
          const filePath = join(this.#folderPath, `./${iconCache.iconFile}`);
          if (existsSync(filePath)) await unlink(filePath);
        }
      } catch (err) {
        console.error(err);
      }
      if (this.#notifications.has(tag)) this.#notifications.delete(tag);
    };

    /**
     * @param {string} eventName
     * @param {string} eventType
     * @param {Record<string|number|symbol, any>} nEvent
     */
    const sendEvent = (eventName, eventType, nEvent = {}) => {
      if (win && win.webContents) {
        const event = { tag, ...nEvent };
        win.webContents.send(eventName, { arg: event, time: Date.now() });
        win.webContents.send(this.#Events.All, { type: eventType, arg: event, time: Date.now() });
      }
    };

    // Show
    noti.on('show', () => {
      sendEvent(this.#Events.Show, 'show');
    });

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
    res({
      tag,
      isSupported: Notification.isSupported(),
    });
  }

  /**
   * @param {Electron.IpcMainEvent} event
   * @returns {BrowserWindow|null}
   */
  #getWin(event) {
    const webContents = event.sender;
    if (!event.senderFrame) return null;
    const win = BrowserWindow.fromWebContents(webContents);
    if (win) return win;
    return null;
  }

  /**
   * Deletes all files inside the configured folder path.
   *
   * This method asynchronously reads the directory and deletes
   * all files found within it.
   *
   * @async
   * @returns {Promise<void>} Resolves when all files are deleted.
   * @throws {Error} If reading the directory or deleting any file fails.
   */
  async deleteAllFilesInDir() {
    const files = await readdir(this.#folderPath);
    const deleteFilePromises = files.map((file) => unlink(join(this.#folderPath, file)));
    await Promise.all(deleteFilePromises);
  }

  /**
   * @param {Object} [settings={}] - Configuration settings for the notifications.
   * @param {NotificationEvents} [settings.eventNames=this.#Events] - Set of event names for internal messaging.
   * @param {TinyIpcResponder} [settings.ipcResponder] - The IPC responder instance used for communication.
   * @param {string} [settings.folderPath]
   */
  constructor({ ipcResponder, folderPath, eventNames = this.#Events } = {}) {
    if (!(ipcResponder instanceof TinyIpcResponder))
      throw new Error('Invalid ipcResponder instance.');
    if (typeof folderPath !== 'string') throw new Error('folderPath must be a string.');
    if (!existsSync(folderPath) || !lstatSync(folderPath).isDirectory())
      throw new Error(`The folderPath "${folderPath}" does not exist or is not a directory.`);

    this.#ipcResponder = ipcResponder;
    this.#folderPath = folderPath;
    checkEventsList(eventNames, this.#Events);

    this.#ipcResponder.on(
      this.#Events.Create,
      /** @param {NotificationConstructorOptions} data */
      (event, data, res) => {
        const win = this.#getWin(event);
        if (win && typeof data === 'object' && typeof data.tag === 'string') {
          /** @type {Electron.NotificationConstructorOptions} */
          const newData = {
            ...Object.fromEntries(Object.entries(data).filter(([key]) => !['tag'].includes(key))),
          };

          // Get icon
          const tag = data.tag;
          const iconCache = { tag, iconFile: '', isBase64: false };

          // Base64
          if (typeof newData.icon === 'string' && newData.icon.startsWith('data:image/')) {
            const base64File = newData.icon.split(';base64,');
            const ext = base64File[0].split('data:image/')[1];

            const filename = `${tag.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;
            const tempFile = join(this.#folderPath, `./${filename}`);

            const binaryString = atob(base64File[1]);
            writeFileSync(tempFile, binaryString, 'binary');

            iconCache.iconFile = filename;
            newData.icon = tempFile;
            iconCache.isBase64 = true;
          }

          // Start notification
          this.#createNotification(win, newData, iconCache, res);
        } else res({ tag: null, isSupported: false });
      },
    );

    // Show
    this.#ipcResponder.on(this.#Events.Show, (_e, tag, res) => {
      const noti = this.#notifications.get(tag);
      if (noti) noti?.show();
      res(null);
    });

    // Close
    this.#ipcResponder.on(this.#Events.Close, (_e, tag, res) => {
      const noti = this.#notifications.get(tag);
      if (noti) noti?.close();
      res(null);
    });
  }
}

export default TinyElectronNotification;
