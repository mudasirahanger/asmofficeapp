/**
 * Regression test for D-7 / the "no bare ipcRenderer exposure" security rule.
 *
 * preload.js must only ever expose a narrow, named API surface through
 * contextBridge.exposeInMainWorld — never the raw ipcRenderer object (which
 * would let renderer code send/receive on arbitrary IPC channels).
 */

describe('preload.js', () => {
  let exposedKey;
  let exposedApi;

  beforeEach(() => {
    jest.resetModules();
    exposedKey = undefined;
    exposedApi = undefined;

    jest.doMock('electron', () => ({
      contextBridge: {
        exposeInMainWorld: jest.fn((key, api) => {
          exposedKey = key;
          exposedApi = api;
        }),
      },
      ipcRenderer: {
        send: jest.fn(),
        invoke: jest.fn(),
        on: jest.fn(),
      },
    }));

    require('../preload.js');
  });

  it('exposes exactly one named bridge on window', () => {
    expect(exposedKey).toBe('electronAPI');
    expect(exposedApi).toBeDefined();
  });

  it('never exposes the raw ipcRenderer object itself', () => {
    const values = Object.values(exposedApi);
    // None of the exposed members may *be* the ipcRenderer module (that
    // would hand the renderer send/on access to every IPC channel).
    values.forEach((value) => {
      expect(value).not.toHaveProperty('send');
      expect(value).not.toHaveProperty('invoke');
    });
    expect(exposedApi.ipcRenderer).toBeUndefined();
  });

  it('exposes only the documented, narrowly-scoped API surface', () => {
    expect(Object.keys(exposedApi).sort()).toEqual(
      [
        'sendNotification',
        'checkForUpdates',
        'downloadUpdate',
        'installUpdate',
        'onUpdateAvailable',
        'onUpdateDownloaded',
        'onUpdateError',
      ].sort()
    );
    Object.values(exposedApi).forEach((fn) => {
      expect(typeof fn).toBe('function');
    });
  });
});
