import {
  getDefaultWindowFrameRoot,
  getDefaultWindowFrameStyle,
  saveCssFile,
} from '../global/CssFile.mjs';
import { RootEvents } from '../global/Events.mjs';
import { areElementsColliding, moveBodyContentTo } from '../global/Utils.mjs';
import TinyElectronClient from './TinyElectronClient.mjs';

/**
 * TinyWindowFrameManager
 *
 * A powerful and fully customizable window frame manager for Electron applications
 * that use frameless windows (`frame: false`). It replaces the native title bar with
 * a fully configurable HTML/CSS/JS interface, allowing total control over window borders,
 * title positioning, icons, menus, and control buttons (minimize, maximize, close).
 *
 * ✅ Features:
 * - Fully draggable top bar and borders.
 * - Highly customizable buttons: change order, position (left/right), and icons.
 * - Configurable window title alignment: left, center, or right.
 * - Dynamic menu sections on left and right, with support for custom elements and buttons.
 * - Automatic handling of Electron window events: minimize, maximize, unmaximize, focus, blur, fullscreen.
 * - Fully responsive to window state changes (maximized, fullscreen, focus).
 * - Dynamic CSS styling with optional default styles, or supply your own CSS.
 * - Change internal icons and class names via constructor or dynamically.
 * - Clean, semantic, and framework-free: pure HTML, CSS, and JavaScript.
 *
 * 🚀 Usage example:
 * ```js
 * const frame = new TinyWindowFrameManager({
 *   client: myElectronClient,
 *   titlePosition: 'center',
 *   buttonsPosition: 'right',
 *   buttonsMap: ['minimize', 'maximize', 'close'],
 *   icons: { minimize: '-', maximize: '▢', unmaximize: '▣', close: '✖' },
 *   classes: { focus: 'win-focus', blur: 'win-blur', fullscreen: 'win-fullscreen', maximized: 'win-maximized' },
 * });
 *
 * frame.setTitle('My Tiny App');
 * frame.setIcon('icon.png');
 * frame.addMenuButton('Settings', { onClick: () => openSettings(), position: 'right' });
 * ```
 *
 * 🔧 Requirements:
 * - Works only with Electron windows that are frameless (`frame: false`), transparent if desired, and `titleBarStyle: 'hidden'`.
 * - Requires a client controller (like TinyElectronClient) that communicates with Electron's main process to handle window actions.
 *
 * 💡 Tip:
 * You can completely replace or override the CSS with your own themes, animations, and layout changes.
 *
 * @class
 */
class TinyWindowFrameManager {
  #windowRoot = '';
  #minimizeIcon = '';
  #maximizeIcon = '';
  #unmaximizeIcon = '';
  #closeIcon = '';

  #blurClass = '';
  #focusClass = '';
  #fullscreenClass = '';
  #maximizedClass = '';

  #options = {
    buttonsPosition: '',
    titlePosition: '',
    /** @type {string[]} */
    buttonsMap: [],
  };

  /** @type {TinyElectronClient} */
  #client;

  /**
   * Represents all HTML elements related to the custom window frame structure.
   * This includes the main container, title bar, borders, menus, and control buttons.
   *
   * @typedef {Object} FrameElements
   * @property {HTMLDivElement} rootContent - The main content container inside the window frame.
   * @property {HTMLDivElement} root - The root container for the entire frame structure.
   * @property {HTMLDivElement} frame - The outer frame that wraps the window content and borders.
   * @property {HTMLDivElement} top - The top bar container that holds title, icon, menus, and buttons.
   * @property {HTMLDivElement} menuLeft - The left-aligned menu container in the top bar.
   * @property {HTMLDivElement} menuRight - The right-aligned menu container in the top bar.
   * @property {HTMLDivElement} icon - The container for the application icon displayed in the top bar.
   * @property {HTMLDivElement} title - The container for the window title text.
   * @property {HTMLDivElement} topLeft - The left corner border of the top bar (used for styling or resizing).
   * @property {HTMLDivElement} topCenter - The center border of the top bar (typically stretches between left and right corners).
   * @property {HTMLDivElement} topRight - The right corner border of the top bar.
   * @property {Object} buttons - The group of window control buttons (minimize, maximize, close).
   * @property {HTMLDivElement} buttons.root - The container that holds all control buttons.
   * @property {HTMLButtonElement} buttons.maximize - The button to maximize or restore the window.
   * @property {HTMLButtonElement} buttons.minimize - The button to minimize the window.
   * @property {HTMLButtonElement} buttons.close - The button to close the window.
   */

  /** @type {FrameElements} */
  #elements;

  /** @type {Record<string, HTMLStyleElement>} */
  #styles = {};

  /**
   * Generates a formatted element name based on the given parameters.
   *
   * @param {string} [name=''] - The base name. If provided without leading space, a space will be prepended.
   * @param {string} [extra=''] - Extra string appended after the window root (optional).
   * @param {string} [extra2=''] - Extra string prepended at the beginning (optional).
   * @returns {string} The fully formatted element name.
   * @throws {TypeError} If any argument is not a string.
   */
  getElementName(name = '', extra = '', extra2 = '') {
    if (typeof name !== 'string') throw new TypeError('The "name" argument must be a string.');
    if (typeof extra !== 'string') throw new TypeError('The "extra" argument must be a string.');
    if (typeof extra2 !== 'string') throw new TypeError('The "extra2" argument must be a string.');
    return `${extra2.length > 0 ? `${extra2} ` : ''}#${this.#windowRoot}${extra}${name.length > 0 && name.startsWith(' ') ? name : ` ${name}`}`;
  }

  /**
   * Creates an instance of the custom window frame with a draggable title bar,
   * customizable buttons, class names, icons, and dynamic styling that integrates with Electron.
   *
   * @param {Object} [options] - Configuration options for the window frame.
   * @param {boolean} [options.applyDefaultStyles=true] - If true, applies the default CSS styles automatically.
   * @param {'left'|'right'} [options.buttonsPosition='right'] - Defines the position of the window control buttons (minimize, maximize, close).
   * @param {'left'|'center'|'right'} [options.titlePosition='center'] - Defines the position of the window title in the top bar.
   * @param {string[]} [options.buttonsMap=['minimize', 'maximize', 'close']] - Determines which buttons appear and their order. Valid values are 'minimize', 'maximize', and 'close'.
   * @param {TinyElectronClient} [options.client] - The Electron client interface that handles window events like minimize, maximize, close, and focus.
   * @param {string} [options.windowRoot='window-root'] - The ID for the root container.
   * @param {Object} [options.icons] - Custom innerHTML icons for buttons.
   * @param {string} [options.icons.minimize='🗕']
   * @param {string} [options.icons.maximize='🗖']
   * @param {string} [options.icons.unmaximize='🗗']
   * @param {string} [options.icons.close='🗙']
   * @param {Object} [options.classes] - Custom class names for window states.
   * @param {string} [options.classes.blur='electron-blur']
   * @param {string} [options.classes.focus='electron-focus']
   * @param {string} [options.classes.fullscreen='electron-fullscreen']
   * @param {string} [options.classes.maximized='electron-maximized']
   */
  constructor({
    applyDefaultStyles = true,
    buttonsPosition = 'right',
    titlePosition = 'center',
    buttonsMap = ['minimize', 'maximize', 'close'],
    client,

    windowRoot = 'window-root',

    icons = {
      minimize: '🗕',
      maximize: '🗖',
      unmaximize: '🗗',
      close: '🗙',
    },

    classes = {
      blur: 'electron-blur',
      focus: 'electron-focus',
      fullscreen: 'electron-fullscreen',
      maximized: 'electron-maximized',
    },
  } = {}) {
    // Validate client
    if (!(client instanceof TinyElectronClient))
      throw new Error(
        `Invalid client instance. Expected instance of TinyElectronClient. Received: ${client}`,
      );

    // Validate types
    if (typeof applyDefaultStyles !== 'boolean')
      throw new TypeError(`applyDefaultStyles must be a boolean. Received: ${applyDefaultStyles}`);

    if (!['left', 'right'].includes(buttonsPosition))
      throw new Error(`buttonsPosition must be 'left' or 'right'. Received: ${buttonsPosition}`);

    if (!['left', 'center', 'right'].includes(titlePosition))
      throw new Error(
        `titlePosition must be 'left', 'center' or 'right'. Received: ${titlePosition}`,
      );

    if (
      !Array.isArray(buttonsMap) ||
      !buttonsMap.every((btn) => ['minimize', 'maximize', 'close'].includes(btn))
    )
      throw new Error(
        `buttonsMap must be an array containing any combination of 'minimize', 'maximize', 'close'. Received: ${JSON.stringify(
          buttonsMap,
        )}`,
      );

    if (typeof windowRoot !== 'string' || !windowRoot.trim())
      throw new Error('windowRoot must be a non-empty string.');

    if (typeof icons !== 'object') throw new Error('icons must be a object.');
    const requiredIcons = ['minimize', 'maximize', 'unmaximize', 'close'];
    requiredIcons.forEach((key) => {
      // @ts-ignore
      if (typeof icons[key] !== 'string' || !icons[key].trim()) {
        throw new Error(`Icon "${key}" must be a non-empty string.`);
      }
    });

    if (typeof classes !== 'object') throw new Error('classes must be a object.');
    const requiredClasses = ['blur', 'focus', 'fullscreen', 'maximized'];
    requiredClasses.forEach((key) => {
      // @ts-ignore
      if (typeof classes[key] !== 'string' || !classes[key].trim()) {
        throw new Error(`Class "${key}" must be a non-empty string.`);
      }
    });

    this.#windowRoot = windowRoot;

    // @ts-ignore
    this.#minimizeIcon = icons.minimize;
    // @ts-ignore
    this.#maximizeIcon = icons.maximize;
    // @ts-ignore
    this.#unmaximizeIcon = icons.unmaximize;
    // @ts-ignore
    this.#closeIcon = icons.close;

    // @ts-ignore
    this.#blurClass = classes.blur;
    // @ts-ignore
    this.#focusClass = classes.focus;
    // @ts-ignore
    this.#fullscreenClass = classes.fullscreen;
    // @ts-ignore
    this.#maximizedClass = classes.maximized;

    this.#options.buttonsPosition = buttonsPosition;
    this.#options.titlePosition = titlePosition;
    this.#options.buttonsMap = buttonsMap;
    this.#client = client;

    const root = document.createElement('div');
    root.id = this.#windowRoot;

    const frame = document.createElement('div');
    frame.classList.add('custom-window-frame');

    const content = document.createElement('div');
    content.classList.add('window-content');

    const rootContent = document.createElement('div');
    rootContent.id = 'root';
    content.prepend(rootContent);

    // Top bar
    const top = document.createElement('div');
    top.classList.add('frame-top');

    // Subcontainers
    const topLeft = document.createElement('div');
    topLeft.classList.add('frame-top-left');

    const topCenter = document.createElement('div');
    topCenter.classList.add('frame-top-center');

    const topRight = document.createElement('div');
    topRight.classList.add('frame-top-right');

    // Menu
    const menuRight = document.createElement('div');
    menuRight.classList.add('frame-menu');
    const menuLeft = document.createElement('div');
    menuLeft.classList.add('frame-menu');

    // Icon
    const icon = document.createElement('div');
    icon.classList.add('frame-icon');

    // Title
    const title = document.createElement('div');
    title.classList.add('frame-title');
    title.textContent = 'Application Title';

    // Buttons
    const buttons = document.createElement('div');
    /** @type {Record<string, HTMLButtonElement>} */
    const btn = {
      maximize: document.createElement('button'),
      minimize: document.createElement('button'),
      close: document.createElement('button'),
    };

    btn.minimize.classList.add('btn-minimize');
    btn.minimize.innerHTML = this.#minimizeIcon;

    btn.maximize.classList.add('btn-maximize');
    btn.maximize.innerHTML = this.#maximizeIcon;

    btn.close.classList.add('btn-close');
    btn.close.innerHTML = this.#closeIcon;

    buttons.classList.add('frame-buttons');
    for (const value of this.#options.buttonsMap) {
      if (btn[value] instanceof HTMLElement) buttons.appendChild(btn[value]);
      else
        throw new Error(
          `Invalid button name "${value}" in buttonsMap. Allowed values are: minimize, maximize, close.`,
        );
    }

    /**
     * @param {boolean} [isMaximized=this.#client.isMaximized()]
     * @returns {boolean}
     */
    const changeMaximizeIcon = (isMaximized = this.#client.isMaximized()) => {
      if (!isMaximized) {
        document.body.classList.remove(this.#maximizedClass);
        btn.maximize.innerHTML = this.#maximizeIcon;
      } else {
        document.body.classList.add(this.#maximizedClass);
        btn.maximize.innerHTML = this.#unmaximizeIcon;
      }
      return isMaximized;
    };

    btn.minimize.addEventListener('click', () => this.#client.minimize());
    btn.close.addEventListener('click', () => this.#client.close());
    btn.maximize.addEventListener('click', () => {
      const isMaximized = changeMaximizeIcon();
      if (isMaximized) this.#client.unmaximize();
      else this.#client.maximize();
    });

    /**
     *  Build top sections respecting icon always at the end
     *
     * @param {'left'|'right'} side
     * @param {Array<HTMLElement|null>} items
     */
    const buildSection = (side, items) => {
      const section = side === 'left' ? topLeft : topRight;
      items.forEach((item) => {
        if (item !== null) section.appendChild(item);
      });

      return section;
    };

    buildSection('left', [
      this.#options.titlePosition === 'left' ? title : null,
      this.#options.buttonsPosition === 'left' ? buttons : null,
      menuLeft,
    ]);
    buildSection('right', [
      menuRight,
      this.#options.titlePosition === 'right' ? title : null,
      this.#options.buttonsPosition === 'right' ? buttons : null,
    ]);
    if (this.#options.titlePosition === 'center') topCenter.appendChild(title);

    top.append(topLeft, topCenter, topRight);

    frame.append(top);

    root.append(frame, content);
    moveBodyContentTo(rootContent);
    document.body.prepend(root);

    this.#elements = {
      rootContent,
      root,
      frame,
      top,
      menuLeft,
      menuRight,
      icon,
      title,
      topLeft,
      topCenter,
      topRight,
      buttons: {
        root: buttons,
        maximize: btn.maximize,
        minimize: btn.minimize,
        close: btn.close,
      },
    };

    if (window.innerHeight === screen.height && window.innerWidth === screen.width)
      document.body.classList.add(this.#fullscreenClass);

    if (document.hasFocus()) document.body.classList.add(this.#focusClass);
    else document.body.classList.add(this.#blurClass);

    changeMaximizeIcon();
    client.on(RootEvents.IsMaximized, (isMaximized) => changeMaximizeIcon(isMaximized));

    client.on(RootEvents.IsFullScreen, (isFullScreen) => {
      if (isFullScreen) document.body.classList.add(this.#fullscreenClass);
      else document.body.classList.remove(this.#fullscreenClass);
    });

    const gainFocus = () => {
      document.body.classList.add(this.#focusClass);
      document.body.classList.remove(this.#blurClass);
    };

    const loseFocus = () => {
      document.body.classList.remove(this.#focusClass);
      document.body.classList.add(this.#blurClass);
    };

    client.on(RootEvents.IsFocused, (isFocused) => {
      if (isFocused) gainFocus();
      else loseFocus();
    });

    // Listen when the window loses focus
    window.addEventListener('blur', () => loseFocus());

    // Listen when the window gains focus
    window.addEventListener('focus', () => gainFocus());
    window.addEventListener('mousedown', () => {
      if (!document.hasFocus()) gainFocus();
    });

    // Check menu visibility initially
    this.#checkMenuVisibility();

    // Init default style
    this.#applyDefaultStyles(applyDefaultStyles);

    // Effects
    const resizeEffect = () => {
      const itemsLeft = this.#elements.menuLeft.querySelectorAll(':scope > *');
      const itemsRight = this.#elements.menuRight.querySelectorAll(':scope > *');

      /** @param {Element} item */
      const collisionTester = (item) => {
        if (areElementsColliding(item, this.#elements.topCenter)) {
          if (!item.classList.contains('hide')) {
            item.classList.add('hide');
            // @ts-ignore
            item.blur();
          }
        } else if (item.classList.contains('hide')) {
          item.classList.remove('hide');
        }
      };

      itemsLeft.forEach(collisionTester);
      itemsRight.forEach(collisionTester);
      collisionTester(this.#elements.icon);
    };

    this.#client.on(RootEvents.Resize, resizeEffect);
    this.#client.on(RootEvents.Resized, resizeEffect);
    this.#client.on(RootEvents.WillResize, resizeEffect);
  }

  /**
   * Save CSS content into a .css file.
   *
   * @param {string} directory - The folder path where the file will be saved.
   * @param {'default'|'root'} filename - The name of the css content.
   * @returns {Promise<void>}
   * @throws {TypeError} If directory is not a valid non-empty string.
   * @throws {TypeError} If filename is not 'default' or 'root'.
   * @throws {Error} If CSS content for the given filename does not exist.
   * @throws {Error} If the file cannot be written.
   */
  saveCssFileStructure(directory, filename) {
    if (typeof directory !== 'string' || !directory.trim())
      throw new TypeError('The "directory" argument must be a non-empty string.');

    if (filename !== 'default' && filename !== 'root')
      throw new TypeError('The "filename" argument must be either "default" or "root".');

    const style = this.#styles[filename];
    if (!style || !style.textContent) throw new Error(`No CSS content found for "${filename}".`);
    return saveCssFile(directory, `electron-${filename}.css`, style.textContent);
  }

  /**
   * Apply the default CSS styles for the window frame.
   * This includes the base styles for the frame container and optional theme styling.
   *
   * @param {boolean} [applyDefaultStyles=false] - If true, applies the full default styling. If false, applies only the root structure.
   */
  #applyDefaultStyles(applyDefaultStyles = false) {
    const root = document.createElement('style');
    root.id = 'electron-window-root-style';
    root.textContent = getDefaultWindowFrameRoot();

    document.head.prepend(root);
    this.#styles.root = root;
    if (!applyDefaultStyles) return;

    const style = document.createElement('style');
    style.id = 'electron-window-style';
    style.textContent = getDefaultWindowFrameStyle({
      getElementName: (className, extra, extra2) => this.getElementName(className, extra, extra2),
      fullscreenClass: this.#fullscreenClass,
      blurClass: this.#blurClass,
      maximizedClass: this.#maximizedClass,
    });

    document.head.prepend(style);
    this.#styles.default = style;
  }

  /**
   * Check the visibility of left and right menus.
   * Hides the menu if it has no children and shows if it has at least one.
   * 🔥 Internal use only.
   */
  #checkMenuVisibility() {
    const menuRight = this.#elements.menuRight;
    menuRight.style.display = menuRight.children.length === 0 ? 'none' : 'flex';
    const menuLeft = this.#elements.menuLeft;
    menuLeft.style.display = menuLeft.children.length === 0 ? 'none' : 'flex';
  }

  /**
   * Get the HTML container element by its name.
   *
   * @param {'rootContent'|'root'|'frame'|'top'|'menuLeft'|'menuRight'|'icon'|'title'|'topLeft'|'topCenter'|'topRight'} name - The name of the element to retrieve.
   * @returns {HTMLDivElement} - The corresponding HTMLDivElement.
   * @throws {Error} If the element name is invalid.
   */
  getHtml(name = 'rootContent') {
    if (
      typeof name !== 'string' ||
      !(name in this.#elements) ||
      !(this.#elements[name] instanceof HTMLElement)
    )
      throw new Error(
        `Invalid element name "${name}". Must be one of: ${Object.keys(this.#elements).join(', ')}`,
      );
    return this.#elements[name];
  }

  /**
   * Get one of the window control buttons (minimize, maximize, close) or the buttons container.
   *
   * @param {'root'|'maximize'|'minimize'|'close'} name - The name of the button or container.
   * @returns {HTMLButtonElement|HTMLDivElement} - The corresponding button or container.
   * @throws {Error} If the button name is invalid.
   */
  getButtonHtml(name) {
    if (
      typeof name !== 'string' ||
      !(name in this.#elements.buttons) ||
      !(
        this.#elements.buttons[name] instanceof HTMLButtonElement ||
        this.#elements.buttons[name] instanceof HTMLDivElement
      )
    )
      throw new Error(
        `Invalid button name "${name}". Must be one of: ${Object.keys(this.#elements.buttons).join(
          ', ',
        )}`,
      );
    return this.#elements.buttons[name];
  }

  /**
   * Add a custom HTML element to the left or right menu bar.
   *
   * @param {HTMLElement} element - The HTML element to add.
   * @param {'left'|'right'} [position='left'] - The position of the menu to insert the element.
   */
  addMenuCustomElement(element, position = 'left') {
    const menu = this.getMenuElement(position);
    menu.appendChild(element);
    this.#checkMenuVisibility();
  }

  /**
   * Show the menu bar (left or right) with a fade-in effect.
   *
   * @param {'left'|'right'} [position='left'] - The menu position to show.
   */
  showMenu(position = 'left') {
    const menu = this.getMenuElement(position);
    menu.classList.remove('menu-fade-out');
    menu.classList.add('menu-fade-in');
    menu.style.display = 'flex';
  }

  /**
   * Hide the menu bar (left or right) with a fade-out effect.
   *
   * @param {'left'|'right'} [position='left'] - Defines which menu to hide.
   * @param {number} [fadeOutTime=200] - Duration of the fade-out effect in milliseconds. Must be a non-negative number.
   * @throws {TypeError} If fadeOutTime is not a valid number.
   * @throws {Error} If position is invalid.
   */
  hideMenu(position = 'left', fadeOutTime = 200) {
    // Validate fadeOutTime
    if (typeof fadeOutTime !== 'number' || !Number.isFinite(fadeOutTime) || fadeOutTime < 0)
      throw new TypeError(`fadeOutTime must be a non-negative number. Received: ${fadeOutTime}`);

    const menu = this.getMenuElement(position);
    menu.classList.remove('menu-fade-in');
    menu.classList.add('menu-fade-out');
    setTimeout(() => {
      menu.style.display = 'none';
    }, fadeOutTime);
  }

  /**
   * Get the menu DOM element (left or right).
   *
   * @param {'left'|'right'} [position='left'] - The position of the menu.
   * @returns {HTMLDivElement} - The menu container element.
   * @throws {Error} - If the position is invalid.
   */
  getMenuElement(position = 'left') {
    if (position !== 'left' && position !== 'right')
      throw new Error(`Invalid menu position "${position}". Allowed values are 'left' or 'right'.`);
    const menu =
      position === 'left'
        ? this.#elements.menuLeft
        : position === 'right'
          ? this.#elements.menuRight
          : null;

    if (!menu) throw new Error(`Invalid menu position "${position}" element.`);
    return menu;
  }

  /**
   * Add a button to the menu bar with optional dropdown and submenus.
   *
   * @param {string} label - The text label of the button.
   * @param {Object} [settings={}] - Button settings.
   * @param {(this: GlobalEventHandlers, ev: MouseEvent) => any} [settings.onClick] - Click event handler for the button.
   * @param {'left'|'right'} [settings.position='left'] - Menu position where the button will be placed.
   * @param {string} [settings.id] - Optional identifier.
   * @returns {HTMLButtonElement} - The created button element.
   * @throws {TypeError} If label is not a string.
   * @throws {TypeError} If onClick is not a function.
   * @throws {Error} If position is invalid.
   */
  addMenuButton(label, { onClick, position = 'left', id } = {}) {
    if (typeof label !== 'string' || !label.trim())
      throw new TypeError(`Label must be a non-empty string. Received: ${label}`);

    // Prepare data
    const menu = this.getMenuElement(position);
    const btn = document.createElement('button');
    btn.classList.add('menu-button');
    btn.textContent = label;
    if (id) btn.dataset.menuId = id;

    if (typeof onClick === 'function') btn.onclick = onClick;
    // Nothing
    else throw new TypeError(`onClick must be a function if no dropdown items are provided.`);

    // Complete
    menu.appendChild(btn);
    this.#checkMenuVisibility();
    return btn;
  }

  /**
   * Remove a menu button by its ID or by passing the HTMLElement itself.
   *
   * @param {string|HTMLElement} idOrElement - The button ID (from `data-menu-id`) or the button element itself.
   * @param {'left'|'right'} [position='left'] - Menu position to target.
   * @throws {TypeError} If idOrElement is not a string or HTMLElement.
   * @throws {Error} If position is invalid.
   */
  removeMenuButton(idOrElement, position = 'left') {
    const menu = this.getMenuElement(position);
    if (typeof idOrElement === 'string') {
      const el = menu.querySelector(`[data-menu-id="${idOrElement}"]`);
      if (el) el.remove();
    } else if (idOrElement instanceof HTMLElement) {
      menu.contains(idOrElement) && idOrElement.remove();
    } else
      throw new TypeError(`idOrElement must be a string or HTMLElement. Received: ${idOrElement}`);

    this.#checkMenuVisibility();
  }

  /**
   * Remove all elements from the menu bar (left or right).
   *
   * @param {'left'|'right'} [position='left'] - The menu position to clear.
   * @throws {Error} If position is invalid.
   */
  clearMenu(position = 'left') {
    const menu = this.getMenuElement(position);
    menu.innerHTML = '';
    this.#checkMenuVisibility();
  }

  /**
   * Change the window title text.
   *
   * @param {string} text - The new title to display.
   * @throws {TypeError} If text is not a string.
   */
  setTitle(text) {
    if (typeof text !== 'string') throw new TypeError(`Title must be a string. Received: ${text}`);
    this.#elements.title.textContent = text;
  }

  /**
   * Set or update the window icon image.
   *
   * @param {string} url - The URL of the image to use as the icon. Pass an empty string to remove the icon.
   * @throws {TypeError} If url is not a string.
   */
  setIcon(url) {
    if (typeof url !== 'string') throw new TypeError(`Icon URL must be a string. Received: ${url}`);

    if (url.length > 0) {
      this.#elements.icon.style.backgroundImage = `url(${url})`;
      this.#elements.topLeft.prepend(this.#elements.icon);
    } else this.removeIcon();
  }

  /**
   * Remove the current window icon from the title bar.
   */
  removeIcon() {
    if (this.#elements.topLeft.contains(this.#elements.icon)) this.#elements.icon.remove();
    this.#elements.icon.style.backgroundImage = '';
  }

  /**
   * Apply custom CSS to the document.
   *
   * @param {string} css - The CSS rules as a string.
   * @returns {HTMLStyleElement} - The created <style> element appended to the document head.
   * @throws {TypeError} If css is not a string.
   */
  applyCustomStyle(css) {
    if (typeof css !== 'string') throw new TypeError(`CSS must be a string. Received: ${css}`);
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    return style;
  }
}

export default TinyWindowFrameManager;
