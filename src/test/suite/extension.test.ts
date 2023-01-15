import * as assert from "assert";
import * as path from "node:path";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Open", async () => {
    await vscode.commands.executeCommand(
      "vscode.openFolder",
      vscode.Uri.file(path.join(__dirname, "../../../example"))
    );
    await vscode.commands.executeCommand(
      "vscode.open",
      vscode.Uri.file(path.join(__dirname, "../../../example/double.py"))
    );
  });
});
