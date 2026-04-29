# 📁 Preload Documentation

Welcome to the **Preload Documentation Folder**! 🎉  
This folder contains detailed documentation for all the utilities, APIs, and internal tools designed to run inside the **Preload context** of an Electron app.

These modules are specifically built to handle communication between the renderer and the main process, window management, IPC requests, notifications, and UI helpers.

---

## 🗺️ Documentation Map

Choose which topic you want to learn more about! Each document contains examples, method descriptions, and usage details.

| 📄 File                            | 🔍 Description                                               |
| ----------------------------------- | ----------------------------------------------------------- |
| [**LoadingHtml**](./LoadingHtml.md)             | 🎨 Manages the loading screen HTML and CSS. Easy way to show/hide a loader before your app is ready. |
| [**TinyDb**](./TinyDb.md)                       | 🗂️ A simple key-value JSON-based database for lightweight storage on the preload side. |
| [**TinyElectronClient**](./TinyElectronClient.md) | 🚀 Main API to control the Electron window, handle IPC, window status, and events between renderer and main. |
| [**TinyElectronNotification**](./TinyElectronNotification.md) | 🔔 Provides cross-platform system notifications with additional options and IPC sync. |
| [**TinyWindowFrameManager**](./TinyWindowFrameManager.md) | 🪟 Full management of custom window frames, borders, and draggable regions for frameless windows. |

---

## 📚 About This Folder

- This folder is **dedicated to the preload layer only**.
- Each file contains:
  - ✅ Purpose of the module
  - ✅ Full API documentation
  - ✅ Usage examples
  - ✅ Notes, warnings, and tips if needed

If you're developing preload-side scripts for your Electron app, this is the place where you’ll find everything you need! 💡

---

## 🛠️ How to Use

Just pick one of the documentation files above and dive into it! Whether you're managing window frames, sending notifications, handling IPC, or tweaking the loading screen — each guide is tailored to help you succeed.

---

## 🚀 Happy Coding! 💙
