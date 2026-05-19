import * as cp from 'child_process';

export interface ValidatorResult {
    taskId: string;
    passed: boolean;
    output: string;
}

export function runValidator(
    taskId: string,
    command: string,
    workingDir: string,
    onResult: (result: ValidatorResult) => void
): void {
    const [program, ...args] = command.split(/\s+/);

    const proc = cp.spawn(program, args, {
        cwd: workingDir,
        env: { ...process.env },
        shell: false,
    });

    let out = '';
    proc.stdout.on('data', (d: Buffer) => { out += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { out += d.toString(); });

    proc.on('close', (code: number | null) => {
        onResult({ taskId, passed: code === 0, output: out.trim() });
    });

    proc.on('error', (err: Error) => {
        onResult({ taskId, passed: false, output: `Could not run validator: ${err.message}` });
    });
}
