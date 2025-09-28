import * as vscode from 'vscode';
import { type ContextEntry, type ContextEntryFile } from '../types/context';

const RECENT_LIMIT = 5;

export class ContextStore implements vscode.Disposable {
  private readonly entries = new Map<string, ContextEntry>();
  private readonly order: string[] = [];
  private readonly onDidChangeEmitter = new vscode.EventEmitter<ContextEntry[]>();
  private readonly onDidRemoveEmitter = new vscode.EventEmitter<string>();

  public readonly onDidChange = this.onDidChangeEmitter.event;
  public readonly onDidRemove = this.onDidRemoveEmitter.event;

  public upsert(entry: ContextEntry) {
    const key = this.toKey(entry);
    const existing = this.entries.get(key);

    if (existing) {
      const updated: ContextEntry = {
        ...existing,
        ...entry,
        createdAt: existing.createdAt,
        mentionCount: entry.mentionCount ?? (existing as ContextEntryFile).mentionCount,
      };
      this.entries.set(key, updated);
      this.bumpOrder(key);
    } else {
      this.entries.set(key, entry);
      this.order.unshift(key);
    }

    this.fireChange();
  }

  public getEntries(): ContextEntry[] {
    return this.order.map((key) => this.entries.get(key)).filter(Boolean) as ContextEntry[];
  }

  public getEntryByUri(uri: string): ContextEntryFile | undefined {
    return this.entries.get(this.toKeyFromUri('file', uri)) as ContextEntryFile | undefined;
  }

  public removeByUri(uri: string) {
    const key = this.toKeyFromUri('file', uri);
    if (!this.entries.has(key)) {
      return;
    }
    this.entries.delete(key);
    const index = this.order.indexOf(key);
    if (index >= 0) {
      this.order.splice(index, 1);
    }
    this.fireChange();
    this.onDidRemoveEmitter.fire(uri);
  }

  public clear() {
    if (this.entries.size === 0) {
      return;
    }
    this.entries.clear();
    this.order.length = 0;
    this.fireChange();
  }

  public getRecentUris(): string[] {
    return this.order.slice(0, RECENT_LIMIT).map((key) => this.entries.get(key)).filter((entry): entry is ContextEntryFile => Boolean(entry)).map((entry) => entry.uri);
  }

  public dispose() {
    this.onDidChangeEmitter.dispose();
    this.onDidRemoveEmitter.dispose();
  }

  private fireChange() {
    this.onDidChangeEmitter.fire(this.getEntries());
  }

  private bumpOrder(key: string) {
    const index = this.order.indexOf(key);
    if (index > 0) {
      this.order.splice(index, 1);
      this.order.unshift(key);
    } else if (index === -1) {
      this.order.unshift(key);
    }
  }

  private toKey(entry: ContextEntry) {
    return this.toKeyFromUri(entry.kind, (entry as ContextEntryFile).uri);
  }

  private toKeyFromUri(kind: string, uri: string) {
    return `${kind}:${uri}`;
  }
}
