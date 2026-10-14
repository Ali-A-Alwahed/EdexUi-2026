import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

/**
 * Regression guards for fixes made during the 2026 upgrade.
 *
 * These are deliberately static checks: the runtime files are Electron
 * renderer/main scripts that cannot be imported outside an Electron runtime,
 * so the tests assert on their source to lock in the behaviour we fixed.
 */

describe('globe rendering', () => {
  it('does not build the globe from a zero-height placeholder', () => {
    const src = read('src', 'classes', 'locationGlobe.class.js');
    // The placeholder div uses height:0 with a padding-bottom aspect-ratio
    // hack, so offsetHeight is 0. Passing it straight into the Globe
    // constructor produced a 0-height canvas and a WebGL crash.
    expect(src).not.toMatch(
      /new this\.ENCOM\.Globe\(\s*placeholder\.offsetWidth\s*,\s*placeholder\.offsetHeight/
    );
  });

  it('derives the globe height from a non-zero width', () => {
    const src = read('src', 'classes', 'locationGlobe.class.js');
    expect(src).toMatch(/const width = placeholder\.offsetWidth/);
    expect(src).toMatch(/const height = Math\.round\(width\) \|\| 400/);
  });

  it('checks the renderer for WebGL support, not the Globe wrapper', () => {
    const src = read('src', 'classes', 'locationGlobe.class.js');
    // Globe wraps a THREE.WebGLRenderer; only the renderer exposes
    // context/supported, so a Globe-level check would always fail.
    expect(src).toMatch(/globeInstance\.renderer/);
    expect(src).toMatch(/renderer\.supported === false/);
  });

  it('guards every globe method so a missing globe is a no-op', () => {
    const src = read('src', 'classes', 'locationGlobe.class.js');
    const guarded = [
      'addRandomConnectedMarkers',
      'addTemporaryConnectedMarker',
      'removeMarkers',
      'removePins',
      'updateLoc',
      'updateConns',
    ];
    for (const method of guarded) {
      // Match the method definition at the start of a line, not a call site.
      // Arguments are optional: some methods take a parameter.
      const re = new RegExp(`^    ${method}\\(`, 'm');
      const m = re.exec(src);
      expect(m, `${method} should be defined`).not.toBeNull();
      const body = src.slice(m.index, m.index + 220);
      expect(body, `${method} should guard on isAvailable()`).toMatch(/isAvailable\(\)/);
    }
  });
});

describe('vendored three.js WebGL handling', () => {
  it('reports failure instead of dereferencing a null context', () => {
    const src = read('src', 'assets', 'vendor', 'encom-globe.js');
    // initGL used to log the failure and then fall through to
    // _gl.getExtension(...), which threw "Cannot read properties of null".
    expect(src).toMatch(/if \( initGL\(\) === false \)/);
    expect(src).toMatch(/this\.supported = false/);
    expect(src).toMatch(/this\.supported = true/);
  });

  it('returns false from initGL when no context can be created', () => {
    const src = read('src', 'assets', 'vendor', 'encom-globe.js');
    const init = src.slice(src.indexOf('function initGL()'));
    expect(init.slice(0, 1500)).toMatch(/return false/);
  });
});

describe('window state', () => {
  it('defaults to fullscreen for new installs', () => {
    const src = read('src', '_boot.js');
    expect(src).toMatch(/useFullscreen:\s*true/);
    expect(src).not.toMatch(/useFullscreen:\s*false/);
  });

  it('honours the remembered fullscreen preference', () => {
    const src = read('src', '_boot.js');
    expect(src).toMatch(/rememberedFullscreen/);
    expect(src).toMatch(/lockedFullscreen \|\| rememberedFullscreen/);
  });
});

describe('terminal exit handling', () => {
  it('quits the app when the main terminal closes', () => {
    const src = read('src', '_boot.js');
    const idx = src.indexOf('tty.onclosed');
    const block = src.slice(idx, idx + 400);
    expect(block).toMatch(/app\.quit\(\)/);
  });

  it('does not leave a dangling reference when closing an extra tty', () => {
    const src = read('src', '_boot.js');
    // term was nulled before term.wss.close(), which could throw.
    expect(src).toMatch(/const closing = term/);
    expect(src).not.toMatch(/term\.wss\.close\(\);\s*\n\s*extraTtys\[term\.port\]/);
  });
});

describe('renderer security', () => {
  it('locks down the content security policy', () => {
    const html = read('src', 'ui.html');
    expect(html).toMatch(/default-src 'none'/);
    expect(html).toMatch(/object-src 'none'/);
    expect(html).toMatch(/base-uri 'none'/);
    expect(html).not.toMatch(/script-src[^;]*unsafe-eval/);
  });

  it('blocks navigation and popups from the main window', () => {
    const src = read('src', '_boot.js');
    expect(src).toMatch(/setWindowOpenHandler/);
    expect(src).toMatch(/action:\s*"deny"/);
    expect(src).toMatch(/will-navigate/);
  });

  it('drops the removed enableRemoteModule flag', () => {
    const src = read('src', '_boot.js');
    expect(src).not.toMatch(/enableRemoteModule/);
  });
});

describe('dependency hygiene', () => {
  it('does not reference the retired repository owner', () => {
    const files = ['package.json', 'src/package.json'];
    for (const file of files) {
      expect(read(file), `${file} should not reference Ali-A-2026`).not.toMatch(/Ali-A-2026/);
    }
  });

  it('does not depend on nanoid', () => {
    const pkg = JSON.parse(read('src', 'package.json'));
    expect(pkg.dependencies).not.toHaveProperty('nanoid');
  });

  it('uses the scoped xterm packages', () => {
    const pkg = JSON.parse(read('src', 'package.json'));
    expect(pkg.dependencies).toHaveProperty('@xterm/xterm');
    expect(pkg.dependencies).toHaveProperty('@xterm/addon-fit');
    expect(pkg.dependencies).not.toHaveProperty('xterm');
  });

  it('targets a modern electron and node', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.dependencies.electron).toMatch(/\^4\d/);
    expect(pkg.engines.node).toMatch(/>=22/);
  });
});
