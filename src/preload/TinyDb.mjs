import { contextBridge, ipcRenderer } from 'electron';

/**
 * Executes an SQL command that modifies data (`INSERT`, `UPDATE`, `DELETE`)
 * or runs any command without returning rows.
 *
 * @callback SqlRun
 * @param {string} query - SQL query string.
 * @param {any[]} params - Query parameters.
 * @returns {Promise<any>} Result of the query execution.
 */

/**
 * Executes a SQL `SELECT` query that returns all matching rows.
 *
 * @callback SqlAll
 * @param {string} query - SQL query string.
 * @param {any[]} params - Query parameters.
 * @returns {Promise<any[]>} Array of matching rows.
 */

/**
 * Executes a SQL `SELECT` query that returns a single row.
 *
 * @callback SqlGet
 * @param {string} query - SQL query string.
 * @param {any[]} params - Query parameters.
 * @returns {Promise<any>} The first row matching the query.
 */

/**
 * Executes a generic SQL query. The result depends on the query type.
 *
 * @callback SqlQuery
 * @param {string} query - SQL query string.
 * @param {any[]} params - Query parameters.
 * @returns {Promise<any>} Result of the query.
 */

/**
 * SqlManager represents the core interface for database interactions.
 * It groups together the primary methods required to execute various types of SQL commands.
 * @typedef {{ get: SqlGet; query: SqlQuery; all: SqlAll; run: SqlRun; }} SqlManager
 */

/**
 * TinyDb provides a secure bridge between the Electron renderer process and the main process.
 * It uses native `ipcRenderer.invoke` to perform database operations over IPC.
 *
 * This class exposes database-like methods (`run`, `all`, `get`, and `query`)
 * to the renderer process using `contextBridge.exposeInMainWorld`.
 */
class TinyDb {
  #exposeInMainWorld = '';
  #id;

  /**
   * Creates a new TinyDb instance.
   *
   * @param {string} id - A unique identifier to namespace the IPC events.
   * @throws {Error} If `id` is not a string.
   */
  constructor(id) {
    if (typeof id !== 'string') throw new Error('id must be a string.');
    this.#id = id;
  }

  /**
   * Private helper to handle the IPC invocation logic.
   *
   * @param {string} action - The database action to perform.
   * @param {string} query - The SQL query string.
   * @param {any[]} params - The query parameters.
   * @returns {Promise<any>} The result from the main process.
   */
  #send(action, query, params) {
    /** @inner {string} channel */
    const channel = `${this.#id}_${action}`;
    /** @inner {object} payload */
    const payload = { query, params };

    return ipcRenderer.invoke(channel, payload);
  }

  /**
   * Exposes the TinyDb API to the renderer process via `window[apiName]`.
   *
   * @param {string} [apiName='tinyDb'] - The name under which the API will be exposed in `window`.
   * @throws {Error} If the API is already exposed.
   * @throws {Error} If `apiName` is not a valid non-empty string.
   */
  exposeInMainWorld(apiName = 'tinyDb') {
    if (this.#exposeInMainWorld.length > 0)
      throw new Error(`API '${this.#exposeInMainWorld}' is already exposed in the main world.`);
    if (typeof apiName !== 'string' || apiName.length < 1)
      throw new Error('apiName must be a non-empty string.');
    this.#exposeInMainWorld = apiName;
    contextBridge.exposeInMainWorld(apiName, {
      /** @type {SqlRun} */
      run: (query, params) => this.run(query, params),
      /** @type {SqlAll} */
      all: (query, params) => this.all(query, params),
      /** @type {SqlGet} */
      get: (query, params) => this.get(query, params),
      /** @type {SqlQuery} */
      query: (query, params) => this.query(query, params),
    });
  }

  /**
   * Executes an SQL command that modifies data (`INSERT`, `UPDATE`, `DELETE`)
   * or runs any command without returning rows.
   *
   * @param {string} query - SQL query string.
   * @param {any[]} params - Query parameters.
   * @returns {Promise<any>}
   */
  run(query, params) {
    return this.#send('run', query, params);
  }

  /**
   * Executes a SQL `SELECT` query for multiple rows.
   *
   * @param {string} query - SQL query string.
   * @param {any[]} params - Query parameters.
   * @returns {Promise<any[]>} Array of matching rows.
   */
  all(query, params) {
    return this.#send('all', query, params);
  }

  /**
   * Executes a SQL `SELECT` query for a single row.
   *
   * @param {string} query - SQL query string.
   * @param {any[]} params - Query parameters.
   * @returns {Promise<any>} The first row matching the query.
   */
  get(query, params) {
    return this.#send('get', query, params);
  }

  /**
   * Executes a generic SQL query.
   *
   * @param {string} query - SQL query string.
   * @param {any[]} params - Query parameters.
   * @returns {Promise<any>} Result of the query.
   */
  query(query, params) {
    return this.#send('query', query, params);
  }
}

export default TinyDb;
