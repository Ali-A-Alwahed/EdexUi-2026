# Credits and Attribution

EdexUi-2026 is a **maintained continuation** of the original **eDEX-UI**
project. It is a derivative work and is distributed under the
[GNU General Public License v3.0 or later](../LICENSE).

## Original project

- **eDEX-UI** — created by **Gabriel "Squared" Saillard**
  - Upstream repository: <https://github.com/GitSquared/edex-ui>
  - Licensed under GPL-3.0-or-later

EdexUi-2026 would not exist without the original eDEX-UI codebase. All of the
core ideas, the visual language, the module layout and the bulk of the
implementation originate there.

## Current maintainer

- **Ali-A-Alwahed** — 2026 maintainer of this continuation
  - <https://github.com/Ali-A-Alwahed>
  - <https://github.com/Ali-A-Alwahed/EdexUi-2026>

## Special thanks

- **Rob "arscan" Scanlon** — author of the ENCOM Globe fork bundled in
  `src/assets/vendor/encom-globe.js`
- **Hyder6112** — for early contributions and help reviving the project
- **Ahmed Adnan** — for patches, packaging fixes and continued support

## What this continuation changed

The fork keeps the original experience intact and focuses on keeping the
project usable on current systems:

- Rebuilt against **Electron 44** and current Node.js
- Migrated the terminal stack to the supported **`@xterm/*`** packages
- Replaced the abandoned `nanoid` dependency with the built-in
  `crypto.randomUUID()`
- Fixed the 3D globe failing to start on a zero-sized canvas
- Defaulted the window to fullscreen and made `exit` in the main terminal
  close the application
- Replaced dead scaffolding (a non-functional React/Vite shell, a duplicate
  `legacy-src/` snapshot and a broken submodule manifest)
- Added a regression test suite and continuous integration
- Hardened the renderer: locked-down CSP, blocked navigation and popups

## Third-party components

Vendored and bundled third-party code keeps its own licence:

| Component | Licence | Notes |
| --- | --- | --- |
| ENCOM Globe (`src/assets/vendor/encom-globe.js`) | MIT | Fork by Rob "arscan" Scanlon of the Encom Globe; bundles three.js (MIT) |
| [@xterm/xterm](https://xtermjs.org) and `@xterm/addon-*` | MIT | Terminal emulator |
| [xterm-addon-ligatures](https://github.com/xtermjs/xterm.js) | MIT | Programming ligatures (unscoped package, see `src/package.json`) |
| [node-pty](https://github.com/microsoft/node-pty) | MIT | Pseudo-terminal |
| [systeminformation](https://github.com/seh-msft/systeminformation) | MIT | Hardware stats |
| [pdfjs-dist](https://mozilla.github.io/pdf.js/) | Apache-2.0 | PDF reader module |
| [smoothie](http://smoothiecharts.com/) | MIT | Network graphs |
| [Howler.js](https://howlerjs.com) | MIT | Audio |
| [maxmind](https://github.com/maxmind/node-maxmind) | MIT | GeoIP lookups |
| [Electron](https://electronjs.org) | MIT | Runtime |
| file-icons mapping data (`src/assets/icons/`) | MIT / CC-BY-SA | Icon metadata |

Run `npm run audit` to review the current dependency advisory status.
