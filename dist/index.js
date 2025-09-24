#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const child_process_1 = require("child_process");
const readline_1 = __importDefault(require("readline"));
const openai_1 = __importDefault(require("openai"));
const package_json_1 = require("./package.json");
const zod_1 = require("openai/helpers/zod");
const zod_2 = require("zod");
if (!process.env.OPENAI_API_KEY) {
    throw new Error("The OpenAI API key (OPENAI_API_KEY) is not defined. Please set it in your environment variables.");
}
function getName() {
    return package_json_1.name
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}
const client = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const CommitInfo = zod_2.z.object({
    title: zod_2.z.string(),
    description: zod_2.z.string(),
});
async function runCommand(command, timeout = 10000) {
    const commandCmd = (0, child_process_1.spawn)(...command);
    let commandOutput = "";
    commandCmd.stdout.on("data", (data) => {
        commandOutput += data.toString();
    });
    const output = await Promise.race([
        new Promise((resolve) => setTimeout(() => {
            commandCmd.kill();
            resolve("");
        }, timeout)),
        new Promise((resolve) => commandCmd.stdout.on("end", () => resolve(commandOutput))),
    ]);
    return output;
}
function lineToFilePath(line) {
    const [status, ...fileParts] = line.split("\t");
    if (status.startsWith("R")) {
        return fileParts[1];
    }
    return fileParts[0];
}
const promptCommand = `You're an experienced programmer known for your precise and effective commit messages. Review the output of git diff --staged and create a commit message. The commit should include a clear and concise title that accurately summarizes the purpose of the changes, followed by a brief description that outlines the key updates or modifications made. Ensure the description highlights any new functionality, bug fixes, or refactoring, and is no longer than 2 sentences. The commit message must follow best practices for clarity and relevance to maintain a well-organized project history.`;
const prompt = `You're an experienced programmer known for your precise and effective commit messages. Review the output of git diff --staged and create a commit message. The commit should include a clear and concise title that accurately summarizes the purpose of the changes, followed by a brief description that outlines the key updates or modifications made. Ensure the description highlights any new functionality, bug fixes, or refactoring, and is no longer than 2 sentences. The commit message must follow best practices for clarity and relevance to maintain a well-organized project history.`;
async function main() {
    const command = new commander_1.Command();
    command
        .name(getName())
        .version(package_json_1.version, "-v, --version")
        .description(package_json_1.description)
        .option("-p, --prompt", "print the prompt without sending it to OpenAI")
        .option("-m, --message <message>", "custom message to include in the prompt")
        .option("-e, --exclude <message>", "exclude files (comma separated values)")
        .option("-c, --conventional-commits", "enforce commit message format as Conventional Commits");
    command.parse(process.argv);
    const options = command.opts();
    const excludedFiles = options.exclude ? options.exclude.split(",") : [];
    const files = await runCommand([
        "git",
        ["diff", "--staged", "--name-status"],
    ]);
    const stagedFiles = files.split("\n").filter(Boolean);
    if (!stagedFiles.length) {
        throw new Error("No files to diff.");
    }
    const gitStagedOutput = await runCommand([
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
    if (options.prompt) {
        console.log([
            promptCommand,
            options.conventionalCommits && "Use conventional commits",
            gitStagedOutput,
            options.message,
        ]
            .filter(Boolean)
            .join("\n\n"));
        process.exit();
    }
    const messages = [
        { role: "system", content: prompt },
    ];
    if (options.conventionalCommits) {
        messages.push({
            role: "system",
            content: "Using conventional commits",
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
    const chatCompletion = await client.chat.completions.create({
        messages,
        model: "gpt-4o-mini",
        response_format: (0, zod_1.zodResponseFormat)(CommitInfo, "commit"),
    });
    const commitMsgJson = await JSON.parse(chatCompletion.choices[0].message.content || "");
    if (!commitMsgJson) {
        throw new Error("Error parsing Chat GPT response.");
    }
    const commitMsg = commitMsgJson.title + "\n\n" + commitMsgJson.description;
    console.info(`Proposed Commit:\n------------------------------\n${commitMsg}\n------------------------------`);
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const answer = await new Promise((resolve) => rl.question("Do you want to continue? (Y/n)", (_answer) => {
        rl.close();
        resolve(_answer);
    }));
    if (answer.toLowerCase() === "n") {
        throw new Error("Commit aborted by user.");
    }
    console.info("Committing message...");
    const psCommit = (0, child_process_1.spawn)("git", ["commit", "-m", `${commitMsg}`], {
        stdio: "inherit",
    });
    const result = await new Promise((resolve, reject) => psCommit.on("close", (code) => {
        if (code !== 0) {
            reject(new Error("There was an error when creating the commit."));
        }
        resolve("Commit created successfully.");
    }));
    console.info(result);
    process.exit();
}
main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
