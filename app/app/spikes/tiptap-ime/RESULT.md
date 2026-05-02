# TipTap Chinese IME Spike — Result

**Status:** PENDING (user has not yet manually tested)

**To test:**
1. From `app/`, run `pnpm dev`
2. Open http://localhost:3000/spikes/tiptap-ime
3. Type `你好世界` using Sogou / Microsoft Pinyin / Mac built-in pinyin IME
4. Watch the event log. Confirm all four PASS criteria on the page.

**Outcome:**
- Date:
- Browser:
- IME:
- PASS / FAIL:
- Notes:

If FAIL → run plan #1 Task 8 (Lexical fallback): `pnpm remove @tiptap/*` + `pnpm add lexical @lexical/react @lexical/rich-text @lexical/history @lexical/utils`, replace this spike with Lexical equivalent, propagate the swap to plans #4 / #6 / #10 / #16.
