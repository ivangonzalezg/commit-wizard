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
function markdownToJson(content) {
    const match = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
        try {
            return JSON.parse(match[1]);
        }
        catch (_) {
            return null;
        }
    }
    return null;
}
function getJson(content) {
    try {
        return JSON.parse(content);
    }
    catch (_) {
        return markdownToJson(content);
    }
}
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
const prompt = `You're an experienced programmer known for your precise and effective commit messages. Review the output of git diff --staged and create a commit message. The commit should include a clear and concise title that accurately summarizes the purpose of the changes, followed by a brief description that outlines the key updates or modifications made. Ensure the description highlights any new functionality, bug fixes, or refactoring, and is no longer than 2 sentences. The commit message must follow best practices for clarity and relevance to maintain a well-organized project history. Return the response in strict JSON format with two keys: 'title' for the commit title and 'description' for the commit description. Example format: {'title': 'Title goes here', 'description': 'Description goes here'}.`;
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
    const content = [
        options.prompt ? promptCommand : prompt,
        options.conventionalCommits && "Use conventional commits",
        options.message,
        gitStagedOutput,
    ]
        .filter(Boolean)
        .join("\n\n");
    if (options.prompt) {
        console.log(content);
        process.exit();
    }
    const chatCompletion = await client.chat.completions.create({
        messages: [{ role: "user", content: content }],
        model: "gpt-4o-mini",
    });
    const commitMsgJson = await getJson(chatCompletion.choices[0].message.content || "");
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
