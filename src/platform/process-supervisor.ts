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
    if (this.activeChild && !this.activeChild.killed) {
      try {
        this.activeChild.kill('SIGTERM');
      } catch {
        // Process might have already exited
      }
    }
  }

  public async execute(
    executable: string,
    args: string[] = [],
    options: SupervisorOptions = {}
  ): Promise<SupervisorResult> {
    const startTime = Date.now();
    const timeoutMs = options.timeoutMs ?? 60_000;
    const maxOutputBytes = options.maxOutputBytes ?? 10 * 1024 * 1024;
    const shell = options.shell ?? false;

    let timedOut = false;
    let outputTruncated = false;
    let stdoutTotalBytes = 0;
    let stderrTotalBytes = 0;
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    // Filter environment variables to prevent uncontrolled secret leaks
    const safeEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH || '',
      Path: process.env.Path || '',
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
        });

        this.activeChild = child;

        // Apply timeout
        if (timeoutMs > 0) {
          timeoutHandle = setTimeout(() => {
            timedOut = true;
            if (!child.killed) {
              try {
                child.kill('SIGTERM');
                // Force kill if not exited after grace period
                setTimeout(() => {
                  if (!child.killed) {
                    try {
                      child.kill('SIGKILL');
                    } catch {
                      // Ignored
                    }
                  }
                }, 2000);
              } catch {
                // Process already gone
              }
            }
          }, timeoutMs);
        }

        child.stdout?.on('data', (chunk: Buffer) => {
          if (stdoutTotalBytes + chunk.length > maxOutputBytes) {
            outputTruncated = true;
            const remaining = maxOutputBytes - stdoutTotalBytes;
            if (remaining > 0) {
              stdoutChunks.push(chunk.subarray(0, remaining));
              stdoutTotalBytes += remaining;
            }
          } else {
            stdoutChunks.push(chunk);
            stdoutTotalBytes += chunk.length;
          }
        });

        child.stderr?.on('data', (chunk: Buffer) => {
          if (stderrTotalBytes + chunk.length > maxOutputBytes) {
            outputTruncated = true;
            const remaining = maxOutputBytes - stderrTotalBytes;
            if (remaining > 0) {
              stderrChunks.push(chunk.subarray(0, remaining));
              stderrTotalBytes += remaining;
            }
          } else {
            stderrChunks.push(chunk);
            stderrTotalBytes += chunk.length;
          }
        });

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
