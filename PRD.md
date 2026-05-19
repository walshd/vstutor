# VSCode Tutor — Product Requirements Document

**Status:** Draft v1.0
**Date:** 2026-05-19
**Owner:** Dave Walsh
**Audience:** Engineering, product, prospective funders, prototype contributors

---

## 1. Summary

VSCode Tutor is a learning environment that teaches software development inside a real IDE rather than a simplified browser sandbox. Students complete markdown-driven, scaffolded tutorials directly in Visual Studio Code, using the same toolchain (extensions, debuggers, terminals, source control, language servers) they will use professionally. A lightweight backend stores progress and surfaces tutor-facing analytics. The product is delivered as a **VSCode extension with webviews**, plus optional backend services — not a standalone application.

The single sentence that scopes this product: *"A VSCode extension that turns the editor itself into the lesson."*

---

## 2. Problem statement

Most introductory programming environments fall into one of two camps:

1. **Browser sandboxes** (Replit-style, Codecademy-style) — friendly, but they hide the realities of installing tooling, managing files, reading errors in a terminal, and using a debugger. Students hit a cliff the moment they leave the sandbox.
2. **"Just use the real tools"** — pedagogically honest but unsupported. Beginners drown in environment setup, lose context switching between docs and editor, and have no scaffolding.

There is no middle path that combines the realism of a professional IDE with the scaffolding of a learning platform. VSCode Tutor fills that gap.

---

## 3. Goals and non-goals

### 3.1 Goals (v1)

- Deliver lessons inside VSCode, not in a separate web tab.
- Author lessons as plain markdown with embedded task metadata — no proprietary lesson format.
- Provide scaffolded exercises (partial code, fill-in-the-blank, progressive tasks) instead of blank-page assignments.
- Track per-student progress and surface it to tutors.
- Support multiple programming languages through a modular language adapter.
- Run on a small team and a realistic budget.

### 3.2 Explicit non-goals (v1)

These are the scope-creep traps the PRD exists to prevent. The product is **not**:

- A full learning management system (no gradebooks, enrolment, billing, certificates).
- A collaborative IDE (no real-time co-editing — VSCode Live Share covers that).
- An analytics platform beyond tutor-facing progress.
- An AI tutor. No Language Model API integration in any planned phase (see §18.4).
- A deployment platform (no hosted student app deployment).
- A copy-prevention DRM system (see §11).
- A paid product. The extension and first-party lessons are free (see §18.1).

If a feature request fits into one of the bullets above, it is out of scope by default and requires an explicit scope amendment.

---

## 4. Users and primary use cases

| Persona | Primary need | Success looks like |
|---|---|---|
| **Student** (beginner / career-switcher) | Learn to code in real tools without drowning in setup | Completes a lesson, runs the code, sees green checks, moves on without leaving the editor |
| **Tutor / instructor** | Author lessons, see who is stuck, grade scaffolded work | Writes a markdown lesson in 30 min; opens a dashboard and sees which students are blocked on which step |
| **Course administrator** | Bulk-deploy to a cohort, configure language environments | Distributes a course via a config file or extension pack |

---

## 5. Feasibility: is a VSCode extension the right shape?

**Verdict: yes, with documented constraints.**

### 5.1 What the VSCode Extension API supports natively

- **Webviews** — full HTML/CSS/JS panels for lesson content, side-by-side with the editor. Used by GitHub Copilot Chat, Jupyter, Markdown Preview Enhanced, etc.
- **TreeView / sidebar** — a "Course" sidebar listing lessons and progress.
- **Status bar items** — current lesson, step, completion %.
- **Decorations / inline widgets** — highlight code regions tied to a task ("edit this function").
- **Diagnostics API** — surface task validation results as native squiggles in the Problems panel.
- **Terminal API** — open an integrated terminal pre-loaded with the lesson's run command.
- **Tasks API** — define run/test tasks the student can trigger via the command palette.
- **FileSystemProvider** — supply scaffolded files; reset to baseline on demand.
- **DebugConfigurationProvider** — preconfigure debug sessions per lesson.
- **Authentication API** — sign-in via GitHub/Microsoft for progress sync.
- **Workspace state / global state** — persist progress locally; sync to backend if signed in.
- **Remote Development & Dev Containers** — lets a lesson ship a sealed environment (Docker / devcontainer.json) so the student doesn't fight Python/Node version mismatches.
- **Web extension target** — the same extension can run in `vscode.dev` / GitHub Codespaces with reduced capability, giving a zero-install fallback.

### 5.2 What the API does *not* support, and the workarounds

| Gap | Workaround |
|---|---|
| No fine-grained "lock these lines, leave the rest editable" | Use decorations + validation; don't try to enforce immutability. Combine with file-reset commands. |
| Cannot prevent copy-paste reliably | Don't try (see §11). Use pedagogy, not DRM. |
| Cannot deeply customise the editor chrome (menus, branding) | Accept VSCode's identity; brand the sidebar and webviews only. |
| Webviews are sandboxed iframes — no direct DOM access to the editor | Use the `postMessage` bridge and the extension host as the broker. Standard pattern. |
| Marketplace publishing requires Microsoft account + extension signing for some scenarios | Plan the publisher account early; budget a few hours of process. |

### 5.3 Risks specific to the extension shape

- **VSCode API churn.** The API is stable but evolves; webview APIs in particular have shifted. Pin the engine version and test on the latest stable + previous stable.
- **VSCodium / Cursor / forks.** Cursor and VSCodium are VSCode forks; most extensions work but the marketplace differs. Decide early whether to publish to OpenVSX as well as the Microsoft marketplace.
- **Web extension constraints.** If supporting `vscode.dev`, no Node APIs, no child processes, no native modules. Architect the core to be web-safe; gate desktop-only features.

### 5.4 Conclusion

Every required capability — lesson rendering, scaffolding, validation, progress tracking, language environments, tutor dashboards — maps onto an existing extension API or a well-trodden webview pattern. **There is no feature in the v1 scope that requires forking VSCode or building a standalone Electron app.** Building a standalone app would multiply the effort by an order of magnitude and abandon the core pedagogical advantage (real IDE, real tooling).

---

## 6. Architecture

```
┌────────────────────────────────────────────────────────────┐
│                       VSCode (host)                        │
│                                                            │
│  ┌─────────────────┐   ┌─────────────────────────────┐     │
│  │ Lesson sidebar  │   │  Lesson webview (markdown)  │     │
│  │ (TreeView)      │   │  rendered + interactive     │     │
│  └────────┬────────┘   └──────────────┬──────────────┘     │
│           │                           │                    │
│           └───────────┬───────────────┘                    │
│                       │ postMessage                        │
│              ┌────────▼─────────┐                          │
│              │  Extension host  │                          │
│              │  (TypeScript)    │                          │
│              └────────┬─────────┘                          │
│   ┌──────────┬────────┼────────┬──────────────┐            │
│   ▼          ▼        ▼        ▼              ▼            │
│ Lesson    Validator  Progress  Language    Telemetry       │
│ loader    runner     store     adapters    emitter         │
└─────┬──────────────────┬──────────────────────┬────────────┘
      │                  │                      │
      ▼                  ▼                      ▼
 Markdown +        Local workspace        Optional backend
 frontmatter        state + global         (FastAPI / Node)
 (filesystem        state                  - progress sync
  or Git repo)                             - tutor dashboard
                                           - cohort mgmt
```

### 6.1 Components

- **Lesson loader.** Reads a directory of markdown files (`lessons/*.md`) with YAML frontmatter declaring `id`, `title`, `language`, `prerequisites`, `tasks`. Lessons live in a Git repo so they version like code.
- **Lesson webview.** Renders the markdown to HTML, injects interactive widgets (task checkboxes, "open this file" buttons, "run validator" buttons). Communicates with the host via `postMessage`.
- **Validator runner.** Per-task validation. Strategies: file diff against expected, run a test command and parse exit code, regex match output, or invoke a language-specific checker.
- **Language adapters.** A pluggable interface (`LanguageAdapter`) exposing `validate(task, workspace)`, `run(task, workspace)`, `setupEnvironment(workspace)`. Ship Python + JavaScript adapters in v1; design for more.
- **Progress store.** Local JSON in workspace state. Syncs to backend when signed in. Schema versioned.
- **Telemetry emitter.** Opt-in. Emits anonymous task-completion events. No code content sent without explicit consent.
- **Backend (optional).** Stateless HTTP API. Endpoints: `POST /progress`, `GET /cohort/:id/progress`, `GET /lessons/:id`. Storage: Postgres. Auth: OAuth via GitHub. Deployed as a single container.

### 6.2 Data model (initial)

```
Course        { id, title, description, lessons[] }
Lesson        { id, title, language, prerequisites[], tasks[], markdownPath }
Task          { id, kind, marking, prompt, scaffoldFiles[], validator, hintsMarkdown }
              // marking ∈ { auto, human, auto+human }
Progress      { studentId, lessonId, taskId, status, attempts, completedAt }
Student       { id, displayName, cohortId? }
Cohort        { id, name, tutorIds[], studentIds[], courseIds[] }
```

---

## 7. Interface layout

Default view when a course is opened:

```
┌──────────────────────────────────────────────────────────────────────┐
│  File  Edit  ...                                                     │
├──────────────────────────────────────────────────────────────────────┤
│ ▾ COURSE: Intro to Python  │                                         │
│   ✓ 01 Hello world         │   editor (student's code)               │
│   ✓ 02 Variables           │                                         │
│   ▸ 03 Functions  (you)    │   ────────────────────────────          │
│     04 Loops               │   integrated terminal                   │
│                            │                                         │
├────────────────────────────┴──── Lesson webview ────────────────────-┤
│  # Functions                                                         │
│  A function packages reusable behaviour…                             │
│  ## Task 1 — write `greet(name)`                                     │
│  [ open scaffold ]  [ run tests ]                                    │
└──────────────────────────────────────────────────────────────────────┘
Status bar: [Lesson 3/12 · Task 1/3 · ▶ Run]
```

Tutor dashboard (separate webview, opened via command):

```
Cohort: Spring 2026   |  12 students
─────────────────────────────────────────────────────────────
Lesson 03 Functions
  ✓ ✓ ✓ ✓ ✓ ✓ ✓ ✓ · · ▲ ✗     8 done, 2 not started, 1 stuck, 1 failed
                              ▲ = stuck >30 min on Task 1
─────────────────────────────────────────────────────────────
```

---

## 8. Tutorial structure

A lesson is a markdown file with frontmatter:

```markdown
---
id: py-03-functions
title: Functions
language: python
prerequisites: [py-02-variables]
---

# Functions

Explanatory prose, examples, motivation.

::: task id=greet kind=scaffold
**Write a function `greet(name)` that returns `"Hello, {name}"`.**

scaffold: ./scaffolds/greet.py
validator: pytest ./tests/test_greet.py
:::

::: task id=goodbye kind=fill-in
…
:::
```

Task kinds (v1):

- **`scaffold`** — partial file provided, student fills the gaps. Validator runs tests.
- **`fill-in`** — single-line / single-expression completion inline in the webview.
- **`predict`** — student predicts the output before running (no IDE editing required).
- **`fix-the-bug`** — broken code provided, student fixes it.
- **`extend`** — working code provided, student adds a feature.

Each task declares a **marking mode**:

- **`auto`** — deterministic check (test suite, output match, regex). Result is final.
- **`human`** — submitted to the tutor's marking queue; status is `pending` until a tutor marks it.
- **`auto+human`** — auto-check must pass first (gating); a tutor then reviews qualitative aspects (style, design). Used for capstone-style tasks.

Each task may also carry **progressive hints** (shown on request) and a **reference solution** (revealed only after completion or after N attempts, configurable).

---

## 9. Progress tracking

- **Local first.** Progress writes to workspace state immediately. Works offline.
- **Sync.** If signed in, progress posts to backend on task completion (debounced).
- **Conflict resolution.** Server is authoritative; local diff replayed on conflict, with last-write-wins per `(student, task)`.
- **Privacy.** Code content never syncs by default. Only `{studentId, taskId, status, attempts, durationMs, timestamp}`. Code submission is opt-in per task.

---

## 10. Tutor analytics

Tutor-facing only. Strictly scoped to:

- Per-cohort completion rates per lesson and per task.
- "Stuck" detector — students with >N attempts or >M minutes on a task without progress.
- Time-on-task distribution per cohort (for spotting outliers, not surveillance).
- Last-active timestamp.
- **Marking queue** — tasks awaiting human marking (`human` and `auto+human` modes), sorted by submission time, with one-click open of the submitted code.

**Not in scope:** keystroke logging, screen recording, code-style scoring, AI-graded essays, plagiarism detection.

---

## 11. Anti-copy and academic integrity

Full copy-prevention is unrealistic in an editor and conflicts with accessibility (screen readers must read content; OS-level copy can never be fully blocked).

The PRD takes a pedagogical stance instead:

- **Scaffolded exercises** — the answer-shape is constrained by the scaffold, so a copied solution often won't fit.
- **Partial snippets** — students complete missing pieces; full-program copying is less applicable.
- **Progressive tasks** — each task depends on the previous, so plagiarising one step still leaves the next.
- **Per-student variation** — where feasible, parameterise inputs/outputs so two students don't have identical expected answers.
- **Optional reference solutions** revealed only after attempt thresholds.

This is documented as a deliberate product decision, not a gap.

---

## 12. Accessibility

- Webviews must follow WCAG 2.1 AA: semantic HTML, keyboard navigation, focus management, ARIA labels.
- Respect the VSCode theme (light / dark / high-contrast) via the `vscode-*` CSS variables. No hard-coded colours.
- Provide a "reduce motion" path; no essential information conveyed by colour alone.
- Screen-reader testing on at least one lesson before each release.
- Lesson markdown is plain text by design — readable in any tool.

---

## 13. Containers and reproducible environments

- Lessons may declare a `devcontainer` (standard `.devcontainer/devcontainer.json`).
- When opened, VSCode prompts to reopen in container; the lesson runs against a pinned Python/Node/etc.
- For students unwilling or unable to use Docker, ship a fallback "environment check" command that validates local tool versions and prints clear remediation steps.
- For web (vscode.dev / Codespaces), Codespaces provides the container; nothing extra to do.

---

## 14. MVP scope

The MVP is the smallest thing that proves the pedagogical premise.

**In:**

1. VSCode extension (desktop) targeting Python.
2. Lesson sidebar + webview rendering markdown lessons.
3. Three task kinds: `scaffold`, `fill-in`, `predict`.
4. Validator runner backed by `pytest`.
5. Local progress storage (no backend).
6. Five hand-authored lessons covering variables → functions → lists.
7. Documented lesson-authoring format.
8. Manual install (VSIX) — not yet on the marketplace.

**Explicitly deferred:**

- Backend / sync / tutor dashboard.
- JavaScript / other languages.
- Web extension target.
- AI hints.
- Cohort management.
- Devcontainers (use local Python).
- Marketplace publication.

**Success criteria for MVP:**

- Three non-team beta testers complete all five lessons end-to-end without assistance beyond the in-product material.
- Authoring a new lesson takes a tutor under 60 minutes (from blank file to working scaffolded task) given the format docs.
- Median task validation runs in under 3 seconds on a 2020-era laptop.

---

## 15. Development phases

| Phase | Duration (est.) | Outcome |
|---|---|---|
| **P0 Spike** | 2 weeks | Throwaway prototype: extension renders a markdown lesson in a webview, runs `pytest` on a button click. Validates the technical premise end-to-end. |
| **P1 MVP** | 8–10 weeks | Everything in §14. Closed beta with 3–5 students. |
| **P2 Backend + tutor dashboard** | 6–8 weeks | Backend, auth, progress sync, basic tutor dashboard. Cohort of 10–20. |
| **P3 Second language + devcontainers** | 6 weeks | JavaScript adapter. Devcontainer support. Marketplace publication on **both** Microsoft Marketplace and OpenVSX. |
| **P4 Web extension target** | 4 weeks | Works in vscode.dev / Codespaces with feature gating. |
| **P5 Hybrid marking polish** | 4 weeks | Tutor marking queue UX, rubric support for `human` tasks, batch-mark actions. |

Phases are gates, not promises — re-evaluate after each.

---

## 16. Technical risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scope creep into LMS / collaborative IDE / AI tutor | High | Project death | §3.2 is the canonical no-list; require written scope amendment to add |
| Validation flakiness (tests that pass locally but not on student machines) | High | Trust collapse | Pin tool versions; recommend devcontainers from P3; ship `tutor doctor` env-check command early |
| VSCode API changes between releases | Medium | Maintenance load | Pin `engines.vscode`; CI tests against current + previous stable |
| Authoring overhead too high for tutors | Medium | No content | Invest in lesson templates and a CLI scaffolder before recruiting authors |
| Web extension limits prevent feature parity | Medium | Confusing UX | Document desktop-only features explicitly; degrade gracefully |
| Backend cost growth with cohort size | Low (early) / Medium (later) | Sustainability | Start serverless / single-VM; progress payloads are tiny |
| Privacy / data-handling for student progress | Medium | Legal | GDPR-aware design from day one; data minimisation; opt-in code submission |
| Marketplace rejection or branding conflict | Low | Launch delay | Submit early in P3 to both Microsoft Marketplace and OpenVSX in parallel |
| Human marking backlog (tutors drown in queue) | Medium | Trust collapse | Default new tasks to `auto`; require explicit opt-in for `human`; surface queue depth in dashboard |

---

## 17. Long-term roadmap (indicative, not committed)

- Author tooling: lesson linter, scaffolder CLI, preview command.
- Pluggable validators (linters, type-checkers, custom Python checkers).
- Multi-file projects and project-based capstones.
- Integration with Git for portfolio building (student's lesson repo *is* their first portfolio).
- Importable course packs from existing OER (Open Educational Resources).
- Localisation framework for non-English lessons.
- Self-hosted backend option for institutions.

---

## 18. Resolved questions

1. **Distribution model — Free.** The extension and all first-party lessons are free. No paid tier, no freemium gate on the tutor dashboard. Backend must therefore be cheap to run at small-to-medium scale (single VM or serverless; see §6.1).
2. **OpenVSX from day one** alongside the Microsoft marketplace. Cursor and VSCodium users are first-class. CI publishes to both registries from the same release artifact.
3. **Lesson licensing — CC-BY-SA 4.0.** All first-party lessons ship under Creative Commons Attribution-ShareAlike. Community contributions accepted under the same licence (inbound = outbound). The lesson repo includes a `LICENSE` file and per-file SPDX headers where practical. Extension code itself is licensed separately (e.g. MIT or Apache-2.0 — to be decided at repo creation, not blocking).
4. **AI hints — out of scope.** Removed from the roadmap. No Language Model API integration, no own-model inference, no user-provided-key path. May be reconsidered in a future major version, but is not on the current trajectory.
5. **Assessment — hybrid.** Auto-marking handles deterministic tasks (test-suite pass/fail, output match, regex match). Human tutors mark anything subjective (code style, design choices, open-ended extensions). Each task in the lesson format declares which mode it uses; the tutor dashboard surfaces a queue of human-mark tasks.

---

## 19. Decision record

- **VSCode extension, not standalone app.** Reaffirmed in §5.4.
- **Markdown lesson format, not proprietary.** Authoring portability beats authoring power.
- **Local-first progress, optional sync.** Works offline; backend is enhancement.
- **No copy-prevention DRM.** Pedagogy over DRM (§11).
- **Tutor analytics scoped tightly.** No surveillance features (§10).
- **Modular language support.** Adapter interface from day one, even with one language in v1.
- **Free, both marketplaces, CC-BY-SA lessons, no AI, hybrid marking.** See §18 for the rationale on each.

---

## Appendix A — Glossary

- **Lesson** — one markdown file plus its scaffold and test files.
- **Task** — one assessable unit inside a lesson.
- **Validator** — the command or check that decides whether a task is complete.
- **Scaffold** — partial code the student edits, rather than starting blank.
- **Cohort** — a group of students sharing a tutor and a course.
- **Course** — an ordered set of lessons.
