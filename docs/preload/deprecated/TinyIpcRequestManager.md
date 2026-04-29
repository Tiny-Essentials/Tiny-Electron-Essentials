# 🔗 TinyIpcRequestManager – Reliable IPC Request/Response for Electron

TinyIpcRequestManager is a powerful tool to handle **request-response patterns over Electron’s IPC**. It wraps `ipcRenderer.send()` with automatic **Promise-based response handling**, unique request IDs, error propagation, and optional timeouts.

> ⚙️ It allows your renderer process to send data to the main process and await responses in a clean and reliable way.

---

## 🚀 Features

* 🔗 Reliable two-way IPC request/response system.
* 🔍 Automatic request tracking via unique `__requestId`.
* ⏳ Optional timeout for each request.
* 💥 Error propagation, including serialized error objects.
* 🧠 Safe management of pending requests with auto-cleanup.

---

## 🏗️ Class: `TinyIpcRequestManager`

```js
import TinyIpcRequestManager from './TinyIpcRequestManager.js';
```

---

## 🔧 Constructor

```js
const ipcRequest = new TinyIpcRequestManager();
```

| Parameter         | Type     | Default          | Description                                      |
| ----------------- | -------- | ---------------- | ------------------------------------------------ |
| `responseChannel` | `string` | `'ipc-response'` | Name of the IPC channel to listen for responses. |

### ⚠️ Throws

* `Error` — If `responseChannel` is not a non-empty string.

---

## 🌐 Method: `getResponseChannel()`

Returns the response channel name that this instance is listening to.

```js
const channel = ipcRequest.getResponseChannel();
```

→ 🔸 Returns: `string`

---

## 🚀 Method: `send(channel, payload, options)`

Sends a request to the main process and returns a Promise that resolves with the response or rejects on error/timeout.

```js
const result = await ipcRequest.send('db_query', { sql: 'SELECT * FROM users' });
```

| Parameter | Type          | Description                               |
| --------- | ------------- | ----------------------------------------- |
| `channel` | `string`      | The name of the IPC channel to send to.   |
| `payload` | `any`         | Optional data to send with the request.   |
| `options` | `EmitOptions` | Optional. Supports `{ timeout: number }`. |

→ 🔸 Returns: `Promise<any>`

### ⚠️ Throws

* `Error` — If `channel` is not a valid string.
* `Error` — If `timeout` is not a positive number (when provided).

---

## 🧠 Internal Structures

### 📦 EmitOptions

| Property  | Type     | Description                                        |
| --------- | -------- | -------------------------------------------------- |
| `timeout` | `number` | Optional. Timeout in milliseconds for the request. |

---

### 📤 SendData

| Property      | Type     | Description                           |
| ------------- | -------- | ------------------------------------- |
| `__requestId` | `string` | Unique ID for this request.           |
| `payload`     | `any`    | The data being sent with the request. |

---

### 📥 SendResult

| Property      | Type          | Description                                      |
| ------------- | ------------- | ------------------------------------------------ |
| `__requestId` | `string`      | Matches the request's ID to resolve the promise. |
| `payload`     | `any`         | The actual response data.                        |
| `error`       | `Error\|null` | An error object if failed, otherwise null.       |

---

## ⏳ Timeout Behavior

* ✅ If `options.timeout` is provided (in milliseconds), the promise will reject if no response is received within that time.
* 🗑️ On timeout, the request is automatically removed from the internal tracking map.

---

## 💡 Usage Example

### 🎯 Renderer Process:

```js
const ipcRequest = new TinyIpcRequestManager();

// Sending a request with no timeout
const result = await ipcRequest.send('get-user', { id: 1 });
console.log(result);

// Sending a request with a timeout
try {
  const data = await ipcRequest.send('long-task', {}, { timeout: 5000 });
  console.log(data);
} catch (err) {
  console.error('Request failed or timed out:', err);
}
```

---

## 🏷️ Notes

* 🆔 Each request is automatically assigned a UUID (`__requestId`) for tracking.
* ♻️ Responses are matched and resolved or rejected based on the `__requestId`.
* ⛔ Safe from memory leaks: completed or timed-out requests are always cleaned.
* 🔥 Works perfectly as a foundation for building higher-level IPC systems.

---

## 🏆 Credits

* Made with ❤️ for reliable and robust Electron communication.
* Handles the pain of IPC request/response patterns with simplicity.
