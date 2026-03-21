import { readFileSync } from 'fs';

/**
 * @typedef {{ width: number; height: number; x?: number; y?: number; }} Bounds
 * An object representing the size and position of a window.
 */

/**
 * @typedef {{ bounds?: Bounds; maximized?: boolean }} InitConfig
 * Configuration used to initialize a window, including size and state.
 */

/**
 * Provides file operations scoped to a window instance.
 *
 * This class handles reading, writing, and managing files related
 * to the context of a specific Electron window. Useful for storing
 * window-specific configuration, cache, or temporary data.
 *
 * Ensures that file operations are organized per window instance
 * and isolated from global application files.
 *
 * @class
 */
class TinyWindowFile {
  /** @type {Record<string, Bounds>} */
  #bounds = {};

  /** @type {Record<string, InitConfig>} */
  #ids = {};

  /**
   * Loads window configuration from a file and stores it internally.
   *
   * @param {string} initFile - The path to the JSON file containing window data.
   * @param {Object} [settings={}] - Optional fallback settings.
   * @param {Bounds} [settings.bounds={ width: 1200, height: 700 }] - Default bounds.
   * @throws {TypeError} If `initFile` is not a string.
   * @throws {TypeError} If `settings.bounds` is invalid.
   */
  loadFile(initFile, { bounds = { width: 1200, height: 700 } } = {}) {
    if (typeof initFile !== 'string') throw new TypeError('Expected "initFile" to be a string.');

    if (typeof bounds !== 'object') throw new TypeError('Expected "bounds" to be an object.');
    if (typeof bounds.width !== 'number' || typeof bounds.height !== 'number')
      throw new TypeError('Expected "bounds" with numeric width and height.');
    if (
      (typeof bounds.x !== 'undefined' && typeof bounds.x !== 'number') ||
      (typeof bounds.y !== 'undefined' && typeof bounds.y !== 'number')
    )
      throw new TypeError('Expected "bounds" with numeric x and y.');

    /** @type {InitConfig} */
    let data = {};
    try {
      const raw = JSON.parse(readFileSync(initFile, 'utf8'));
      if (typeof raw === 'object') data = raw;
    } catch {
      data = {};
    }

    const rawBounds = typeof data.bounds === 'object' ? data.bounds : bounds;
    const finalBounds = {
      width: typeof rawBounds.width === 'number' ? rawBounds.width : bounds.width,
      height: typeof rawBounds.height === 'number' ? rawBounds.height : bounds.height,
      ...(typeof rawBounds.x === 'number' ? { x: rawBounds.x } : {}),
      ...(typeof rawBounds.y === 'number' ? { y: rawBounds.y } : {}),
    };

    const maximized = typeof data.maximized === 'boolean' ? data.maximized : false;

    this.#bounds[initFile] = finalBounds;
    this.#ids[initFile] = { bounds: finalBounds, maximized };
  }

  /**
   * Returns a complete configuration for a previously loaded window.
   *
   * @param {string} id - The ID or path used to load the window configuration.
   * @returns {InitConfig}
   * @throws {TypeError} If `id` is not a string.
   * @throws {Error} If `id` has not been registered.
   */
  getData(id) {
    if (typeof id !== 'string') throw new TypeError('Expected "id" to be a string.');
    if (!this.hasId(id)) throw new Error(`No configuration found for id "${id}".`);

    const stored = this.#ids[id];
    return {
      bounds: stored.bounds ? { ...stored.bounds } : undefined,
      maximized: stored.maximized ?? false,
    };
  }

  /**
   * Checks if a configuration has been loaded for the given ID.
   *
   * @param {string} id - The ID or path to check.
   * @returns {boolean} True if a config exists, false otherwise.
   * @throws {TypeError} If `id` is not a string.
   */
  hasId(id) {
    if (typeof id !== 'string') throw new TypeError('Expected "id" to be a string.');
    return !!this.#ids[id];
  }

  /**
   * Returns the bounds for a previously loaded window.
   *
   * @param {string} id - The ID or path used to load the window configuration.
   * @returns {Bounds} A new copy of the bounds object.
   * @throws {TypeError} If `id` is not a string.
   * @throws {Error} If bounds are not found for the given ID.
   */
  getBounds(id) {
    if (typeof id !== 'string') throw new TypeError('Expected "id" to be a string.');
    const bounds = this.#bounds[id];
    if (!bounds) throw new Error(`No bounds found for id "${id}".`);
    return { ...bounds };
  }
}

export default TinyWindowFile;
