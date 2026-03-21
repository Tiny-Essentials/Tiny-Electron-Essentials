/**
 * An extended error object that may contain additional metadata.
 *
 * @typedef {Error & {
 *   code?: any,   // Optional error code, any type.
 *   data?: any    // Optional additional error data.
 * }} ErrorParsed
 */

/**
 * Converts an `Error` object into a plain JSON-serializable object.
 * Useful for sending errors between processes or over the network.
 *
 * @param {ErrorParsed} error - The error object to serialize.
 * @returns {{
 *   name: string,          // Error name (e.g., 'TypeError')
 *   message: string,       // Error message
 *   stack?: string,        // Optional stack trace
 *   code?: any,            // Optional error code
 *   data?: any             // Optional additional error data
 * }}
 * @throws {Error} Throws if the input is not a valid error object.
 */
export function serializeError(error) {
  if (typeof error !== 'object' || error === null)
    throw new Error('Expected error to be a non-null object');
  if (typeof error.name !== 'string') throw new Error('Expected error.name to be a string');
  if (typeof error.message !== 'string') throw new Error('Expected error.message to be a string');
  if (error.stack !== undefined && typeof error.stack !== 'string')
    throw new Error('Expected error.stack to be a string if defined');

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error.code !== undefined && { code: error.code }),
    ...(error.data !== undefined && { data: error.data }),
  };
}

/**
 * Converts a plain JSON object back into an `Error` instance.
 * Useful for reconstructing errors received over IPC or network.
 *
 * @param {{
 *   name?: string,        // Optional error name (defaults to 'Error')
 *   message: string,      // Error message
 *   stack?: string,       // Optional stack trace
 *   code?: any,           // Optional error code
 *   data?: any            // Optional additional error data
 * }} json - The JSON object representing the error.
 * @returns {ErrorParsed} The reconstructed error object.
 * @throws {Error} Throws if the input JSON does not match the expected structure.
 */
export function deserializeError(json) {
  if (typeof json !== 'object' || json === null)
    throw new Error('Expected json to be a non-null object');
  if (typeof json.message !== 'string') throw new Error('Expected json.message to be a string');
  if (json.name !== undefined && typeof json.name !== 'string')
    throw new Error('Expected json.name to be a string if defined');
  if (json.stack !== undefined && typeof json.stack !== 'string')
    throw new Error('Expected json.stack to be a string if defined');

  /** @type {ErrorParsed} */
  const error = new Error(json.message);
  error.name = json.name || 'Error';
  error.stack = json.stack || '';
  if (json.code !== undefined) error.code = json.code;
  if (json.data !== undefined) error.data = json.data;
  return error;
}

/**
 * Performs a deep clone of an object, array, or date.
 * Useful for creating fully independent copies of nested structures.
 *
 * @param {*} obj - The object to clone. Supports plain objects, arrays, and Date instances.
 * @returns {*} A deep-cloned copy of the input.
 * @throws {Error} Throws if the input type is not supported (e.g., functions, Map, Set).
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(deepClone);
  if (obj instanceof Object) {
    const copy = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // @ts-ignore
        copy[key] = deepClone(obj[key]);
      }
    }
    return copy;
  }

  throw new Error('Unsupported type');
}

/**
 * Validates and synchronizes event name constants between two objects.
 *
 * This function checks if the `eventNames` object contains string values
 * for keys present in the `list` object. If valid, it copies the values
 * from `eventNames` into `list`. If a value in `eventNames` is not a string,
 * it throws an error. Additionally, it ensures that `eventNames` is a valid object.
 *
 * @param {Record<string, string>} eventNames
 * An object containing event name keys and their corresponding string values.
 *
 * @param {Record<string, string>} list
 * The target object where valid event names from `eventNames` will be copied to.
 * This object is modified in-place.
 *
 * @throws {TypeError} If `eventNames` is not a valid JSON object.
 * @throws {Error} If any value in `eventNames` (for keys that exist in `list`) is not a string.
 */
export const checkEventsList = (eventNames, list) => {
  if (typeof eventNames !== 'object') throw new TypeError('Expected "eventNames" to be an object.');
  for (const key in list) {
    // @ts-ignore
    if (typeof eventNames[key] !== 'undefined' && typeof eventNames[key] !== 'string')
      throw new Error(
        // @ts-ignore
        `[Events] Value of key "${eventNames[key]}" must be a string. Got: ${typeof eventNames[key]}`,
      );
  }

  for (const key in eventNames) {
    // @ts-ignore
    if (typeof eventNames[key] === 'string')
      // @ts-ignore
      list[key] = eventNames[key];
  }
};

/**
 * Move all elements from document.body into a target container,
 * except for <style> and <script> tags.
 *
 * @param {HTMLElement} targetElement - The destination container.
 */
export function moveBodyContentTo(targetElement) {
  if (!(targetElement instanceof HTMLElement)) {
    throw new TypeError('targetElement must be an HTMLElement');
  }

  const nodes = Array.from(document.body.childNodes);

  for (const node of nodes) {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      // @ts-ignore
      (node.tagName === 'SCRIPT' || node.tagName === 'STYLE')
    ) {
      continue; // Skip <script> and <style>
    }
    targetElement.appendChild(node);
  }
}

/**
 * Checks if two DOM elements are colliding on the screen.
 *
 * @param {Element} elem1 - First DOM element.
 * @param {Element} elem2 - Second DOM element.
 * @returns {boolean} - Returns true if the elements are colliding.
 */
export function areElementsColliding(elem1, elem2) {
  const rect1 = elem1.getBoundingClientRect();
  const rect2 = elem2.getBoundingClientRect();

  return !(
    rect1.right < rect2.left ||
    rect1.left > rect2.right ||
    rect1.bottom < rect2.top ||
    rect1.top > rect2.bottom
  );
}
