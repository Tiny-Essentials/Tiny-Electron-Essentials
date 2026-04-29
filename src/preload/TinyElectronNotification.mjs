import { ipcRenderer, contextBridge } from 'electron';
import { EventEmitter } from 'events';

import { NotificationEvents } from '../global/Events.mjs';
import { checkEventsList } from '../global/Utils.mjs';

/**
 * @typedef {(...args: any[]) => void} ListenerCallback
 * A generic callback function used for event listeners.
 */

/**
 * @typedef {Object} NotificationInstance
 * @property {() => boolean} isSupported - Indicates whether the feature is supported.
 * @property {() => Promise<void>} show - Shows the notification.
 * @property {() => Promise<void>} close - Closes the notification.
 * @property {(event: string|symbol, callback: ListenerCallback) => void} on - Registers an event listener.
 * @property {(event: string|symbol, callback: ListenerCallback) => void} off - Removes an event listener.
 * @property {(event: string|symbol, callback: ListenerCallback) => void} once - Registers a one-time event listener.
 * @property {(event: string|symbol, callback: ListenerCallback) => void} addListener - Alias for `on`.
 * @property {(event: string|symbol, callback: ListenerCallback) => void} removeListener - Alias for `off`.
 * @property {(event: string|symbol, callback: ListenerCallback) => void} prependListener - Adds listener to the beginning.
 * @property {(event: string|symbol, callback: ListenerCallback) => void} prependOnceListener - Adds one-time listener to the beginning.
 * @property {(count: number) => void} setMaxListeners - Sets the maximum number of listeners.
 * @property {() => number} getMaxListeners - Gets the maximum number of listeners.
 * @property {(event: string|symbol) => number} listenerCount - Returns the number of listeners for the event.
 * @property {(event: string|symbol) => Function[]} listeners - Returns an array of listeners.
 * @property {(event: string|symbol) => Function[]} rawListeners - Returns raw array of listeners.
 * @property {() => (string|symbol)[]} eventNames - Returns registered event names.
 */

/**
 * Provides an interface to manage notifications with event handling
 * through Electron's native IPC.
 *
 * @beta This API is experimental and may change in future versions.
 */
class TinyElectronNotification {
  #exposeInMainWorld = '';
  #maxListeners = Infinity;

  /** @type {Map<string, { resolve: Function, reject: Function, event?: EventEmitter }>} */
  #notifications = new Map();

  #Events = NotificationEvents;

  /**
   * Exposes the API securely to the main window context.
   *
   * @param {string} [apiName='newElectronNotification'] - The name under which the API will be exposed.
   */
  installWinScript(apiName = 'newElectronNotification') {
    if (this.#exposeInMainWorld.length > 0)
      throw new Error(`[installWinScript] API '${this.#exposeInMainWorld}' is already exposed.`);
    if (typeof apiName !== 'string' || apiName.trim() === '')
      throw new Error('[installWinScript] apiName must be a non-empty string.');
    this.#exposeInMainWorld = apiName;
    contextBridge.exposeInMainWorld(
      apiName,
      /** @param {Electron.NotificationConstructorOptions & { tag: string }} args */ (args) =>
        this.create(args),
    );
  }

  /**
   * Creates a new notification instance and sets up event bridging.
   *
   * @param {Electron.NotificationConstructorOptions & { tag: string }} arg - Notification configuration.
   * @returns {Promise<NotificationInstance>} Resolves to the notification instance methods.
   */
  create(arg) {
    return new Promise((resolve, reject) => {
      if (typeof arg !== 'object' || arg === null)
        throw new TypeError('Argument "arg" must be a non-null object.');
      if (!('tag' in arg)) throw new Error('Notification "tag" is required.');
      if (typeof arg.tag !== 'string' || arg.tag.trim() === '')
        throw new Error('Notification "tag" must be a non-empty string.');
      if (this.#notifications.has(arg.tag))
        throw new Error(`Notification with tag "${arg.tag}" already exists.`);

      const notiConfig = { resolve, reject, event: new EventEmitter() };
      this.#notifications.set(arg.tag, notiConfig);
      notiConfig.event.setMaxListeners(this.#maxListeners);

      // Using native ipcRenderer.invoke to call handle from main process
      ipcRenderer
        .invoke(this.#Events.Create, arg)
        .then((response) => {
          notiConfig.resolve({
            /**
             * Indicates whether the feature is supported.
             * @returns {boolean} True if supported, false otherwise.
             */
            isSupported: () => response.isSupported,

            /**
             * Shows the notification.
             * Sends an IPC request to show.
             */
            show: () => ipcRenderer.invoke(this.#Events.Show, arg.tag),

            /**
             * Closes the notification.
             * Sends an IPC request to close.
             */
            close: () => ipcRenderer.invoke(this.#Events.Close, arg.tag),

            // EventEmitter bindings

            /**
             * Registers an event listener.
             * @param {string|symbol} event The event name.
             * @param {ListenerCallback} callback The event handler function.
             */
            on: (event, callback) => {
              notiConfig.event?.on(event, callback);
            },

            /**
             * Removes an event listener.
             * @param {string|symbol} event The event name.
             * @param {ListenerCallback} callback The event handler function.
             */
            off: (event, callback) => {
              notiConfig.event?.off(event, callback);
            },
            /**
             * Registers a one-time event listener.
             * @param {string|symbol} event The event name.
             * @param {ListenerCallback} callback The event handler function.
             */
            once: (event, callback) => {
              notiConfig.event?.once(event, callback);
            },

            /**
             * Alias for `on`. Registers an event listener.
             * @param {string|symbol} event The event name.
             * @param {ListenerCallback} callback The event handler function.
             */
            addListener: (event, callback) => {
              notiConfig.event?.addListener(event, callback);
            },

            /**
             * Alias for `off`. Removes an event listener.
             * @param {string|symbol} event The event name.
             * @param {ListenerCallback} callback The event handler function.
             */
            removeListener: (event, callback) => {
              notiConfig.event?.removeListener(event, callback);
            },

            /**
             * Adds an event listener to the beginning of the listeners array.
             * @param {string|symbol} event The event name.
             * @param {ListenerCallback} callback The event handler function.
             */
            prependListener: (event, callback) => {
              notiConfig.event?.prependListener(event, callback);
            },

            /**
             * Adds a one-time event listener to the beginning of the listeners array.
             * @param {string|symbol} event The event name.
             * @param {ListenerCallback} callback The event handler function.
             */
            prependOnceListener: (event, callback) => {
              notiConfig.event?.prependOnceListener(event, callback);
            },

            /**
             * Sets the maximum number of listeners for the EventEmitter instance.
             * @param {number} count The maximum number of listeners.
             */
            setMaxListeners: (count) => {
              notiConfig.event?.setMaxListeners(count);
            },

            /**
             * Gets the maximum number of listeners for the EventEmitter instance.
             * @returns {number} The maximum number of listeners.
             */
            getMaxListeners: () => notiConfig.event?.getMaxListeners(),

            /**
             * Returns the number of listeners listening to the specified event.
             * @param {string|symbol} event The event name.
             * @returns {number} The number of listeners.
             */
            listenerCount: (event) => notiConfig.event?.listenerCount(event),

            /**
             * Returns a copy of the array of listeners for the specified event.
             * @param {string|symbol} event The event name.
             * @returns {Function[]} Array of listener functions.
             */
            listeners: (event) => notiConfig.event?.listeners(event),

            /**
             * Returns a copy of the array of listeners for the specified event,
             * including wrappers for once listeners.
             * @param {string|symbol} event The event name.
             * @returns {Function[]} Array of listener functions (raw).
             */
            rawListeners: (event) => notiConfig.event?.rawListeners(event),

            /**
             * Returns an array listing the events for which the emitter has registered listeners.
             * @returns {(string|symbol)[]} Array of event names.
             */
            eventNames: () => notiConfig.event?.eventNames() || [],
          });
        })
        .catch(reject);
    });
  }

  /**
   * Creates a new TinyElectronNotification instance and binds renderer IPC listeners.
   *
   * @param {Object} [settings={}] - Configuration settings for the notifications.
   * @param {NotificationEvents} [settings.eventNames=this.#Events] - Set of event names for internal messaging.
   */
  constructor({ eventNames = this.#Events } = {}) {
    checkEventsList(eventNames, this.#Events);

    /** @param {string} tag */
    const clearNotification = (tag) => {
      if (this.#notifications.has(tag)) this.#notifications.delete(tag);
    };

    /**
     * @param {string} eventName
     * @param {string} tag
     * @param {any} payload
     */
    const emitEvent = (eventName, tag, payload) => {
      const notiConfig = this.#notifications.get(tag);
      if (notiConfig?.event) {
        notiConfig.event.emit(eventName, payload);
      }
      return notiConfig;
    };

    // Bind native IPC listeners for incoming events from Main
    // Close
    ipcRenderer.on(this.#Events.Close, (_event, { arg } = {}) => {
      const config = emitEvent('close', arg.tag, arg.event);
      if (config) delete config.event;
      clearNotification(arg.tag);
    });

    // All
    ipcRenderer.on(this.#Events.All, (_event, { arg, type } = {}) => {
      emitEvent('all', arg.tag, type);
    });

    // Show
    ipcRenderer.on(this.#Events.Show, (_event, { arg } = {}) =>
      emitEvent('show', arg.tag, arg.event),
    );

    // Click
    ipcRenderer.on(this.#Events.Click, (_event, { arg } = {}) => {
      emitEvent('click', arg.tag, arg.event);
      clearNotification(arg.tag);
    });

    // Reply
    ipcRenderer.on(this.#Events.Reply, (_event, { arg } = {}) => {
      emitEvent('reply', arg.tag, arg.reply);
      clearNotification(arg.tag);
    });

    // Action
    ipcRenderer.on(this.#Events.Action, (_event, { arg } = {}) => {
      emitEvent('action', arg.tag, arg.index);
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
