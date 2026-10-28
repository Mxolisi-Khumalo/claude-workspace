import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { MemoryStore, emptyStoreData, type StoreData } from "./memory";

/**
 * JSON-file Store for local development (.data/store.json). All operations
 * run through one promise queue; writes go to a temp file that is renamed
 * over the original, so a crash never leaves a half-written store. The file
 * is re-read when its mtime changes (another process, or a manual reset).
 */
export class FileStore extends MemoryStore {
  override readonly kind = "file";
  private queue: Promise<unknown> = Promise.resolve();
  private loaded = false;
  /** mtime of the file as we last read or wrote it; null when it did not exist. */
  private knownMtime: number | null = null;

  constructor(readonly file: string) {
    super();
  }

  protected override read<T>(fn: (d: StoreData) => T): Promise<T> {
    return this.exclusive(async () => {
      await this.sync();
      return super.read(fn);
    });
  }

  protected override write<T>(fn: (d: StoreData) => T): Promise<T> {
    return this.exclusive(async () => {
      await this.sync();
      const result = await super.write(fn);
      await this.persist();
      return result;
    });
  }

  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async mtime(): Promise<number | null> {
    try {
      return (await stat(this.file)).mtimeMs;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  private async sync() {
    const mtime = await this.mtime();
    if (this.loaded && mtime === this.knownMtime) return;
    this.loaded = true;
    this.knownMtime = mtime;
    if (mtime === null) {
      this.data = emptyStoreData();
      return;
    }
    const raw = await readFile(this.file, "utf8");
    try {
      this.data = { ...emptyStoreData(), ...(JSON.parse(raw) as Partial<StoreData>) };
    } catch {
      const backup = `${this.file}.corrupt-${Date.now()}`;
      await rename(this.file, backup).catch(() => undefined);
      console.error(`[store] ${this.file} was not valid JSON; moved it to ${backup} and started empty`);
      this.data = emptyStoreData();
      this.knownMtime = null;
    }
  }

  private async persist() {
    await mkdir(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
    await writeFile(tmp, JSON.stringify(this.data, null, 1), "utf8");
    await rename(tmp, this.file);
    this.knownMtime = await this.mtime();
  }
}
