# Playground: prism-code ready on open

Effect's playground installs the effect package in the background as soon as the page opens, so pressing Run starts right away. Prism Playground will do the same with prism-code.

## What changes
- Opening the playground starts installing prism-code at once. Visitors don't have to press Run first.
- The status shows "Installing prism-code", then "Ready" with a green dot.
- Run is available straight away. If it's pressed while the install is still going, the code runs as soon as the install finishes. There's no second install.
- The console shows a short line, "prism-code installed", so people know it's ready.
- If the install fails, a clear message appears with a Retry button.
- A faster install: progress output is hidden and the package lock is skipped.
- Editing package.json still triggers a reinstall on the next Run, as it does now.

## Technical details
- `src/playground/Playground.tsx`: right after the shell spawns, call a shared `install()` that runs `npm install --no-audit --no-fund --progress=false --prefer-offline` and stores its promise. `run()` awaits that promise and only reinstalls when package.json differs from what was installed.
- Status flow: starting → installing → ready, shown in the existing heading status.
- Check in the browser that a fresh tab installs on its own and the first Run prints output without reinstalling.
