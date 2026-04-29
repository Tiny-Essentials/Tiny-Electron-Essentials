# 🔗 TinyIpcResponder

TinyIpcResponder is an IPC manager for the **main process** in Electron.  
It handles incoming IPC requests from renderer processes with a structured, request/response pattern — including error handling! 🚀

This class is designed to be paired with [`TinyIpcRequestManager`](../preload/TinyIpcRequestManager.md) on the **preload/renderer side**, creating a robust and reliable communication bridge. 🏗️

---

## 🎯 Purpose

- ✅ Handle IPC requests **with response IDs**, allowing asynchronous request/response flows.
- ✅ Built-in error serialization for clean error handling across processes.
- ✅ Easy to register and unregister handlers dynamically.

---

## 🚀 Features

- 🔥 Auto-response with matching request IDs (`__requestId`).
- 🛑 Safe error handling using `serializeError()`.
- 🔧 Manage handlers: `on`, `off`, `addListener`, `removeListener`, `clear`.
- 🧠 Clean abstraction over Electron's `ipcMain`.

---

## 🏗️ Constructor

```js
new TinyIpcResponder(responseChannel?)
```

| Parameter         | Type     | Default          | Description                            |
| ----------------- | -------- | ---------------- | -------------------------------------- |
| `responseChannel` | `string` | `'ipc-response'` | The response channel name for replies. |

If no responseChannel is provided, it defaults to `'ipc-response'`.

---

## 🧠 Methods

### 🛰️ getResponseChannel()

```js
getResponseChannel()
```

Returns the name of the response channel this responder listens to.

| Returns | Type     | Description                    |
| ------- | -------- | ------------------------------ |
|         | `string` | Current response channel name. |

---

### 🎧 on(channel, handler)

Registers a handler for a specific IPC channel.

```js
on(channel, handler)
```

| Parameter | Type                | Description                           |
| --------- | ------------------- | ------------------------------------- |
| `channel` | `string`            | The IPC channel name.                 |
| `handler` | `IPCRequestHandler` | The function to handle incoming data. |

* Throws if the channel name is invalid or a handler already exists.

---

### 🔇 off(channel)

Removes the handler for the specified channel.

```js
off(channel)
```

| Parameter | Type     | Description                             |
| --------- | -------- | --------------------------------------- |
| `channel` | `string` | The IPC channel name to remove handler. |

* Throws if the channel is invalid or no handler is registered.

---

### ➕ addListener(channel, handler)

Alias for [`on()`](#-onchannel-handler).

---

### ➖ removeListener(channel)

Alias for [`off()`](#-offchannel).

---

### 🧽 clear()

Removes **all** registered handlers.

```js
clear()
```

* No parameters.
* Completely wipes the internal handlers map.

---

## 🔥 Example

### ✨ Main Process

```js
import TinyIpcResponder from './TinyIpcResponder.mjs';

const responder = new TinyIpcResponder('ipc-response');

// Register a handler
responder.on('get-user', (event, payload, respond) => {
  console.log('Received payload:', payload);

  // Do some processing
  const user = { id: 1, name: 'Yasmin' };

  // Return result
  respond(user);
});

// Handle errors
responder.on('cause-error', (_event, _payload, respond) => {
  respond(null, new Error('Something went wrong!'));
});
```

### 💻 Renderer Process (with TinyIpcRequestManager)

```js
const user = await ipc.request('get-user', { query: 'info' });
console.log(user); // { id: 1, name: 'Yasmin' }
```

---

## 💡 How It Works

* ✅ Every request from the renderer includes a `__requestId`.
* 🎯 The responder processes the request and sends a reply on the `responseChannel` with the matching `__requestId`.
* 🔥 Errors are serialized safely to avoid cross-process issues.

---

## ⚠️ Errors

* If your handler throws an error, it will automatically be caught and returned to the renderer as a serialized error object.
* Invalid channel names, duplicate handlers, or missing handlers will throw exceptions on the main side.

---

## 🏁 Conclusion

**TinyIpcResponder** simplifies IPC in Electron like a pro.
Forget about manually wiring `ipcMain` listeners and response matching — it's all handled for you with proper error handling and clean APIs. 💖🚀
