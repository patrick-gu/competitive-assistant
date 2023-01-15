import * as vscode from "vscode";
import { TestsEditorNotebookSerializer } from "./notebook/TestsEditorNotebookSerializer";
import { TestsEditorNotebookController } from "./notebook/TestsEditorNotebookController";

export function activate(context: vscode.ExtensionContext) {
  console.log("Activating...");

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "competitive-assistant.create-solution",
      async () => {}
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "competitive-assistant.create-test",
      async () => {}
    )
  );

  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer(
      "competitive-assistant.tests-editor",
      new TestsEditorNotebookSerializer()
    )
  );

  TestsEditorNotebookController.register(context);

  console.log("Activated.");
}

export function deactivate() {}
