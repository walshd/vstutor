import * as vscode from 'vscode';
import * as path from 'path';
import { Lesson, TaskDef, loadLesson } from './lessonLoader';
import { runValidator } from './validator';

export class LessonPanel {
    public static currentPanel: LessonPanel | undefined;

    private readonly _panel: vscode.WebviewPanel;
    private readonly _context: vscode.ExtensionContext;
    private _lesson: Lesson;
    private _lessonPath: string;
    private _allLessonPaths: string[];
    private _workspaceRoot: string;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(
        context: vscode.ExtensionContext,
        lessonPath: string,
        allLessonPaths: string[] = [],
        workspaceRoot: string = ''
    ): void {
        const column = vscode.window.activeTextEditor
            ? vscode.ViewColumn.Beside
            : vscode.ViewColumn.One;

        if (LessonPanel.currentPanel) {
            LessonPanel.currentPanel._allLessonPaths = allLessonPaths.length
                ? allLessonPaths
                : LessonPanel.currentPanel._allLessonPaths;
            LessonPanel.currentPanel._load(lessonPath);
            LessonPanel.currentPanel._panel.reveal(column);
            return;
        }

        const lesson = loadLesson(lessonPath);
        const panel = vscode.window.createWebviewPanel(
            'vscodetutor.lesson',
            `Lesson: ${lesson.title}`,
            column,
            { enableScripts: true }
        );

        LessonPanel.currentPanel = new LessonPanel(
            panel, context, lesson, lessonPath, allLessonPaths, workspaceRoot
        );
    }

    private constructor(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext,
        lesson: Lesson,
        lessonPath: string,
        allLessonPaths: string[],
        workspaceRoot: string
    ) {
        this._panel = panel;
        this._context = context;
        this._lesson = lesson;
        this._lessonPath = lessonPath;
        this._allLessonPaths = allLessonPaths;
        this._workspaceRoot = workspaceRoot ||
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || lesson.lessonDir;

        this._render();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            (msg: { type: string; taskId: string; scaffoldFile?: string; command?: string; direction?: string }) => {
                const workspaceRoot = this._workspaceRoot;

                if (msg.type === 'openScaffold' && msg.scaffoldFile) {
                    const full = path.join(workspaceRoot, msg.scaffoldFile);
                    vscode.workspace.openTextDocument(full).then(doc =>
                        vscode.window.showTextDocument(doc, vscode.ViewColumn.One)
                    );
                } else if (msg.type === 'runValidator' && msg.command) {
                    const command: string = msg.command;
                    // Auto-save all dirty editors before running tests
                    vscode.workspace.saveAll(false).then(() => {
                        runValidator(msg.taskId, command, workspaceRoot, result => {
                            this._panel.webview.postMessage({ type: 'validatorResult', ...result });
                        });
                    });
                } else if (msg.type === 'navigate' && msg.direction) {
                    this._navigate(msg.direction === 'next' ? 1 : -1);
                }
            },
            null,
            this._disposables
        );
    }

    private _load(lessonPath: string): void {
        this._lessonPath = lessonPath;
        this._lesson = loadLesson(lessonPath);
        this._panel.title = `Lesson: ${this._lesson.title}`;
        this._render();
    }

    private _navigate(delta: number): void {
        const idx = this._allLessonPaths.indexOf(this._lessonPath);
        const next = idx + delta;
        if (idx === -1 || next < 0 || next >= this._allLessonPaths.length) { return; }

        const nextPath = this._allLessonPaths[next];
        this._load(nextPath);

        // Open the new lesson's first scaffold file in column 1
        try {
            const lesson = this._lesson;
            const firstScaffold = lesson.tasks.find(t => t.scaffoldFile);
            if (firstScaffold?.scaffoldFile) {
                const scaffoldPath = path.join(this._workspaceRoot, firstScaffold.scaffoldFile);
                vscode.workspace.openTextDocument(scaffoldPath).then(doc =>
                    vscode.window.showTextDocument(doc, vscode.ViewColumn.One)
                );
            }
        } catch { /* scaffold may not exist */ }
    }

    private _render(): void {
        const idx = this._allLessonPaths.indexOf(this._lessonPath);
        const prevTitle = idx > 0
            ? path.basename(this._allLessonPaths[idx - 1], '.md') : undefined;
        const nextTitle = idx !== -1 && idx < this._allLessonPaths.length - 1
            ? path.basename(this._allLessonPaths[idx + 1], '.md') : undefined;
        this._panel.webview.html = buildHtml(this._lesson, this._panel.webview, prevTitle, nextTitle);
    }

    public dispose(): void {
        LessonPanel.currentPanel = undefined;
        this._panel.dispose();
        for (const d of this._disposables) { d.dispose(); }
        this._disposables = [];
    }
}

// ── HTML generation ──────────────────────────────────────────────────────────

function buildHtml(lesson: Lesson, webview: vscode.Webview, prevTitle?: string, nextTitle?: string): string {
    const nonce = getNonce();
    const csp = webview.cspSource;

    const bodyHtml = renderMarkdown(lesson.body);
    const tasksHtml = lesson.tasks.map(renderTaskCard).join('\n');
    const prevBtn = prevTitle
        ? `<button data-action="navigate" data-direction="prev" class="nav-btn">&#8592; ${esc(prevTitle)}</button>`
        : `<span></span>`;
    const nextBtn = nextTitle
        ? `<button data-action="navigate" data-direction="next" class="nav-btn">&#8594; ${esc(nextTitle)}</button>`
        : `<span></span>`;

    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${csp} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(lesson.title)}</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 0 2rem 4rem;
      max-width: 780px;
      margin: 0 auto;
      line-height: 1.65;
    }
    h1 {
      color: var(--vscode-textLink-activeForeground);
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: .4rem;
    }
    h2 { color: var(--vscode-textLink-foreground); margin-top: 1.8rem; }
    code {
      font-family: var(--vscode-editor-font-family);
      background: var(--vscode-textCodeBlock-background);
      padding: .1em .35em;
      border-radius: 3px;
      font-size: .88em;
    }
    pre {
      background: var(--vscode-textCodeBlock-background);
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
    }
    pre code { background: none; padding: 0; font-size: 1em; }
    ul { padding-left: 1.4rem; }
    li { margin: .3rem 0; }
    .task-card {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 1rem 1.25rem;
      margin: 2rem 0;
      background: var(--vscode-editor-inactiveSelectionBackground);
    }
    .task-label {
      font-size: .7em;
      font-weight: 600;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      margin-bottom: .6rem;
    }
    .task-actions { display: flex; gap: .5rem; margin-top: 1rem; flex-wrap: wrap; }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: .38rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: .83em;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button:disabled { opacity: .5; cursor: default; }
    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .spinner { display: none; font-size: .8em; color: var(--vscode-descriptionForeground); margin-top: .6rem; }
    .lesson-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid var(--vscode-panel-border);
    }
    .nav-btn {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      padding: .5rem 1.1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: .9em;
    }
    .nav-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .result {
      display: none;
      margin-top: .7rem;
      padding: .6rem .9rem;
      border-radius: 4px;
      font-size: .82em;
      font-family: var(--vscode-editor-font-family);
      white-space: pre-wrap;
      word-break: break-all;
    }
    .result.pass { background: #0d2b0d; color: #73c991; border-left: 3px solid #73c991; }
    .result.fail { background: #2b0d0d; color: #f48771; border-left: 3px solid #f48771; }
  </style>
</head>
<body>
  ${bodyHtml}
  ${tasksHtml}
  <div class="lesson-nav">${prevBtn}${nextBtn}</div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    // Single delegated listener — onclick attrs are blocked by CSP nonce policy
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) { return; }
      const action = btn.dataset.action;
      const taskId = btn.dataset.task;

      if (action === 'navigate') {
        vscode.postMessage({ type: 'navigate', direction: btn.dataset.direction });

      } else if (action === 'openScaffold') {
        vscode.postMessage({ type: 'openScaffold', taskId, scaffoldFile: btn.dataset.file });

      } else if (action === 'runValidator') {
        const spin   = document.getElementById('spin-' + taskId);
        const result = document.getElementById('res-'  + taskId);
        btn.disabled = true;
        result.style.display = 'none';
        spin.style.display = 'block';
        vscode.postMessage({ type: 'runValidator', taskId, command: btn.dataset.command });
      }
    });

    window.addEventListener('message', ({ data: msg }) => {
      if (msg.type !== 'validatorResult') { return; }
      const btn    = document.getElementById('run-' + msg.taskId);
      const spin   = document.getElementById('spin-' + msg.taskId);
      const result = document.getElementById('res-'  + msg.taskId);
      btn.disabled = false;
      spin.style.display = 'none';
      result.className = 'result ' + (msg.passed ? 'pass' : 'fail');
      result.textContent = msg.output || (msg.passed ? '✓ All tests passed.' : '✗ Tests failed.');
      result.style.display = 'block';
    });
  </script>
</body>
</html>`;
}

function renderTaskCard(task: TaskDef): string {
    const desc = renderMarkdown(task.description);
    // onclick attributes are blocked by CSP — use data-* attributes and event delegation instead
    const scaffoldBtn = task.scaffoldFile
        ? `<button class="secondary" data-action="openScaffold" data-task="${esc(task.id)}" data-file="${esc(task.scaffoldFile)}">Open scaffold</button>`
        : '';
    const runBtn = task.validatorCommand
        ? `<button id="run-${esc(task.id)}" data-action="runValidator" data-task="${esc(task.id)}" data-command="${esc(task.validatorCommand)}">&#9654; Run tests</button>`
        : '';

    return `
<div class="task-card" id="task-${esc(task.id)}">
  <div class="task-label">${esc(task.kind)} &middot; ${esc(task.marking)}</div>
  ${desc}
  <div class="task-actions">${scaffoldBtn}${runBtn}</div>
  <div class="spinner" id="spin-${esc(task.id)}">Running tests&hellip;</div>
  <div class="result" id="res-${esc(task.id)}"></div>
</div>`;
}

// ── Minimal markdown renderer ────────────────────────────────────────────────

function renderMarkdown(md: string): string {
    let html = '';
    const lines = md.split('\n');
    let i = 0;
    let inList = false;

    const flushList = () => { if (inList) { html += '</ul>\n'; inList = false; } };

    while (i < lines.length) {
        const line = lines[i];

        // fenced code block
        if (line.startsWith('```')) {
            flushList();
            const lang = line.slice(3).trim();
            const code: string[] = [];
            i++;
            while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++; }
            html += `<pre><code class="language-${esc(lang)}">${escText(code.join('\n'))}</code></pre>\n`;
            i++;
            continue;
        }

        // heading
        const hm = line.match(/^(#{1,4})\s+(.*)/);
        if (hm) {
            flushList();
            html += `<h${hm[1].length}>${inline(hm[2])}</h${hm[1].length}>\n`;
            i++; continue;
        }

        // list item
        if (/^[-*]\s+/.test(line)) {
            if (!inList) { html += '<ul>\n'; inList = true; }
            html += `<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>\n`;
            i++; continue;
        }

        // blank line
        if (line.trim() === '') { flushList(); i++; continue; }

        // paragraph
        flushList();
        html += `<p>${inline(line)}</p>\n`;
        i++;
    }
    flushList();
    return html;
}

function inline(s: string): string {
    return escText(s)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

// escapes for HTML attribute context (quotes, angle brackets, ampersands)
function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// escapes for HTML text content (no quote escaping needed but safe to include)
function escText(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
