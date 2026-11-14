import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

export class RunDirectoryManager {
  private runId: string;
  private runDir: string;

  constructor(customRunId?: string) {
    this.runId = customRunId || `run-${crypto.randomBytes(6).toString('hex')}`;
    this.runDir = path.join(os.tmpdir(), 'mockguard-runs', this.runId);
  }

  public getRunId(): string {
    return this.runId;
  }

  public getRunDir(): string {
    return this.runDir;
  }

  public init(): string {
    if (!fs.existsSync(this.runDir)) {
      fs.mkdirSync(this.runDir, { recursive: true });
    }
    return this.runDir;
  }

  public saveArtifact(filename: string, content: string | Buffer): string {
    this.init();
    // Guard against path traversal
    const safeName = path.basename(filename);
    const target = path.join(this.runDir, safeName);
    fs.writeFileSync(target, content);
    return target;
  }

  public cleanup(): void {
    if (fs.existsSync(this.runDir)) {
      try {
        fs.rmSync(this.runDir, { recursive: true, force: true });
      } catch {
        // Ignored
      }
    }
  }
}
