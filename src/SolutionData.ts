import { Test } from "./Test";

interface SolutionData {
  tests: {
    type: SolutionType;
    input?: string;
    output?: string;
  }[];
}

enum SolutionType {
  inputOutput = "input-output",
  //   generated = "generated",
}

export function dataToTests(data: SolutionData): Test[] {
    return data.tests.map(({ type, input, output }, i) => {
        return new Test(i, input ?? "", output ?? "")
    });
}

export function testsToData(tests: Test[]): SolutionData {
    return {
        tests: tests.map((test) => {
            return {
                type: SolutionType.inputOutput,
                input: test.input.data,
                output: test.output.data,
            };
        })
    }
}