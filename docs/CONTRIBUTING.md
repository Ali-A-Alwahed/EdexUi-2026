# Contributing to EdexUi-2026

Thanks for taking the time to contribute.

## Before You Start

- Keep the original eDEX-UI spirit and upstream credit intact.
- Prefer focused pull requests over large mixed changes.
- Avoid committing build output, `dist/`, or `node_modules/`.

## Local Setup

Requirements: **Node.js 22.12 or newer**.

```bash
npm install             # build tooling
npm run install-linux   # app dependencies + native node-pty rebuild
```

> On Windows use `npm run install-windows`. The rebuild step is required or the
> terminal will not start.

Run the app locally:

```bash
npm start
```

Run the tests and the dependency audit:

```bash
npm test
npm run audit
```

## Pull Request Expectations

- Describe what changed and why.
- Keep changes scoped to one feature or fix when possible.
- Update documentation when behavior changes.
- Preserve attribution to the original eDEX-UI project.
- Include screenshots for visible UI changes when helpful.

## Release Notes

If your change affects packaging, user-visible behavior, or compatibility, update the changelog or release notes in the same pull request.
