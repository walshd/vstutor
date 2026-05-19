# Lesson Authoring Guide

This guide explains how to create lessons, control their release, set up a new course, and distribute the extension to students.

---

## Quick start — adding a new lesson

1. Create a markdown file in `lessons/`, e.g. `lessons/css-04-grid.md`
2. Create any scaffold files in `scaffolds/`, e.g. `scaffolds/grid.css`
3. Create a pytest test file in `tests/`, e.g. `tests/test_css_grid.py`
4. Set `releaseDate` in the frontmatter to the date you want students to see it
5. Push to git — students get it automatically next time they open VSCode

---

## Lesson file format

```markdown
---
id: css-04-grid
title: CSS Grid Basics
language: css
releaseDate: "2026-10-06"
prerequisites: [css-03-flexbox-nav]
---

# CSS Grid Basics

Explanatory prose, examples, motivation.
Code examples use fenced blocks:

\`\`\`css
.container {
    display: grid;
}
\`\`\`

## Task heading

Intro text for the task below.

::: task id=grid-container kind=scaffold marking=auto
**Brief task instruction in bold.**

Longer explanation of what the student should do and why.

scaffold: scaffolds/grid.css
validator: python3 -m pytest tests/test_css_grid.py::test_grid_container -v
:::
```

### Frontmatter fields

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique identifier, used in `prerequisites`. Match the filename. |
| `title` | Yes | Display name shown in the lesson picker and panel title. |
| `language` | Yes | `python`, `css`, `html`, `javascript` — affects syntax highlighting hints. |
| `releaseDate` | Recommended | `YYYY-MM-DD`. Lesson is hidden until this date. Omit to always show. |
| `prerequisites` | No | List of lesson IDs that should be completed first (informational only in v1). |

### Task block format

```
::: task id=TASK_ID kind=KIND marking=MARKING
Task description in markdown (bold, inline code, lists all work).

scaffold: path/relative/to/workspace/root.ext
validator: python3 -m pytest tests/test_file.py::test_function -v
:::
```

**Task kinds:**

| Kind | What the student does |
|---|---|
| `scaffold` | Edits a partial file to complete it |
| `fill-in` | Completes a single expression (coming in P1) |
| `predict` | Predicts output before running (coming in P1) |
| `fix-the-bug` | Fixes broken code |
| `extend` | Adds a feature to working code |

**Marking modes:**

| Mode | Behaviour |
|---|---|
| `auto` | Validator runs; pass/fail is immediate |
| `human` | Submitted to tutor marking queue (coming in P2) |
| `auto+human` | Auto check must pass first; tutor reviews qualitative aspects (P2) |

---

## Writing validators

Validators are pytest commands. They run in the workspace root directory.

### Python exercises — test the student's function

```python
# tests/test_my_lesson.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from scaffolds.my_file import my_function

def test_my_function_returns_correct_value():
    assert my_function(2, 3) == 5, "my_function(2, 3) should return 5"
```

Validator command in the lesson:
```
validator: python3 -m pytest tests/test_my_lesson.py::test_my_function_returns_correct_value -v
```

### CSS/HTML exercises — inspect the file content

```python
# tests/test_css_my_lesson.py
import os, re

SCAFFOLDS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scaffolds')

def read(filename):
    with open(os.path.join(SCAFFOLDS, filename)) as f:
        return f.read()

def normalize(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.DOTALL)  # strip comments
    return re.sub(r'\s+', ' ', css).lower()

def all_blocks_for(css, selector):
    norm = normalize(css)
    blocks = []
    for m in re.finditer(re.escape(selector) + r'\s*\{([^}]*)\}', norm):
        blocks.append(m.group(1))
    return ' '.join(blocks)

def test_grid_container():
    block = all_blocks_for(read('grid.css'), '.container')
    assert re.search(r'display\s*:\s*grid', block), \
        "Add 'display: grid' to the .container rule in grid.css"
```

### Tip: run individual test functions per task

Use `pytest path/file.py::test_function_name` to run one specific test per task.
This gives students precise, targeted feedback rather than running all tests at once.

---

## Controlling lesson release

In `tutor.config.json`, set `releaseMode`:

```json
{
  "courseId": "CIS1705",
  "courseName": "Accessible Web Design",
  "releaseMode": "date"
}
```

- `"date"` — only show lessons whose `releaseDate` is today or in the past
- `"all"` — show all lessons regardless of date (useful for testing locally)

Students see a "N upcoming lesson(s) not yet released" notice at the bottom of the picker so they know more are coming.

---

## Setting up a new course

### 1. Create the course repo

```bash
mkdir cis1705-web-design
cd cis1705-web-design
git init
git remote add origin https://github.com/your-org/cis1705-web-design.git
```

### 2. Add the required structure

```
cis1705-web-design/
├── tutor.config.json      ← course identity and release mode
├── lessons/               ← one .md file per lesson
├── scaffolds/             ← partial code files students edit
└── tests/                 ← pytest test files
```

Minimum `tutor.config.json`:
```json
{
  "courseId": "CIS1705",
  "courseName": "Accessible Web Design",
  "releaseMode": "date"
}
```

### 3. Add lessons with release dates

Name lesson files so they sort in the intended order:
```
lessons/
├── week01-01-html-structure.md    releaseDate: "2026-09-22"
├── week01-02-semantic-html.md     releaseDate: "2026-09-22"
├── week02-01-css-selectors.md     releaseDate: "2026-09-29"
└── week03-01-flexbox.md           releaseDate: "2026-10-06"
```

### 4. Push to git

```bash
git add .
git commit -m "Initial lessons"
git push -u origin main
```

---

## Distributing to students

### Step 1 — Package the extension (once per release)

```bash
npm install
npm run package
# creates vscode-tutor-0.0.1.vsix
```

### Step 2 — Share the VSIX

Upload to your VLE (Moodle, Blackboard, etc.) or course Teams channel.

Students install it in VSCode:
- `Cmd+Shift+P` → **Extensions: Install from VSIX…** → select the file

They only need to do this once (or when you release a new extension version).

### Step 3 — Students clone the course repo

Share the repo URL with students. They run:
```bash
git clone https://github.com/your-org/cis1705-web-design.git
```
Then open the folder in VSCode.

From that point on, the extension pulls updates automatically every time they open a lesson.

---

## Week-by-week tutor workflow

Each week:

1. Write new lesson `.md` files with next week's `releaseDate`
2. Add corresponding scaffold and test files
3. `git push`

That's it. Students opening VSCode on Monday will pull the new lessons and see them in the picker.

To hold a lesson back temporarily, set its `releaseDate` to a future date. To release early, change the date and push.

---

## Multiple classes on one machine

Because each class is a separate git repo in a separate folder, there is no mixing. The extension reads `tutor.config.json` from the *currently open workspace* — so whichever folder is open determines which course is active. Students with two courses just have two folders.

```
~/Repositories/
├── cis1705-web-design/    ← open this for Accessible Web Design
└── cis1703-programming/   ← open this for Programming 2
```
