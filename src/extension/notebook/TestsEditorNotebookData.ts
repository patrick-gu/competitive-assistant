import { TestsEditorNotebookCell } from "./TestsEditorNotebookCell";

export interface TestsEditorNotebookData {
  metadata?: { [key: string]: any };
  cells: TestsEditorNotebookCell[];
}
