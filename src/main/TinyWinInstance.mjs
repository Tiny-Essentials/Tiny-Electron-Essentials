import { BrowserWindow, shell } from 'electron';
import { EventEmitter } from 'events';
import { AppEvents, RootEvents } from '../global/Events.mjs';
import { checkEventsList } from '../global/Utils.mjs';

/**
 * Represents a single managed Electron BrowserWindow instance.
 *
 * This class tracks visibility, readiness, and index of the window.
 * It allows toggling visibility and storing references to the parent controller and window instance.
 */
class TinyWinInstance {
  /** @typedef {function(string | symbol, ...any): void} Emit */
  /** @typedef {(win: Electron.BrowserWindow, ops?: Electron.OpenDevToolsOptions) => void} OpenDevTools */
  /** @typedef {(win: Electron.BrowserWindow, config: Electron.ProxyConfig) => void} SetProxy */
  /** @typedef {(win: Electron.BrowserWindow, page: string|string[], ops?: Electron.LoadFileOptions|Electron.LoadURLOptions) => void} LoadPath */

  #AppEvents = AppEvents;

  /**
   * Important instance used to make event emitter.
   * @type {EventEmitter}
   */
  #events = new EventEmitter();

  /**
   * Important instance used to make system event emitter.
   * @type {EventEmitter}
   */
  #sysEvents = new EventEmitter();
  #sysEventsUsed = false;

  /**
   * Provides access to a secure internal EventEmitter for subclass use only.
   *
   * This method exposes a dedicated EventEmitter instance intended specifically for subclasses
   * that extend the main class. It prevents subclasses from accidentally or intentionally using
   * the primary class's public event system (`emit`), which could lead to unpredictable behavior
   * or interference in the base class's event flow.
   *
   * For security and consistency, this method is designed to be accessed only once.
   * Multiple accesses are blocked to avoid leaks or misuse of the internal event bus.
   *
   * @returns {EventEmitter} A special internal EventEmitter instance for subclass use.
   * @throws {Error} If the method is called more than once.
   */
  getSysEvents() {
    if (this.#sysEventsUsed)
      throw new Error(
        'Access denied: getSysEvents() can only be called once. ' +
          'This restriction ensures subclass event isolation and prevents accidental interference ' +
          'with the main class event emitter.',
      );
    this.#sysEventsUsed = true;
    return this.#sysEvents;
  }

  /**
   * Emits an event with optional arguments to all system emit.
   * @param {string | symbol} event - The name of the event to emit.
   * @param {...any} args - Arguments passed to event listeners.
   */
  #emit(event, ...args) {
    this.#events.emit(event, ...args);
    if (this.#sysEventsUsed) this.#sysEvents.emit(event, ...args);
  }

  /**
   * @typedef {(...args: any[]) => void} ListenerCallback
   * A generic callback function used for event listeners.
   */

  /**
   * Sets the maximum number of listeners for the internal event emitter.
   *
   * @param {number} max - The maximum number of listeners allowed.
   */
  setMaxListeners(max) {
    this.#events.setMaxListeners(max);
  }

  /**
   * Emits an event with optional arguments.
   * @param {string | symbol} event - The name of the event to emit.
   * @param {...any} args - Arguments passed to event listeners.
   * @returns {boolean} `true` if the event had listeners, `false` otherwise.
   */
  emit(event, ...args) {
    return this.#events.emit(event, ...args);
  }

  /**
   * Registers a listener for the specified event.
   * @param {string | symbol} event - The name of the event to listen for.
   * @param {ListenerCallback} listener - The callback function to invoke.
   * @returns {this} The current class instance (for chaining).
   */
  on(event, listener) {
    this.#events.on(event, listener);
    return this;
  }

  /**
   * Registers a one-time listener for the specified event.
   * @param {string | symbol} event - The name of the event to listen for once.
   * @param {ListenerCallback} listener - The callback function to invoke.
   * @returns {this} The current class instance (for chaining).
   */
  once(event, listener) {
    this.#events.once(event, listener);
    return this;
  }

  /**
   * Removes a listener from the specified event.
   * @param {string | symbol} event - The name of the event.
   * @param {ListenerCallback} listener - The listener to remove.
   * @returns {this} The current class instance (for chaining).
   */
  off(event, listener) {
    this.#events.off(event, listener);
    return this;
  }

  /**
   * Alias for `on`.
   * @param {string | symbol} event - The name of the event.
   * @param {ListenerCallback} listener - The callback to register.
   * @returns {this} The current class instance (for chaining).
   */
  addListener(event, listener) {
    this.#events.addListener(event, listener);
    return this;
  }

  /**
   * Alias for `off`.
   * @param {string | symbol} event - The name of the event.
   * @param {ListenerCallback} listener - The listener to remove.
   * @returns {this} The current class instance (for chaining).
   */
  removeListener(event, listener) {
    this.#events.removeListener(event, listener);
    return this;
  }

  /**
   * Removes all listeners for a specific event, or all events if no event is specified.
   * @param {string | symbol} [event] - The name of the event. If omitted, all listeners from all events will be removed.
   * @returns {this} The current class instance (for chaining).
   */
  removeAllListeners(event) {
    this.#events.removeAllListeners(event);
    return this;
  }

  /**
   * Returns the number of times the given `listener` is registered for the specified `event`.
   * If no `listener` is passed, returns how many listeners are registered for the `event`.
   * @param {string | symbol} eventName - The name of the event.
   * @param {Function} [listener] - Optional listener function to count.
   * @returns {number} Number of matching listeners.
   */
  listenerCount(eventName, listener) {
    return this.#events.listenerCount(eventName, listener);
  }

  /**
   * Adds a listener function to the **beginning** of the listeners array for the specified event.
   * The listener is called every time the event is emitted.
   * @param {string | symbol} eventName - The event name.
   * @param {ListenerCallback} listener - The callback function.
   * @returns {this} The current class instance (for chaining).
   */
  prependListener(eventName, listener) {
    this.#events.prependListener(eventName, listener);
    return this;
  }

  /**
   * Adds a **one-time** listener function to the **beginning** of the listeners array.
   * The next time the event is triggered, this listener is removed and then invoked.
   * @param {string | symbol} eventName - The event name.
   * @param {ListenerCallback} listener - The callback function.
   * @returns {this} The current class instance (for chaining).
   */
  prependOnceListener(eventName, listener) {
    this.#events.prependOnceListener(eventName, listener);
    return this;
  }

  /**
   * Returns an array of event names for which listeners are currently registered.
   * @returns {(string | symbol)[]} Array of event names.
   */
  eventNames() {
    return this.#events.eventNames();
  }

  /**
   * Gets the current maximum number of listeners allowed for any single event.
   * @returns {number} The max listener count.
   */
  getMaxListeners() {
    return this.#events.getMaxListeners();
  }

  /**
   * Returns a copy of the listeners array for the specified event.
   * @param {string | symbol} eventName - The event name.
   * @returns {Function[]} An array of listener functions.
   */
  listeners(eventName) {
    return this.#events.listeners(eventName);
  }

  /**
   * Returns a copy of the internal listeners array for the specified event,
   * including wrapper functions like those used by `.once()`.
   * @param {string | symbol} eventName - The event name.
   * @returns {Function[]} An array of raw listener functions.
   */
  rawListeners(eventName) {
    return this.#events.rawListeners(eventName);
  }

  #checkDestroy() {
    if (!this.#win || this.#win.isDestroyed?.())
      throw new Error('The BrowserWindow instance "win" is not available or has been destroyed.');
  }

  /**
   * Checks if a given value exists in the AppEvents values.
   *
   * @param {string} value - The value to check for.
   * @returns {boolean} True if the value exists, false otherwise.
   */
  isValidAppEvent(value) {
    return Object.keys(this.#AppEvents).includes(value);
  }

  /**
   * Gets the key (event name) associated with a given AppEvents value.
   *
   * @param {string} value - The value to look up.
   * @returns {string} The matching AppEvents key.
   * @throws {Error} If the value is not found.
   */
  getAppEventKey(value) {
    if (!this.isValidAppEvent(value)) throw new Error(`AppEvent value "${value}" not found.`);
    // @ts-ignore
    if (typeof this.#AppEvents[value] !== 'string')
      throw new Error(`AppEvent value "${value}" is invalid.`);
    // @ts-ignore
    return this.#AppEvents[value];
  }

  #preparingDestroy = false;
  #visible = false;
  #ready = false;

  #isFullScreenable = true;
  #isMaximizable = true;
  #isClosable = true;
  #isFocusable = true;

  /** @type {string|number|null} */
  #index = null;

  /** @type {BrowserWindow} */
  #win;

  /**
   * Emits an event with optional arguments.
   * @type {Emit}
   */
  #primaryEmit;

  /**
   * @type {OpenDevTools}
   */
  #openDevTools;

  /**
   * @type {SetProxy}
   */
  #setProxy;

  /**
   * @type {LoadPath}
   */
  #loadPath;

  /**
   * Returns whether the window is currently maximizable.
   *
   * @returns {boolean} True if the window can be maximized; otherwise, false.
   */
  isMaximizable() {
    const result = this.#win.isMaximizable();
    this.#setMaximizable(result);
    return this.#isMaximizable;
  }

  /**
   * Returns whether the window is currently closable.
   *
   * @returns {boolean} True if the window can be closed; otherwise, false.
   */
  isClosable() {
    const result = this.#win.isClosable();
    this.#setClosable(result);
    return this.#isClosable;
  }

  /**
   * Returns whether the window is currently fullscreenable.
   *
   * @returns {boolean} True if the window can enter fullscreen; otherwise, false.
   */
  isFullScreenable() {
    const result = this.#win.isFullScreenable();
    this.#setFullScreenable(result);
    return this.#isFullScreenable;
  }

  /**
   * Returns whether the window is currently focusable.
   *
   * @returns {boolean} True if the window can be focused; otherwise, false.
   */
  isFocusable() {
    const result = this.#win.isFocusable();
    this.#setFocusable(result);
    return this.#isFocusable;
  }

  /**
   * Updates the internal maximizable state.
   *
   * @param {boolean} value - True to make the window maximizable, false otherwise.
   * @throws {TypeError} If the value is not a boolean.
   */
  #setMaximizable(value) {
    if (typeof value !== 'boolean') throw new TypeError('The "value" argument must be a boolean.');
    const oldValue = this.#isMaximizable;
    if (oldValue === value) return;
    this.#isMaximizable = value;
    this.#win.webContents.send(this.#AppEvents.WindowIsMaximizable, {
      value,
      time: Date.now(),
    });
    this.#emit(this.#AppEvents.WindowIsMaximizable, value);
    this.#primaryEmit(this.#AppEvents.WindowIsMaximizable, this.#index, value);
  }

  /**
   * Updates the internal closable state.
   *
   * @param {boolean} value - True to make the window closable, false otherwise.
   * @throws {TypeError} If the value is not a boolean.
   */
  #setClosable(value) {
    if (typeof value !== 'boolean') throw new TypeError('The "value" argument must be a boolean.');
    const oldValue = this.#isClosable;
    if (oldValue === value) return;
    this.#isClosable = value;
    this.#win.webContents.send(this.#AppEvents.WindowIsClosable, {
      value,
      time: Date.now(),
    });
    this.#emit(this.#AppEvents.WindowIsClosable, value);
    this.#primaryEmit(this.#AppEvents.WindowIsClosable, this.#index, value);
  }

  /**
   * Updates the internal fullscreenable state.
   *
   * @param {boolean} value - True to allow fullscreen, false otherwise.
   * @throws {TypeError} If the value is not a boolean.
   */
  #setFullScreenable(value) {
    if (typeof value !== 'boolean') throw new TypeError('The "value" argument must be a boolean.');
    const oldValue = this.#isFullScreenable;
    if (oldValue === value) return;
    this.#isFullScreenable = value;
    this.#win.webContents.send(this.#AppEvents.WindowIsFullScreenable, {
      value,
      time: Date.now(),
    });
    this.#emit(this.#AppEvents.WindowIsFullScreenable, value);
    this.#primaryEmit(this.#AppEvents.WindowIsFullScreenable, this.#index, value);
  }

  /**
   * Updates the internal focusable state.
   *
   * @param {boolean} value - True to make the window focusable, false otherwise.
   * @throws {TypeError} If the value is not a boolean.
   */
  #setFocusable(value) {
    if (typeof value !== 'boolean') throw new TypeError('The "value" argument must be a boolean.');
    const oldValue = this.#isFocusable;
    if (oldValue === value) return;
    this.#isFocusable = value;
    this.#win.webContents.send(this.#AppEvents.WindowIsFocusable, {
      value,
      time: Date.now(),
    });
    this.#emit(this.#AppEvents.WindowIsFocusable, value);
    this.#primaryEmit(this.#AppEvents.WindowIsFocusable, this.#index, value);
  }

  /**
   * Returns the window index assigned to this instance.
   * @returns {string|number|null}
   */
  getIndex() {
    return this.#index;
  }

  /**
   * Checks whether the window is currently visible.
   * @returns {boolean}
   */
  isVisible() {
    return this.#visible;
  }

  /**
   * Checks whether the window is marked as ready.
   * @returns {boolean}
   */
  isReady() {
    return this.#ready;
  }

  /**
   * Loads a page. Depending on configuration, it can load a local file path or a URL.
   *
   * @param {string|string[]} page - The page or path segments to load.
   * @param {Electron.LoadFileOptions|Electron.LoadURLOptions} [ops] - Options passed to `loadFile` or `loadURL`.
   * @throws {TypeError} If page is not a string or string[].
   * @throws {TypeError} If page contains non-string entries.
   * @throws {TypeError} If ops is not an object.
   */
  loadPath(page, ops) {
    this.#checkDestroy();
    return this.#loadPath(this.#win, page, ops);
  }

  /**
   * Opens the developer tools.
   * Also sends the custom console warning message to the devtools console.
   * @param {Electron.OpenDevToolsOptions} [ops] - The target DevTools config.
   */
  openDevTools(ops) {
    this.#checkDestroy();
    return this.#openDevTools(this.#win, ops);
  }

  /**
   * Sets whether the window can be maximized.
   * Sends an event to the renderer with the updated state.
   *
   * @param {boolean} value - If true, the window becomes maximizable; otherwise, it cannot be maximized.
   * @returns {boolean} - Edit result.
   */
  setMaximizable(value) {
    this.#checkDestroy();
    this.#win.setMaximizable(value);
    const result = this.#win.isMaximizable();
    this.#setMaximizable(result);
    return result;
  }

  /**
   * Sets whether the window can be closed.
   * Sends an event to the renderer with the updated state.
   *
   * @param {boolean} value - If true, the window can be closed; otherwise, it cannot be closed.
   * @returns {boolean} - Edit result.
   */
  setClosable(value) {
    this.#checkDestroy();
    this.#win.setClosable(value);
    const result = this.#win.isClosable();
    this.#setClosable(result);
    return result;
  }

  /**
   * Sets whether the window can be focused.
   * Sends an event to the renderer with the updated state.
   *
   * @param {boolean} value - If true, the window can be focused; otherwise, it cannot receive focus.
   * @returns {boolean} - Edit result.
   */
  setFocusable(value) {
    this.#checkDestroy();
    this.#win.setFocusable(value);
    const result = this.#win.isFocusable();
    this.#setFocusable(result);
    return result;
  }

  /**
   * Sets whether the window can enter fullscreen mode.
   * Sends an event to the renderer with the updated state.
   *
   * @param {boolean} value - If true, the window can enter fullscreen mode; otherwise, it cannot receive focus.
   * @returns {boolean} - Edit result.
   */
  setFullScreenable(value) {
    this.#checkDestroy();
    this.#win.setFullScreenable(value);
    const result = this.#win.isFullScreenable();
    this.#setFullScreenable(result);
    return result;
  }

  /**
   * Applies a network proxy configuration.
   *
   * This method sets the proxy settings for the session.
   * Upon completion, it emits events back to the renderer process to indicate success or failure.
   *
   * @param {Electron.ProxyConfig} config - The proxy configuration object following Electron's ProxyConfig structure.
   * Example: `{ proxyRules: 'http=myproxy.com:8080;https=myproxy.com:8080', proxyBypassRules: 'localhost' }`
   *
   * @throws {Error} Throws an error if the provided window (`win`) is invalid (null, destroyed, or missing webContents).
   *
   * @returns {void}
   */
  setProxy(config) {
    this.#checkDestroy();
    return this.#setProxy(this.#win, config);
  }

  /**
   * Returns the internal BrowserWindow instance.
   * @returns {BrowserWindow}
   * @throws {Error} If the window is not initialized.
   */
  getWin() {
    if (!this.#win)
      throw new Error(
        '[getWindow Error] The BrowserWindow instance is not available. Make sure it was properly created.',
      );
    this.#checkDestroy();
    return this.#win;
  }

  /**
   * Toggles the visibility of the window, or sets it explicitly if a value is provided.
   *
   * Emits the `ShowApp` event to the root instance when visibility changes.
   *
   * @param {boolean} [isVisible] - If defined, sets visibility to this value. Otherwise, it toggles.
   * @returns {boolean} - The new visibility state.
   * @throws {Error} If `isVisible` is not a boolean or undefined.
   */
  toggleVisible(isVisible) {
    this.#checkDestroy();
    if (typeof isVisible !== 'undefined' && typeof isVisible !== 'boolean')
      throw new Error(
        `[toggleVisible Error] Expected a boolean or undefined, but got: ${typeof isVisible}`,
      );

    if (!this.#ready) return this.#visible;
    const changeVisibleTo = typeof isVisible === 'boolean' ? isVisible : !this.#visible;

    if (changeVisibleTo) this.#win?.show();
    else this.#win?.hide();
    this.#visible = changeVisibleTo;
    this.#emit(RootEvents.ShowApp, changeVisibleTo);
    this.#primaryEmit(RootEvents.ShowApp, this.#index, changeVisibleTo);
    return changeVisibleTo;
  }

  /**
   * Sends a ping event with custom data to the renderer process.
   *
   * This method allows the main process to send arbitrary data to the window
   * via the `Ping` event. It is commonly used for connection checks,
   * heartbeat signals, or simple data synchronization.
   *
   * @param {any} data - Any serializable data to send along with the ping event.
   *
   * @throws {Error} Throws an error if the window instance is destroyed or unavailable.
   *
   * @returns {void}
   */
  ping(data) {
    this.#checkDestroy();
    if (this.#win.webContents)
      this.#win.webContents.send(this.#AppEvents.Ping, { value: data, time: Date.now() });
  }

  /**
   * Checks whether the given IPC event originated from this window instance.
   *
   * This is useful when multiple windows exist and you want to ensure an IPC event
   * came from the correct one before handling it.
   *
   * @param {Electron.IpcMainEvent} event - The IPC event object received in the main process.
   * @returns {boolean} - Returns true if the event originated from this instance's window.
   */
  isFromWin(event) {
    this.#checkDestroy();
    const webContents = event.sender;
    if (!event.senderFrame) return false;
    const win = BrowserWindow.fromWebContents(webContents);
    if (win && win.id === this.#win.id) return true;
    return false;
  }

  /**
   * @param {Object} [settings2={}] - Configuration for the new instance.
   * @param {Emit} [settings2.emit] - The root controller or application class managing this instance.
   * @param {SetProxy} [settings2.setProxy] - SetProxy callback.
   * @param {OpenDevTools} [settings2.openDevTools] - OpenDevTools callback.
   * @param {LoadPath} [settings2.loadPath] - Load path callback.
   * @param {AppEvents} [settings2.eventNames=this.#AppEvents] - Set of event names for internal messaging.
   * @param {Object} [settings={}] - Configuration for the new BrowserWindow.
   * @param {Electron.BrowserWindowConstructorOptions} [settings.config] - Configuration for the new BrowserWindow.
   * @param {string|number} [settings.index] - (Optional) Index of the window in the manager.
   * @param {boolean} [settings.isMaximized=false] - The window will try to be maximized by booting.
   * @param {boolean} [settings.openWithBrowser=true] - if you will make all links open with the browser, not with the application.
   * @param {boolean} [settings.show] - The window will appear when the load is finished.
   * @param {string[]} [settings.urls=['https:', 'http:']] - List of allowed URL protocols to permit external opening.
   * @throws {Error} If any parameter is invalid.
   */
  constructor(
    { eventNames = this.#AppEvents, emit, loadPath, openDevTools, setProxy } = {},
    {
      config,
      index,
      show,
      isMaximized = false,
      openWithBrowser = true,
      urls = ['https:', 'http:'],
    } = {},
  ) {
    checkEventsList(eventNames, this.#AppEvents);
    if (typeof emit !== 'function')
      throw new Error(`[Window Creation Error] 'emit' must be a event emit.`);
    if (typeof loadPath !== 'function')
      throw new Error(`[Window Creation Error] 'loadPath' must be a loadPath.`);
    if (typeof openDevTools !== 'function')
      throw new Error(`[Window Creation Error] 'openDevTools' must be a openDevTools.`);
    if (typeof setProxy !== 'function')
      throw new Error(`[Window Creation Error] 'setProxy' must be a setProxy.`);

    if (typeof config !== 'object')
      throw new Error('[Window Creation Error] Expected "config" to be an object.');

    if (typeof isMaximized !== 'boolean')
      throw new Error('[Window Creation Error] Expected "isMaximized" to be an boolean.');
    if (typeof openWithBrowser !== 'boolean')
      throw new Error('[Window Creation Error] Expected "openWithBrowser" to be an boolean.');
    if (typeof show !== 'boolean')
      throw new Error('[Window Creation Error] Expected "show" to be an boolean.');

    if (!Array.isArray(urls))
      throw new Error('[Window Creation Error] Expected an url list of strings.');
    for (const item of urls)
      if (typeof item !== 'string')
        throw new Error('[Window Creation Error] All urls in the array must be strings.');

    if (
      typeof index !== 'undefined' &&
      typeof index !== 'string' &&
      (typeof index !== 'number' || !Number.isFinite(index) || Number.isNaN(index))
    )
      throw new Error('[Window Creation Error] Expected "index" to be an string or number.');

    this.#win = new BrowserWindow(config);
    this.#primaryEmit = emit;
    this.#openDevTools = openDevTools;
    this.#setProxy = setProxy;
    this.#loadPath = loadPath;
    this.#index = typeof index === 'number' || typeof index === 'string' ? index : null;
    this.#visible = show;

    // Make all links open with the browser, not with the application
    if (openWithBrowser)
      this.#win.webContents.setWindowOpenHandler(({ url }) => {
        let allowed = false;
        for (const name of urls) {
          if (url.startsWith(name)) {
            allowed = true;
            break;
          }
        }
        if (allowed) shell.openExternal(url);
        return { action: 'deny' };
      });

    // Show Page
    this.#win.once('ready-to-show', (...args) => {
      this.#ready = true;
      this.toggleVisible(show);
      if (isMaximized && show) this.#win.maximize();
      this.#emit(RootEvents.ReadyToShow, ...args);
      this.#primaryEmit(RootEvents.ReadyToShow, this.#index, ...args);
      if (this.#win)
        this.#win.webContents.send(this.#AppEvents.ReadyToShow, {
          time: Date.now(),
        });
    });

    /**
     * Resize
     * @param {string[]} events
     */
    const resizeWindowEvent = (events) => {
      if (this.#win) {
        for (const eventName of events)
          this.#win.webContents.send(eventName, {
            value: this.#win.getSize(),
            time: Date.now(),
          });
      }
    };

    this.#win.on('resize', () => resizeWindowEvent([this.#AppEvents.Resize]));
    this.#win.on('resized', () => resizeWindowEvent([this.#AppEvents.Resized]));
    this.#win.on('will-resize', () => resizeWindowEvent([this.#AppEvents.WillResize]));

    this.#win.on('maximize', () =>
      resizeWindowEvent([
        this.#AppEvents.WillResize,
        this.#AppEvents.Resize,
        this.#AppEvents.Resized,
      ]),
    );
    this.#win.on('unmaximize', () =>
      resizeWindowEvent([
        this.#AppEvents.WillResize,
        this.#AppEvents.Resize,
        this.#AppEvents.Resized,
      ]),
    );

    this.#win.on('minimize', () =>
      resizeWindowEvent([
        this.#AppEvents.WillResize,
        this.#AppEvents.Resize,
        this.#AppEvents.Resized,
      ]),
    );
    this.#win.on('restore', () =>
      resizeWindowEvent([
        this.#AppEvents.WillResize,
        this.#AppEvents.Resize,
        this.#AppEvents.Resized,
      ]),
    );

    this.#win.on('enter-full-screen', () =>
      resizeWindowEvent([
        this.#AppEvents.WillResize,
        this.#AppEvents.Resize,
        this.#AppEvents.Resized,
      ]),
    );
    this.#win.on('leave-full-screen', () =>
      resizeWindowEvent([
        this.#AppEvents.WillResize,
        this.#AppEvents.Resize,
        this.#AppEvents.Resized,
      ]),
    );

    this.#win.on('enter-html-full-screen', () =>
      resizeWindowEvent([
        this.#AppEvents.WillResize,
        this.#AppEvents.Resize,
        this.#AppEvents.Resized,
      ]),
    );
    this.#win.on('leave-html-full-screen', () =>
      resizeWindowEvent([
        this.#AppEvents.WillResize,
        this.#AppEvents.Resize,
        this.#AppEvents.Resized,
      ]),
    );

    const fullscreenEvent = () => {
      if (this.#win)
        this.#win.webContents.send(this.#AppEvents.WindowIsFullScreen, {
          value: this.#win.isFullScreen(),
          time: Date.now(),
        });
    };

    this.#win.on('enter-full-screen', fullscreenEvent);
    this.#win.on('leave-full-screen', fullscreenEvent);

    this.#win.on('enter-html-full-screen', fullscreenEvent);
    this.#win.on('leave-html-full-screen', fullscreenEvent);

    // More
    this.#win.on('focus', () => {
      if (this.#win && this.#win.webContents)
        this.#win.webContents.send(this.#AppEvents.WindowIsFocused, {
          value: true,
          time: Date.now(),
        });
    });

    this.#win.on('blur', () => {
      if (this.#win && this.#win.webContents)
        this.#win.webContents.send(this.#AppEvents.WindowIsFocused, {
          value: false,
          time: Date.now(),
        });
    });

    this.#win.on('show', () => {
      if (this.#win && this.#win.webContents)
        this.#win.webContents.send(this.#AppEvents.WindowIsVisible, {
          value: true,
          time: Date.now(),
        });
    });

    this.#win.on('hide', () => {
      if (this.#win && this.#win.webContents)
        this.#win.webContents.send(this.#AppEvents.WindowIsVisible, {
          value: false,
          time: Date.now(),
        });
    });

    this.#win.on('maximize', () => {
      if (this.#win && this.#win.webContents)
        this.#win.webContents.send(this.#AppEvents.WindowIsMaximized, {
          value: true,
          time: Date.now(),
        });
    });

    this.#win.on('unmaximize', () => {
      if (this.#win && this.#win.webContents)
        this.#win.webContents.send(this.#AppEvents.WindowIsMaximized, {
          value: false,
          time: Date.now(),
        });
    });

    this.#win.on('will-resize', () => {
      if (this.#win && this.#win.webContents)
        this.#win.webContents.send(this.#AppEvents.WindowIsMaximized, {
          value: this.#win.isMaximized(),
          time: Date.now(),
        });
    });

    this.#win.on('resize', () => {
      if (this.#win && this.#win.webContents)
        this.#win.webContents.send(this.#AppEvents.WindowIsMaximized, {
          value: this.#win.isMaximized(),
          time: Date.now(),
        });
    });

    this.#win.on('resized', () => {
      if (this.#win && this.#win.webContents)
        this.#win.webContents.send(this.#AppEvents.WindowIsMaximized, {
          value: this.#win.isMaximized(),
          time: Date.now(),
        });
    });

    this.#win.on('move', () => {
      if (this.#win && this.#win.webContents)
        this.#win.webContents.send(this.#AppEvents.WindowMove, {
          value: this.#win.getPosition(),
          time: Date.now(),
        });
    });
  }

  /**
   * Checks whether the internal BrowserWindow instance has been destroyed.
   *
   * This method safely verifies if the window no longer exists or has already been destroyed.
   * It handles edge cases where the window may be `null` or the `isDestroyed` method is unavailable.
   *
   * @returns {boolean} `true` if the window is destroyed or unavailable, otherwise `false`.
   */
  isDestroyed() {
    if (!this.#win || this.#win.isDestroyed()) return true;
    return false;
  }

  /**
   * Checks whether the internal BrowserWindow instance is preparing to be destroyed.
   *
   * @returns {boolean} `true` if the window is being destroyed.
   */
  isPreparingDestroy() {
    return this.#preparingDestroy;
  }

  /**
   * Destroys the current BrowserWindow instance.
   *
   * @returns {void}
   */
  destroy() {
    this.#preparingDestroy = true;
    this.#events.removeAllListeners();
    this.#sysEvents.removeAllListeners();
    if (!this.isDestroyed()) this.#win.destroy();
  }
}

export default TinyWinInstance;
