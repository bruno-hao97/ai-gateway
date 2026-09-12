import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { tryHybridLocaleSwitch } from './playground-locale-bridge.ts';

type WindowStub = Window & {
  __hybridLocaleApplied?: boolean;
};

function withWindow(pathname: string, run: () => void) {
  const prev = globalThis.window;
  const storage = new Map<string, string>();
  const win = {
    location: {
      pathname,
      origin: 'http://localhost:5173',
      search: '',
      hash: '',
    },
    history: {
      replaceState: () => {},
    },
    localStorage: {
      setItem: (key: string, value: string) => storage.set(key, value),
      getItem: (key: string) => storage.get(key) ?? null,
    },
    dispatchEvent: () => true,
    __hybridLocaleApplied: false,
  } as WindowStub;
  globalThis.window = win;
  try {
    run();
  } finally {
    globalThis.window = prev;
  }
}

describe('tryHybridLocaleSwitch', () => {
  afterEach(() => {
    globalThis.window = undefined as unknown as Window & typeof globalThis;
  });

  it('allows same-path query navigation on app shell (Activity drill-down)', () => {
    withWindow('/app/activity/', () => {
      const blocked = tryHybridLocaleSwitch(
        '/app/activity/?tab=explore&model=imagegen_2_0',
        '/app/activity/',
      );
      assert.equal(blocked, false);
    });
  });

  it('allows same locale hybrid path with only period query change', () => {
    withWindow('/app/activity/', () => {
      const blocked = tryHybridLocaleSwitch('/app/activity/?period=7d', '/app/activity/');
      assert.equal(blocked, false);
    });
  });

  it('blocks EN → VI locale switch on the same app page', () => {
    withWindow('/app/activity/', () => {
      const blocked = tryHybridLocaleSwitch('/vi/app/activity/', '/app/activity/');
      assert.equal(blocked, true);
    });
  });

  it('ignores non app-shell routes', () => {
    withWindow('/quickstart', () => {
      const blocked = tryHybridLocaleSwitch('/vi/quickstart', '/quickstart');
      assert.equal(blocked, false);
    });
  });
});
