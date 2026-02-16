import * as fs from 'fs/promises';
import * as path from 'path';
import type { EventEnvelope } from '@/events/types';
import type { EventStore } from '@/events/store';
import type { SessionID } from '@/types/ids';
import { Paths, FileExtensions } from '@/constants';

/**
 * File-based event store implementation.
 * Stores events in JSONL (JSON Lines) format for append-only, streamable storage.
 * Events are persisted to `.syrin/events/{sessionId}.jsonl`
 *
 * v1.5.0: Added write queue to prevent race conditions during concurrent appends.
 */
export class FileEventStore implements EventStore {
  private readonly eventsDir: string;
  private writeStreams: Map<SessionID, fs.FileHandle> = new Map();
  // v1.5.0: Write queues per session to serialize concurrent writes
  private writeQueues: Map<SessionID, Promise<void>> = new Map();

  constructor(eventsDir: string = Paths.EVENTS_DIR) {
    this.eventsDir = eventsDir;
  }

  /**
   * Initialize the events directory if it doesn't exist.
   */
  private async ensureEventsDir(): Promise<void> {
    try {
      await fs.mkdir(this.eventsDir, { recursive: true });
    } catch (error: unknown) {
      // Directory might already exist, which is fine
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Get the file path for a session's events.
   */
  private getEventFilePath(sessionId: SessionID): string {
    return path.join(this.eventsDir, `${sessionId}${FileExtensions.JSONL}`);
  }

  /**
   * Get or create a write stream for a session.
   */
  private async getWriteStream(sessionId: SessionID): Promise<fs.FileHandle> {
    if (this.writeStreams.has(sessionId)) {
      return this.writeStreams.get(sessionId)!;
    }

    await this.ensureEventsDir();
    const filePath = this.getEventFilePath(sessionId);

    const handle = await fs.open(filePath, 'a'); // Append mode
    this.writeStreams.set(sessionId, handle);
    return handle;
  }

  async append(event: EventEnvelope): Promise<void> {
    const sessionId = event.session_id;

    // v1.5.0: Serialize writes per session to prevent race conditions
    // Chain this write after any pending writes for this session
    const previousWrite = this.writeQueues.get(sessionId) ?? Promise.resolve();

    const currentWrite = previousWrite.then(async () => {
      const handle = await this.getWriteStream(sessionId);
      const line = JSON.stringify(event) + '\n';
      const buffer = Buffer.from(line, 'utf-8');

      // Get file stats to determine write position (end of file)
      const stats = await handle.stat();
      await handle.write(buffer, 0, buffer.length, stats.size);
    });

    // Store the current write promise
    this.writeQueues.set(sessionId, currentWrite);

    // Wait for this write to complete
    await currentWrite;

    // Clean up if this was the last pending write
    if (this.writeQueues.get(sessionId) === currentWrite) {
      this.writeQueues.delete(sessionId);
    }
  }

  async load(sessionId: SessionID): Promise<EventEnvelope[]> {
    const filePath = this.getEventFilePath(sessionId);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content
        .trim()
        .split('\n')
        .filter(line => line.length > 0);

      return lines.map((line: string) => {
        try {
          return JSON.parse(line) as EventEnvelope;
        } catch (error: unknown) {
          const err = error instanceof Error ? error : new Error(String(error));
          throw new Error(
            `Failed to parse event line in ${filePath}: ${err.message}`
          );
        }
      });
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        // File doesn't exist yet, return empty array
        return [];
      }
      throw error;
    }
  }

  /**
   * Close all open file handles.
   * Should be called before process exit.
   * v1.5.0: Waits for all pending writes to complete before closing.
   */
  async close(): Promise<void> {
    // v1.5.0: Wait for all pending writes to complete
    const pendingWrites = Array.from(this.writeQueues.values());
    if (pendingWrites.length > 0) {
      await Promise.all(pendingWrites);
    }
    this.writeQueues.clear();

    const closePromises = Array.from(this.writeStreams.values()).map(handle =>
      handle.close()
    );
    await Promise.all(closePromises);
    this.writeStreams.clear();
  }

  /**
   * Get all session IDs that have event files.
   */
  async getSessionIds(): Promise<SessionID[]> {
    await this.ensureEventsDir();

    try {
      const files = await fs.readdir(this.eventsDir);

      return files
        .filter((file: string) => file.endsWith(FileExtensions.JSONL))
        .map(
          (file: string) => file.replace(FileExtensions.JSONL, '') as SessionID
        );
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}
