import { existsSync, lstatSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve as resolvePath, relative, isAbsolute as isAbsolutePath, join } from 'node:path';

import { EventEmitter } from 'events';
import { app, BrowserWindow, ipcMain, session, powerMonitor, Tray } from 'electron';
import { release, platform } from 'node:os';

import { AppEvents, RootEvents } from '../global/Events.mjs';
import { checkEventsList, deepClone, serializeError } from '../global/Utils.mjs';
import TinyWinInstance from './TinyWinInstance.mjs';
import TinyWindowFile from './TinyWindowFile.mjs';
import TinyIpcResponder from './TinyIpcResponder.mjs';

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

/** @typedef {import('./TinyWindowFile.mjs').InitConfig} WinInitFile */
/** @typedef {import('./TinyIpcResponder.mjs').IPCRespondCallback} IPCRespondCallback */

/**
 * @typedef {Object} NewBrowserOptions - Configuration for the new BrowserWindow.
 * @property {Electron.BrowserWindowConstructorOptions} [config] - Configuration for the new BrowserWindow.
 * @property {Electron.AppDetailsOptions} [appDetails={ appId: this.getAppId(), appIconPath: this.getIcon(), relaunchDisplayName: this.getTitle() }] - Configuration for the browser app details.
 * @property {boolean} [openWithBrowser=this.#openWithBrowser] - If you will make all links open with the browser, not with the application.
 * @property {boolean} [show=true] - The window will appear when the load is finished.
 * @property {string} [fileId] - (Optional) Id file of the window in the manager.
 * @property {string[]} [urls=['https:', 'http:']] - List of allowed URL protocols to permit external opening.
 * @property {boolean} [isMain=false] - Whether this window is the main application window.
 * @property {boolean} [needsMaximize=true] - It is necessary to make auto maximize on startup.
 * @property {boolean} [minimizeOnClose] - Overrides the default behavior to minimize the window instead of closing it. Falls back to `this.getMinimizeOnClose()` if not provided.
 */

/**
 * Manages the root context of the Electron application.
 *
 * This class acts as the central manager for window instances,
 * IPC handlers, and global application state. It coordinates
 * the lifecycle of windows, IPC responders, and shared resources.
 *
 * Typically used in the main process to bootstrap and manage the
 * core behavior of the entire Electron application.
 *
 * @class
 */
class TinyElectronRoot {
  #AppEvents = AppEvents;
  #winFile = new TinyWindowFile();

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

  // Don't touch
  #loadByUrl = false;
  #firstTime = true;
  #appReady = false;
  #isQuiting = false;
  #minimizeOnClose = false;
  #winIds = 0;

  #appId;
  #title;
  #urlBase;
  #pathBase;
  #iconFolder;
  #icon;

  #openWithBrowser;

  #appDataName;

  /** @type {((data: any) => Record<string, any>) | null} */
  #requestCache = null;

  /** @type {TinyIpcResponder} */
  #ipcResponder;

  /** @type {Record<string, string>} */
  #appDataStarted = {};

  /** @type {Map<string, Electron.Tray>} */
  #trays = new Map();

  /** @type {Map<number, boolean>} */
  #winMinimizeOnClose = new Map();

  /**
   * Warning message shown in the developer console when opened.
   * Intended to alert users about potential risks of pasting untrusted code.
   * @type {string[]}
   */
  #consoleOpenWarn = [
    `%cThis is a developer console! Putting weird things can result in theft of accounts or crashing your machine! Do not trust strange people asking you to paste things here!`,
    'color:red; font-size: 12pt; font-weight: 700;',
  ];

  /**
   * Indicates whether this instance has acquired the lock to run.
   * Can be null (not yet determined), or a boolean result.
   * @type {null|boolean}
   */
  #gotTheLock = null;

  /**
   * The current active window instance, or null if none exists.
   * @type {TinyWinInstance | null}
   */
  #win = null;

  /**
   * A map of all created window instances indexed by their internal numeric ID.
   * @type {Map<number|string, TinyWinInstance>}
   */
  #wins = new Map();

  /**
   * Ensures the provided value is a valid Electron BrowserWindow instance.
   * @param {BrowserWindow} win - The window object to validate.
   * @throws {Error} If the value is not an instance of BrowserWindow.
   */
  #isBrowserWindow(win) {
    if (!(win instanceof BrowserWindow))
      throw new Error('Expected win to be an instance of Electron.BrowserWindow.');
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
   * Executes initialization logic that must only run once.
   * Registers a listener for app quit and emits a creation event for the first window.
   */
  #execFirstTime() {
    if (!this.#firstTime) return;
    this.#firstTime = false;
    /**
     * @param {Electron.IpcMainEvent} event
     * @returns {TinyWinInstance|null}
     */
    const getWinInstance = (event) => {
      const webContents = event.sender;
      if (!event.senderFrame) return null;
      const win = BrowserWindow.fromWebContents(webContents);
      if (win) {
        if (this.#win && win.id === this.#win.getWin().id) return this.#win;
        /** @type {TinyWinInstance|null} */
        let result = null;
        this.#wins.forEach((value) => {
          if (!result && win.id === value.getWin().id) result = value;
        });
        return result;
      }
      return null;
    };

    this.#ipcResponder.on(this.#AppEvents.GetWindowData, (event, value, res) => {
      const win = this.#getWin(event);
      const instance = getWinInstance(event);
      if (win && instance)
        res({
          bounds: win.getBounds(),
          isFullScreenable: instance.isFullScreenable(),
          isMaximizable: instance.isMaximizable(),
          isClosable: instance.isClosable(),
          isFocusable: instance.isFocusable(),
          isFullScreen: win.isFullScreen(),
          isFocused: win.isFocused(),
          isMaximized: win.isMaximized(),
        });
      res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.OpenDevTools, (event, value, res) => {
      const win = this.#getWin(event);
      if (win) this.openDevTools(win, value);
      res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.SetTitle, (event, title, res) => {
      const win = this.#getWin(event);
      if (win) win.setTitle(title);
      res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.FocusWindow, (event, _value, res) => {
      const win = this.#getWin(event);
      if (win)
        setTimeout(() => {
          const win = this.#getWin(event);
          if (win) win.focus();
          res(null);
        }, 200);
      else res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.BlurWindow, (event, _value, res) => {
      const win = this.#getWin(event);
      if (win)
        setTimeout(() => {
          const win = this.#getWin(event);
          if (win) win.blur();
          res(null);
        }, 200);
      else res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.ShowWindow, (event, _value, res) => {
      const win = this.#getWin(event);
      if (win)
        setTimeout(() => {
          const win = this.#getWin(event);
          if (win) win.show();
          res(null);
        }, 200);
      else res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.ForceFocusWindow, (event, _value, res) => {
      const win = this.#getWin(event);
      if (win)
        setTimeout(() => {
          const win = this.#getWin(event);
          if (win) {
            win.show();
            win.focus();
          }
          res(null);
        }, 200);
      else res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.SystemIdleTime, (event, _value, res) => {
      const win = this.#getWin(event);
      if (win) {
        const idleSecs = powerMonitor.getSystemIdleTime();
        res(idleSecs);
      } else res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.SystemIdleState, (event, value, res) => {
      const win = this.#getWin(event);
      if (win) {
        const idleState = powerMonitor.getSystemIdleState(value);
        res(idleState);
      } else res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.ToggleVisible, (event, isVisible, res) => {
      const win = getWinInstance(event);
      if (win) res(win.toggleVisible(isVisible));
      else res(null);
    });

    ipcMain.on(this.#AppEvents.AppQuit, () => this.quit());

    ipcMain.on(this.#AppEvents.DOMContentLoaded, (event, data) => {
      const win = getWinInstance(event);
      if (win) this.#emit(RootEvents.DOMContentLoaded, win, data);
    });

    // Win configs
    this.#ipcResponder.on(this.#AppEvents.SetWindowIsMaximizable, (event, data, res) => {
      const win = getWinInstance(event);
      if (win) res(win.setMaximizable(data));
      else res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.SetWindowIsClosable, (event, data, res) => {
      const win = getWinInstance(event);
      if (win) res(win.setClosable(data));
      else res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.SetWindowIsFocusable, (event, data, res) => {
      const win = getWinInstance(event);
      if (win) res(win.setFocusable(data));
      else res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.SetWindowIsFullScreenable, (event, data, res) => {
      const win = getWinInstance(event);
      if (win) res(win.setFullScreenable(data));
      else res(null);
    });

    // Set proxy
    this.#ipcResponder.on(this.#AppEvents.SetProxy, (event, config, res) => {
      const win = this.#getWin(event);
      if (win && win.webContents) {
        this.setProxy(win, config, res);
      } else res(null, new Error('Invalid window type'));
    });

    // Window status
    this.#ipcResponder.on(this.#AppEvents.WindowMaximize, (event, _value, res) => {
      const win = this.#getWin(event);
      if (win) win.maximize();
      res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.WindowUnmaximize, (event, _value, res) => {
      const win = this.#getWin(event);
      if (win) win.unmaximize();
      res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.WindowMinimize, (event, _value, res) => {
      const win = this.#getWin(event);
      if (win) win.minimize();
      res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.WindowHide, (event, _value, res) => {
      const win = getWinInstance(event);
      if (win) res(win.toggleVisible(false));
      else res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.WindowClose, (event, _value, res) => {
      const win = getWinInstance(event);
      if (win) win.getWin().close();
      else res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.WindowDestroy, (event, _value, res) => {
      const win = getWinInstance(event);
      if (win) win.destroy();
      else res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.WindowShow, (event, _value, res) => {
      const win = getWinInstance(event);
      if (win) res(win.toggleVisible(true));
      else res(null);
    });

    // Icons
    this.#ipcResponder.on(this.#AppEvents.ChangeAppIcon, (event, img, res) => {
      if (typeof img !== 'string' || img.length === 0)
        throw new TypeError(`Invalid "img" argument: expected non-empty string, got "${img}"`);
      const win = this.#getWin(event);
      if (win) win.setIcon(this.resolveSystemIconPath(img));
      res(null);
    });

    this.#ipcResponder.on(this.#AppEvents.ChangeTrayIcon, (event, { img, key } = {}, res) => {
      if (typeof img !== 'string' || img.length === 0)
        throw new TypeError(`Invalid "img" argument: expected non-empty string, got "${img}"`);
      if (typeof key !== 'string' || key.length === 0)
        throw new TypeError(`Invalid "key" argument: expected non-empty string, got "${key}"`);
      this.getTray(key).setImage(this.resolveSystemIconPath(img));
      res(null);
    });

    this.#emit(RootEvents.CreateFirstWindow);
  }

  /**
   * Applies a network proxy configuration to a given BrowserWindow instance.
   *
   * This method sets the proxy settings for the session associated with the window's webContents.
   * Upon completion, it emits events back to the renderer process to indicate success or failure.
   *
   * If a callback (`res`) is provided, it will be invoked with `(null)` on success,
   * or with `(null, Error)` on failure.
   *
   * @param {BrowserWindow} win - The target BrowserWindow whose session will receive the proxy configuration.
   * Must be a valid and active window instance.
   *
   * @param {Electron.ProxyConfig} config - The proxy configuration object following Electron's ProxyConfig structure.
   * Example: `{ proxyRules: 'http=myproxy.com:8080;https=myproxy.com:8080', proxyBypassRules: 'localhost' }`
   *
   * @param {IPCRespondCallback} [res] - Optional IPC response callback. Called with:
   * - `(null)` on success,
   * - `(null, Error)` on failure,
   * or `(null, Error('Invalid window type'))` if the window is invalid.
   *
   * @throws {Error} Throws an error if the provided window (`win`) is invalid (null, destroyed, or missing webContents).
   *
   * @returns {void}
   */
  setProxy(win, config, res) {
    this.#isBrowserWindow(win);
    win.webContents.session
      .setProxy(config)
      .then((data) => {
        if (win && win.webContents) {
          if (typeof res === 'function') res(null);
          win.webContents.send(this.#AppEvents.SetProxy, { value: config, time: Date.now() });
        } else if (typeof res === 'function') res(null, new Error('Invalid window type'));
        return data;
      })
      .catch((err) => {
        if (win && win.webContents) {
          if (typeof res === 'function') res(null, err);
          win.webContents.send(this.#AppEvents.SetProxyError, {
            err: serializeError(err),
            time: Date.now(),
          });
        } else if (typeof res === 'function') res(null, new Error('Invalid window type'));
        return err;
      });
  }

  /**
   * Resolves a safe full path to an icon file inside the icon folder based on the OS.
   *
   * - Linux: .png
   * - Windows: .ico
   * - macOS: .icns
   *
   * @param {string} filename - The base name of the icon (without extension).
   * @param {string} [iconFolder=this.getIconFolder()] - The root folder where icons are stored.
   * @returns {string} - The full, safe path to the icon.
   * @throws {Error} If the filename is invalid, or the file does not exist or escapes the folder.
   */
  resolveSystemIconPath(filename, iconFolder = this.getIconFolder()) {
    if (typeof filename !== 'string' || !/^[a-zA-Z0-9_.-]+$/.test(filename))
      throw new Error(
        `Invalid icon filename: "${filename}". Only use safe characters without slashes.`,
      );

    if (
      typeof iconFolder !== 'string' ||
      !existsSync(iconFolder) ||
      !lstatSync(iconFolder).isDirectory()
    )
      throw new Error(`Invalid or missing icon folder: "${iconFolder}".`);

    // Determine correct extension based on OS
    const osValue = platform();
    let extension = '.png';
    if (osValue === 'win32') extension = '.ico';
    else if (osValue === 'darwin') extension = '.icns';

    // Prevent directory traversal
    const normalizedFolder = resolvePath(iconFolder);
    const fullPath = resolvePath(normalizedFolder, filename + extension);

    // Security: Ensure the fullPath is inside the icon folder
    const relativePath = relative(normalizedFolder, fullPath);
    if (relativePath.startsWith('..') || isAbsolutePath(relativePath))
      throw new Error(`Illegal access attempt: "${filename}" resolves outside the icon folder.`);

    // Check if file exists
    if (!existsSync(fullPath) || !lstatSync(fullPath).isFile())
      throw new Error(`Icon file not found: "${fullPath}".`);

    return fullPath;
  }

  /**
   * Returns the internal TinyWindowFile instance.
   * @returns {TinyWindowFile}
   */
  getWinFile() {
    return this.#winFile;
  }

  /**
   * Returns the internal TinyIpcResponder instance.
   * @returns {TinyIpcResponder}
   */
  getIpcResponder() {
    return this.#ipcResponder;
  }

  /**
   * Registers a callback function responsible for providing cache data to be sent
   * to renderer processes upon request.
   *
   * This method can only be called **once** during the application's lifecycle.
   * Any attempt to register multiple callbacks will result in an error.
   *
   * Once set, this callback is triggered when a renderer sends an event
   * requesting cache values (`ElectronCacheValues`). The response is automatically
   * sent back to the requesting renderer.
   *
   * @param {(data: any) => Record<string, any>} callback - A function that returns the current cache data as an object.
   *
   * @throws {Error} Throws an error if a cache request callback is already registered.
   * Error message: `"Cache request callback has already been set."`
   *
   * @returns {void}
   */
  setRequestCache(callback) {
    if (this.#requestCache) throw new Error('Cache request callback has already been set.');
    this.#requestCache = callback;
    this.#ipcResponder.on(this.#AppEvents.ElectronCacheValues, (event, value, res) => {
      const win = this.#getWin(event);
      if (win && win.webContents && typeof this.#requestCache === 'function') {
        res(this.#requestCache(value));
      } else res(null);
    });
  }

  /**
   * Creates a new Electron BrowserWindow and tracks it as a main or secondary window.
   *
   * If marked as the main window, it will be assigned to `#win`. Otherwise, it's stored
   * in the `#wins` map using an auto-incremented index.
   *
   * @param {NewBrowserOptions} [settings={}] - Configuration for the new BrowserWindow
   * @returns {TinyWinInstance}
   * @throws {TypeError} If settings is not an object.
   * @throws {Error} If trying to create a second main window.
   */
  createWindow({
    config,
    fileId,
    show,
    minimizeOnClose,
    appDetails = {
      appId: this.getAppId(),
      appIconPath: this.getIcon(),
      relaunchDisplayName: this.getTitle(),
    },
    urls = ['https:', 'http:'],
    openWithBrowser = this.#openWithBrowser,
    needsMaximize = true,
    isMain = false,
  } = {}) {
    // Validate input
    if (typeof appDetails !== 'object')
      throw new TypeError('Expected "appDetails" to be a object.');
    if (typeof isMain !== 'boolean') throw new TypeError('Expected "isMain" to be a boolean.');
    if (typeof needsMaximize !== 'boolean')
      throw new TypeError('Expected "needsMaximize" to be a boolean.');
    if (isMain && this.#win) throw new Error('Main window already exists. Cannot create another.');
    if (minimizeOnClose !== undefined && typeof minimizeOnClose !== 'boolean')
      throw new TypeError('Expected "minimizeOnClose" to be a boolean if defined.');

    // New instance
    const index = this.#winIds++;
    let showCfg = show;

    let isMaximized = false;
    let cfg;
    if (typeof fileId === 'string' && !this.#winFile.hasId(fileId)) this.#winFile.loadFile(fileId);
    if (typeof fileId === 'string') {
      if (typeof config !== 'object')
        throw new Error('[Window Creation Error] Expected "config" to be an object.');

      cfg = deepClone(config);
      const winData = this.#winFile.getData(fileId);
      if (typeof winData.bounds?.height === 'number') cfg.height = winData.bounds.height;
      if (typeof winData.bounds?.width === 'number') cfg.width = winData.bounds.width;
      if (typeof winData.bounds?.y === 'number') cfg.y = winData.bounds.y;
      if (typeof winData.bounds?.x === 'number') cfg.x = winData.bounds.x;
      if (needsMaximize && typeof winData.maximized === 'boolean') isMaximized = winData.maximized;
    }

    if (typeof show === 'undefined' && typeof cfg.show === 'boolean') showCfg = cfg.show;
    if (typeof showCfg === 'undefined') showCfg = true;
    cfg.show = false;

    const newInstance = new TinyWinInstance(
      {
        eventNames: this.#AppEvents,
        emit: (event, ...args) => this.emit(event, ...args),
        loadPath: (win, page, ops) => this.loadPath(win, page, ops),
        openDevTools: (win, ops) => this.openDevTools(win, ops),
        setProxy: (win, config) => this.setProxy(win, config),
      },
      {
        config: cfg,
        isMaximized,
        openWithBrowser,
        show: showCfg,
        urls,
        index,
      },
    );

    const win = newInstance.getWin();

    // Insert app details
    if (platform() === 'win32') win.setAppDetails(appDetails);

    // Save custom minimizeOnClose (if any)
    if (!isMain && typeof minimizeOnClose === 'boolean')
      this.#winMinimizeOnClose.set(index, minimizeOnClose);

    win.on('close', (event) => {
      // Save window cache
      if (typeof fileId === 'string') {
        /** @type {WinInitFile} */
        const winData = {
          bounds: win.getBounds(),
          maximized: win.isMaximized(),
        };
        writeFileSync(fileId, JSON.stringify(winData));
      }

      // Prevent Close
      const minimize = isMain ? this.getMinimizeOnClose() : this.getMinimizeOnCloseFor(index);
      if (
        !newInstance.isPreparingDestroy() &&
        !newInstance.isDestroyed() &&
        minimize &&
        newInstance.isReady() &&
        !this.isQuiting()
      ) {
        event.preventDefault();
        newInstance.toggleVisible(false);
        return false;
      }
    });

    // Complete
    if (isMain) this.#win = newInstance;
    else this.#wins.set(index, newInstance);
    return newInstance;
  }

  /**
   * Destroys a specific window by key or the main window if no key is provided.
   *
   * This will fully close and remove the associated BrowserWindow and clean up its references.
   * If the window is the main one, it clears the internal main reference. If it’s a secondary
   * window, it is removed from the internal map.
   *
   * @param {string|number} [key] - Optional key to target a secondary window. If omitted, the main window is destroyed.
   * @throws {Error} If no main window exists or no matching window instance is found.
   */
  destroyWindow(key) {
    const instance = this.getWinInstance(key);
    // Destroy the native window if not already
    instance.destroy();

    // Clear internal references
    if (typeof key === 'undefined') {
      this.#win = null;
    } else {
      this.#wins.delete(key);
      this.#winMinimizeOnClose.delete(Number(key));
    }
  }

  /**
   * Registers an existing Electron Tray instance under a given key.
   *
   * This method does not create a new tray. It simply stores a reference
   * to an already created Electron Tray so it can be managed later.
   *
   * @param {string} key - A unique identifier for the tray.
   * @param {Electron.Tray} tray - The Electron Tray instance to register.
   * @throws {Error} If the key is not a string or if the tray is invalid.
   */
  registerTray(key, tray) {
    if (typeof key !== 'string' || key.trim() === '')
      throw new TypeError('[registerTray Error] Tray key must be a non-empty string.');
    if (!(tray instanceof Tray))
      throw new Error('[registerTray Error] Provided tray is not a valid Electron Tray instance.');
    if (this.#trays.has(key))
      throw new Error(`[registerTray Error] Tray key "${key}" is already registered.`);

    this.#trays.set(key, tray);
  }

  /**
   * Registers a tray click callback depending on the platform.
   * On Linux and macOS, it listens to the `click` event.
   * On Windows, it listens to the `double-click` event.
   *
   * @param {string} key - The identifier of the tray instance.
   * @param {(event: Electron.KeyboardEvent, bounds: Electron.Rectangle) => void} callback - The callback function to invoke when the event occurs.
   */
  onTrayClick(key, callback) {
    const tray = this.getTray(key);
    const eventName = platform() === 'win32' ? 'double-click' : 'click';
    // @ts-ignore
    tray.on(eventName, callback);
  }

  /**
   * Unregisters a previously registered tray click callback.
   * On Linux and macOS, it removes the `click` event listener.
   * On Windows, it removes the `double-click` event listener.
   *
   * @param {string} key - The identifier of the tray instance.
   * @param {(event: Electron.KeyboardEvent, bounds: Electron.Rectangle) => void} callback - The callback function to remove.
   */
  offTrayClick(key, callback) {
    const tray = this.getTray(key);
    const eventName = platform() === 'win32' ? 'double-click' : 'click';
    // @ts-ignore
    tray.off(eventName, callback);
  }

  /**
   * Retrieves a registered Tray by its key.
   *
   * @param {string} key - The identifier of the tray to retrieve.
   * @returns {Electron.Tray}
   * @throws {Error} If the tray is not found.
   */
  getTray(key) {
    const tray = this.#trays.get(key);
    if (!tray) throw new Error(`[getTray Error] Tray with key "${key}" is not registered.`);
    return tray;
  }

  /**
   * Checks if a tray is registered under the specified key.
   *
   * @param {string} key - The key to check.
   * @returns {boolean}
   */
  hasTray(key) {
    return this.#trays.has(key);
  }

  /**
   * Removes a tray from the registered tray list.
   *
   * @param {string} key - The identifier of the tray to delete.
   * @returns {boolean} True if the tray was found and deleted; false otherwise.
   */
  deleteTray(key) {
    return this.#trays.delete(key);
  }

  /**
   * Gets whether the window should minimize instead of close on user request.
   * @returns {boolean}
   */
  getMinimizeOnClose() {
    return this.#minimizeOnClose;
  }

  /**
   * Sets whether the window should minimize instead of close on user request.
   * @param {boolean} value
   */
  setMinimizeOnClose(value) {
    if (typeof value !== 'boolean') throw new TypeError('minimizeOnClose must be a boolean.');
    this.#minimizeOnClose = value;
  }

  /**
   * Gets the `minimizeOnClose` behavior for a specific window index.
   * Falls back to the global setting if not explicitly set.
   *
   * @param {number} index - The index of the window.
   * @returns {boolean}
   */
  getMinimizeOnCloseFor(index) {
    return this.#winMinimizeOnClose.get(index) ?? this.getMinimizeOnClose();
  }

  /**
   * Sets the `minimizeOnClose` behavior for a specific window index.
   *
   * @param {number} index - The index of the window.
   * @param {boolean} value - Whether the window should minimize on close.
   */
  setMinimizeOnCloseFor(index, value) {
    if (typeof index !== 'number' || typeof value !== 'boolean')
      throw new TypeError('Expected index to be number and value to be boolean.');
    if (!this.#wins.has(index)) throw new Error(`No window found with index ${index}`);
    this.#winMinimizeOnClose.set(index, value);
  }

  /**
   * Removes any custom `minimizeOnClose` override for a specific window.
   *
   * @param {number} index - The index of the window.
   */
  removeMinimizeOnCloseFor(index) {
    this.#winMinimizeOnClose.delete(index);
  }

  /**
   * Clears all custom `minimizeOnClose` settings for secondary windows.
   */
  clearMinimizeOnCloseOverrides() {
    this.#winMinimizeOnClose.clear();
  }

  /**
   * Initializes the core application configuration and sets up essential app behaviors.
   *
   * This constructor sets up base application options such as window behavior,
   * app identification, and URL handling. It also defines internal lifecycle events
   * for handling window closures, second instance attempts, and macOS dock activations.
   *
   * - On **Windows**, it sets the App User Model ID to allow native toast notifications.
   * - On **macOS**, it recreates the window when the dock icon is clicked and no windows are open.
   * - When a second instance is started, it focuses the existing window instead of launching a new one.
   *
   * @param {Object} [settings={}] - Configuration settings for the application.
   * @param {AppEvents} [settings.eventNames=this.#AppEvents] - Set of event names for internal messaging.
   * @param {string} [settings.ipcResponseChannel] - Custom ipc response channel name of TinyIpcResponder instance.
   * @param {boolean} [settings.openWithBrowser=true] - Whether to allow fallback opening in the system browser.
   * @param {string} [settings.urlBase=''] - The base URL for loading content if using remote sources.
   * @param {string} [settings.pathBase] - The local path used for loading static files if not using a URL.
   * @param {string} [settings.icon] - The icon of the application.
   * @param {string} [settings.iconFolder] - Path to a folder containing icon assets for the app and tray.
   * @param {string} [settings.title] - The title of the application.
   * @param {string} [settings.appId] - The unique App User Model ID (used for Windows notifications).
   * @param {string} [settings.appDataName] - The appData application name used by folder names.
   * @param {string} [settings.name=app.getName()] - The internal application name used by Electron APIs.
   * @param {boolean} [settings.minimizeOnClose=false] - Whether to minimize instead of closing the window.
   *
   * @throws {Error} If any required string values are missing or invalid.
   */
  constructor({
    eventNames = { ...this.#AppEvents },
    ipcResponseChannel,
    openWithBrowser = true,
    name = app.getName(),
    urlBase = '',
    icon,
    pathBase,
    iconFolder,
    appId,
    title,
    appDataName,
    minimizeOnClose = false,
  } = {}) {
    checkEventsList(eventNames, this.#AppEvents);
    if (typeof urlBase !== 'string')
      throw new TypeError(
        'Expected "urlBase" to be a string. Provide a valid application urlBase.',
      );
    if (typeof icon !== 'string')
      throw new TypeError('Expected "icon" to be a string. Provide a valid application icon.');

    if (typeof iconFolder !== 'string')
      throw new TypeError(
        'Expected "iconFolder" to be a string. Provide a valid icon folder path.',
      );
    if (!existsSync(iconFolder) || !lstatSync(iconFolder).isDirectory())
      throw new Error(`The icon folder path "${iconFolder}" does not exist or is not a directory.`);

    if (typeof pathBase !== 'string')
      throw new TypeError(
        'Expected "pathBase" to be a string. Provide a valid application pathBase.',
      );
    if (!existsSync(pathBase) || !lstatSync(pathBase).isDirectory())
      throw new Error(`The pathBase "${pathBase}" does not exist or is not a directory.`);

    this.#iconFolder = iconFolder;
    this.#pathBase = pathBase;

    if (!existsSync(this.resolveSystemIconPath(icon)))
      throw new Error(`The icon "${icon}" does not exist.`);

    if (typeof title !== 'string')
      throw new TypeError('Expected "title" to be a string. Provide a valid application title.');
    if (typeof appId !== 'string')
      throw new TypeError('Expected "appId" to be a string. Provide a valid application appId.');
    if (typeof appDataName !== 'string')
      throw new TypeError(
        'Expected "appDataName" to be a string. Provide a valid application appDataName.',
      );

    if (typeof minimizeOnClose !== 'boolean')
      throw new TypeError(
        'Expected "minimizeOnClose" to be a boolean. Provide a valid minimizeOnClose value.',
      );

    if (typeof openWithBrowser !== 'boolean')
      throw new TypeError(
        'Expected "openWithBrowser" to be a boolean. Provide a valid application openWithBrowser.',
      );

    this.#ipcResponder = new TinyIpcResponder(ipcResponseChannel);
    this.#minimizeOnClose = minimizeOnClose;
    this.#appDataName = appDataName;
    this.#openWithBrowser = openWithBrowser;
    this.#loadByUrl = urlBase.trim().length > 0 ? true : false;
    this.#urlBase = urlBase;
    this.#title = title;
    this.#appId = appId;
    this.#icon = icon;

    // Set application name for Windows 10+ notifications
    if (platform() === 'win32') app.setAppUserModelId(name);

    app.on('will-quit', () => {
      this.#win = null;
      this.#wins.clear();
      this.#isQuiting = true;
    });

    // Someone tried to run a second instance, we should focus our window.
    app.on('second-instance', () => {
      if (this.existsWin()) {
        const instance = this.getWinInstance();
        instance.toggleVisible(true);
        const win = this.getWin();
        if (win.isMinimized()) {
          win.restore();
        }
        win?.focus();
      }
    });

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      const allWindows = BrowserWindow.getAllWindows();
      if (allWindows.length) allWindows[0].focus();
      else this.#execFirstTime();
    });
  }

  /**
   * Checks if a specific CLI argument was provided when starting the application.
   *
   * This method scans `process.argv` to determine whether a particular argument
   * (exact match) was passed via the command line. It's useful for enabling or
   * disabling behaviors at runtime based on flags.
   *
   * @param {string} name - The exact argument name to search for (e.g., "--debug").
   * @returns {boolean} `true` if the argument was found; otherwise, `false`.
   */
  hasCliArg(name) {
    if (!Array.isArray(process.argv)) return false;
    for (const argName of process.argv)
      if (typeof argName === 'string' && argName === name) return true;
    return false;
  }

  /**
   * Signals the application to quit and sets the internal quit flag.
   *
   * This method marks the app as intentionally quitting and then calls `app.quit()`.
   * If called more than once, it has no additional effect beyond the first invocation.
   */
  quit() {
    this.#isQuiting = true;
    app.quit();
  }

  /**
   * Returns a copy of the developer console warning message array.
   * @returns {string[]}
   */
  getConsoleWarning() {
    return [...this.#consoleOpenWarn];
  }

  /**
   * Sets the warning messages to be displayed in the developer console.
   * Expects an array of two strings: the message and its CSS style.
   * @param {string[]} value
   */
  setConsoleWarning(value) {
    if (!Array.isArray(value) || !value.every((v) => typeof v === 'string'))
      throw new TypeError('consoleOpenWarn must be an array of strings.');
    this.#consoleOpenWarn = [value[0], value[1]];
  }

  /**
   * Checks if this is the first time the application logic is running.
   * @returns {boolean}
   */
  isFirstTime() {
    return this.#firstTime;
  }

  /**
   * Indicates whether the application is ready.
   * @returns {boolean}
   */
  isAppReady() {
    return this.#appReady;
  }

  /**
   * Indicates whether the application is in the process of quitting.
   * @returns {boolean}
   */
  isQuiting() {
    return this.#isQuiting;
  }

  /**
   * Checks whether a main window or a specific secondary window exists.
   *
   * If a `key` is provided, this method will check for the existence of a secondary window
   * in the internal map of windows. Only string keys are allowed.
   *
   * @param {string|number} [key] - Optional key to check existence of a specific secondary window.
   * @returns {boolean}
   * @throws {TypeError} If the provided key is not a string.
   */
  existsWin(key) {
    if (typeof key === 'undefined') return !!this.#win;
    if (typeof key !== 'string' && typeof key !== 'number')
      throw new TypeError(
        `[existsWin Error] Invalid key type "${typeof key}". Only string or number keys are supported.`,
      );
    return this.#wins.has(key);
  }

  /**
   * Returns the current main BrowserWindow instance or a specific one by key.
   *
   * If a `key` is provided, this method will attempt to retrieve a secondary window
   * from the internal map of windows. Only string keys are accepted.
   *
   * @param {string|number} [key] - Optional key to retrieve a specific secondary window.
   * @returns {BrowserWindow}
   * @throws {Error} If no main window exists, key is not a string, or the key does not match any window.
   */
  getWin(key) {
    if (typeof key === 'undefined') {
      if (!this.#win)
        throw new Error(
          '[getWin Error] No main window has been created. Call create a new main window first.',
        );
      return this.#win.getWin();
    }

    if (typeof key !== 'string' && typeof key !== 'number')
      throw new TypeError(
        `[getWin Error] Invalid key type "${typeof key}". Only string or number keys are supported.`,
      );

    /** @type {TinyWinInstance|undefined} */
    const winObj = this.#wins.get(key);
    if (!winObj)
      throw new Error(
        `[getWin Error] No window found for the given key "${key}". Check if the window was created.`,
      );
    return winObj.getWin();
  }

  /**
   * Retrieves a window instance by its Electron window ID.
   *
   * @param {number} id - The Electron window ID to search for.
   * @returns {TinyWinInstance} The window instance matching the given ID.
   *
   * @throws {TypeError} If the provided ID is not a valid number.
   * @throws {Error} If no window instance with the given ID is found.
   */
  getWinInstanceById(id) {
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 0)
      throw new TypeError('Invalid argument: "id" must be a non-negative integer.');

    if (
      this.#win &&
      !this.#win.isDestroyed() &&
      !this.#win.isPreparingDestroy() &&
      this.#win.getWin().id === id
    )
      return this.#win;
    let selected = null;
    this.#wins.forEach((value) => {
      if (!value.isDestroyed() && !value.isPreparingDestroy() && value.getWin().id === id)
        selected = value;
    });
    if (selected) return selected;
    throw new Error(`[getWinInstanceById] No window instance found with ID ${id}.`);
  }

  /**
   * Returns the TinyWinInstance object associated with the main window or a specific one by key.
   *
   * If a `key` is provided, this method will attempt to retrieve a secondary window
   * instance from the internal map of windows. Only string keys are supported.
   *
   * @param {string|number} [key] - Optional key to retrieve a specific secondary window instance.
   * @returns {TinyWinInstance}
   * @throws {Error} If no main window exists, key is not a string, or the key does not match any window.
   */
  getWinInstance(key) {
    if (typeof key === 'undefined') {
      if (!this.#win)
        throw new Error(
          '[getWinInstance Error] Cannot retrieve main instance because no main window has been initialized.',
        );
      return this.#win;
    }

    if (typeof key !== 'string' && typeof key !== 'number')
      throw new TypeError(
        `[getWinInstance Error] Invalid key type "${typeof key}". Only string or number keys are supported.`,
      );

    /** @type {TinyWinInstance|undefined} */
    const instance = this.#wins.get(key);
    if (!instance)
      throw new Error(
        `[getWinInstance Error] No window instance found for the given key "${key}".`,
      );

    return instance;
  }

  /**
   * @typedef {"home"|"appData"|"userData"|"sessionData"|"temp"|"exe"|"module"|"desktop"|"documents"|"downloads"|"music"|"pictures"|"videos"|"recent"|"logs"|"crashDumps"} ElectronPathName
   */

  /**
   * Returns the full path to a folder inside the Electron app's unpacked directory.
   *
   * Useful when accessing files that must remain unpacked (e.g. native binaries).
   * Validates inputs and throws if any parameter is not a string.
   *
   * @param {string|null} [where] - The folder name to append inside the unpacked directory.
   * @param {string} [packName='app.asar'] - The packed archive filename (usually "app.asar").
   * @param {string} [unpackName='app.asar.unpacked'] - The corresponding unpacked folder name (usually "app.asar.unpacked").
   * @returns {{ isUnpacked: boolean, unPackedFolder: string }} Object with unpacked folder path and status.
   * @throws {TypeError} If any parameter is not a valid string.
   */
  getUnpackedFolder(where, packName = 'app.asar', unpackName = 'app.asar.unpacked') {
    if (
      typeof where !== 'undefined' &&
      where !== null &&
      (typeof where !== 'string' || !where.trim())
    )
      throw new TypeError(
        `Invalid "where" argument: expected non-empty string, got ${typeof where}`,
      );
    if (typeof packName !== 'string' || !packName.trim())
      throw new TypeError(
        `Invalid "packName" argument: expected non-empty string, got ${typeof packName}`,
      );
    if (typeof unpackName !== 'string' || !unpackName.trim())
      throw new TypeError(
        `Invalid "unpackName" argument: expected non-empty string, got ${typeof unpackName}`,
      );

    const basePath = app.getAppPath();
    const unPackedFolder = basePath.replace(packName, unpackName);
    const isUnpacked = unPackedFolder.endsWith(unpackName);

    return {
      isUnpacked,
      unPackedFolder: typeof where === 'string' ? join(unPackedFolder, where) : unPackedFolder,
    };
  }

  /**
   * Loads a Chromium extension from a specified folder and extension name.
   *
   * This method attempts to load the extension first from the unpacked folder.
   * If that fails, it tries to load from a fallback path.
   *
   * @param {string} extName - The name of the extension's folder.
   * @param {string} folder - Folder name inside the unpacked app path where the extension is located.
   * @param {Electron.LoadExtensionOptions} [ops] - Optional Electron extension loading options.
   * @returns {Promise<Electron.Extension>} A promise that resolves with the loaded extension.
   * @throws {TypeError} If any required argument is missing or invalid.
   * @throws {TypeError} If the extension fails to load from both primary and fallback paths.
   *
   * @beta
   */
  async loadExtension(extName, folder, ops) {
    if (
      typeof folder !== 'undefined' &&
      folder !== null &&
      (typeof folder !== 'string' || !folder.trim())
    )
      throw new TypeError(
        `Invalid "folder" argument: expected non-empty string, got ${typeof folder}`,
      );
    if (typeof extName !== 'string' || !extName.trim())
      throw new TypeError(
        `Invalid "extName" argument: expected non-empty string, got ${typeof extName}`,
      );

    const { unPackedFolder, isUnpacked } = this.getUnpackedFolder(folder);
    if (isUnpacked) {
      try {
        const result = await session.defaultSession.extensions.loadExtension(
          join(unPackedFolder, `./${extName}`),
          ops,
        );
        return result;
      } catch {
        try {
          const result = await session.defaultSession.extensions.loadExtension(
            join(__dirname, `../${extName}`),
            ops,
          );
          return result;
        } catch (err) {
          throw err;
        }
      }
    } else {
      try {
        const result = await session.defaultSession.extensions.loadExtension(
          join(__dirname, `../${extName}`),
          ops,
        );
        return result;
      } catch (err) {
        throw err;
      }
    }
  }

  /**
   * Initializes the base folder in the given Electron path if not already created.
   * Throws if the folder was already initialized.
   *
   * @param {ElectronPathName} [name] - The Electron path key to use as root.
   * @returns {string} The absolute path of the created folder.
   * @throws {Error} If the folder for this path was already initialized.
   */
  initAppDataDir(name = 'appData') {
    if (typeof name !== 'string')
      throw new TypeError(`Invalid key type "${typeof name}". Only string keys are supported.`);

    if (typeof this.#appDataStarted[name] === 'string')
      throw new Error(`App data for path "${name}" has already been initialized.`);
    const folder = join(app.getPath(name), this.getAppDataName());
    if (!existsSync(folder)) mkdirSync(folder);
    this.#appDataStarted[name] = folder;
    return folder;
  }

  /**
   * Retrieves the base folder path previously initialized via `initAppDataDir()`.
   *
   * @param {ElectronPathName} [name] - The Electron path key.
   * @returns {string} The initialized app data folder path.
   * @throws {Error} If the folder was not yet initialized.
   */
  getAppDataDir(name = 'appData') {
    if (typeof name !== 'string')
      throw new TypeError(`Invalid key type "${typeof name}". Only string keys are supported.`);

    if (typeof this.#appDataStarted[name] !== 'string')
      throw new Error(`App data root for path "${name}" has not been initialized.`);
    return this.#appDataStarted[name];
  }

  /**
   * Creates a subdirectory inside the initialized base app data folder.
   * Throws if the subfolder was already created.
   *
   * @param {string} subdir - The name of the subfolder to create.
   * @param {ElectronPathName} [name] - The Electron path key.
   * @returns {string} The full path to the created subdirectory.
   * @throws {Error} If the subdirectory already exists in memory tracking.
   */
  initAppDataSubdir(subdir, name = 'appData') {
    if (typeof name !== 'string')
      throw new TypeError(`Invalid key type "${typeof name}". Only string keys are supported.`);
    if (typeof subdir !== 'string')
      throw new TypeError(`Invalid key type "${typeof subdir}". Only string keys are supported.`);

    const root = this.getAppDataDir(name);
    const id = `${name}:${subdir}`;

    if (typeof this.#appDataStarted[id] === 'string')
      throw new Error(`App data subdir "${subdir}" under "${name}" has already been created.`);
    const folder = join(root, subdir);
    if (!existsSync(folder)) mkdirSync(folder);
    this.#appDataStarted[id] = folder;
    return folder;
  }

  /**
   * Retrieves a previously created subdirectory path.
   *
   * @param {string} subdir - The name of the subfolder.
   * @param {ElectronPathName} [name] - The Electron path key.
   * @returns {string} The absolute path of the subdirectory.
   * @throws {Error} If the subdirectory was not previously created.
   */
  getAppDataSubdir(subdir, name = 'appData') {
    if (typeof name !== 'string')
      throw new TypeError(`Invalid key type "${typeof name}". Only string keys are supported.`);
    if (typeof subdir !== 'string')
      throw new TypeError(`Invalid key type "${typeof subdir}". Only string keys are supported.`);

    const id = `${name}:${subdir}`;
    if (typeof this.#appDataStarted[id] !== 'string')
      throw new Error(`App data subdir "${subdir}" under "${name}" has not been initialized.`);

    return this.#appDataStarted[id];
  }

  /**
   * Returns the current application appData folder name.
   * @returns {string}
   */
  getAppDataName() {
    if (typeof this.#appDataName !== 'string' || this.#appDataName.trim() === '')
      throw new Error('[getAppDataName Error] No appDataName was defined in the configuration.');
    return this.#appDataName;
  }

  /**
   * Returns the current application icon path.
   * @returns {string}
   */
  getIcon() {
    if (typeof this.#icon !== 'string' || this.#icon.trim() === '')
      throw new Error('[getIcon Error] No icon was defined in the configuration.');
    return this.resolveSystemIconPath(this.#icon);
  }

  /**
   * Returns the base folder path where icon assets are stored.
   *
   * This is useful when loading tray or window icons using relative paths
   * from a single shared folder defined in the constructor.
   *
   * @returns {string} The path to the icon folder.
   * @throws {Error} If the icon folder has not been defined.
   */
  getIconFolder() {
    if (typeof this.#iconFolder !== 'string' || this.#iconFolder.trim() === '')
      throw new Error('[getIconFolder Error] No icon folder was defined in the configuration.');
    return this.#iconFolder;
  }

  /**
   * Returns the current application title.
   * @returns {string}
   */
  getTitle() {
    if (typeof this.#title !== 'string' || this.#title.trim() === '')
      throw new Error('[getTitle Error] No title was defined in the configuration.');
    return this.#title;
  }

  /**
   * Returns the current application app id.
   * @returns {string}
   */
  getAppId() {
    if (typeof this.#appId !== 'string' || this.#appId.trim() === '')
      throw new Error('[getAppId Error] No appId was defined in the configuration.');
    return this.#appId;
  }

  /**
   * Indicates whether this instance has acquired the lock to run.
   * Can be null (not yet determined), or a boolean result.
   * @returns {null|boolean}
   */
  gotTheLock() {
    return this.#gotTheLock;
  }

  /**
   * Opens the developer tools for the given BrowserWindow.
   * Also sends the custom console warning message to the devtools console.
   * @param {Electron.BrowserWindow} win - The target BrowserWindow instance.
   * @param {Electron.OpenDevToolsOptions} [ops] - The target DevTools config.
   */
  openDevTools(win, ops) {
    this.#isBrowserWindow(win);
    win.webContents.openDevTools(ops);
    win.webContents.send(this.#AppEvents.ConsoleMessage, {
      value: [this.#consoleOpenWarn[0], this.#consoleOpenWarn[1]],
      time: Date.now(),
    });
  }

  /**
   * Installs platform-specific protections for Windows systems.
   *
   * Currently disables GPU acceleration for Windows 7 (version 6.1).
   */
  installWinProtection() {
    // Disable GPU Acceleration for Windows 7
    if (release().startsWith('6.1')) app.disableHardwareAcceleration();
  }

  /**
   * Initializes the application by ensuring a single instance is running.
   *
   * If another instance is already running, it exits. Otherwise,
   * it sets up Electron readiness events and prepares the app.
   */
  init() {
    this.#gotTheLock = app.requestSingleInstanceLock();
    if (!this.#gotTheLock) {
      app.quit();
      process.exit(0);
    } else {
      // This method will be called when Electron has finished
      // initialization and is ready to create browser windows.
      // Some APIs can only be used after this event occurs.
      app.whenReady().then(() => this.#execFirstTime());
      app.on('ready', () => {
        if (this.#appReady) return;
        this.#appReady = true;
        this.#emit(RootEvents.Ready);
      });
    }
  }

  /**
   * Loads a page into the given BrowserWindow.
   *
   * Depending on configuration, it can load a local file path or a URL.
   *
   * @param {BrowserWindow} win - The target BrowserWindow instance.
   * @param {string|string[]} page - The page or path segments to load.
   * @param {Electron.LoadFileOptions|Electron.LoadURLOptions} [ops] - Options passed to `loadFile` or `loadURL`.
   * @throws {TypeError} If the window is not a valid BrowserWindow.
   * @throws {TypeError} If page is not a string or string[].
   * @throws {TypeError} If page contains non-string entries.
   * @throws {TypeError} If ops is not an object.
   */
  loadPath(win, page, ops) {
    // Validate BrowserWindow
    this.#isBrowserWindow(win); // presume que já lança erro se não for

    // Validate `page`
    const pageData = [];

    if (typeof page === 'string') {
      pageData.push(page);
    } else if (Array.isArray(page)) {
      if (!page.every((p) => typeof p === 'string')) {
        throw new TypeError('Expected all elements in the "page" array to be strings.');
      }
      pageData.push(...page);
    } else {
      throw new TypeError('Expected "page" to be a string or an array of strings.');
    }

    // Validate `ops`
    if (ops !== undefined && typeof ops !== 'object')
      throw new TypeError('Expected "ops" to be an object.');

    // Load by URL or file
    if (this.#loadByUrl) {
      const url = new URL(this.#urlBase);

      // Clean join of path segments, avoiding double slashes
      const pathname = [url.pathname, ...pageData].filter(Boolean).join('/');
      const fullUrl = `${url.origin}/${pathname}`;

      /** @type {Electron.LoadURLOptions} */
      // @ts-ignore
      const options = ops;
      win.loadURL(fullUrl, options);
    } else {
      /** @type {Electron.LoadFileOptions} */
      // @ts-ignore
      const options = ops;
      const finalPath = join(this.#pathBase, ...pageData);
      win.loadFile(finalPath, options);
    }
  }
}

export default TinyElectronRoot;
