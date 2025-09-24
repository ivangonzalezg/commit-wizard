#!/usr/bin/env node
import { name, description, version } from "./package.json";
import { Command, Option } from "commander";
import { spawn } from "child_process";
import readline from "readline";
import { z } from "zod";
import { ChatCompletionMessageParam } from "openai/resources";
import { zodResponseFormat } from "openai/helpers/zod";
import { openAIChatCompletion } from "./src/openai";
import { geminiChatCompletion } from "./src/gemini";

const fullName = name
  .split("-")
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  .join(" ");

const defaultExcludedFiles = ["package-lock.json", "yarn.lock"];

const responseObject = z.object({
  title: z.string(),
  description: z.string(),
});

async function runCommand(
  command: [string, string[]],
  timeout: number = 10000
): Promise<string> {
  const commandCmd = spawn(...command);
  let commandOutput = "";
  commandCmd.stdout.on("data", (data) => {
    commandOutput += data.toString();
  });
  const output = await Promise.race([
    new Promise((resolve) =>
      setTimeout(() => {
        commandCmd.kill();
        resolve("");
      }, timeout)
    ),
    new Promise((resolve) =>
      commandCmd.stdout.on("end", () => resolve(commandOutput))
    ),
  ]);
  return output as string;
}

function lineToFilePath(line: string) {
  const [status, ...fileParts] = line.split("\t");
  if (status.startsWith("R")) {
    return fileParts[1];
  }
  return fileParts[0];
}

const prompt = `You're an experienced programmer known for your precise and effective commit messages. Review the output of git diff --staged and create a commit message. The commit should include a clear and concise title that accurately summarizes the purpose of the changes, followed by a brief description that outlines the key updates or modifications made. Ensure the description highlights any new functionality, bug fixes, or refactoring, and is no longer than 2 sentences. The commit message must follow best practices for clarity and relevance to maintain a well-organized project history.`;

const conventionalCommitsPrompt =
  "Format the commit title using the Conventional Commits specification: `type(scope): short imperative description`";

async function main() {
  const command = new Command()
    .name(name)
    .version(version, "-v, --version")
    .description(description)
    .addOption(
      new Option(
        "-d, --dry-run",
        "print the prompt without sending it to provider"
      )
    )
    .addOption(
      new Option(
        "-m, --message <message>",
        "custom message to include in the prompt"
      )
    )
    .addOption(
      new Option(
        "-e, --exclude <files>",
        "exclude files (comma separated values)"
      )
    )
    .addOption(
      new Option(
        "-c, --conventional-commits",
        "enforce commit message format as Conventional Commits"
      )
    )
    .addOption(
      new Option(
        "-p, --provider <provider>",
        "choose a provider to generate the commit message"
      )
        .choices(["openai", "gemini"])
        .default("gemini")
    );

  command.parse();

  const options = command.opts();

  if (!options.dryRun) {
    console.info(
      `🤖 ${fullName} v${version} is running with ${options.provider} as the AI provider.`
    );
  }

  if (options.provider && !["openai", "gemini"].includes(options.provider)) {
    console.error("Invalid provider. Please choose 'openai' or 'gemini'.");
    process.exit(1);
  }

  const excludedFiles = Array.from(
    new Set(
      (options.exclude ? options.exclude.split(",") : []).concat(
        defaultExcludedFiles
      )
    )
  );

  const files = await runCommand([
    "git",
    ["diff", "--staged", "--name-status"],
  ]);

  const stagedFiles = files.split("\n").filter(Boolean);

  if (!stagedFiles.length) {
    throw new Error("No files to diff.");
  }

  let gitStagedOutput = await runCommand([
    "git",
    [
      "diff",
      "--staged",
      "--",
      ...stagedFiles
        .map(lineToFilePath)
        .filter((file) => !excludedFiles.includes(file))
        .filter(Boolean),
    ],
  ]);

  if (!gitStagedOutput) {
    throw new Error("No staged changes found.");
  }

  gitStagedOutput = "```\n" + gitStagedOutput + "\n```";

  if (options.dryRun) {
    console.info(
      [
        prompt,
        options.conventionalCommits && conventionalCommitsPrompt,
        gitStagedOutput,
        options.message,
      ]
        .filter(Boolean)
        .join("\n\n")
    );
    process.exit();
  }

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: prompt },
  ];

  if (options.conventionalCommits) {
    messages.push({
      role: "system",
      content: conventionalCommitsPrompt,
    });
  }

  if (options.message) {
    messages.push({
      role: "user",
      content: options.message,
    });
  }

  messages.push({
    role: "user",
    content: gitStagedOutput,
  });

  const providerChatCompletion =
    options.provider === "gemini" ? geminiChatCompletion : openAIChatCompletion;

  const chatCompletionResponse = await providerChatCompletion(
    messages,
    zodResponseFormat(responseObject, "commit")
  );

  const commitMsgJson = JSON.parse(chatCompletionResponse) as z.infer<
    typeof responseObject
  >;

  if (!commitMsgJson) {
    throw new Error("Error parsing Chat GPT response.");
  }

  const commitMsg = commitMsgJson.title + "\n\n" + commitMsgJson.description;

  console.info(
    `\nProposed Commit:\n------------------------------\n${commitMsg}\n------------------------------`
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) =>
    rl.question("Do you want to continue? (Y/n)", (_answer) => {
      rl.close();
      resolve(_answer);
    })
  );

  if (answer.toLowerCase() === "n") {
    throw new Error("Commit aborted by user.");
  }

  console.info("Committing message...");

  const psCommit = spawn("git", ["commit", "-m", commitMsg], {
    stdio: "inherit",
  });

  const result = await new Promise<string>((resolve, reject) =>
    psCommit.on("close", (code) => {
      if (code !== 0) {
        reject(new Error("There was an error when creating the commit."));
      }
      resolve("Commit created successfully.");
    })
  );

  console.info(result);

  process.exit();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
