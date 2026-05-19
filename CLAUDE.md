# CLAUDE.md — VSCode Tutor

Context for Claude Code sessions on this project.

## What this project is

A VSCode extension that delivers coding lessons inside the editor. Students edit real scaffold files and run pytest validators without leaving VSCode. Tutors author lessons as markdown files in git repositories.

The core thesis: teach development in a real IDE, not a browser sandbox. The extension is the delivery mechanism; git repositories are the content layer.

## Tech stack

- **Extension**: TypeScript, VSCode Extension API, compiled CommonJS
- **Lesson format**: Markdown with YAML frontmatter + custom `::: task` blocks
- **Validators**: pytest (Python), with CSS/HTML checks via Python regex
- **Distribution**: VSIX file (extension) + per-course git repos (content)
- **No backend yet** — P2 feature. All state is local.

## Key source files

| File | Purpose |
|---|---|
| `src/extension.ts` | Activation, command registration, git pull on open, release date filtering, `tutor.config.json` reading |
| `src/lessonLoader.ts` | Parses lesson markdown: YAML frontmatter, body, `::: task` blocks |
| `src/lessonPanel.ts` | WebviewPanel — renders lesson HTML, postMessage bridge, prev/next nav, auto-save before tests |
| `src/validator.ts` | Spawns pytest as child_process, streams stdout/stderr back to webview |

## Lesson format

```markdown
---
id: css-01-float
title: CSS Float
language: css
releaseDate: "2026-09-22"
prerequisites: [some-other-id]
---

Body markdown (rendered in webview)...

::: task id=TASK_ID kind=scaffold marking=auto
Task description markdown.

scaffold: scaffolds/relative/path.ext
validator: python3 -m pytest tests/test_file.py::test_name -v
:::
```

Task kinds: `scaffold`, `fill-in`, `predict`, `fix-the-bug`, `extend`
Marking modes: `auto`, `human` (P2), `auto+human` (P2)

## Course repository structure

Each course is a completely separate git repository:

```
course-repo/
├── tutor.config.json    { courseId, courseName, releaseMode: "date"|"all" }
├── lessons/*.md
├── scaffolds/           partial code files students edit
└── tests/               pytest files
```

`releaseMode: "date"` hides lessons until their `releaseDate`. `"all"` shows everything (dev/testing).

## Important design decisions (from PRD)

- **No standalone app** — VSCode extension only. This is final.
- **Markdown lesson format** — plain text, no proprietary format. Authors use any editor.
- **No copy-prevention DRM** — pedagogical approach: scaffolded tasks, partial snippets. See PRD §11.
- **No AI hints** — explicitly removed from roadmap. Not in any planned phase.
- **Free, both marketplaces** — Microsoft Marketplace + OpenVSX when published.
- **Hybrid marking** — `auto` for deterministic tasks, `human` for subjective (P2).
- **Local-first progress** — no backend in P0/P1. P2 adds optional sync.

## Current state (P0 spike — complete)

- [x] Extension renders markdown lessons in a WebviewPanel
- [x] Task cards with "Open scaffold" and "Run tests" buttons
- [x] Auto-saves all dirty editors before running pytest
- [x] pytest output displayed inline (green pass / red fail)
- [x] Prev/Next lesson navigation with scaffold auto-open
- [x] Git pull on every lesson open (silent fail if no remote)
- [x] `tutor.config.json` — course name in picker, release mode
- [x] `releaseDate` frontmatter filtering
- [x] VSIX packaging (`npm run package`)
- [x] Sample course: Python Hello World + CSS Float + Flexbox Basics + Flexbox Nav
- [x] Live course repos: github.com/walshd/CIS1000Test, github.com/walshd/CIS10001Test2

## Not yet built (future phases)

- P2: Backend API (FastAPI or Node), progress sync, tutor dashboard, marking queue
- P3: JavaScript language adapter, devcontainer support, marketplace publication (OpenVSX + Microsoft)
- P4: Web extension target (vscode.dev / Codespaces) — requires removing Node APIs from hot paths
- Lesson sidebar TreeView (currently command palette + QuickPick)
- Student progress persistence (local JSON exists, no backend sync yet)

## How to run locally

```bash
npm install
# Press F5 in VSCode — opens Extension Development Host with sample-course/
# Cmd+Shift+P → Tutor: Open Lesson
```

## How to build the VSIX

```bash
npm run package   # produces vscode-tutor-x.x.x.vsix
```

## CSP note (important)

Webview HTML uses a nonce-based Content Security Policy. `onclick` attributes are **blocked** — all button handlers must use `data-action` attributes and a single delegated `document.addEventListener('click', ...)` inside the nonce-tagged `<script>` block. Do not add `onclick` handlers to any HTML element rendered by `buildHtml`.

## Test files

CSS validator tests use a `normalize()` + `all_blocks_for()` pattern to handle whitespace and compound selectors (`div, p { }` vs `div { }`). See `sample-course/tests/test_css_float.py` for the pattern.

Python validator tests add the workspace root to `sys.path` via `sys.path.insert(0, ...)` at the top of each test file.
