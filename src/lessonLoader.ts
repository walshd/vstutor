import * as fs from 'fs';
import * as path from 'path';

export interface TaskDef {
    id: string;
    kind: string;
    marking: string;
    description: string;
    scaffoldFile: string | undefined;
    validatorCommand: string | undefined;
}

export interface Lesson {
    id: string;
    title: string;
    language: string;
    releaseDate: string | undefined;  // YYYY-MM-DD, undefined = always visible
    body: string;
    tasks: TaskDef[];
    lessonDir: string;
}

export function loadLesson(filePath: string): Lesson {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lessonDir = path.dirname(filePath);

    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) {
        throw new Error(`Lesson ${filePath} is missing YAML frontmatter.`);
    }
    const fm = parseFrontmatter(fmMatch[1]);
    const content = fmMatch[2];

    const tasks: TaskDef[] = [];
    const bodyParts: string[] = [];
    let lastIndex = 0;

    // matches `::: task attrs\nbody\n:::`
    const taskRe = /^:::\s*task\b([^\n]*)\n([\s\S]*?)\n^:::/gm;
    let match: RegExpExecArray | null;
    while ((match = taskRe.exec(content)) !== null) {
        bodyParts.push(content.slice(lastIndex, match.index));
        tasks.push(parseTask(match[1], match[2]));
        lastIndex = match.index + match[0].length;
    }
    bodyParts.push(content.slice(lastIndex));

    return {
        id: fm['id'] ?? path.basename(filePath, '.md'),
        title: fm['title'] ?? 'Untitled',
        language: fm['language'] ?? 'python',
        releaseDate: fm['releaseDate'],
        body: bodyParts.join(''),
        tasks,
        lessonDir,
    };
}

function parseFrontmatter(raw: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of raw.split('\n')) {
        const colon = line.indexOf(':');
        if (colon === -1) { continue; }
        result[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
    }
    return result;
}

function parseTask(attrString: string, body: string): TaskDef {
    const attrs = parseAttrs(attrString);

    const scaffoldMatch = body.match(/^scaffold:\s*(.+)$/m);
    const validatorMatch = body.match(/^validator:\s*(.+)$/m);
    const description = body.replace(/^(scaffold|validator):\s*.+$/gm, '').trim();

    return {
        id: attrs['id'] ?? 'task',
        kind: attrs['kind'] ?? 'scaffold',
        marking: attrs['marking'] ?? 'auto',
        description,
        scaffoldFile: scaffoldMatch?.[1]?.trim(),
        validatorCommand: validatorMatch?.[1]?.trim(),
    };
}

function parseAttrs(line: string): Record<string, string> {
    const result: Record<string, string> = {};
    const re = /(\w+)=("[^"]*"|[^\s]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
        result[m[1]] = m[2].replace(/^"|"$/g, '');
    }
    return result;
}
