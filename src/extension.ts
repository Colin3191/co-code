// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CoCodeProvider } from './CoCodeProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "co-code" is now active!');

  // 注册侧边栏面板提供者
  const sidebarProvider = new CoCodeProvider(
    context.extensionUri,
    context,
  );
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

  // 注册命令
  const helloWorldCommand = vscode.commands.registerCommand(
    'co-code.helloWorld',
    () => {
      vscode.window.showInformationMessage('Hello World from co-code!');
    },
  );

  const openSidebarCommand = vscode.commands.registerCommand(
    'co-code.openSidebar',
    () => {
      vscode.commands.executeCommand('co-code-sidebar.focus');
    },
  );

  // 注册代码操作命令
  const explainCodeCommand = vscode.commands.registerCommand(
    'co-code.explainCode',
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        if (selectedText) {
          // 发送消息到侧边栏
          vscode.commands.executeCommand('co-code-sidebar.focus');
          // 这里可以添加更多逻辑来与侧边栏交互
        } else {
          vscode.window.showWarningMessage('请先选择要解释的代码');
        }
      }
    },
  );

  const optimizeCodeCommand = vscode.commands.registerCommand(
    'co-code.optimizeCode',
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        if (selectedText) {
          vscode.commands.executeCommand('co-code-sidebar.focus');
        } else {
          vscode.window.showWarningMessage('请先选择要优化的代码');
        }
      }
    },
  );

  // 添加到订阅列表
  context.subscriptions.push(
    helloWorldCommand,
    openSidebarCommand,
    explainCodeCommand,
    optimizeCodeCommand,
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
