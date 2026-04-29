# 🔔 TinyElectronNotification

TinyElectronNotification is an wrapper for handling desktop notifications in **Electron apps** using IPC communication. It allows the renderer process to create, show, and close notifications while listening for their lifecycle events.

> ⚠️ **Experimental:** This API is marked as beta and might change in future versions.

---

## 🎯 Purpose

- Manage notifications with full event handling from the main process.
- Support for icons as **file paths** or **Base64** (converted to temporary files).
- Persistent notifications managed by unique `tags`.

---

## 🚀 Features

- 🔗 IPC-based communication between renderer and main.
- 🔔 Show, close, and manage notifications by tag.
- 🎭 Emits events: `show`, `click`, `reply`, `action`, `failed`, `close`, and a wildcard event for **all events**.
- 🖼️ Auto-handles **Base64 icons** by converting them into temporary files.
- 🗑️ Automatic cleanup of icon files and notifications.
- 🧽 Includes method to delete all files inside the icon folder.

---

## 🏗️ Constructor

```js
new TinyElectronNotification({
  folderPath,
  eventNames,
})
```

| Param          | Type                 | Description                                        |
| -------------- | -------------------- | -------------------------------------------------- |
| `folderPath`   | `string`             | Folder where icons (especially base64) are stored. |
| `eventNames`   | `NotificationEvents` | (Optional) Override default event names.           |

---

## 🧠 Methods

### 🗑️ deleteAllFilesInDir()

Deletes **all files** inside the configured folder path.

```js
await deleteAllFilesInDir()
```

| Return | Type      | Description                         |
| ------ | --------- | ----------------------------------- |
|        | `Promise` | Resolves when deletion is complete. |

---

## 🪟 Private Helper

### 🔍 #getWin(event)

Retrieves the `BrowserWindow` instance from an IPC event.

---

## 🔐 Private Method

### 🔧 #createNotification(win, data, iconCache, res)

Creates and manages a notification instance internally.

---

## 📡 IPC Events Handled

| Event Name | Description                               |
| ---------- | ----------------------------------------- |
| `Create`   | Create a notification with given options. |
| `Show`     | Show a notification by `tag`.             |
| `Close`    | Close a notification by `tag`.            |

---

## 🎭 Notification Events Emitted

| Event    | Description                                  |
| -------- | -------------------------------------------- |
| `Show`   | Notification is shown.                       |
| `Click`  | User clicked the notification.               |
| `Reply`  | User replied (input notification).           |
| `Action` | User clicked an action button (with index).  |
| `Failed` | Notification failed to show.                 |
| `Close`  | Notification was closed.                     |
| `All`    | Wildcard event — triggered on **any event**. |

---

## 🎨 Icon Handling

* If the icon is provided as a **Base64 string**, it will be converted into a temporary file inside `folderPath`.
* The file is automatically cleaned up when the notification is closed.

---

## 🧠 Example Usage

```js
import TinyElectronNotification from './TinyElectronNotification.mjs';

const notification = new TinyElectronNotification({
  folderPath: './tempIcons',
});
```

---

## 💡 Notes

* Each notification is identified by a unique `tag`.
* Notifications can be shown and closed multiple times using the same tag.
* If a notification's icon is in Base64, it is temporarily stored and cleaned up after the notification is closed.
* Supports full event listening on the renderer side through IPC.

---

## ⚠️ Limitations

* Some notification features depend on the operating system (e.g., reply, actions).
* The notification API is still experimental and subject to changes.

---

## 🏁 Conclusion

**TinyElectronNotification** offers a clean and event-driven way to manage desktop notifications in your Electron app. Fully IPC-based, safe, and powerful. 🔥
