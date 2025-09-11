import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';
import { getNonce } from './utils/getNonce';

export class CoCodeProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'co-code-sidebar';

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
  ) {}

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    webviewView.webview.options = {
      // 允许在webview中运行脚本
      enableScripts: true,
      // 允许访问本地资源
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'webview')],
    };

    // 设置webview的HTML内容
    webviewView.webview.html = await this.getHMRHtmlContent(
      webviewView.webview,
    );
    // this._getHtmlForWebview(webviewView.webview);

    // 监听来自webview的消息
    webviewView.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
          case 'ready':
            console.log('Co-Code侧边栏已准备就绪');
            break;

          case 'saveSettings':
            this._saveSettings(message.settings);
            break;

          case 'insertCode':
            this._insertCodeToEditor(message.code);
            break;

          case 'getCurrentCode':
            this._sendCurrentCodeToWebview(webviewView.webview);
            break;

          case 'showNotification':
            vscode.window.showInformationMessage(message.message);
            break;
        }
      },
      undefined,
      this._context.subscriptions,
    );
  }

  private async getHMRHtmlContent(webview: vscode.Webview) {
    const localPort = '5173';
    const localServerUrl = `http://localhost:${localPort}`;
    try {
      await axios.get(localServerUrl);
    } catch (error) {
      vscode.window.showErrorMessage(`访问${localServerUrl}本地开发服务失败`);
    }
    const nonce = getNonce();
    const csp = [
      "default-src 'none'",
      `font-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource} 'unsafe-inline' https://* http://${localServerUrl} http://0.0.0.0:${localPort}`,
      `img-src ${webview.cspSource} https://* data:`,
      `media-src ${webview.cspSource}`,
      `script-src 'unsafe-eval' ${webview.cspSource} https://* http://${localServerUrl} http://0.0.0.0:${localPort} 'nonce-${nonce}'`,
      `connect-src ${webview.cspSource} https://* ws://${localServerUrl} ws://0.0.0.0:${localPort} http://${localServerUrl} http://0.0.0.0:${localPort}`,
    ];
    // 安装 es6-string-html 插件启用高亮
    return /*html */ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
        	<meta http-equiv="Content-Security-Policy" content="${csp.join('; ')}">
          <script type="module" nonce="${nonce}">
            import { injectIntoGlobalHook } from 'http://localhost:${localPort}/@react-refresh';
            injectIntoGlobalHook(window);
            window.$RefreshReg$ = () => {};
            window.$RefreshSig$ = () => (type) => type;
          </script>
          <script type="module" nonce="${nonce}" src="http://localhost:${localPort}/@vite/client"></script>
          <meta charset="UTF-8" />
          <link rel="icon" type="image/svg+xml" href="http://localhost:${localPort}/vite.svg" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>co code</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="http://localhost:${localPort}/src/main.tsx"></script>
        </body>
      </html>
`;
  }

  private getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; media-src ${webview.cspSource}; script-src ${webview.cspSource} 'wasm-unsafe-eval' 'nonce-${nonce}' 'strict-dynamic'; connect-src ${webview.cspSource};">
          <meta charset="UTF-8" />
          <link rel="icon" type="image/svg+xml" href="/vite.svg" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>co code</title>
          <script type="module" crossorigin src="/assets/index-BKroMzMQ.js"></script>
          <link rel="stylesheet" crossorigin href="/assets/index-D8b4DHJx.css" />
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html>  
    `;
  }

  private _readFile(uri: vscode.Uri): string | undefined {
    try {
      const fs = require('fs');
      return fs.readFileSync(uri.fsPath, 'utf8');
    } catch (error) {
      console.error('读取文件失败:', error);
      return undefined;
    }
  }

  private _saveSettings(settings: any) {
    // 保存设置到全局状态
    this._context.globalState.update('coCodeSettings', settings);
    console.log('设置已保存:', settings);
  }

  private _insertCodeToEditor(code: string) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const position = editor.selection.active;
      editor.edit((editBuilder) => {
        editBuilder.insert(position, code);
      });
    } else {
      vscode.window.showWarningMessage('请先打开一个文件');
    }
  }

  private _sendCurrentCodeToWebview(webview: vscode.Webview) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const document = editor.document;
      const selection = editor.selection;
      const selectedText = document.getText(selection);
      const fullText = document.getText();

      webview.postMessage({
        type: 'updateCode',
        selectedText: selectedText,
        fullText: fullText,
        language: document.languageId,
        fileName: path.basename(document.fileName),
      });
    }
  }
}
