import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { compile, CompileResult, isSolutionLanguage, run } from "../run";

export class TestsEditorNotebookController {
  static register(context: vscode.ExtensionContext) {
    context.subscriptions.push(new TestsEditorNotebookController(context));
  }

  private readonly controller: vscode.NotebookController =
    vscode.notebooks.createNotebookController(
      "competitive-assistant.tests-editor-controller",
      "competitive-assistant.tests-editor",
      "Tests Editor Controller"
    );

  private static readonly supportedDataLanguages = ["plaintext"];

  private static isSupported(languageId: string): boolean {
    return this.supportedDataLanguages.includes(languageId);
  }

  private readonly changedEditorSubscription =
    vscode.window.onDidChangeActiveTextEditor((e) => this.changedEditor(e));

  private constructor(context: vscode.ExtensionContext) {
    this.controller.supportedLanguages =
      TestsEditorNotebookController.supportedDataLanguages;
    this.controller.supportsExecutionOrder = false;
    this.controller.executeHandler = this.execute.bind(this);

    context.subscriptions.push(this.changedEditorSubscription);
    this.changedEditor(vscode.window.activeTextEditor);
  }

  private solutionEditor?: vscode.TextEditor;

  private async changedEditor(textEditor?: vscode.TextEditor): Promise<void> {
    if (textEditor === undefined) {
      this.solutionEditor = undefined;
      return;
    }
    const fileName = textEditor.document.fileName;
    if (fileName.endsWith(".tests.json")) {
      return;
    }
    this.solutionEditor = textEditor;
    const filePath = path.parse(textEditor.document.uri.fsPath);
    const dataPath = path.format({
      ...filePath,
      base: "",
      ext: ".tests.json",
    });
    try {
      await fs.promises.access(dataPath, fs.constants.F_OK);
    } catch (e) {
      return;
    }
    const dataUri = vscode.Uri.file(dataPath);
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.uri.toString() === dataUri.toString()) {
        return;
      }
    }
    for (const editor of vscode.window.visibleNotebookEditors) {
      if (editor.notebook.uri.toString() === dataUri.toString()) {
        return;
      }
    }
    for (const document of vscode.workspace.notebookDocuments) {
      if (document.uri.toString() === dataUri.toString()) {
        vscode.window.showNotebookDocument(document, {
          viewColumn: vscode.ViewColumn.Beside,
        });
        return;
      }
    }
    const notebookDocument = await vscode.workspace.openNotebookDocument(
      vscode.Uri.file(dataPath)
    );
    vscode.window.showNotebookDocument(notebookDocument, {
      viewColumn: vscode.ViewColumn.Beside,
    });
  }

  private identifySolutionEditor(
    notebook: vscode.NotebookDocument
  ): vscode.TextEditor | undefined {
    const solutionEditor = this.solutionEditor;
    if (solutionEditor !== undefined) {
      if (!isSolutionLanguage(solutionEditor.document.languageId)) {
        vscode.window.showErrorMessage(
          `Unsupported solution language: ${solutionEditor.document.languageId}`
        );
        return undefined;
      } else {
        return solutionEditor;
      }
    }

    const notebookUri = notebook.uri.toString();
    let ansEditor = undefined;
    for (const editor of vscode.window.visibleTextEditors) {
      const filePath = path.parse(editor.document.uri.fsPath);
      const dataPath = path.format({
        ...filePath,
        base: "",
        ext: ".tests.json",
      });
      const dataUri = vscode.Uri.file(dataPath);
      if (dataUri.toString() === notebookUri) {
        if (ansEditor === undefined) {
          ansEditor = editor;
        } else {
          vscode.window.showErrorMessage(
            "Multiple possible solutions are open"
          );
          return undefined;
        }
      }
    }
    if (ansEditor === undefined) {
      vscode.window.showErrorMessage("No solution is open");
    }
    return ansEditor;
  }

  private async execute(
    cells: vscode.NotebookCell[],
    notebook: vscode.NotebookDocument,
    controller: vscode.NotebookController
  ): Promise<void> {
    const editor = this.identifySolutionEditor(notebook);
    if (editor === undefined) {
      return;
    }

    const compileResult = await compile(
      editor.document.uri.fsPath,
      editor.document.languageId
    );

    const allCells = notebook.getCells();
    const indicesToExecute: Set<number> = new Set();
    for (const cellToExecute of cells) {
      const index = cellToExecute.index;
      if (index === -1) {
        continue;
      }
      const curSupported = TestsEditorNotebookController.isSupported(
        cellToExecute.document.languageId
      );
      const nextSupported =
        index !== allCells.length - 1 &&
        TestsEditorNotebookController.supportedDataLanguages.includes(
          allCells[index + 1].document.languageId
        );
      const lastSupported =
        index !== 0 &&
        TestsEditorNotebookController.supportedDataLanguages.includes(
          allCells[index - 1].document.languageId
        );
      if (curSupported) {
        if (nextSupported && !lastSupported) {
          indicesToExecute.add(index);
        } else if (lastSupported && !nextSupported) {
          indicesToExecute.add(index - 1);
        }
      }
    }
    for (const index of indicesToExecute) {
      const input = allCells[index];
      const output = allCells[index + 1];
      this.executeCell(compileResult, input, output);
    }
  }

  private async executeCell(
    compileResult: CompileResult,
    input: vscode.NotebookCell,
    output: vscode.NotebookCell
  ): Promise<void> {
    const inputData = input.document.getText();
    const expectedOutput = output.document.getText();

    const inputExecution = this.controller.createNotebookCellExecution(input);
    const outputExecution = this.controller.createNotebookCellExecution(output);
    const startTime = Date.now();
    inputExecution.start(startTime);
    outputExecution.start(startTime);

    const res = await run(compileResult, inputData, 1000);

    const runSuccess = res.exitCode === 0;
    const foundStdout = res.stdout;
    const foundStderr = res.stderr;
    const outputSuccess = runSuccess && foundStdout === expectedOutput;

    await inputExecution.replaceOutput([
      new vscode.NotebookCellOutput([
        vscode.NotebookCellOutputItem.stderr(foundStderr),
      ]),
    ]);

    await outputExecution.replaceOutput([
      new vscode.NotebookCellOutput([
        vscode.NotebookCellOutputItem.stdout(foundStdout),
      ]),
    ]);

    const endTime = Date.now();
    inputExecution.end(runSuccess, endTime);
    outputExecution.end(outputSuccess, endTime);
  }

  dispose(): void {
    this.controller.dispose();
    this.changedEditorSubscription.dispose();
  }
}
