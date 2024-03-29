const { commandMap, supportedLanguages } = require("./instructions");
const { createCodeFile } = require("../file-system/createCodeFile");
const { removeCodeFile } = require("../file-system/removeCodeFile");
const { info } = require("./info");

const { spawn } = require("child_process");

async function runCode({ language = "", code = "", input = "" }) {
  try {
    const timeout = 30;

    if (!code.trim()) {
      throw {
        status: 400,
        error: "No code found to execute.",
      };
    }

    if (!supportedLanguages.includes(language)) {
      throw {
        status: 400,
        error: `Please enter a valid language. Supported languages: ${supportedLanguages.join(
          ", "
        )}.`,
      };
    }

    const { jobID } = await createCodeFile(language, code);
    const {
      compileCodeCommand,
      compilationArgs,
      executeCodeCommand,
      executionArgs,
      outputExt,
    } = commandMap(jobID, language);

    if (compileCodeCommand) {
      await new Promise((resolve, reject) => {
        const compileCode = spawn(compileCodeCommand, compilationArgs || []);
        compileCode.stderr.on("data", (error) => {
          reject({
            status: 200,
            output: "",
            error: error.toString(),
            language,
          });
        });
        compileCode.on("exit", () => {
          resolve();
        });
      });
    }

    const result = await new Promise((resolve, reject) => {
      // start a new process
      const executeCode = spawn(executeCodeCommand, executionArgs || []);
      let output = "",
        error = "";

      const timer = setTimeout(async () => {
        // to end(kill) child process
        executeCode.kill("SIGHUP");

        await removeCodeFile(jobID, language, outputExt);

        reject({
          status: 408,
          error: `Your code took too long to execute, over ${timeout} seconds. Make sure you are sending input as payload if your code expects an input.`,
        });
      }, timeout * 1000);

      if (input) {
        input.split("\n").forEach((line) => {
          executeCode.stdin.write(`${line}\n`);
        });
        executeCode.stdin.end();
      }

      // events

      executeCode.stdin.on("error", (err) => {
        console.log("stdin err", err);
      });

      executeCode.stdout.on("data", (data) => {
        output += data.toString();
      });

      executeCode.stderr.on("data", (data) => {
        error += data.toString();
      });

      executeCode.on("exit", (err) => {
        clearTimeout(timer);
        resolve({ output, error });
      });
    });

    await removeCodeFile(jobID, language, outputExt);

    return {
      ...result,
      language,
      info: await info(language),
    };
  } catch (error) {
    console.log("🚀 ~ runCode ~ error:", error);
  }
}

module.exports = { runCode };
