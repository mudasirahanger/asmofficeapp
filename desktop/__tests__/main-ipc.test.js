/**
 * Regression test for D-3: main.js must restrict window.open()/new-window
 * behavior and block navigation away from the packaged app:// origin.
 *
 * We mock the 'electron', 'electron-serve', and 'electron-updater' modules
 * so main.js's top-level bootstrap code (which runs immediately on require)
 * can execute without a real Electron runtime, then assert the navigation
 * hardening is actually wired into the created BrowserWindow.
 */

const mockWebContents = {
  setWindowOpenHandler: jest.fn(),
  on: jest.fn(),
  send: jest.fn(),
  reload: jest.fn(),
};

const mockWindowInstance = {
  webContents: mockWebContents,
  on: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  focus: jest.fn(),
  isMinimized: jest.fn(() => false),
  isVisible: jest.fn(() => true),
  restore: jest.fn(),
};

jest.mock('electron', () => ({
  app: {
    setAppUserModelId: jest.fn(),
    requestSingleInstanceLock: jest.fn(() => true),
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
    quit: jest.fn(),
  },
  BrowserWindow: Object.assign(
    jest.fn(() => mockWindowInstance),
    { getAllWindows: jest.fn(() => [mockWindowInstance]) }
  ),
  ipcMain: { on: jest.fn(), handle: jest.fn() },
  Notification: jest.fn(() => ({ on: jest.fn(), show: jest.fn() })),
  Tray: jest.fn(() => ({ setToolTip: jest.fn(), setContextMenu: jest.fn(), on: jest.fn() })),
  Menu: { buildFromTemplate: jest.fn(() => ({})) },
  nativeImage: { createFromPath: jest.fn(() => ({ resize: jest.fn(() => ({})) })) },
  shell: { openExternal: jest.fn() },
}));

jest.mock('electron-serve', () => jest.fn(() => jest.fn()));

jest.mock('electron-updater', () => ({
  autoUpdater: {
    autoDownload: true,
    checkForUpdates: jest.fn(),
    downloadUpdate: jest.fn(),
    quitAndInstall: jest.fn(),
    on: jest.fn(),
  },
}));

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

describe('main.js navigation hardening (D-3 regression)', () => {
  let mainModule;

  beforeAll(async () => {
    mainModule = require('../main.js');
    // app.whenReady().then(() => { createWindow(); ... }) resolves async.
    await flushMicrotasks();
    await flushMicrotasks();
  });

  it('registers a window-open handler on the created window', () => {
    expect(mockWebContents.setWindowOpenHandler).toHaveBeenCalledTimes(1);
  });

  it('denies new-window requests and does not open them in-process', () => {
    const handler = mockWebContents.setWindowOpenHandler.mock.calls[0][0];
    const result = handler({ url: 'https://example.com' });
    expect(result).toEqual({ action: 'deny' });
  });

  it('registers a will-navigate guard on the created window', () => {
    const calls = mockWebContents.on.mock.calls.map(([eventName]) => eventName);
    expect(calls).toContain('will-navigate');
  });

  describe('white-screen diagnostics/recovery (D-16 regression)', () => {
    it('registers did-fail-load, did-finish-load, and render-process-gone handlers', () => {
      const calls = mockWebContents.on.mock.calls.map(([eventName]) => eventName);
      expect(calls).toContain('did-fail-load');
      expect(calls).toContain('did-finish-load');
      expect(calls).toContain('render-process-gone');
    });

    it('registers unresponsive/responsive handlers on the window itself', () => {
      const calls = mockWindowInstance.on.mock.calls.map(([eventName]) => eventName);
      expect(calls).toContain('unresponsive');
      expect(calls).toContain('responsive');
    });

    it('reloads once on a real load failure but not on ERR_ABORTED (-3)', () => {
      const failHandler = mockWebContents.on.mock.calls.find(([e]) => e === 'did-fail-load')[1];
      mockWebContents.reload.mockClear();

      failHandler({}, -3, 'ERR_ABORTED', 'app://-/index.html');
      expect(mockWebContents.reload).not.toHaveBeenCalled();

      failHandler({}, -6, 'ERR_FILE_NOT_FOUND', 'app://-/index.html');
      expect(mockWebContents.reload).toHaveBeenCalledTimes(1);
    });

    it('reloads when the renderer process goes away for a non-clean reason', () => {
      const goneHandler = mockWebContents.on.mock.calls.find(([e]) => e === 'render-process-gone')[1];
      mockWebContents.reload.mockClear();

      goneHandler({}, { reason: 'crashed' });
      expect(mockWebContents.reload).toHaveBeenCalledTimes(1);

      mockWebContents.reload.mockClear();
      goneHandler({}, { reason: 'clean-exit' });
      expect(mockWebContents.reload).not.toHaveBeenCalled();
    });
  });

  describe('isAllowedNavigationTarget', () => {
    it('allows the packaged app:// origin', () => {
      expect(mainModule.isAllowedNavigationTarget('app://-/index.html')).toBe(true);
    });

    it('blocks http(s) and other external origins', () => {
      expect(mainModule.isAllowedNavigationTarget('https://evil.example.com')).toBe(false);
      expect(mainModule.isAllowedNavigationTarget('http://localhost:9999')).toBe(false);
      expect(mainModule.isAllowedNavigationTarget('file:///etc/passwd')).toBe(false);
    });

    it('blocks malformed URLs rather than throwing', () => {
      expect(mainModule.isAllowedNavigationTarget('not a url')).toBe(false);
    });
  });
});
