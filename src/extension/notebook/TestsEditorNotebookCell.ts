import * as vscode from "vscode";

export interface TestsEditorNotebookCell {
  kind: vscode.NotebookCellKind;
  languageId: string;
  text: string;
}
