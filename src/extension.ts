import * as vscode from "vscode";
import { TestsProvider } from "./TestsProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log("Activating...");

  const treeDataProvider = new TestsProvider(context);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "competitive-assistant.create-solution",
      async () => {
        await treeDataProvider.createSolution();
      }
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "competitive-assistant.create-test",
      async () => {
        await treeDataProvider.createTest();
      }
    )
  );

  vscode.window.createTreeView("competitive-assistant-panel-tests", {
    treeDataProvider,
  });

  console.log("Activated.");
}

export function deactivate() {}
