import * as vscode from 'vscode';
import { createHash } from 'crypto';
import { ContextStore } from '../../store/contextStore';
import {
  type ContextEntryFile,
  type WorkspaceFileItem,
} from '../../types/context';
import {
  formatFileSize,
  readFilePreview,
  toWorkspaceRelativePath,
} from '../../utils/fileSystem';

const SOFT_LIMIT_BYTES = 200 * 1024;
const HARD_LIMIT_BYTES = 1024 * 1024;
const MAX_PREVIEW_LINES = 400;
const FIND_FILES_LIMIT = 400;
const EXCLUDE_GLOBS = '{**/node_modules/**,**/.git/**,**/dist/**,**/out/**,**/.svn/**,**/tmp/**,**/.vscode/**}';

export class ContextService {
  private readonly recentFileMap = new Map<string, WorkspaceFileItem>();

  constructor(private readonly store: ContextStore) {}

  public async addFileContext(uri: vscode.Uri, descriptor?: WorkspaceFileItem) {
    const stat = await vscode.workspace.fs.stat(uri);
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    const relativePath = workspaceFolder ? toWorkspaceRelativePath(workspaceFolder, uri) : uri.fsPath;

    if (stat.size > HARD_LIMIT_BYTES) {
      const confirm = await vscode.window.showWarningMessage(
        `文件 ${relativePath} (${formatFileSize(stat.size)}) 超出 ${formatFileSize(HARD_LIMIT_BYTES)}，仅支持截断添加。`,
        { modal: true },
        '截断添加',
        '取消',
      );
      if (confirm !== '截断添加') {
        return;
      }
    }

    const wouldTruncate = stat.size > SOFT_LIMIT_BYTES;

    if (wouldTruncate && stat.size <= HARD_LIMIT_BYTES) {
      const proceed = await vscode.window.showWarningMessage(
        `文件 ${relativePath} (${formatFileSize(stat.size)}) 将被截断到 ${formatFileSize(SOFT_LIMIT_BYTES)}。`,
        '继续',
        '取消',
      );
      if (proceed !== '继续') {
        return;
      }
    }

    try {
      const preview = await readFilePreview(uri, {
        maxBytes: stat.size > SOFT_LIMIT_BYTES ? SOFT_LIMIT_BYTES : stat.size,
        maxLines: MAX_PREVIEW_LINES,
      });

      const hash = createHash('sha256').update(preview.content).digest('hex');
      const existing = this.store.getEntryByUri(uri.toString());
      const createdAt = existing?.createdAt ?? Date.now();

      const entry: ContextEntryFile = {
        id: existing?.id ?? `${Date.now()}-${hash.slice(0, 8)}`,
        kind: 'file',
        label: relativePath,
        createdAt,
        uri: uri.toString(),
        relativePath,
        workspaceFolder: workspaceFolder?.name,
        size: stat.size,
        hash,
        truncated: preview.truncated || wouldTruncate || stat.size > HARD_LIMIT_BYTES,
        totalLines: preview.totalLines,
        preview: preview.content,
        previewLineCount: preview.previewLineCount,
        encoding: preview.encoding,
        mentionCount: existing?.mentionCount ?? 0,
      };

      this.store.upsert(entry);
      this.bumpRecent(uri.toString(), descriptor ?? this.toWorkspaceFileItem(entry, stat.mtime));
    } catch (error) {
      if (error instanceof Error && error.message === 'BINARY_FILE') {
        vscode.window.showWarningMessage(`文件 ${relativePath} 看起来是二进制文件，无法添加到上下文。`);
        return;
      }
      vscode.window.showErrorMessage(`读取文件 ${relativePath} 失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public getRecentItems(): WorkspaceFileItem[] {
    return Array.from(this.recentFileMap.values()).reverse().slice(0, 5);
  }

  public removeContext(uri: string) {
    this.store.removeByUri(uri);
  }

  public async listWorkspaceFiles(): Promise<WorkspaceFileItem[]> {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      return [];
    }
    const files = await vscode.workspace.findFiles('**/*', EXCLUDE_GLOBS, FIND_FILES_LIMIT);
    const items: WorkspaceFileItem[] = [];
    const recentUris = new Set(this.store.getRecentUris());

    const stats = await Promise.all(
      files.map(async (uri) => {
        try {
          const stat = await vscode.workspace.fs.stat(uri);
          return { uri, stat } as const;
        } catch (error) {
          console.error('读取文件信息失败', uri.toString(), error);
          return undefined;
        }
      }),
    );

    for (const entry of stats) {
      if (!entry) {
        continue;
      }
      const { uri, stat } = entry;
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
      const relativePath = workspaceFolder ? toWorkspaceRelativePath(workspaceFolder, uri) : uri.fsPath;
      const description = workspaceFolder ? workspaceFolder.name : undefined;
      const detailParts = [formatFileSize(stat.size)];
      if (recentUris.has(uri.toString())) {
        detailParts.push('最近');
      }
      if (stat.size > HARD_LIMIT_BYTES) {
        detailParts.push('超大文件');
      }

      const detail = detailParts.join(' • ');

      const item: WorkspaceFileItem = {
        label: relativePath,
        description,
        detail,
        uri: uri.toString(),
        size: stat.size,
        mtime: stat.mtime,
        workspaceFolder: workspaceFolder?.name,
        isRecent: recentUris.has(uri.toString()),
        isTooLarge: stat.size > HARD_LIMIT_BYTES,
      };

      items.push(item);
    }

    const recents = this.getRecentItems();
    const recentIds = new Set(recents.map((item) => item.uri));
    const ordered = [
      ...recents,
      ...items.filter((item) => !recentIds.has(item.uri)),
    ];

    return ordered;
  }

  private bumpRecent(uri: string, item: WorkspaceFileItem) {
    this.recentFileMap.delete(uri);
    this.recentFileMap.set(uri, { ...item, isRecent: true });
    while (this.recentFileMap.size > 10) {
      const key = this.recentFileMap.keys().next().value;
      if (!key) {
        break;
      }
      this.recentFileMap.delete(key);
    }
  }

  private toWorkspaceFileItem(entry: ContextEntryFile, mtime: number): WorkspaceFileItem {
    return {
      label: entry.relativePath,
      description: entry.workspaceFolder,
      detail: formatFileSize(entry.size),
      uri: entry.uri,
      size: entry.size,
      mtime,
      workspaceFolder: entry.workspaceFolder,
      isRecent: true,
      truncated: entry.truncated,
    };
  }
}
