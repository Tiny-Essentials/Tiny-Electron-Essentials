import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { resolve as resolvePath, join } from 'path';

/**
 * Save CSS content into a .css file with strict validation.
 *
 * @param {string} directory - The folder path where the file will be saved.
 * @param {string} filename - The name of the file (should end with .css).
 * @param {string} cssContent - The CSS content to be saved.
 * @returns {Promise<void>}
 * @throws {Error} If validation fails or write fails.
 */
export async function saveCssFile(directory, filename, cssContent) {
  if (typeof directory !== 'string' || directory.trim() === '')
    throw new Error('Invalid directory path.');
  if (typeof filename !== 'string' || !/^[\w\- ]+\.css$/.test(filename))
    throw new Error('Invalid filename. Must be a valid name ending with .css');
  if (typeof cssContent !== 'string') throw new Error('CSS content must be a string.');

  const absolutePath = resolvePath(directory);
  const fullFilePath = join(absolutePath, filename);

  if (!existsSync(absolutePath)) throw new Error(`Directory does not exist: ${absolutePath}`);

  try {
    await writeFile(fullFilePath, cssContent, 'utf8');
    console.log(`✔ CSS file saved to: ${fullFilePath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save CSS file: ${message}`);
  }
}

// TinyWindowFrameManager

/**
 * Returns the default CSS variables for the custom window frame.
 *
 * This CSS string defines a set of variables under `:root` that control
 * colors, layout, spacing, fonts, and component sizes for a window frame UI.
 *
 * @returns {string} CSS string containing :root variables for styling the window frame.
 */
export const getDefaultWindowFrameRoot = () => {
  return `
      :root {
        /* Layout */
        --frame-root-background: #fff;
        --frame-height: 32px;

        /* Colors */
        --frame-background: rgba(30, 30, 30, 1);
        --frame-blur-background: rgba(30, 30, 30, 0.95);

        /* Border */
        --frame-border-color: rgb(76 76 76);
        --frame-border-radius: 7px;
        --frame-border-size: 1px;

        /* Text */
        --frame-title-font-size: 8pt;
        --frame-font-size: 10pt;
        --frame-font-family: system-ui, sans-serif;
        --frame-font-color: white;
        --frame-font-blur-color: rgba(255, 255, 255, 0.6);

        /* Icons */
        --frame-icon-size: 20px;

        /* Buttons */
        --frame-button-width: 32px;
        --frame-button-hover-background: rgba(255, 255, 255, 0.1);
        --frame-button-active-background: rgba(255, 255, 255, 0.2);
        --frame-close-button-hover-background: #C42B1C;
        --frame-close-button-active-background: #B12719;

        /* Padding */
        --frame-padding-x: 8px;
        --frame-gap: 6px;

        /* Menu */
        --frame-menu-max-width: 200px;
        --frame-menu-gap: 4px;
      }
    `;
};

/**
 * Returns the default CSS rules for the custom window frame layout and behavior.
 *
 * This CSS string styles the window borders, title bar, buttons, icons, menus,
 * and supports fullscreen and blur states. It relies on a function to generate
 * dynamic class selectors for component names.
 *
 * @param {Object} [settings={}] - Optional settings to customize the CSS output.
 * @param {(className?: string, extra?: string, extra2?: string) => string} [settings.getElementName] - Function that returns a valid CSS selector string.
 * @param {string} [settings.fullscreenClass] - Class name applied to body to indicate fullscreen mode.
 * @param {string} [settings.blurClass] - Class name applied to body to indicate blur mode.
 * @param {string} [settings.maximizedClass] - Class name applied to body to indicate maximized mode.
 *
 * @returns {string} CSS string for the full custom window frame styling.
 * @throws {Error} If any of the required settings are invalid.
 */
export const getDefaultWindowFrameStyle = ({
  getElementName,
  fullscreenClass,
  blurClass,
  maximizedClass,
} = {}) => {
  if (typeof getElementName !== 'function')
    throw new Error(
      'Invalid argument: "getElementName" must be a function that returns CSS selectors.',
    );
  if (typeof fullscreenClass !== 'string')
    throw new Error('Invalid argument: "fullscreenClass" must be a string.');
  if (typeof blurClass !== 'string')
    throw new Error('Invalid argument: "blurClass" must be a string.');
  if (typeof maximizedClass !== 'string')
    throw new Error('Invalid argument: "maximizedClass" must be a string.');

  return `
      /* Base */
      body {
        margin: 0;
        padding: 0;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        box-sizing: border-box;
      }

      ${getElementName()} {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /* Border */
      ${getElementName('.custom-window-frame')},
      ${getElementName('.window-content')} {
        box-sizing: border-box;
      }

      ${getElementName('.custom-window-frame')} {
        border-top: var(--frame-border-size) solid var(--frame-border-color);
        border-left: var(--frame-border-size) solid var(--frame-border-color);
        border-right: var(--frame-border-size) solid var(--frame-border-color);
        pointer-events: none;
        user-select: none;
        color: var(--frame-font-color);
      }

      ${getElementName('.custom-window-frame')},
      ${getElementName('.frame-top')} {
        border-top-left-radius: var(--frame-border-radius);
        border-top-right-radius: var(--frame-border-radius);
      }

      ${getElementName('.frame-top-left')} {
        border-top-left-radius: var(--frame-border-radius);
      }

      ${getElementName('.frame-top-right')} {
        border-top-right-radius: var(--frame-border-radius);
      }

      ${getElementName('.window-content')} {
        border-bottom: var(--frame-border-size) solid var(--frame-border-color);
        border-left: var(--frame-border-size) solid var(--frame-border-color);
        border-right: var(--frame-border-size) solid var(--frame-border-color);
        border-bottom-left-radius: var(--frame-border-radius);
        border-bottom-right-radius: var(--frame-border-radius);
        flex: 1;
        overflow: auto;
        pointer-events: all;
        background: var(--frame-root-background);
      }

      /* Frame */
      ${getElementName('.frame-top')} {
        position: relative;
        width: 100%;
        height: var(--frame-height);
        display: block;
        background: var(--frame-background);
        pointer-events: all;
        -webkit-app-region: drag;
      }

      ${getElementName('.frame-top-left')},
      ${getElementName('.frame-top-center')},
      ${getElementName('.frame-top-right')} {
        display: flex;
        align-items: center;
        gap: var(--frame-gap);
      }

      ${getElementName('.frame-top-left')},
      ${getElementName('.frame-top-right')} {
        flex: 0 0 auto;
        padding: 0;
      }

      ${getElementName('.frame-top-left')} {
        padding-right: var(--frame-padding-x);
        display: inline-flex;
        height: 100%;
      }

      ${getElementName('.frame-top-right')} {
        padding-left: var(--frame-padding-x);
        display: inline-flex;
        height: 100%;
        position: absolute;
        right: 0;
      }

      ${getElementName('.frame-top-center')} {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 var(--frame-padding-x);
        overflow: hidden;
        white-space: nowrap;
      }

      /* Title */
      ${getElementName('.frame-title')} {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: var(--frame-title-font-size);
        font-family: var(--frame-font-family);
      }

      /* Icon */
      ${getElementName('.frame-icon')} {
        padding-left: var(--frame-padding-x);
        width: var(--frame-icon-size);
        height: var(--frame-icon-size);
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
      }

      /* Buttons style base */
      ${getElementName('.frame-menu > button')},
      ${getElementName('.frame-buttons > button')},
      ${getElementName('.frame-menu > button:focus')},
      ${getElementName('.frame-menu > button:active')},
      ${getElementName('.frame-menu > button:hover')},
      ${getElementName('.frame-buttons > button:focus')},
      ${getElementName('.frame-buttons > button:active')},
      ${getElementName('.frame-buttons > button:hover')},
      ${getElementName('.frame-menu > button:disabled')},
      ${getElementName('.frame-buttons > button:disabled')} {
        outline: none;
        box-shadow: none;
        text-shadow: none;
      }

      ${getElementName('.frame-menu > button:disabled')},
      ${getElementName('.frame-buttons > button:disabled')} {
        opacity: 0.5;
      }

      /* Buttons */
      ${getElementName('.frame-menu > button')} {
        font-size: var(--frame-font-size);
        font-family: var(--frame-font-family);
        background-color: transparent;
        border: none;
        color: var(--frame-font-color);
        padding: 4px 8px;
        border-radius: 4px;
        cursor: default;
      }

      ${getElementName('.frame-buttons')} {
        height: 100%;
      }

      ${getElementName('.frame-buttons > button')} {
        font-size: var(--frame-font-size);
        font-family: var(--frame-font-family);
        background: transparent;
        border: none;
        color: var(--frame-font-color);
        width: var(--frame-button-width);
        height: 100%;
        cursor: default;
        -webkit-app-region: no-drag;
      }

      ${getElementName('.frame-buttons > button:hover')},
      ${getElementName('.frame-menu > button:hover')} {
        background-color: var(--frame-button-hover-background);
      }

      ${getElementName('.frame-menu')} {
        max-width: var(--frame-menu-max-width);
        overflow-x: auto;
        display: flex;
        gap: var(--frame-menu-gap);
        -webkit-app-region: no-drag;
      }

      ${getElementName('.frame-top-left .frame-menu:first-child')} {
        padding-left: var(--frame-padding-x);
      }

      ${getElementName('.frame-top-right .frame-menu:last-child')} {
        padding-right: var(--frame-padding-x);
      }

      /* Buttons Dropdown */
      ${getElementName('.menu-dropdown')} {
        background: var(--frame-background);
        border: 1px solid var(--frame-border-color);
        padding: 4px;
        border-radius: 4px;
        display: none;
        gap: 4px;
        z-index: 9999;
        min-width: 150px;
      }

      ${getElementName('.menu-item')} {
        background: none;
        color: var(--frame-font-color);
        border: none;
        text-align: left;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
      }

      ${getElementName('.menu-item:hover')} {
        background: var(--frame-button-hover-background);
      }

      ${getElementName('.has-submenu::after')} {
        content: '▸';
        float: right;
        margin-left: 6px;
      }

      /* Hide effects */
      ${getElementName('.frame-menu > button.hide')},
      ${getElementName('.frame-icon.hide')} {
        opacity: 0;
        pointer-events: none;
      }

      /* Blur effects */
      ${getElementName('.frame-title', '', `body.${blurClass}`)},
      ${getElementName('.frame-menu > button', '', `body.${blurClass}`)},
      ${getElementName('.frame-buttons > button', '', `body.${blurClass}`)} {
        color: var(--frame-font-blur-color);
      }

      ${getElementName('.frame-title:hover', '', `body.${blurClass}`)},
      ${getElementName('.frame-menu > button:hover', '', `body.${blurClass}`)},
      ${getElementName('.frame-buttons > button:hover', '', `body.${blurClass}`)} {
        color: var(--frame-font-color);
      }

      ${getElementName('.frame-top', '', `body.${blurClass}`)} {
        background: var(--frame-blur-background);
      }

      /* Active effects */
      ${getElementName('.frame-buttons > button:active')},
      ${getElementName('.frame-menu > button:active:not(.has-dropdown)')},
      ${getElementName('.frame-menu > button.active')} {
        background-color: var(--frame-button-active-background);
      }

      /* Border last and first button */
      ${getElementName('.frame-top-right .frame-buttons > button:last-child', '', `body:not(.${maximizedClass})`)} {
        border-top-right-radius: var(--frame-border-radius);
      }

      ${getElementName('.frame-top-left .frame-buttons:first-child > button:first-child', '', `body:not(.${maximizedClass})`)} {
        border-top-left-radius: var(--frame-border-radius);
      }

      /* Full Screen and Maximize */
      ${getElementName('.custom-window-frame', '', `body.${fullscreenClass}`)} {
        display: none !important;
      }

      ${getElementName('.custom-window-frame', '', `body.${maximizedClass}`)} {
        border-top-left-radius: 0 !important;
        border-top-right-radius: 0 !important;
        border: none !important;
      }

      ${getElementName('.window-content', '', `body.${fullscreenClass}`)},
      ${getElementName('.window-content', '', `body.${maximizedClass}`)} {
        border: none !important;
        border-bottom-left-radius: 0 !important;
        border-bottom-right-radius: 0 !important;
      }

      /* Close Button */
      ${getElementName('.frame-buttons > .btn-close:hover')} {
        background-color: var(--frame-close-button-hover-background);
      }

      ${getElementName('.frame-buttons > .btn-close:active')} {
        background-color: var(--frame-close-button-active-background);
      }
    `;
};
