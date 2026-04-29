# TinyElectronRoot API Documentation 🚀✨

This document describes the main class `TinyElectronRoot` methods and properties with detailed usage notes and examples.

---

## Table of Contents
- [Tray Event Methods 🍱](#tray-event-methods-🍱)
- [Tray Management Methods 🧰](#tray-management-methods-🧰)
- [Window Minimize Behavior 🪟](#window-minimize-behavior-🪟)
- [Constructor & Initialization ⚙️](#constructor--initialization-⚙️)
- [Window Management 🖥️](#window-management-🖥️)
- [App Data & Folder Utilities 📂](#app-data--folder-utilities-📂)
- [Developer Tools & Platform Protections 🛠️](#developer-tools--platform-protections-🛠️)
- [App Lifecycle & Loading Paths 🌐](#app-lifecycle--loading-paths-🌐)

---

## Tray Event Methods 🍱

### `onTrayClick(key, callback)`  
Registers a tray click callback depending on platform.  
- On Linux/macOS listens to `click`.  
- On Windows listens to `double-click`.  

**Parameters:**  
- `key` (string) — Tray identifier.  
- `callback` ((event, bounds) => void) — Function called on event.

---

### `offTrayClick(key, callback)`  
Unregisters a tray click callback matching the platform event.  

**Parameters:**  
- `key` (string) — Tray identifier.  
- `callback` ((event, bounds) => void) — Function to remove.

---

## Tray Management Methods 🧰

### `getTray(key)`  
Retrieves a registered tray by key. Throws error if tray is not found.

**Parameters:**  
- `key` (string) — Tray identifier.

**Returns:**  
- Electron Tray instance.

---

### `hasTray(key)`  
Checks if a tray is registered under the specified key.

**Parameters:**  
- `key` (string) — Tray identifier.

**Returns:**  
- Boolean indicating presence.

---

### `deleteTray(key)`  
Deletes a tray from registry.

**Parameters:**  
- `key` (string) — Tray identifier.

**Returns:**  
- Boolean: `true` if deleted; `false` otherwise.

---

## Window Minimize Behavior 🪟

### `getMinimizeOnClose()`  
Gets the global setting to minimize instead of closing the window.

**Returns:**  
- Boolean.

---

### `setMinimizeOnClose(value)`  
Sets the global minimize-on-close behavior.

**Parameters:**  
- `value` (boolean) — New global setting.

---

### `getMinimizeOnCloseFor(index)`  
Gets minimize-on-close behavior for a specific window index. Falls back to global setting if not set.

**Parameters:**  
- `index` (number) — Window index.

**Returns:**  
- Boolean.

---

### `setMinimizeOnCloseFor(index, value)`  
Sets minimize-on-close behavior for a specific window.

**Parameters:**  
- `index` (number) — Window index.  
- `value` (boolean) — Behavior flag.

---

### `removeMinimizeOnCloseFor(index)`  
Removes custom minimize-on-close override for a window.

**Parameters:**  
- `index` (number) — Window index.

---

### `clearMinimizeOnCloseOverrides()`  
Clears all custom minimize-on-close overrides.

---

## Constructor & Initialization ⚙️

### `constructor(settings = {})`  
Initializes core app configuration and setups essential app behaviors.  

**Settings object (optional):**  
- `eventNames` — Custom event names.  
- `openWithBrowser` (boolean) — Allow fallback open in system browser (default: true).  
- `urlBase` (string) — Base URL for remote content loading.  
- `pathBase` (string) — Base local path for static files.  
- `icon` (string) — App icon path.  
- `iconFolder` (string) — Folder path with icon assets.  
- `title` (string) — App title.  
- `appId` (string) — App User Model ID (Windows notifications).  
- `appDataName` (string) — App data folder name.  
- `name` (string) — Internal app name (default: `app.getName()`).  
- `minimizeOnClose` (boolean) — Whether windows minimize instead of close (default: false).

**Notes:**  
- Throws if required strings are invalid or missing.  
- On Windows, sets App User Model ID for toast notifications.  
- On macOS, handles dock icon activation.  
- Ensures single instance behavior, focusing existing window if second instance launched.

---

## Window Management 🖥️

### `existsWin(key)`  
Checks if main or secondary window exists.  
- If no key, checks main window.  
- Accepts string or number keys for secondary windows.

**Parameters:**  
- `key` (string|number) — Optional window key.

**Returns:**  
- Boolean.

---

### `getWin(key)`  
Gets BrowserWindow instance for main or secondary window.

**Parameters:**  
- `key` (string|number) — Optional window key.

**Returns:**  
- BrowserWindow instance.

---

### `getWinInstanceById(id)`  
Retrieves window instance by Electron window ID.

**Parameters:**  
- `id` (number) — Electron window ID.

**Returns:**  
- `TinyWinInstance`.

---

### `getWinInstance(key)`  
Gets `TinyWinInstance` for main or secondary window.

**Parameters:**  
- `key` (string|number) — Optional window key.

**Returns:**  
- `TinyWinInstance`.

---

## App Data & Folder Utilities 📂

### `getUnpackedFolder(where, packName = 'app.asar', unpackName = 'app.asar.unpacked')`  
Gets full path to unpacked app folder. Useful for native binaries or unpacked resources.

**Parameters:**  
- `where` (string|null) — Subfolder name inside unpacked directory.  
- `packName` (string) — Archive filename (default: `'app.asar'`).  
- `unpackName` (string) — Unpacked folder name (default: `'app.asar.unpacked'`).

**Returns:**  
- `{ isUnpacked: boolean, unPackedFolder: string }`

---

### `loadExtension(extName, folder, ops)` 🔧  
Loads a Chromium extension from unpacked or fallback path.

**Parameters:**  
- `extName` (string) — Extension folder name.  
- `folder` (string) — Unpacked app folder path.  
- `ops` (Electron.LoadExtensionOptions) — Optional load options.

**Returns:**  
- Promise resolving to loaded Electron Extension.

---

### `initAppDataDir(name = 'appData')`  
Initializes app data base folder if not already created.

**Parameters:**  
- `name` (ElectronPathName) — Electron path key.

**Returns:**  
- Absolute folder path.

---

### `getAppDataDir(name = 'appData')`  
Retrieves initialized app data base folder path.

**Parameters:**  
- `name` (ElectronPathName) — Electron path key.

**Returns:**  
- Folder path.

---

### `initAppDataSubdir(subdir, name = 'appData')`  
Creates a subdirectory inside initialized app data base folder.

**Parameters:**  
- `subdir` (string) — Subfolder name.  
- `name` (ElectronPathName) — Electron path key.

**Returns:**  
- Full path to created subdirectory.

---

### `getAppDataSubdir(subdir, name = 'appData')`  
Retrieves previously created subdirectory path.

**Parameters:**  
- `subdir` (string) — Subfolder name.  
- `name` (ElectronPathName) — Electron path key.

**Returns:**  
- Absolute path of subdirectory.

---

### `getAppDataName()`  
Returns current application appData folder name.

**Returns:**  
- String.

---

### `getIcon()`  
Returns current application icon path.

**Returns:**  
- String.

---

### `getIconFolder()`  
Returns base folder path where icon assets are stored.

**Returns:**  
- String.

---

### `getTitle()`  
Returns current application title.

**Returns:**  
- String.

---

### `getAppId()`  
Returns current application app ID.

**Returns:**  
- String.

---

## Developer Tools & Platform Protections 🛠️

### `gotTheLock()`  
Indicates whether app has acquired single instance lock.

**Returns:**  
- `boolean|null` — null if unknown, boolean if known.

---

### `openDevTools(win, ops)`  
Opens dev tools for a given BrowserWindow and sends custom console warning message.

**Parameters:**  
- `win` (BrowserWindow) — Target window.  
- `ops` (Electron.OpenDevToolsOptions) — Optional dev tools config.

---

### `installWinProtection()`  
Installs Windows-specific protections, e.g., disables GPU acceleration on Windows 7.

---

## App Lifecycle & Loading Paths 🌐

### `init()`  
Initializes the application ensuring single instance lock. Exits if lock not acquired.

---

### `loadPath(win, page, ops)`  
Loads a page into the given BrowserWindow instance.

**Parameters:**  
- `win` (BrowserWindow) — Target window.  
- `page` (string|string[]) — Page or path segments to load.  
- `ops` (Electron.LoadFileOptions | Electron.LoadURLOptions) — Optional loading options.

---

# Notes

- All string validations throw errors for invalid or missing values.  
- Methods often throw clear errors on misuse or incorrect state.  
- Supports Windows, macOS, Linux platform specific quirks and behaviors.  
- Encourages single instance app with focus behavior on second instance.

---

## Network & Proxy Utilities 🌐🔗

### `setProxy(config)`
Sets a custom proxy for the Electron session.

**Parameters:**  
- `config` (string) — Proxy configuration string (e.g., `'http=foopy:80;https=foopy2'`).

**Throws:**  
- `TypeError` if config is not a string.

---

## Icon Utilities 🖼️✨

### `resolveSystemIconPath(file)`
Resolves the full absolute path to an icon file located in the icon folder.

**Parameters:**  
- `file` (string) — Icon filename.

**Returns:**  
- Full path (string) to the icon.

**Throws:**  
- `Error` if icon folder is not configured.

---

## File Utilities 📄📦

### `getWinFile()`
Returns the internal TinyWindowFile instance.

**Returns:**  
- TinyWindowFile instance.

---

## Request Cache 🔄📥

### `setRequestCache(callback)`
Stores a value in the internal request cache.

**Parameters:**  
- `(data: any) => Record<string, any>` A function that returns the current cache data as an object. 

**Throws:**  
- `Error` Throws an error if a cache request callback is already registered.

---

## Window Lifecycle Management 🖥️🚪

### `createWindow(settings = {})`
Creates a new secondary window with a specified key and settings.

**Parameters:**  
- `settings` (object) — Window creation options (BrowserWindow options, custom configs, etc.).

**Returns:**  
- `TinyWinInstance`.

**Throws:**  
- `Error` if window key is invalid or window already exists.

---

### `destroyWindow(key)`
Destroys a secondary window by key.

**Parameters:**  
- `key` (string|number) — Window identifier.

**Throws:**  
- `Error` if window key is invalid or window does not exist.

---

## Tray Registration 🍱🔧

### `registerTray(key, options)`
Registers a new tray icon.

**Parameters:**  
- `key` (string) — Tray identifier.  
- `tray` (Electron.Tray) — The Electron Tray instance to register.

**Throws:**  
- `TypeError` if key is invalid.  
- `Error` if tray with the same key already exists.

---

## CLI Argument Utilities 🖥️📝

### `hasCliArg(name)`
Checks if a specific command-line argument was passed to the Electron app.

**Parameters:**  
- `name` (string) — Argument name.

**Returns:**  
- Boolean indicating if the argument is present.

**Throws:**  
- `TypeError` if name is not a string.

---

## App Lifecycle 🚪💥

### `quit()`
Immediately quits the application gracefully.  
- Triggers app cleanup before exiting.

---

## Console Warning Utilities ⚠️🖥️

### `getConsoleWarning()`
Retrieves the current console warning message shown when developer tools are opened.

**Returns:**  
- `[text: string, style: string]` — Array with title and warning message.

---

### `setConsoleWarning([text, style])`
Sets a custom console warning that appears when developer tools are opened.

**Parameters:**  
- `[title, message]` (Array of strings) — Title and message content.

**Throws:**  
- `TypeError` if the input is not an array of two strings.

---

## App State Checkers 🔍🟢

### `isFirstTime()`
Checks if the app is running for the first time during the current session.

**Returns:**  
- Boolean.

---

### `isAppReady()`
Checks if the Electron app has finished initialization (`app.whenReady()`).

**Returns:**  
- Boolean.

---

### `isQuiting()`
Checks if the app is in the process of quitting.

**Returns:**  
- Boolean.
