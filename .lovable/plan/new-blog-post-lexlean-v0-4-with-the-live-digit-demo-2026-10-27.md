# New blog post: LexLean v0.4, with the live digit demo

## The post
- Title: "Write it once. Read it, prove it, run it." Subtitle line: LexLean v0.4 is here.
- Category: Engineering. Date: October 27, 2026. Slug `lexlean-v0-4`.
- Written for someone who has never heard of LexLean. No jargon; any term that is needed (proof checker, Rust, fingerprint) gets a one line plain explanation. No dashes in visible text.
- Structure follows why, how, what without naming it:
  1. **The problem** (why): papers describe software, code does something else, and nobody can easily check that the two match.
  2. **One source, three results** (how): you write in a careful, English like language; LexLean turns that into a readable paper, a machine checked proof, and a working program, all proven to say the same thing. Short diagram style list.
  3. **Evidence, not belief**: only `verify` can claim something is verified; every claim has a test; missing parts are reported openly.
  4. **What is new in v0.4** (what): from proving theorems to building real programs; tight bullet list of what ships, in plain words.
  5. **See it work: a digit reader you can check** with the demo embedded right here, a caption explaining that the page refuses to run unless its fingerprint matches.
  6. **Honest scorecard**: a small table, Proved / Measured / Not yet (98.92% accuracy matching the reference, 8.7 ms vs 66 µs per image, overflow checked at runtime, not proved).
  7. **How it compares**, briefly: proof tools you program inside vs code with contracts vs LexLean's single document chain; where others still win.
  8. **Try it**: links to the LexLean and MNIST GitHub repos, plus Discord.
- Facts come only from the two uploaded notes; I will not add claims.

## The embedded demo
- The uploaded demo page is served from this site and shown inside the post in a framed, graphite styled panel (draw a digit, see the answer), with an "Open full screen" link. Works on phones (touch drawing is already supported).
- Agents' Markdown copy of the post gets a link to the demo instead of the embed.

## Cover
- A generated cover in the blog's existing style: a dark graphite image of one document splitting into three outputs (page, proof, program).

## Technical details
- Copy `mnist-demo.html` unchanged to `public/blog/lexlean-v0-4/mnist-demo.html` (unchanged so its self check fingerprint still matches).
- Add the post at the top of `POSTS_DATA` in `src/blog/posts.data.ts`; body uses a marker line (e.g. `<!-- demo:mnist -->`) that `Blog.tsx` replaces with a sandboxed `<iframe>` (`sandbox="allow-scripts"`, fixed aspect, lazy loaded); `postMarkdown` replaces it with a link.
- Cover via imagegen into `src/assets/blog/`, registered in `covers.ts`.
- Add `.bl-demo` styles in `src/index.css` using existing tokens.
- Update `blog.test.ts` count to 10; RSS, llms files and `.md` twin come from the existing plugin automatically.

## Verification
Open the post at desktop and phone widths, draw a digit in the embed and confirm it classifies, check the `.md` twin, run blog and copy tests, confirm a clean build.
