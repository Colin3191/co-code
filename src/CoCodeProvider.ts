import * as vscode from "vscode";
import * as path from "path";
import { getNonce } from "./utils/getNonce";
import { getUri } from "./utils/getUri";
import { ConfigManager } from './config/ConfigManager';
import { ContextStore } from './store/contextStore';
import { ContextService } from './services/context/ContextService';

export class CoCodeProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "co-code-sidebar";
  private _webviewView?: vscode.WebviewView;
  private _configManager: ConfigManager;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext,
    private readonly _contextStore: ContextStore,
    private readonly _contextService: ContextService,
  ) {
    this._configManager = new ConfigManager(_context);
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._webviewView = webviewView;
    const resourceRoots = [this._extensionUri];

    if (vscode.workspace.workspaceFolders) {
      resourceRoots.push(
        ...vscode.workspace.workspaceFolders.map((folder) => folder.uri)
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

    const postColorTheme = (theme: vscode.ColorTheme | vscode.ColorThemeKind) => {
      const kind = typeof theme === "number" ? theme : theme.kind;
      webviewView.webview.postMessage({
        type: "colorTheme",
        data: {
          kind,
        },
      });
    };

    postColorTheme(vscode.window.activeColorTheme);

    const themeChangeDisposable = vscode.window.onDidChangeActiveColorTheme(
      (theme) => postColorTheme(theme)
    );
    this._context.subscriptions.push(themeChangeDisposable);

    const postContextState = () => {
      if (!this._webviewView) {
        return;
      }
      this._webviewView.webview.postMessage({
        type: 'context:update',
        data: {
          entries: this._contextStore.getEntries(),
        },
      });
    };

    const storeDisposable = this._contextStore.onDidChange(() => {
      postContextState();
    });
    this._context.subscriptions.push(storeDisposable);
    const removeDisposable = this._contextStore.onDidRemove((uri) => {
      this._webviewView?.webview.postMessage({
        type: 'context:entryRemoved',
        data: { uri },
      });
    });
    this._context.subscriptions.push(removeDisposable);
    postContextState();

    // 监听来自webview的消息
    webviewView.webview.onDidReceiveMessage(
      async(message) => {
        switch (message.type) {
          case "ready":
            console.log("Co-Code侧边栏已准备就绪");
            postContextState();
            break;
          case "requestColorTheme":
            postColorTheme(vscode.window.activeColorTheme);
            break;
          case "getModelConfig":
            const modelConfig = await this._configManager.getModelConfig();
            webviewView.webview.postMessage({
              type: "modelConfig",
              data: modelConfig,
            });
            break;
          case "saveModelConfig":
            this._configManager.setModelConfig(message.data);
            break;
          case 'context:listFiles':
            try {
              const files = await this._contextService.listWorkspaceFiles();
              webviewView.webview.postMessage({
                type: 'context:fileList',
                data: { files },
              });
            } catch (error) {
              webviewView.webview.postMessage({
                type: 'context:fileList',
                data: { files: [], error: error instanceof Error ? error.message : String(error) },
              });
            }
            break;
          case 'context:addFile':
            if (typeof message.data?.uri === 'string') {
              await this._contextService.addFileContext(vscode.Uri.parse(message.data.uri));
            }
            break;
          case 'context:remove':
            if (typeof message.data?.uri === 'string') {
              this._contextService.removeContext(message.data.uri);
            }
            break;
        }
      },
      undefined,
      this._context.subscriptions
    );
  }

  private async getHMRHtmlContent(webview: vscode.Webview) {
    const localPort = "5173";
    const localServerUrl = `localhost:${localPort}`;
    const nonce = getNonce();
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource} 'unsafe-inline' http://${localServerUrl}`,
      `img-src ${webview.cspSource} http://${localServerUrl} data:`,
      `media-src ${webview.cspSource}`,
      `script-src 'unsafe-eval' ${webview.cspSource} http://${localServerUrl} 'nonce-${nonce}'`,
      `connect-src ${webview.cspSource} ws://${localServerUrl} http://${localServerUrl} https://*`,
    ];
    // 安装 es6-string-html 插件启用高亮
    return /*html */ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
        	<meta http-equiv="Content-Security-Policy" content="${csp.join("; ")}">
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
						window.PUBLIC_BASE_URI = "http://${localServerUrl}";
            window.vscode = acquireVsCodeApi();
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
      "webview-ui-dist",
      "assets",
      "index.css",
    ]);
    const scriptUri = getUri(webview, this._context.extensionUri, [
      "webview-ui-dist",
      "assets",
      "index.js",
    ]);
    const publicUri = getUri(webview, this._context.extensionUri, [
      "webview-ui-dist",
    ]);

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; media-src ${webview.cspSource}; script-src ${webview.cspSource} 'wasm-unsafe-eval' 'nonce-${nonce}' 'strict-dynamic'; connect-src ${webview.cspSource} https://*;">
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>co code</title>
          <script type="module" nonce="${nonce}" crossorigin src="${scriptUri}"></script>
          <script nonce="${nonce}">
						window.PUBLIC_BASE_URI = "${publicUri}";
            window.vscode = acquireVsCodeApi();
					</script>
          <link rel="stylesheet" crossorigin href="${styleUri}" />
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html> 
    `;
  }

  private _saveSettings(settings: any) {
    // 保存设置到全局状态
    this._context.globalState.update("coCodeSettings", settings);
    console.log("设置已保存:", settings);
  }

  private _sendSettingsToWebview(webview: vscode.Webview) {
    // 从全局状态加载设置
    const settings = this._context.globalState.get("coCodeSettings", {});

    webview.postMessage({
      type: "settingsLoaded",
      settings: settings,
    });
  }

  /**
   * 打开设置面板
   */
  public openSettingPanel() {
    if (this._webviewView) {
      this._webviewView.webview.postMessage({
        type: "openSettingPanel",
        timestamp: Date.now(),
      });
    }
  }
}
