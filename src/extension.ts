import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import { LessonPanel } from './lessonPanel';
import { loadLesson } from './lessonLoader';

interface TutorConfig {
    courseId: string;
    courseName: string;
    releaseMode: 'date' | 'all';  // 'date' = honour releaseDate; 'all' = show everything
}

function readTutorConfig(workspaceRoot: string): TutorConfig {
    const configPath = path.join(workspaceRoot, 'tutor.config.json');
    try {
        const raw = fs.readFileSync(configPath, 'utf8');
        return { releaseMode: 'date', ...JSON.parse(raw) };
    } catch {
        return { courseId: 'unknown', courseName: 'Course', releaseMode: 'all' };
    }
}

function isReleased(releaseDate: string | undefined, mode: TutorConfig['releaseMode']): boolean {
    if (mode === 'all' || !releaseDate) { return true; }
    return new Date(releaseDate) <= new Date();
}

function gitPull(workspaceRoot: string): Promise<string> {
    return new Promise(resolve => {
        cp.exec('git pull --ff-only', { cwd: workspaceRoot, timeout: 15000 }, (err, stdout) => {
            resolve(err ? '' : stdout.trim());
        });
    });
}

export function activate(context: vscode.ExtensionContext): void {
    const cmd = vscode.commands.registerCommand('vscodetutor.openLesson', async () => {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            vscode.window.showErrorMessage('VSCode Tutor: open a course folder first.');
            return;
        }

        const workspaceRoot = folders[0].uri.fsPath;
        const config = readTutorConfig(workspaceRoot);

        // Pull latest lessons in the background — silent on failure
        const pullResult = await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Window, title: `$(sync) ${config.courseName}: checking for new lessons…` },
            () => gitPull(workspaceRoot)
        );
        if (pullResult && pullResult !== 'Already up to date.') {
            vscode.window.showInformationMessage(`${config.courseName}: lessons updated.`);
        }

        const files = await vscode.workspace.findFiles('lessons/**/*.md', '**/node_modules/**', 200);
        if (files.length === 0) {
            vscode.window.showErrorMessage('VSCode Tutor: no lesson files found in lessons/');
            return;
        }

        // Filter by release date, sort by filename
        const allPaths = files.map(f => f.fsPath).sort();
        const visiblePaths: string[] = [];
        const lockedPaths: string[] = [];

        for (const p of allPaths) {
            try {
                const lesson = loadLesson(p);
                if (isReleased(lesson.releaseDate, config.releaseMode)) {
                    visiblePaths.push(p);
                } else {
                    lockedPaths.push(p);
                }
            } catch {
                visiblePaths.push(p); // parse error → show it so author can debug
            }
        }

        if (visiblePaths.length === 0) {
            vscode.window.showInformationMessage(
                `${config.courseName}: no lessons are available yet. Check back later.`
            );
            return;
        }

        const lastLesson = context.workspaceState.get<string>('lastLesson');

        const items = visiblePaths.map(p => {
            const isLast = p === lastLesson;
            return {
                label: (isLast ? '$(history) ' : '') + path.basename(p, '.md'),
                description: isLast ? 'resume here' : '',
                fsPath: p,
            };
        });

        // Sort last-opened lesson to the top
        if (lastLesson && visiblePaths.includes(lastLesson)) {
            const idx = items.findIndex(i => i.fsPath === lastLesson);
            if (idx > 0) { items.unshift(...items.splice(idx, 1)); }
        }

        // Show locked lessons as disabled separators so students know more are coming
        if (lockedPaths.length > 0) {
            items.push({
                label: `— ${lockedPaths.length} upcoming lesson(s) not yet released —`,
                description: '',
                fsPath: '',
            });
        }

        const pick = await vscode.window.showQuickPick(items, {
            placeHolder: `${config.courseName} — select a lesson`,
        });

        if (pick?.fsPath) {
            context.workspaceState.update('lastLesson', pick.fsPath);
            await openLesson(context, pick.fsPath, visiblePaths, workspaceRoot);
        }
    });

    context.subscriptions.push(cmd);
}

export async function openLesson(
    context: vscode.ExtensionContext,
    lessonPath: string,
    allPaths: string[],
    workspaceRoot: string
): Promise<void> {
    try {
        const lesson = loadLesson(lessonPath);
        const firstScaffold = lesson.tasks.find(t => t.scaffoldFile);
        if (firstScaffold?.scaffoldFile) {
            const scaffoldPath = path.join(workspaceRoot, firstScaffold.scaffoldFile);
            const doc = await vscode.workspace.openTextDocument(scaffoldPath);
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
        } else {
            // No scaffold file — open an empty editor so the lesson panel opens beside it
            const doc = await vscode.workspace.openTextDocument({ content: '', language: lesson.language });
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
        }
    } catch (err) {
        console.warn('VSCode Tutor: could not pre-open scaffold:', err);
    }
    LessonPanel.createOrShow(context, lessonPath, allPaths, workspaceRoot);
}

export function deactivate(): void {}
