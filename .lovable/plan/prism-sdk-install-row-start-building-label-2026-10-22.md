# Prism SDK install row: "Start building" label

In the Prism SDK section, the install row under the two buttons changes to:

```text
Start building            [ $ npm install prism-code  ⧉ ]
```

- A "Start building" label on the left, in the same muted body text style as the line above it.
- The npm pill moves right but stays inside the text column, so its right edge lines up with the end of the description text.
- On phones the label sits above the pill so neither one gets squashed.
- Nothing else changes: the copy button, the wording and the buttons stay as they are.

## Technical details
- Edit the install row in the Prism section of `src/site/FoundationHome.tsx` and put it in a flex row with `justify-between`, `items-center` and `max-w` matched to the description paragraph.
- Add the label text to `FRAMEWORK` in `src/site/content.ts`.
- Check it in the browser at desktop and phone widths.
