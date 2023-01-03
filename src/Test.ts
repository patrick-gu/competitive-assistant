export type Node = Test | TestInput | TestOutput;

export class Test {
  index: number;

  input: TestInput;
  output: TestOutput;

  constructor(index: number, input: string, output: string) {
    this.index = index;
    this.input = new TestInput(this, input);
    this.output = new TestOutput(this, output);
  }
}

export class TestInput {
  parent: Test;
  data: string;

  constructor(parent: Test, data: string) {
    this.parent = parent;
    this.data = data;
  }
}

export class TestOutput {
  parent: Test;
  data: string;

  constructor(parent: Test, data: string) {
    this.parent = parent;
    this.data = data;
  }
}
