export type ContextEntryKind = 'file';

export interface ContextEntryBase {
  id: string;
  kind: ContextEntryKind;
  label: string;
  createdAt: number;
}

export interface ContextFileMetadata {
  uri: string;
  relativePath: string;
  workspaceFolder?: string;
}

export interface ContextEntryFile extends ContextEntryBase, ContextFileMetadata {
  kind: 'file';
  size: number;
  hash: string;
  truncated: boolean;
  totalLines: number;
  preview: string;
  previewLineCount: number;
  encoding: string;
  mentionCount: number;
}

export type ContextEntry = ContextEntryFile;

export interface WorkspaceFileItem {
  uri: string;
  size: number;
  mtime: number;
  workspaceFolder?: string;
  isRecent?: boolean;
  isTooLarge?: boolean;
  truncated?: boolean;
  label: string;
  description?: string;
  detail?: string;
}

export interface ContextUpdatePayload {
  entries: ContextEntry[];
}
