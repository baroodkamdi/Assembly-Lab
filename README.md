# AssemblyLab — The Reverse Engineer's Journey

An independent, static GitHub Pages project for learning assembly language, practicing instruction reasoning, and exploring reverse-engineering concepts. Not affiliated with IYSecurity.

## Features

- **Game Hub:** player level, XP, progress meter, daily mission, achievements, and 14 learning worlds with level-based unlocks.
- **Challenge Arena:** locally generated, template-based questions about register arithmetic, bitwise operations, branches, effective addresses, instruction roles, and analyst reasoning.
- **Local progress:** XP, solved challenge IDs, practice streak, badges, visited worlds, and daily completion are stored in the visitor's browser using `localStorage`.
- **Learn assembly:** guided lessons, annotated examples, knowledge checks, and lesson completion tracking.
- **Malware patterns:** behavior-oriented annotated examples, API references, investigation pointers, and ATT&CK context notes.
- **Assembly explanation:** rule-based explanations for common x86/x64 instructions pasted from Ghidra, IDA, WinDbg, or other disassemblers.
- **Godbolt practice:** opens Compiler Explorer separately for optional compiler experiments; AssemblyLab does not embed or execute native assembly.

## Run locally

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Publish on GitHub Pages

1. Create a separate repository for AssemblyLab.
2. Upload `index.html`, `styles.css`, `data.js`, `app.js`, `game.js`, `README.md`, `LICENSE`, and `.nojekyll` to the repository root.
3. Open **Settings → Pages**.
4. Select **Deploy from a branch**, choose `main` and `/(root)`, then save.

## Privacy and architecture

- No backend, account system, PAT, API secret, or build step is required.
- The project writes progress only to the local browser storage. Clearing site data can remove progress; another browser/device will have a separate profile.
- Local XP and badges are for personal learning, not tamper-proof competitive rankings.
- Godbolt opens as a separate site. Do not paste private code, proprietary source, or real malware samples into third-party services.

## Important limitations

This is a static educational site, not a native emulator, compiler, sandbox, or automatic malware verdict engine. The challenge arena simulates selected instruction semantics with validated question templates. Compiler output varies with architecture, compiler, options, and optimization level. Assembly explanations are heuristic and primarily support common x86/x64 syntax. Confirm architecture, calling convention, control flow, data flow, and runtime evidence before drawing conclusions. A suspicious API or instruction alone is not proof of malicious behavior.


### Decimal and hexadecimal teaching aid
The Memory Maze challenge displays decimal and hexadecimal equivalents side by side, walks through effective-address arithmetic in steps, and includes a compact reference table. For example, `12` decimal is `0xC`, so `0x2000 + 0xC + 0x8 = 0x2014`.


### v7 fix: Malware Pattern detail rendering
Fixed the missing `pattern-detail` container. Clicking a malware pattern card now has a destination element for the annotated assembly, indicators, investigation notes, references and ATT&CK context. The panel is revealed only after selecting a pattern.


### v8: Lesson navigation and challenge variety
- Selecting a lesson now smoothly scrolls the selected lesson content into view.
- Expanded the game challenge pool with hexadecimal conversion, flag tracking, stack navigation, and data-width/shift questions.
- Challenge family selection now varies across the expanded pool to reduce repetitive sequences; randomized values still vary within each family.


### v9: Lesson focus, player name, and completion certificate
- Lesson selection now uses a delayed, offset-aware scroll to bring the lesson panel into view.
- Visitors can save a display name locally in their browser.
- A browser-generated printable certificate unlocks after every course lesson is completed and the player earns more than 500 XP (minimum 501 XP).
- The certificate is explicitly described as a self-generated learning record, not an accredited or independently verified qualification.


### v10: Certificate progress repair and challenge rotation
- Certificate progress is now calculated from the actual lesson IDs in the current learning path, ignoring stale completion IDs left by earlier builds. The dashboard's lesson count and graduation panel use the same calculation.
- Certificate generation rechecks eligibility at click time and gives a clear message when requirements are not met or the browser blocks the new window.
- Expanded the challenge arena to 24 question families and made family rotation deterministic, while randomizing numeric operands and answer order. This reduces immediate repeats; it is still a finite set of templates, not literally infinite authored questions.


## Lesson quiz update (v11)

The 24 extended curriculum lessons now have lesson-specific knowledge checks, answer choices, and explanations. The original curated lesson quizzes remain unchanged. This update changes quiz content only and does not reset saved XP, completed lessons, player profile, or certificate progress.
