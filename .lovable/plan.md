# Blog post: Prism SDK v0.4 is here

## The post
- Title: "Describe it once. Run it anywhere." Subtitle: Prism SDK v0.4 is here.
- Category: Engineering. Date: November 12, 2026. Slug `prism-sdk-v0-4`. Shown first on /blog/ and in the homepage Highlights (top 3).
- Plain, jargon free, no dashes in visible text. Any needed term (Lean, spec, projection, holo) gets a one line explanation the first time.
- Why, how, what is applied without naming it:
  1. **Why: software you can't check.** AI writes code faster than anyone can review it. Every machine runs it a little differently. Trust rests on hope.
  2. **How: one spec, everything else is a projection.** Every Prism app is declared in a single LexLean spec, an English like description that is formally verified in Lean (a proof checker). The code and the screens are generated from that spec, never hand written.
  3. **The agent edits the spec, never the code.** The model (LLM) only writes and changes the LexLean spec; Prism regenerates the code. Nothing drifts, nothing is patched by hand.
  4. **Same result on every machine.** Same spec, same bytes, same fingerprint, from a phone at the edge to a cloud server.
  5. **The next step after Docker.** Docker packaged software so it ran the same everywhere. Prism packages the proof of what the software is. Side by side mapping table (Dockerfile to spec/model, image to holo, container to instance, `docker build` to `prism build`), using the existing vocabulary data so it matches the docs.
  6. **Serverless and self verifying.** No server, no account; an app checks its own fingerprint when it loads and refuses to run if anything changed.
  7. **What ships in v0.4:** short bullet list, taken only from the PrismPM repo and the prism-code `latest` package.
  8. **Start in one command:** `npx prism-code@latest setup`, copyable, with what it does (skill + MCP servers), then links to Docs, PrismPM on GitHub and Discord.

## Visual examples
- **Diagram 1, "One spec, many projections":** a spec card in the middle with arrows to Code, UI, Proof, Fingerprint.
- **Diagram 2, "Who edits what":** LLM writes to Spec (allowed), LLM to Code (crossed out), Spec to Code (generated).
- **Diagram 3, "Docker then, Prism now":** two column comparison table.
- **Diagram 4, "Edge to cloud":** the same fingerprint shown on laptop, phone, server.
- A short spec snippet next to the generated code, labelled "you edit this" / "never touched".
- All diagrams are built in the page with site styles (crisp, theme aware, readable by agents as text), not images. A generated graphite cover image matches the other posts.

## Accuracy
- Every factual claim (what v0.4 contains, which commands exist, the Lean verification) is checked against the PrismPM repo and the published package before writing. Anything not shipped yet is labelled "coming" with its milestone, consistent with the release status used in the docs.

## Technical details
- Add the post at the top of `POSTS_DATA` in `src/blog/posts.data.ts`; diagrams via marker lines (e.g. `<!-- figure:projections -->`) rendered by `Blog.tsx` as styled blocks, and as plain text or tables in the `.md` twin via `postMarkdown`.
- Cover via imagegen into `src/assets/blog/prism-sdk-v0-4.jpg`, registered in `covers.ts`; add to homepage `POSTS` highlights.
- Figure styles in `src/index.css` with existing tokens and type roles.
- Update `blog.test.ts` post count; RSS, llms files and `.md` twin come from the existing plugin; emit-pages covers /blog/ routes already.

## Verification
Open the post at desktop and phone widths, check every diagram, the copy button and the `.md` twin, run blog and copy tests, confirm a clean build.
