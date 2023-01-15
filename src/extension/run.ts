import { spawn } from "node:child_process";
import * as consumers from "node:stream/consumers";

export function isSolutionLanguage(languageId: string): boolean {
  return ["python", "cpp"].includes(languageId);
}

export async function compile(
  path: string,
  languageId: string
): Promise<CompileResult> {
  const functions = new Map();
  functions.set("python", compilePython);
  functions.set("cpp", compileCpp);
  return await functions.get(languageId)(path);
}

export interface CompileResult {
  command: string;
  args: string[];
}

export async function compilePython(path: string): Promise<CompileResult> {
  return {
    command: "py",
    args: [path],
  };
}

export async function compileCpp(path: string) {
  throw new Error();
}

export async function run(
  compileResult: CompileResult,
  input: string,
  timeoutMs: number
): Promise<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
}> {
  const process = spawn(compileResult.command, compileResult.args);
  const exitPromise = new Promise<void>((resolve, reject) => {
    process.once("close", (code) => {
      resolve();
    });
  });
  const timerPromise = new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, timeoutMs);
  });
  const stdinPromise = new Promise<void>((resolve, reject) => {
    process.stdin.write(input, "utf8", (e) => {
      if (e === undefined || e === null) {
        resolve();
      } else {
        reject(e);
      }
    });
  });
  const stdoutPromise = consumers.text(process.stdout);
  const stderrPromise = consumers.text(process.stderr);
  await Promise.race([timerPromise, exitPromise]);
  if (process.exitCode === null) {
    process.kill("SIGKILL");
  }
  const stdout = await stdoutPromise;
  const stderr = await stderrPromise;
  return {
    exitCode: process.exitCode,
    stdout,
    stderr,
  };
}
