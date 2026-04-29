import { BrowserWindow, ipcMain } from 'electron';

/**
 * A function that executes an SQL query against the database.
 * The query can be for fetching data (`SELECT`), modifying data (`UPDATE`, `INSERT`),
 * or any other valid SQL command depending on the method used.
 *
 * @callback QueryRequest
 * @param {string} query - The SQL query string to execute.
 * @param {any[]} params - The parameters to bind to the query.
 * @returns {Promise<any>} The result of the database operation.
 */

/**
 * TinyDb is an IPC-based database handler designed for Electron applications.
 * It connects the renderer process to a backend database using native `ipcMain.handle`.
 *
 * This class listens to specific IPC events (`run`, `all`, `get`, `query`) identified by a unique ID,
 * allowing the renderer process to execute database operations securely via `ipcRenderer.invoke`.
 *
 * The class itself does not handle the database logic directly; instead, it acts as an abstract interface.
 * You must extend this class and override its internal methods (`#run`, `#all`, `#get`, `#query`)
 * to provide the actual database functionality.
 */
class TinyDb {
  #id;

  /**
   * Executes a SQL `SELECT` query that returns a single row.
   * @type {QueryRequest}
   */
  #get = async (query = '', params = []) => {
    console.warn('[TinyDb Debug] Called "get" with:', { query, params });
    throw new Error('TinyDb: "get" function is not defined.');
  };

  /**
   * Executes an SQL command that modifies data (`INSERT`, `UPDATE`, `DELETE`).
   * @type {QueryRequest}
   */
  #run = async (query = '', params = []) => {
    console.warn('[TinyDb Debug] Called "run" with:', { query, params });
    throw new Error('TinyDb: "run" function is not defined.');
  };

  /**
   * Executes a SQL `SELECT` query that returns all matching rows.
   * @type {QueryRequest}
   */
  #all = async (query = '', params = []) => {
    console.warn('[TinyDb Debug] Called "all" with:', { query, params });
    throw new Error('TinyDb: "all" function is not defined.');
  };

  /**
   * Executes a generic SQL query.
   * @type {QueryRequest}
   */
  #query = async (query = '', params = []) => {
    console.warn('[TinyDb Debug] Called "query" with:', { query, params });
    throw new Error('TinyDb: "query" function is not defined.');
  };

  /**
   * Set the implementation for the `get` operation.
   * Use this for queries that fetch a single row.
   *
   * @param {QueryRequest} callback - The function to execute a `get` query.
   */
  setGet(callback) {
    if (typeof callback !== 'function') throw new Error('setGet callback must be a function');
    this.#get = callback;
  }

  /**
   * Set the implementation for the `run` operation.
   * Use this for queries that modify data (`INSERT`, `UPDATE`, `DELETE`).
   *
   * @param {QueryRequest} callback - The function to execute a `run` query.
   */
  setRun(callback) {
    if (typeof callback !== 'function') throw new Error('setRun callback must be a function');
    this.#run = callback;
  }

  /**
   * Set the implementation for the `all` operation.
   * Use this for queries that return multiple rows.
   *
   * @param {QueryRequest} callback - The function to execute an `all` query.
   */
  setAll(callback) {
    if (typeof callback !== 'function') throw new Error('setAll callback must be a function');
    this.#all = callback;
  }

  /**
   * Set the implementation for the `query` operation.
   * Use this for any generic query, depending on the backend.
   *
   * @param {QueryRequest} callback - The function to execute a `query` operation.
   */
  setQuery(callback) {
    if (typeof callback !== 'function') throw new Error('setQuery callback must be a function');
    this.#query = callback;
  }

  /**
   * Retrieves the `BrowserWindow` instance that originated the IPC event.
   *
   * @param {Electron.IpcMainInvokeEvent} event - The IPC event.
   * @returns {BrowserWindow|null} The associated `BrowserWindow` or `null`.
   */
  #getWin(event) {
    const webContents = event.sender;
    if (!event.senderFrame) return null;
    return BrowserWindow.fromWebContents(webContents);
  }

  /**
   * Internal helper to register IPC handlers and avoid repetition.
   *
   * @param {string} action - The action name (e.g., 'run', 'all').
   * @param {QueryRequest} handler - The internal method to call.
   */
  #registerHandler(action, handler) {
    /** @inner {string} channel */
    const channel = `${this.#id}_${action}`;

    ipcMain.handle(channel, async (event, args) => {
      /** @inner {BrowserWindow|null} win */
      const win = this.#getWin(event);
      if (!win) return null;

      const { query, params } = args || {};
      return await handler(query, params);
    });
  }

  /**
   * Creates a new TinyDb instance and sets up native Electron IPC handlers.
   *
   * @param {string} id - A unique identifier to namespace the IPC channels.
   */
  constructor(id) {
    if (typeof id !== 'string') throw new Error('id must be a string.');
    this.#id = id;

    // Register all database handlers using the template method
    this.#registerHandler('run', (q, p) => this.#run(q, p));
    this.#registerHandler('all', (q, p) => this.#all(q, p));
    this.#registerHandler('get', (q, p) => this.#get(q, p));
    this.#registerHandler('query', (q, p) => this.#query(q, p));
  }
}

export default TinyDb;
