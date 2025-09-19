import * as vscode from 'vscode';
import * as path from 'path';
import { getNonce } from './utils/getNonce';
import { getUri } from './utils/getUri';

export class CoCodeProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'co-code-sidebar';
  private _webviewView?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
  ) {}

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._webviewView = webviewView;
    const resourceRoots = [this._extensionUri];

    if (vscode.workspace.workspaceFolders) {
      resourceRoots.push(
        ...vscode.workspace.workspaceFolders.map((folder) => folder.uri),
      );
    }

    webviewView.webview.options = {
      // 允许在webview中运行脚本
      enableScripts: true,
      // 允许访问本地资源
      localResourceRoots: resourceRoots,
    };

    // 设置webview的HTML内容
    webviewView.webview.html =
      this._context.extensionMode === vscode.ExtensionMode.Development
        ? await this.getHMRHtmlContent(webviewView.webview)
        : this.getHtmlForWebview(webviewView.webview);

    // 监听来自webview的消息
    webviewView.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
          case 'ready':
            console.log('Co-Code侧边栏已准备就绪');
            // 发送当前设置到webview
            this._sendSettingsToWebview(webviewView.webview);
            break;

          case 'saveSettings':
            this._saveSettings(message.settings);
            break;

          case 'loadSettings':
            this._sendSettingsToWebview(webviewView.webview);
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
    const localServerUrl = `localhost:${localPort}`;
    const nonce = getNonce();
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource} 'unsafe-inline' http://${localServerUrl}`,
      `img-src ${webview.cspSource} http://${localServerUrl} data:`,
      `media-src ${webview.cspSource}`,
      `script-src 'unsafe-eval' ${webview.cspSource} http://${localServerUrl} 'nonce-${nonce}'`,
      `connect-src ${webview.cspSource} ws://${localServerUrl} http://${localServerUrl}`,
    ];
    // 安装 es6-string-html 插件启用高亮
    return /*html */ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
        	<meta http-equiv="Content-Security-Policy" content="${csp.join('; ')}">
          <script type="module" nonce="${nonce}">
            import { injectIntoGlobalHook } from 'http://${localServerUrl}/@react-refresh';
            injectIntoGlobalHook(window);
            window.$RefreshReg$ = () => {};
            window.$RefreshSig$ = () => (type) => type;
          </script>
          <script type="module" nonce="${nonce}" src="http://${localServerUrl}/@vite/client"></script>
          <meta charset="UTF-8" />
          <link rel="icon" type="image/svg+xml" href="http://${localServerUrl}/vite.svg" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>co code</title>
          <script nonce="${nonce}">
						window.PUBLIC_BASE_URI = "http://${localServerUrl}"
					</script>
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
    const styleUri = getUri(webview, this._context.extensionUri, [
      'webview-ui-dist',
      'assets',
      'index.css',
    ]);
    const scriptUri = getUri(webview, this._context.extensionUri, [
      'webview-ui-dist',
      'assets',
      'index.js',
    ]);
    const publicUri = getUri(webview, this._context.extensionUri, [
      'webview-ui-dist',
    ]);

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; media-src ${webview.cspSource}; script-src ${webview.cspSource} 'wasm-unsafe-eval' 'nonce-${nonce}' 'strict-dynamic'; connect-src ${webview.cspSource};">
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>co code</title>
          <script type="module" nonce="${nonce}" crossorigin src="${scriptUri}"></script>
          <script nonce="${nonce}">
						window.PUBLIC_BASE_URI = "${publicUri}"
					</script>
          <link rel="stylesheet" crossorigin href="${styleUri}" />
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

  private _sendSettingsToWebview(webview: vscode.Webview) {
    // 从全局状态加载设置
    const settings = this._context.globalState.get('coCodeSettings', {
      apiKey: '',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2048,
      autoSave: true,
    });

    webview.postMessage({
      type: 'settingsLoaded',
      settings: settings,
    });
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

  /**
   * 打开设置面板
   */
  public openSettingPanel() {
    if (this._webviewView) {
      this._webviewView.webview.postMessage({
        type: 'openSettingPanel',
        timestamp: Date.now(),
      });
      this._webviewView.show();
    }
  }
}
