# VSCode Tutor

A VSCode extension that turns the editor itself into the lesson. Students complete scaffolded coding exercises inside a real IDE — with real tooling, terminals, and debuggers — instead of a browser sandbox.

Tutors author lessons as plain markdown files in a git repository. Students clone that repository, install the extension once, and lessons update automatically every time VSCode opens.

---

## For students

### 1 — Install the extension (once)

Download `vscode-tutor-x.x.x.vsix` from your course page, then in VSCode:

`Cmd+Shift+P` → **Extensions: Install from VSIX…** → select the file

### 2 — Clone your course repository

Your tutor will give you a URL. Run:

```bash
git clone git@github.com:your-org/your-course.git
```

Then open that folder in VSCode (`File → Open Folder`).

### 3 — Open a lesson

`Cmd+Shift+P` → **Tutor: Open Lesson**

The extension pulls the latest lessons from GitHub, then shows you what's available. The scaffold file opens on the left; the lesson instructions open on the right.

Complete each task, then click **▶ Run tests**. Green means you're done — use the **Next →** button at the bottom to move on.

---

## For tutors

### Creating a new course

```bash
# scaffold a new course repo in one command
./scripts/new-course.sh CIS1705 "Accessible Web Design" git@github.com:your-org/CIS1705.git
```

This creates the folder structure, commits a template lesson, and pushes to GitHub. Replace the template with your real content.

### Adding a lesson

1. Add `lessons/week03-01-grid-layout.md` with a `releaseDate` in the frontmatter
2. Add `scaffolds/grid.css` (the partial file students edit)
3. Add `tests/test_css_grid.py` (pytest assertions that validate the student's work)
4. `git push` — students get it automatically next time they open VSCode

See [AUTHORING.md](AUTHORING.md) for the full lesson format, task types, and validator guide.

### Controlling release dates

```yaml
---
id: week03-01-grid-layout
title: CSS Grid Layout
language: css
releaseDate: "2026-10-06"
---
```

Set `releaseMode: "date"` in `tutor.config.json` and lessons are hidden until their `releaseDate`. Students see *"N upcoming lessons not yet released"* in the picker so they know more are coming.

---

## For developers

### Prerequisites

- Node.js 18+
- VSCode 1.85+
- Python 3.9+ with pytest (`pip install pytest`)

### Setup

```bash
git clone git@github.com:walshd/vstutor.git
cd vstutor
npm install
```

### Run and debug

Press **F5** in VSCode. This compiles the extension and opens an **Extension Development Host** window with `sample-course/` loaded. Run `Cmd+Shift+P` → **Tutor: Open Lesson** to test.

### Build the distributable VSIX

```bash
npm run package
# produces vscode-tutor-x.x.x.vsix
```

Bump `version` in `package.json` before packaging a new release.

### Project structure

```
vstutor/
├── src/
│   ├── extension.ts      # activation, command registration, git pull, release filtering
│   ├── lessonLoader.ts   # parses markdown + YAML frontmatter + ::: task blocks
│   ├── lessonPanel.ts    # WebviewPanel: renders HTML, handles postMessage bridge
│   └── validator.ts      # spawns pytest, streams output back to webview
├── sample-course/        # self-contained example course (CSS + Python lessons)
│   ├── lessons/          # one .md file per lesson
│   ├── scaffolds/        # partial code files students edit
│   ├── tests/            # pytest test files
│   └── tutor.config.json # course identity and release mode
├── scripts/
│   └── new-course.sh     # scaffold a new course repo in one command
├── PRD.md                # full product requirements document
├── AUTHORING.md          # lesson authoring guide for tutors
└── package.json
```

### Lesson format (quick reference)

```markdown
---
id: css-01-float
title: CSS Float
language: css
releaseDate: "2026-09-22"
---

# CSS Float

Explanatory content...

::: task id=add-float kind=scaffold marking=auto
**Write the float CSS rule.**

scaffold: scaffolds/styles.css
validator: python3 -m pytest tests/test_css.py::test_float_rule -v
:::
```

---

## Architecture

```
Student's VSCode
├── Lesson sidebar (command palette → QuickPick)
├── Lesson webview (markdown rendered to HTML)
│   ├── "Open scaffold" button → opens file in editor column 1
│   ├── "Run tests" button → auto-saves all files, then spawns pytest
│   └── "← Prev / Next →" nav bar at the bottom
└── Extension host (TypeScript)
    ├── git pull --ff-only on every lesson open
    ├── reads tutor.config.json for course identity + release mode
    ├── filters lessons by releaseDate
    └── spawns child_process for pytest, streams result to webview
```

Each course is a plain git repository. The extension has no registry — it works with whatever folder is open. Multiple courses = multiple cloned folders, no configuration needed.

---

## Roadmap

See [PRD.md](PRD.md) for the full product requirements. Key upcoming phases:

| Phase | What |
|---|---|
| P2 | Backend: progress sync, tutor dashboard, marking queue |
| P3 | JavaScript language adapter, devcontainer support, marketplace publication |
| P4 | Web extension target (vscode.dev / Codespaces) |

---

## Contributing

Issues and pull requests welcome at [github.com/walshd/vstutor](https://github.com/walshd/vstutor).

For lesson content issues (not extension bugs), raise them in the relevant course repository.

## Licence

MIT — see [LICENSE](LICENSE) for details.
