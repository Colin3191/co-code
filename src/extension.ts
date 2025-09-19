// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CoCodeProvider } from './CoCodeProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "co-code" is now active!');

  // 注册侧边栏面板提供者
  const sidebarProvider = new CoCodeProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CoCodeProvider.viewType,
      sidebarProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
  );

  const openSidebarCommand = vscode.commands.registerCommand(
    'co-code.openSidebar',
    () => {
      vscode.commands.executeCommand('co-code-sidebar.focus');
    },
  );

  const openSettingPanelCommand = vscode.commands.registerCommand(
    'co-code.openSettingPanel',
    () => {
      sidebarProvider.openSettingPanel();
    },
  );

  // 添加到订阅列表
  context.subscriptions.push(openSidebarCommand, openSettingPanelCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
