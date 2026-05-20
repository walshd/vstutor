import * as vscode from 'vscode';
import * as path from 'path';
import { Lesson, TaskDef, loadLesson } from './lessonLoader';
import { runValidator } from './validator';

interface RenderCtx {
    webview: vscode.Webview;
    lessonDir: string;
    workspaceRoot: string;
}

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

        const roots: vscode.Uri[] = [vscode.Uri.joinPath(context.extensionUri, 'media')];
        if (workspaceRoot) { roots.push(vscode.Uri.file(workspaceRoot)); }

        const panel = vscode.window.createWebviewPanel(
            'vscodetutor.lesson',
            `Lesson: ${lesson.title}`,
            column,
            {
                enableScripts: true,
                localResourceRoots: roots,
            }
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

        try {
            const firstScaffold = this._lesson.tasks.find(t => t.scaffoldFile);
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
        this._panel.webview.html = buildHtml(
            this._lesson,
            this._panel.webview,
            prevTitle,
            nextTitle,
            this._context.extensionUri,
            this._workspaceRoot
        );
    }

    public dispose(): void {
        LessonPanel.currentPanel = undefined;
        this._panel.dispose();
        for (const d of this._disposables) { d.dispose(); }
        this._disposables = [];
    }
}

// ── HTML generation ──────────────────────────────────────────────────────────

function buildHtml(
    lesson: Lesson,
    webview: vscode.Webview,
    prevTitle: string | undefined,
    nextTitle: string | undefined,
    extensionUri: vscode.Uri,
    workspaceRoot: string
): string {
    const nonce = getNonce();
    const csp = webview.cspSource;

    const prismCssUri  = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'prism-vscode.css'));
    const prismJsUri   = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'prism.js'));
    const prismPyUri   = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'prism-python.min.js'));
    const prismCssLUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'prism-css.min.js'));
    const prismHtmlUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'prism-markup.min.js'));

    const ctx: RenderCtx = { webview, lessonDir: lesson.lessonDir, workspaceRoot };
    const bodyHtml  = renderMarkdown(lesson.body, ctx);
    const tasksHtml = lesson.tasks.map(t => renderTaskCard(t, ctx)).join('\n');

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
        content="default-src 'none';
                 style-src ${csp} 'unsafe-inline';
                 script-src 'nonce-${nonce}' ${csp};
                 img-src ${csp} https: data:;
                 media-src ${csp};
                 frame-src https://www.youtube-nocookie.com https://www.youtube.com;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(lesson.title)}</title>
  <link rel="stylesheet" href="${prismCssUri}">
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 0 2rem 4rem;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.7;
    }
    h1 {
      color: var(--vscode-textLink-activeForeground);
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: .4rem;
      margin-top: 1.5rem;
    }
    h2 { color: var(--vscode-textLink-foreground); margin-top: 2rem; }
    h3 { color: var(--vscode-foreground); margin-top: 1.5rem; font-size: 1.05em; }
    h4, h5 { color: var(--vscode-descriptionForeground); margin-top: 1.2rem; font-size: 1em; }
    p { margin: .7rem 0; }
    a { color: var(--vscode-textLink-foreground); text-decoration: none; }
    a:hover { text-decoration: underline; }
    blockquote {
      border-left: 3px solid var(--vscode-textBlockQuote-border, #569cd6);
      background: var(--vscode-textBlockQuote-background, rgba(86,156,214,.08));
      margin: 1rem 0;
      padding: .5rem 1rem;
      border-radius: 0 4px 4px 0;
    }
    blockquote p { margin: 0; }
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
      margin: 1rem 0;
    }
    pre code { background: none; padding: 0; font-size: 1em; }
    ul, ol { padding-left: 1.4rem; margin: .5rem 0; }
    li { margin: .3rem 0; }
    img.media-full {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      display: block;
      margin: 1rem 0;
    }
    video.media-full {
      max-width: 100%;
      border-radius: 4px;
      display: block;
      margin: 1rem 0;
    }
    .video-container {
      position: relative;
      padding-bottom: 56.25%;
      height: 0;
      overflow: hidden;
      margin: 1rem 0;
      border-radius: 4px;
    }
    .video-container iframe {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      border: 0;
    }
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
  <script src="${prismJsUri}"></script>
  <script src="${prismPyUri}"></script>
  <script src="${prismCssLUri}"></script>
  <script src="${prismHtmlUri}"></script>
  <script nonce="${nonce}">
    Prism.highlightAll();
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

function renderTaskCard(task: TaskDef, ctx: RenderCtx): string {
    const desc = renderMarkdown(task.description, ctx);
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

// ── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(md: string, ctx: RenderCtx): string {
    let html = '';
    const lines = md.split('\n');
    let i = 0;
    let inList = false;
    let paraLines: string[] = [];

    const flushList = () => { if (inList) { html += '</ul>\n'; inList = false; } };
    const flushPara = () => {
        if (paraLines.length) {
            html += `<p>${paraLines.map(l => inline(l, ctx)).join(' ')}</p>\n`;
            paraLines = [];
        }
    };
    const flush = () => { flushPara(); flushList(); };

    while (i < lines.length) {
        const line = lines[i];

        // fenced code block
        if (line.startsWith('```')) {
            flush();
            const lang = line.slice(3).trim() || 'text';
            const code: string[] = [];
            i++;
            while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++; }
            html += `<pre><code class="language-${esc(lang)}">${escText(code.join('\n'))}</code></pre>\n`;
            i++;
            continue;
        }

        // heading
        const hm = line.match(/^(#{1,5})\s+(.*)/);
        if (hm) {
            flush();
            html += `<h${hm[1].length}>${inline(hm[2], ctx)}</h${hm[1].length}>\n`;
            i++; continue;
        }

        // blockquote
        if (line.startsWith('> ')) {
            flush();
            html += `<blockquote><p>${inline(line.slice(2), ctx)}</p></blockquote>\n`;
            i++; continue;
        }

        // standalone image / video line
        const mediaMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
        if (mediaMatch) {
            flush();
            html += renderMedia(mediaMatch[1], mediaMatch[2], ctx);
            i++; continue;
        }

        // list item
        if (/^[-*]\s+/.test(line)) {
            flushPara();
            if (!inList) { html += '<ul>\n'; inList = true; }
            html += `<li>${inline(line.replace(/^[-*]\s+/, ''), ctx)}</li>\n`;
            i++; continue;
        }

        // blank line
        if (line.trim() === '') { flush(); i++; continue; }

        // accumulate paragraph lines (flush list, not para)
        flushList();
        paraLines.push(line);
        i++;
    }
    flush();
    return html;
}

function renderMedia(alt: string, src: string, ctx: RenderCtx): string {
    // YouTube embed
    const ytId = extractYouTubeId(src);
    if (ytId) {
        return `<div class="video-container"><iframe src="https://www.youtube-nocookie.com/embed/${esc(ytId)}" allowfullscreen title="${esc(alt)}"></iframe></div>\n`;
    }

    // Local video file
    if (/\.(mp4|webm|ogv)$/i.test(src)) {
        const mime = src.match(/\.(\w+)$/i)?.[1]?.toLowerCase() ?? 'mp4';
        const mimeMap: Record<string, string> = { mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg' };
        const uri = resolveLocalUri(src, ctx);
        return `<video controls class="media-full"><source src="${uri}" type="${mimeMap[mime] ?? 'video/mp4'}"><p>${esc(alt)}</p></video>\n`;
    }

    // External image (https://)
    if (src.startsWith('https://') || src.startsWith('http://')) {
        return `<img src="${esc(src)}" alt="${esc(alt)}" class="media-full">\n`;
    }

    // Local image — resolve relative to lesson directory
    const uri = resolveLocalUri(src, ctx);
    return `<img src="${uri}" alt="${esc(alt)}" class="media-full">\n`;
}

function resolveLocalUri(src: string, ctx: RenderCtx): string {
    const abs = path.isAbsolute(src) ? src : path.join(ctx.lessonDir, src);
    return ctx.webview.asWebviewUri(vscode.Uri.file(abs)).toString();
}

function extractYouTubeId(url: string): string | null {
    const patterns = [
        /[?&]v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /embed\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) { return m[1]; }
    }
    return null;
}

function inline(s: string, _ctx?: RenderCtx): string {
    return escText(s)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
            (_, text, href) => `<a href="${esc(href)}" target="_blank">${text}</a>`);
}

// escapes for HTML attribute context
function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// escapes for HTML text content
function escText(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
