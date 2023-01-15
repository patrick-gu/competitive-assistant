import { TextDecoder, TextEncoder } from "util";
import * as vscode from "vscode";
import { TestsEditorNotebookData } from "./TestsEditorNotebookData";

export class TestsEditorNotebookSerializer
  implements vscode.NotebookSerializer
{
  deserializeNotebook(
    content: Uint8Array,
    token: vscode.CancellationToken
  ): vscode.NotebookData | Thenable<vscode.NotebookData> {
    const string = new TextDecoder().decode(content);
    const data: TestsEditorNotebookData = JSON.parse(string);
    return new vscode.NotebookData(
      data.cells.map((cellData) => {
        return new vscode.NotebookCellData(
          cellData.kind,
          cellData.text.replaceAll("\r\n", "\n"),
          cellData.languageId
        );
      })
    );
  }
  serializeNotebook(
    data: vscode.NotebookData,
    token: vscode.CancellationToken
  ): Uint8Array | Thenable<Uint8Array> {
    const dataJson: TestsEditorNotebookData = {
      metadata: data.metadata,
      cells: data.cells.map((cell) => ({
        kind: cell.kind,
        text: cell.value.replaceAll("\r\n", "\n"),
        languageId: cell.languageId,
      })),
    };
    const string = JSON.stringify(dataJson);
    return new TextEncoder().encode(string);
  }
}
