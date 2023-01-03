import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { dataToTests, testsToData } from "./SolutionData";
import { Node, Test, TestInput, TestOutput } from "./Test";

export class TestsProvider implements vscode.TreeDataProvider<Node> {
  private solutionEditor?: vscode.TextEditor;
  private tests?: Test[];
  private updateEmitter = new vscode.EventEmitter<null>();

  constructor(context: vscode.ExtensionContext) {
    this.changedEditor(vscode.window.activeTextEditor);
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor((e) => this.changedEditor(e))
    );
  }

  private async changedEditor(textEditor?: vscode.TextEditor) {
    this.solutionEditor = textEditor;
    if (
      this.solutionEditor === undefined ||
      this.solutionEditor.document.uri.scheme !== "file"
    ) {
      vscode.commands.executeCommand(
        "setContext",
        "competitive-assistant.welcome",
        "open-file"
      );
      this.updateTreeData();
      return;
    }
    const languageId = this.solutionEditor.document.languageId;
    if (!this.isLanguageSupported(languageId)) {
      vscode.commands.executeCommand(
        "setContext",
        "competitive-assistant.welcome",
        "unsupported-language"
      );
      this.updateTreeData();
      return;
    }
    await this.readSolutionData();
    if (this.tests === undefined) {
      vscode.commands.executeCommand(
        "setContext",
        "competitive-assistant.welcome",
        "create-solution"
      );
      this.updateTreeData();
      return;
    }
    vscode.commands.executeCommand(
      "setContext",
      "competitive-assistant.welcome",
      "create-test"
    );
    this.updateTreeData();
  }

  private isLanguageSupported(languageId: string) {
    return ["cpp", "python"].includes(languageId);
  }

  private async readSolutionData(): Promise<void> {
    if (
      this.solutionEditor === undefined ||
      this.solutionEditor.document.uri.scheme !== "file"
    ) {
      return;
    }
    const languageId = this.solutionEditor.document.languageId;
    if (!this.isLanguageSupported(languageId)) {
      return;
    }
    const filePath = this.solutionEditor.document.uri.fsPath;
    const dataPath = path.format({
      ...path.parse(filePath),
      base: "",
      ext: ".json",
    });
    this.tests = await fs
      .readFile(dataPath, { encoding: "utf-8" })
      .then((s) => JSON.parse(s))
      .then((d) => dataToTests(d))
      .catch(() => undefined);
    console.log(`Read solution data at ${dataPath} for ${filePath}`);
  }

  private async writeSolutionData(): Promise<void> {
    if (this.tests === undefined) {
      throw new Error("No solution");
    }
    const filePath = this.solutionEditor!.document.uri.fsPath;
    const dataPath = path.format({
      ...path.parse(filePath),
      base: "",
      ext: ".json",
    });
    await fs.writeFile(dataPath, JSON.stringify(testsToData(this.tests)));
    console.log(`Wrote solution data at ${dataPath} for ${filePath}`);
  }

  async createSolution() {
    if (
      this.solutionEditor === undefined ||
      this.solutionEditor.document.uri.scheme !== "file"
    ) {
      throw new Error("No file open");
    }
    const languageId = this.solutionEditor.document.languageId;
    if (!this.isLanguageSupported(languageId)) {
      throw new Error("Language not supported");
    }
    if (this.tests !== undefined) {
      throw new Error("Solution already exists");
    }
    this.tests = [];
    await this.writeSolutionData();
    vscode.commands.executeCommand(
      "setContext",
      "competitive-assistant.welcome",
      "create-test"
    );
    this.updateTreeData();
    console.log("Created solution.");
  }

  async createTest() {
    if (this.tests === undefined) {
      throw new Error("No solution exists");
    }
    this.tests.push(new Test(this.tests.length, "", ""));
    this.updateTreeData();
    await this.writeSolutionData();
    console.log("Created test.");
  }

  private updateTreeData() {
    this.updateEmitter.fire(null);
  }

  onDidChangeTreeData?:
    | vscode.Event<void | Node | Node[] | null | undefined>
    | undefined = this.updateEmitter.event;

  getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem> {
    if (element instanceof Test) {
      let item = new vscode.TreeItem(`Test Case ${element.index + 1}`);
      item.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
      // item.
      return item;
    }
    if (element instanceof TestInput) {
      return new vscode.TreeItem("Input");
    }
    if (element instanceof TestOutput) {
      return new vscode.TreeItem("Output");
    }
    throw new TypeError();
  }

  async getChildren(element?: Node | undefined): Promise<Node[] | undefined> {
    if (element === undefined) {
      if (
        this.solutionEditor === undefined ||
        this.solutionEditor.document.uri.scheme !== "file"
      ) {
        return [];
      }
      const languageId = this.solutionEditor.document.languageId;
      if (!this.isLanguageSupported(languageId)) {
        return [];
      }
      await this.readSolutionData();
      return this.tests ?? [];
    } else if (element instanceof Test) {
      return [element.input, element.output];
    }
  }

  getParent?(element: Node): vscode.ProviderResult<Node> {
    if (element instanceof TestInput) {
      return element.parent;
    }
    if (element instanceof TestOutput) {
      return element.parent;
    }
  }

  resolveTreeItem?(
    item: vscode.TreeItem,
    element: Test,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.TreeItem> {
    // if (element instanceof Test) {
    //   item.label = `Test Case ${element.index + 1}`;
    //   item.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    // }
    // if (element instanceof TestInput) {
    //   item.label = "Input";
    // }
    // if (element instanceof TestOutput) {
    //   item.label = "Output";
    // }
    return item;
  }
}
