import { spawn, ChildProcess } from 'node:child_process';

export interface SupervisorOptions {
  cwd?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  env?: NodeJS.ProcessEnv;
  shell?: boolean;
}

export interface SupervisorResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  cancelled: boolean;
  outputTruncated: boolean;
  error?: Error;
}

export class BoundedProcessSupervisor {
  private activeChild: ChildProcess | null = null;
  private isCancelled = false;

  public cancel(): void {
    this.isCancelled = true;
    this.killChildTree(this.activeChild, 'SIGTERM');
  }

  private killChildTree(child: ChildProcess | null, signal: NodeJS.Signals): void {
    if (!child || child.killed) return;
    const pid = child.pid;
    if (!pid) return;

    if (process.platform === 'win32') {
      try {
        // Windows process-tree termination
        spawn('taskkill', ['/pid', pid.toString(), '/T', '/F'], {
          stdio: 'ignore',
          windowsHide: true,
        });
      } catch {
        try {
          child.kill(signal);
        } catch {
          // Ignored
        }
      }
    } else {
      try {
        // Process group / direct termination on POSIX
        if (child.pid) {
          process.kill(-child.pid, signal);
        }
      } catch {
        try {
          child.kill(signal);
        } catch {
          // Process already gone
        }
      }
    }
  }

  public async execute(
    executable: string,
    args: string[] = [],
    options: SupervisorOptions = {}
  ): Promise<SupervisorResult> {
    // Reset cancellation state per run to allow clean supervisor reuse
    this.isCancelled = false;

    const startTime = Date.now();
    const timeoutMs = options.timeoutMs ?? 60_000;
    const maxOutputBytes = options.maxOutputBytes ?? 10 * 1024 * 1024;
    const shell = options.shell ?? false;

    let timedOut = false;
    let outputTruncated = false;
    let combinedTotalBytes = 0;
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    // Filter environment variables: allowlist safe system & CI variables
    const safeEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH || '',
      Path: process.env.Path || '',
      SYSTEMROOT: process.env.SYSTEMROOT || process.env.SystemRoot || '',
      SystemRoot: process.env.SystemRoot || process.env.SYSTEMROOT || '',
      WINDIR: process.env.WINDIR || '',
      LANG: process.env.LANG || 'en_US.UTF-8',
      LC_ALL: process.env.LC_ALL || '',
      NODE_ENV: options.env?.NODE_ENV || process.env.NODE_ENV || 'test',
      HOME: process.env.HOME || '',
      USERPROFILE: process.env.USERPROFILE || '',
      TEMP: process.env.TEMP || '',
      TMP: process.env.TMP || '',
      CI: process.env.CI || 'true',
      ...options.env,
    };

    return new Promise<SupervisorResult>((resolve) => {
      let timeoutHandle: NodeJS.Timeout | null = null;
      let forceKillHandle: NodeJS.Timeout | null = null;
      let settled = false;

      const finish = (
        exitCode: number | null,
        signal: NodeJS.Signals | null,
        error?: Error
      ) => {
        if (settled) return;
        settled = true;

        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        if (forceKillHandle) {
          clearTimeout(forceKillHandle);
          forceKillHandle = null;
        }

        this.activeChild = null;
        const durationMs = Date.now() - startTime;

        resolve({
          exitCode,
          signal,
          stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
          stderr: Buffer.concat(stderrChunks).toString('utf-8'),
          durationMs,
          timedOut,
          cancelled: this.isCancelled,
          outputTruncated,
          error,
        });
      };

      try {
        const child = spawn(executable, args, {
          cwd: options.cwd || process.cwd(),
          env: safeEnv,
          shell,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
          detached: process.platform !== 'win32', // Allows process-group signaling on POSIX
        });

        this.activeChild = child;

        // Apply timeout with SIGTERM -> SIGKILL escalation
        if (timeoutMs > 0) {
          timeoutHandle = setTimeout(() => {
            timedOut = true;
            this.killChildTree(child, 'SIGTERM');

            // Two-phase escalation: force kill with SIGKILL if still active after 1.5s
            forceKillHandle = setTimeout(() => {
              this.killChildTree(child, 'SIGKILL');
            }, 1500);
          }, timeoutMs);
        }

        const appendChunk = (chunk: Buffer, targetChunks: Buffer[]) => {
          if (combinedTotalBytes >= maxOutputBytes) {
            outputTruncated = true;
            return;
          }

          if (combinedTotalBytes + chunk.length > maxOutputBytes) {
            outputTruncated = true;
            const remaining = maxOutputBytes - combinedTotalBytes;
            if (remaining > 0) {
              targetChunks.push(chunk.subarray(0, remaining));
              combinedTotalBytes += remaining;
            }
          } else {
            targetChunks.push(chunk);
            combinedTotalBytes += chunk.length;
          }
        };

        child.stdout?.on('data', (chunk: Buffer) => appendChunk(chunk, stdoutChunks));
        child.stderr?.on('data', (chunk: Buffer) => appendChunk(chunk, stderrChunks));

        child.on('error', (err: Error) => {
          finish(null, null, err);
        });

        child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
          finish(code, signal);
        });
      } catch (err) {
        finish(null, null, err instanceof Error ? err : new Error(String(err)));
      }
    });
  }
}
