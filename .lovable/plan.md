

## Move "What is your main focus today?" into the input placeholder and remove the heading

### Change
In `src/modules/oracle/components/ImmersiveSearchView.tsx`, remove the `<p>` heading on lines 174-176 that displays "What is your main focus today?" above the search input. The placeholder text on the input (line 189) already says the same thing — so we just delete the duplicate heading paragraph and its `mb-4` spacing.

### File: `src/modules/oracle/components/ImmersiveSearchView.tsx`
- **Delete** lines 174-176 (the `<p className="text-white/60 ...">What is your main focus today?</p>`)
- The input's `placeholder="What is your main focus today?"` on line 189 already has it — no other changes needed

Single-line edit, one file.

