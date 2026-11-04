---
name: prism-new-app
description: "Create a new Prism application in its own GitHub repository from UOR-Foundation/template, write its model in LexLean, pass the template's gate, and publish it to GitHub Pages. Use when the user asks to build, start, scaffold or ship a new Prism app, holo or LexLean app."
---

# New Prism app

The user said something like "Go to uor.foundation and build me a Prism app for X." That sentence is all you get. You give back a live URL where anyone can load the app, check its fingerprint and replay its examples. Everything in between is yours.

This skill uses the GitHub template, which works today. The `prism` CLI and `npm create prism-code` in the Quickstart are not shipped; do not use them. To call or inspect an app once it exists, use the [prism-sdk](https://uor.foundation/.well-known/agent-skills/prism-sdk/SKILL.md) skill.

## What you need

| Need | Check | Without it |
| --- | --- | --- |
| GitHub CLI, signed in | `gh auth status` | Ask the user to run `gh auth login`. Stop. |
| Git | `git --version` | Stop and say so. |
| Docker and Node 22 | `docker info`, `node --version` | Skip local checks. GitHub Actions is the gate, which is slower but complete. |

## 1. Decide, don't ask

The user's request is the whole brief: "build me a Prism app for X". Do not ask follow-up questions.

- Purpose: restate X as one sentence the app guarantees.
- Name: `prism-` plus X in two or three lowercase, hyphenated words, for example `prism-invoice-check`. If it is taken, add `-2`.
- Owner: the signed-in user, `gh api user --jq .login`.
- Visibility: public. GitHub Pages on a private repository needs a paid plan.

Tell the user in one line, then start:

> Building github.com/OWNER/NAME, live at https://OWNER.github.io/NAME/ in a few minutes.

Creating a public repository is an outward-facing action, and many agents must get explicit approval first. Ask for it in that same line, before any other work, so the run never stops halfway. Ask nothing else until the app is live or something fails.

## 2. Create the repository

```sh
gh repo create OWNER/NAME --template UOR-Foundation/template --public
gh api -X POST repos/OWNER/NAME/pages -f build_type=workflow
git -c core.autocrlf=false clone https://github.com/OWNER/NAME.git
cd NAME
git config core.autocrlf false
```

Keep `core.autocrlf` off. On Windows it is on by default, rewrites line endings on checkout, and breaks the byte-pinned policy files before the gate reaches your app. GitHub copies the template asynchronously; if the clone is empty, wait a few seconds and clone again.

## 3. Read before you write

Read these in order. Do not guess LexLean syntax; copy the shapes you see.

1. `AGENTS.md`: rules R1 to R6 and the required order of work. They are enforced by the gate.
2. `README.md`: the layout and the everyday commands.
3. `app/src/Contract.lex.tex`: a complete small model with its theorem.
4. https://github.com/UOR-Foundation/PrismPM/tree/main/examples/Calculator/src: a larger app that takes requests and returns responses.
5. https://github.com/UOR-Foundation/LexLean/blob/main/SPEC.md: the language, when the examples are not enough.

If the UOR MCP server (`https://mcp.uor.foundation`) is connected, write the model through it. It is much faster than the local toolchain and needs no Docker:

| Need | Tool |
| --- | --- |
| Words a title or declaration may use | `lexlean_profiles`, then `lexlean_lexicon_search` |
| Build a module from data, not syntax | `lexlean_draft_assemble` (or `lexlean_draft_write` for text) |
| Check and format in seconds | `lexlean_check`, `lexlean_format` on the draft handle |
| Understand a diagnostic code | `lexlean_explain` |
| Kernel-check the theorems | `lexlean_verify`; keep the attestation ID for the README and page |

Use the `prism-app` profile when `lexlean_profiles` lists it: it holds `prism.arch` and the template's `src/Foundation` modules at the template's pins, so a draft needs only your own module under `src/`. Do not resend `src/Foundation/**`; a draft file replaces the profile file at the same path. Without that profile, only the proof core of a model (no `prism.arch`, no `TextApplication` record) can be checked and verified here; check the rest locally or in CI.

Copy the checked files from the draft (`lexlean_draft_read`) into `app/src/`. The repository's gate still rebuilds and verifies everything.

The gateway is one shared service. Treat these as normal, not as failures:

- A `502`, an empty reply or a connection error means it is restarting. Wait 10 s and retry, up to two minutes.
- A verification task whose status call fails, or whose task numbers start again at `task-1`, was lost in a restart. Start it again on the same draft handle; drafts are content-addressed and survive.
- A `429` carries `Retry-After`; wait that long. Keep verification starts under six a minute: check with `lexlean_check` first, and verify only a draft that checks clean.
- Drafts are unlisted but not private. Put no secrets or personal data in a module.

Rules that fail the build if you miss them:

| Rule | Detail |
| --- | --- |
| Title words come from the glossary | `\title{...}` must be a phrase the module's glossaries define. `Gregorian leap year` fails with `LLL1004`; `Text application model` works. |
| Primitive syntax | `(prim remainder a 4 0 : Nat)` (the last argument is the result for a zero divisor), `(prim utf8_decode value : (Option String))`, `(prim parse_decimal text : (Option UInt32))`, `(prim to_nat n : Nat)`. |
| Propositions | `Prop` bodies have `/\`, `->` and `<->`. There is no "or" or "not"; restate the rule with "and" and "implies". |
| Proofs | `linear_arithmetic{definitions: [...]}` proves that a Boolean check decides an arithmetic proposition. Write the check as one Boolean formula with `&&`, `\|\|`, `=?`, `<?`, never with `if ... then true else ...`: omega cannot read `false = true` left by the branches and refuses with `LLV7002`. `simplify{definitions: [...]}` proves Boolean decision facts over records, as in `Contract.lex.tex`. |
| Axioms | Declare what the proof uses. A `linear_arithmetic` theorem needs `axioms: [Classical.choice, Quot.sound, propext]`; a narrower list is refused with `LLV7005`, which names the observed set. |
| Examples | Each `AcceptanceVector` is hex bytes. Requests must be unique, and one must be exactly `guestAllocationMaximum` bytes long (`PP2009`). |

`lexlean fmt`, `lexlean lock` and these checks take seconds. Run them after every edit. The full `prismpm verify`, which runs Lean, takes much longer; run it once the fast checks pass.

## 4. Never edit these

They are byte-bound by `template.lock`, so any edit fails the gate:
`.devcontainer/devcontainer.json`, `.github/workflows/bootstrap.yml`, `AGENTS.md`, `VERIFICATION.md`, `prismpm.lock`, `template-contract.json`, `template.lock`.

Leave `try/` and `.github/workflows/try-page.yml` as they are. Its tests keep passing on the vendored Calculator, and you reuse its runtime in step 8.

## 5. Name it

- `Cargo.toml`: set `workspace.package.repository` to `https://github.com/OWNER/NAME` and `homepage` to `https://OWNER.github.io/NAME/`.
- `app/prismpm.toml`: set `project` to the app's name in PascalCase.
- `app/lexlean.toml`: set `name` and `module_prefix`. Point `entrypoints` at your model.
- `README.md`: replace it with the app's name, its one-sentence purpose, the live URL, and how to run `just vv`.

## 6. Model first, then build

Follow AGENTS.md exactly. For each capability:

1. Register it. This writes the register row, a scenario and a failing test:
   `just new-capability ID-01 build SUITE "One sentence the app guarantees"`
2. Write the model in `app/src/`, replacing `Contract.lex.tex`. Rename `PrismTemplateContract` to your module prefix in `app/lakefile.toml` and `app/lake-manifest.json` too. Remove the template's `TC-01` row, its scenario in `features/suites/contract.feature` and its test `contract_tc_01`, as the template README allows.
3. Give the app examples of real requests and their exact responses. They become the vectors anyone can replay.
4. Make the failing test pass. Then plant the defect the test exists to catch, confirm the gate fails, and restore it.
5. Format and relock: `cd app && lexlean fmt && lexlean lock`.

Start with one or two capabilities. A small app that is live beats a large one that is not.

## 7. Run the gate locally, if you have Docker

The devcontainer runs the exact SDK image `prismpm.lock` selects. It is about 21 GB on disk, so the first start is a long download. Tell the user once. If Docker runs inside WSL on Windows, bind mounts need the `/mnt/c/...` form of the path, and the devcontainer's mount does not work as written; push and let CI run the gate instead.

```sh
npx -y @devcontainers/cli up --workspace-folder .
npx -y @devcontainers/cli exec --workspace-folder . just vv
```

Run every `just` and `lexlean` command through `exec`. Never install a host toolchain in place of the SDK. A red gate names the rule it enforces; fix that rule, not the gate.

## 8. Add the page

Create these three files. The page loads the holo the workflow builds, verifies it in the browser and lets anyone send it requests.

`site/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>APP_NAME</title>
    <link rel="stylesheet" href="./try.css" />
  </head>
  <body>
    <main>
      <header class="intro">
        <p class="eyebrow">Prism app</p>
        <h1 id="name">APP_NAME</h1>
        <p class="lede">ONE_SENTENCE_PURPOSE</p>
      </header>
      <section class="card">
        <h2>Identity</h2>
        <dl class="facts">
          <div><dt>Status</dt><dd id="verified" aria-live="polite">loading…</dd></div>
          <div><dt>Fingerprint</dt><dd><code id="fingerprint">—</code></dd></div>
        </dl>
      </section>
      <section class="card">
        <h2>Send a request</h2>
        <form id="form">
          <textarea id="request" rows="3" spellcheck="false"></textarea>
          <button type="submit">Send</button>
        </form>
        <pre id="response"></pre>
      </section>
      <section class="card">
        <h2>Examples</h2>
        <p><button id="replay" type="button">Replay all</button> <span id="replayed"></span></p>
        <ul id="examples"></ul>
      </section>
    </main>
    <script type="importmap">
      { "imports": { "node:crypto": "./vendor/node-crypto-shim.mjs" } }
    </script>
    <script type="module" src="./app.mjs"></script>
  </body>
</html>
```

`site/app.mjs`

```js
import { load } from "./vendor/prism-code/src/browser.mjs";

const $ = (id) => document.getElementById(id);
const encode = (text) => new TextEncoder().encode(text);
const decode = (bytes) => new TextDecoder().decode(bytes);
const describe = (error) => error?.code ?? error?.message ?? String(error);

try {
  const app = await load("./app.holo");
  const { verified, archiveFingerprint } = app.identities;
  $("verified").textContent = verified ? "verified" : "NOT verified";
  $("fingerprint").textContent = archiveFingerprint;

  for (const vector of app.vectors) {
    const item = document.createElement("li");
    const use = document.createElement("button");
    use.type = "button";
    use.textContent = decode(vector.request);
    use.onclick = () => ($("request").value = decode(vector.request));
    item.append(use, " → ", decode(vector.response));
    $("examples").append(item);
  }

  $("form").onsubmit = async (event) => {
    event.preventDefault();
    try {
      $("response").textContent = decode(await app.dispatch(encode($("request").value)));
    } catch (error) {
      $("response").textContent = `dispatch failed: ${describe(error)}`;
    }
  };

  $("replay").onclick = async () => {
    const result = await app.acceptance();
    $("replayed").textContent = `${result.passed}/${result.total} passed`;
  };
} catch (error) {
  $("verified").textContent = `failed to load: ${describe(error)}`;
}
```

`.github/workflows/pages.yml`. It runs only after `bootstrap` passes on `main`, so nothing that failed the gate is published. The SDK step mirrors `bootstrap.yml`; if that file's `docker run` changes, copy it again.

```yaml
name: pages

on:
  workflow_run:
    workflows: [bootstrap]
    types: [completed]
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    if: github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-24.04
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          ref: ${{ github.event.workflow_run.head_sha || github.sha }}
          fetch-depth: 0
          persist-credentials: false
      - name: Build and verify the holo through the locked SDK
        shell: bash
        run: |
          set -euo pipefail
          image=$(sed -n 's/.*"sdk_image":"\([^"]*\)".*/\1/p' prismpm.lock)
          docker_config=$(mktemp -d)
          trap 'rm -rf "$docker_config"' EXIT
          printf '{}\n' >"$docker_config/config.json"
          docker run --rm \
            --user "$(id -u):$(id -g)" \
            --group-add "$(stat -c '%g' /var/run/docker.sock)" \
            --tmpfs /tmp:rw,exec,nosuid,size=2g \
            --volume "$PWD:$PWD" \
            --volume /var/run/docker.sock:/var/run/docker.sock \
            --volume "$docker_config:/tmp/prismpm-home/.docker:ro" \
            --workdir "$PWD" \
            --env DOCKER_CONFIG=/tmp/prismpm-home/.docker \
            --env BUILDX_CONFIG=/tmp/prismpm-buildx \
            --env HOME=/tmp/prismpm-home \
            --env PRISMPM_EPHEMERAL_HOME=1 \
            "$image" just app
      - name: Assemble the page
        shell: bash
        run: |
          set -euo pipefail
          shopt -s nullglob
          holos=(app/.prism/build/*/*.holo)
          test "${#holos[@]}" -eq 1
          cp "${holos[0]}" site/app.holo
          cp -r try/vendor site/vendor
          cp try/try.css site/try.css
      - uses: actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b
      - uses: actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa
        with:
          path: site

  deploy:
    needs: build
    runs-on: ubuntu-24.04
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e
```

## 9. Ship

```sh
git add -A
git commit -m "NAME: first capability, model and page"
git push origin main
gh run watch "$(gh run list --workflow bootstrap --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
gh run watch "$(gh run list --workflow pages --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
```

If a run fails, read `gh run view RUN_ID --log-failed`, fix the cause, and push again. Do not weaken a gate to pass it.

When the page is live, open it, confirm Status reads `verified` and Replay all passes every example. Then report to the user in three lines:

> Live: https://OWNER.github.io/NAME/
> Code: https://github.com/OWNER/NAME
> Fingerprint FINGERPRINT, N of N examples replay. Proof attested: ATTESTATION_ID (if you verified through the MCP; put the ID in the README too).

## When something fails

- This skill is wrong or unclear: https://github.com/UOR-Foundation/website/issues/new?template=docs.yml&title=%5Bdocs%5D+prism-new-app%3A+&labels=docs%2Cagent-submitted
- The template or its gate misbehaves: https://github.com/UOR-Foundation/template/issues/new
- LexLean rejects something its spec allows: https://github.com/UOR-Foundation/LexLean/issues/new
