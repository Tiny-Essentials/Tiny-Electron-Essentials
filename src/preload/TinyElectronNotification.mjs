import { ipcRenderer, contextBridge } from 'electron';
import { EventEmitter } from 'events';
import TinyIpcRequestManager from './TinyIpcRequestManager.mjs';
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
  /**
   * @typedef {(...args: any[]) => void} ListenerCallback
   * A generic callback function used for event listeners.
   */

  #ipcRequest;
  #exposeInMainWorld = '';
  #maxListeners = Infinity;
  #notifications = new Map();

  #Events = NotificationEvents;

  /**
   * @param {string} apiName - The name under which the API will be exposed in the window context.
   */
  installWinScript(apiName = 'newElectronNotification') {
    if (this.#exposeInMainWorld.length > 0)
      throw new Error(
        `[installWinScript] API '${this.#exposeInMainWorld}' is already exposed in the main world.`,
      );
    if (typeof apiName !== 'string' || apiName.length < 1)
      throw new Error('[installWinScript] apiName must be a non-empty string.');
    this.#exposeInMainWorld = apiName;
    contextBridge.exposeInMainWorld(
      apiName,
      /** @param {NotificationConstructorOptions} args */ (args) => this.create(args),
    );
  }

  /**
   * Creates a new notification instance with event handling capabilities.
   *
   * @param {NotificationConstructorOptions} arg Notification configuration object. The `tag` is required and must be unique.
   * @returns {Promise<{
   *   isSupported: () => boolean,
   *   show: () => void,
   *   close: () => void,
   *   on: (event: string|symbol, callback: ListenerCallback) => void,
   *   off: (event: string|symbol, callback: ListenerCallback) => void,
   *   once: (event: string|symbol, callback: ListenerCallback) => void,
   *   addListener: (event: string|symbol, callback: ListenerCallback) => void,
   *   removeListener: (event: string|symbol, callback: ListenerCallback) => void,
   *   prependListener: (event: string|symbol, callback: ListenerCallback) => void,
   *   prependOnceListener: (event: string|symbol, callback: ListenerCallback) => void,
   *   setMaxListeners: (count: number) => void,
   *   getMaxListeners: () => number,
   *   listenerCount: (event: string|symbol) => number,
   *   listeners: (event: string|symbol) => Function[],
   *   rawListeners: (event: string|symbol) => Function[],
   *   eventNames: () => (string|symbol)[]
   * }>} Promise resolving to the notification instance with event methods.
   *
   * @throws {TypeError} If `arg` is not an object.
   * @throws {Error} If `arg.tag` is missing or not a non-empty string.
   * @throws {Error} If a notification with the same `tag` already exists.
   */
  create(arg) {
    return new Promise((resolve, reject) => {
      if (typeof arg !== 'object') throw new TypeError('Argument "arg" must be a non-null object.');
      if (!('tag' in arg)) throw new Error('Notification "tag" is required.');
      if (typeof arg.tag !== 'string' || arg.tag.trim() === '')
        throw new Error('Notification "tag" must be a non-empty string.');
      if (this.#notifications.has(arg.tag))
        throw new Error(`Notification with tag "${arg.tag}" already exists.`);

      const notiConfig = { resolve, reject, event: new EventEmitter() };
      this.#notifications.set(arg.tag, notiConfig);
      notiConfig.event.setMaxListeners(this.#maxListeners);
      this.#ipcRequest
        .send(this.#Events.Create, arg)
        .then((arg2) => {
          notiConfig.resolve({
            /**
             * Indicates whether the feature is supported.
             * @returns {boolean} True if supported, false otherwise.
             */
            isSupported: () => arg2.isSupported,

            /**
             * Shows the notification.
             * Sends an IPC request to show.
             */
            show: () => this.#ipcRequest.send(this.#Events.Show, arg.tag),

            /**
             * Closes the notification.
             * Sends an IPC request to close.
             */
            close: () => this.#ipcRequest.send(this.#Events.Close, arg.tag),

            /**
             * Registers an event listener.
             * @param {string|symbol} event The event name.
             * @param {ListenerCallback} callback The event handler function.
             */
            on: (event, callback) => {
              notiConfig.event.on(event, callback);
            },

            /**
             * Removes an event listener.
             * @param {string|symbol} event The event name.
             * @param {ListenerCallback} callback The event handler function.
             */
            off: (event, callback) => {
              notiConfig.event.off(event, callback);
            },

            /**
             * Registers a one-time event listener.
             * @param {string|symbol} event The event name.
             * @param {ListenerCallback} callback The event handler function.
             */
            once: (event, callback) => {
              notiConfig.event.once(event, callback);
            },

            /**
             * Alias for `on`. Registers an event listener.
             * @param {string|symbol} event The event name.
             * @param {ListenerCallback} callback The event handler function.
             */
            addListener: (event, callback) => {
              notiConfig.event.addListener(event, callback);
            },

            /**
             * Alias for `off`. Removes an event listener.
             * @param {string|symbol} event The event name.
             * @param {ListenerCallback} callback The event handler function.
             */
            removeListener: (event, callback) => {
              notiConfig.event.removeListener(event, callback);
            },

            /**
             * Adds an event listener to the beginning of the listeners array.
             * @param {string|symbol} event The event name.
             * @param {ListenerCallback} callback The event handler function.
             */
            prependListener: (event, callback) => {
              notiConfig.event.prependListener(event, callback);
            },

            /**
             * Adds a one-time event listener to the beginning of the listeners array.
             * @param {string|symbol} event The event name.
             * @param {ListenerCallback} callback The event handler function.
             */
            prependOnceListener: (event, callback) => {
              notiConfig.event.prependOnceListener(event, callback);
            },

            /**
             * Sets the maximum number of listeners for the EventEmitter instance.
             * @param {number} count The maximum number of listeners.
             */
            setMaxListeners: (count) => {
              notiConfig.event.setMaxListeners(count);
            },

            /**
             * Gets the maximum number of listeners for the EventEmitter instance.
             * @returns {number} The maximum number of listeners.
             */
            getMaxListeners: () => {
              return notiConfig.event.getMaxListeners();
            },

            /**
             * Returns the number of listeners listening to the specified event.
             * @param {string|symbol} event The event name.
             * @returns {number} The number of listeners.
             */
            listenerCount: (event) => {
              return notiConfig.event.listenerCount(event);
            },

            /**
             * Returns a copy of the array of listeners for the specified event.
             * @param {string|symbol} event The event name.
             * @returns {Function[]} Array of listener functions.
             */
            listeners: (event) => {
              return notiConfig.event.listeners(event);
            },

            /**
             * Returns a copy of the array of listeners for the specified event,
             * including wrappers for once listeners.
             * @param {string|symbol} event The event name.
             * @returns {Function[]} Array of listener functions (raw).
             */
            rawListeners: (event) => {
              return notiConfig.event.rawListeners(event);
            },

            /**
             * Returns an array listing the events for which the emitter has registered listeners.
             * @returns {(string|symbol)[]} Array of event names.
             */
            eventNames: () => {
              return notiConfig.event.eventNames();
            },
          });
        })
        .catch(reject);
    });
  }

  /**
   * Creates a new TinyElectronNotification instance.
   *
   * @param {Object} [settings={}] - Configuration settings for the notifications.
   * @param {NotificationEvents} [settings.eventNames=this.#Events] - Set of event names for internal messaging.
   * @param {TinyIpcRequestManager} [settings.ipcRequest] - The IPC request manager instance for communication.
   *
   * @throws {Error} If `ipcRequest` is not an instance of `TinyIpcRequestManager`.
   * @throws {Error} If `id` is not a string.
   */
  constructor({ ipcRequest, eventNames = this.#Events } = {}) {
    checkEventsList(eventNames, this.#Events);
    if (!(ipcRequest instanceof TinyIpcRequestManager))
      throw new Error('ipcRequest must be an instance of TinyIpcRequestManager.');
    this.#ipcRequest = ipcRequest;

    /** @param {string} tag */
    const clearNotification = (tag) => {
      if (this.#notifications.has(tag)) this.#notifications.delete(tag);
    };

    // Close
    ipcRenderer.on(this.#Events.Close, (_event, { arg } = {}) => {
      const notiConfig = this.#notifications.get(arg.tag);
      if (notiConfig?.event) {
        notiConfig.event.emit('close', arg.event);
        delete notiConfig.event;
      }
      clearNotification(arg.tag);
    });

    // All
    ipcRenderer.on(this.#Events.All, (_event, { arg, type } = {}) => {
      const notiConfig = this.#notifications.get(arg.tag);
      if (notiConfig?.event) notiConfig.event.emit('all', type, arg);
    });

    // Show
    ipcRenderer.on(this.#Events.Show, (_event, { arg } = {}) => {
      const notiConfig = this.#notifications.get(arg.tag);
      if (notiConfig?.event) notiConfig.event.emit('show', arg.event);
    });

    // Click
    ipcRenderer.on(this.#Events.Click, (_event, { arg } = {}) => {
      const notiConfig = this.#notifications.get(arg.tag);
      if (notiConfig?.event) notiConfig.event.emit('click', arg.event);
      clearNotification(arg.tag);
    });

    // Reply
    ipcRenderer.on(this.#Events.Reply, (_event, { arg } = {}) => {
      const notiConfig = this.#notifications.get(arg.tag);
      if (notiConfig?.event) notiConfig.event.emit('reply', arg.reply);
      clearNotification(arg.tag);
    });

    // Action
    ipcRenderer.on(this.#Events.Action, (_event, { arg } = {}) => {
      const notiConfig = this.#notifications.get(arg.tag);
      if (notiConfig?.event) notiConfig.event.emit('action', arg.index);
      clearNotification(arg.tag);
    });

    // Failed
    ipcRenderer.on(this.#Events.Failed, (_event, { arg } = {}) => {
      const notiConfig = this.#notifications.get(arg.tag);
      if (notiConfig?.event) notiConfig.event.emit('failed', new Error(arg.error));
      clearNotification(arg.tag);
    });
  }
}

export default TinyElectronNotification;
