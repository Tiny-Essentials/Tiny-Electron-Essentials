# 📂 Main — Core of the Application

Welcome to the **`main/`** folder! 🎉 This is the heart of the Electron backend logic. Everything related to window management, IPC communication, persistent data, notifications, and core application behavior lives here. 🧠💻

The modules in this folder are designed to abstract away common Electron operations into simple, reusable, and powerful classes — reducing boilerplate and making your app easier to maintain.

---

## ✨ What You'll Find Here

- ✅ Window management with full control.
- ✅ IPC simplified with responder patterns.
- ✅ Notification handling wrapped with ease.
- ✅ File management, app data handling, and more.
- ✅ Persistent lightweight database.
- ✅ Well-defined error handling and API validation.

---

## 📜 Available Modules

| File                          | Description                                      |
| ----------------------------- | ------------------------------------------------ |
| [`TinyDb`](./TinyDb.md)                                     | 📦 Tiny JSON-based database for simple persistent storage. |
| [`TinyElectronNotification`](./TinyElectronNotification.md) | 🔔 Wrapper for Electron's notification API with enhancements. |
| [`TinyElectronRoot`](./TinyElectronRoot.md)                 | 🚀 The main app manager: handles windows, tray, lifecycle, paths, and more. |
| [`TinyWindowFile`](./TinyWindowFile.md)                     | 📁 File path resolver and utilities for windows and app assets. |
| [`TinyWinInstance`](./TinyWinInstance.md)                   | 🪟 Encapsulates a single BrowserWindow instance with extended controls. |

---

## 🚀 Purpose of the `main/` Folder

The `main/` folder handles **everything that runs in the Electron main process**, such as:

- 🖥️ Window creation and management.
- 🔗 Tray icon, menus, and system UI.
- 📡 IPC (Inter-Process Communication) responders.
- 🛠️ File path management (icons, assets, user data).
- 🔔 Native notifications.
- 💾 Persistent local storage via JSON database.
- 🔥 App lifecycle management (quit, minimize on close, single instance lock, etc.).

If it's part of the backend logic of the Electron app — it's here. 🍮

---

## 🏗️ How Files Connect

```plaintext
TinyElectronRoot ─┬─ TinyWinInstance ──> TinyWindowFile
                   ├─ TinyElectronNotification
                   └─ TinyDb
````

* **`TinyElectronRoot`** is the brain 🧠 — it connects to windows, the tray, notifications, and IPC.
* **`TinyWinInstance`** handles a single window lifecycle.
* **`TinyWindowFile`** supports file path resolution for windows.
* **`TinyElectronNotification`** handles desktop notifications.
* **`TinyDb`** is a lightweight JSON-based data storage.

---

## 💡 Tip

This folder **does not contain renderer process code** (frontend/UI). Everything here runs in the Electron **main process context**.

---

## 📚 Dive Deeper

Check the individual docs above ☝️ to explore each module in detail.
