import * as vscode from 'vscode';

const DEFAULT_ENCODING = 'utf-8';
const ZERO_BYTE = 0x00;
const CONTROL_CHAR_THRESHOLD = 0.3;

export interface FilePreviewOptions {
  maxBytes: number;
  maxLines: number;
}

export interface FilePreviewResult {
  content: string;
  truncated: boolean;
  totalBytes: number;
  totalLines: number;
  previewLineCount: number;
  encoding: string;
}

export const isBinaryBuffer = (buffer: Uint8Array) => {
  if (buffer.length === 0) {
    return false;
  }

  let controlCharCount = 0;
  const sampleLength = Math.min(buffer.length, 1024);

  for (let index = 0; index < sampleLength; index += 1) {
    const byte = buffer[index];
    if (byte === ZERO_BYTE) {
      return true;
    }
    if (byte < 7 || (byte > 13 && byte < 32)) {
      controlCharCount += 1;
    }
  }

  return controlCharCount / sampleLength > CONTROL_CHAR_THRESHOLD;
};

export const readFilePreview = async (
  uri: vscode.Uri,
  options: FilePreviewOptions,
): Promise<FilePreviewResult> => {
  const buffer = await vscode.workspace.fs.readFile(uri);
  const totalBytes = buffer.byteLength;
  const previewBuffer = totalBytes > options.maxBytes ? buffer.slice(0, options.maxBytes) : buffer;

  if (isBinaryBuffer(previewBuffer)) {
    throw new Error('BINARY_FILE');
  }

  const decoder = new TextDecoder(DEFAULT_ENCODING, { fatal: false });
  const decoded = decoder.decode(previewBuffer);
  const totalLines = decoded.split(/\r?\n/).length;

  let content = decoded;
  let previewLineCount = totalLines;
  let truncated = totalBytes > options.maxBytes;

  if (previewLineCount > options.maxLines) {
    const previewLines = decoded.split(/\r?\n/).slice(0, options.maxLines);
    content = previewLines.join('\n');
    previewLineCount = previewLines.length;
    truncated = true;
  }

  return {
    content,
    truncated,
    totalBytes,
    totalLines,
    previewLineCount,
    encoding: DEFAULT_ENCODING,
  };
};

export const toWorkspaceRelativePath = (workspaceFolder: vscode.WorkspaceFolder, uri: vscode.Uri) => {
  return vscode.workspace.asRelativePath(uri, false);
};

export const formatFileSize = (sizeInBytes: number) => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }
  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
};
