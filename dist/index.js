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
const promptCommand = `You're an experienced programmer known for your precise commit messages. Use the output of git diff --staged to create a commit. Provide a clear and concise title, followed by a brief description that outlines the changes made. Once prepared, execute the commit with both the title and description intact. Your commitment to clarity ensures a well-organized development history. The description should not be bigger than 2 sentences. Returns the response replacing title and description in following terminal command: git commit -m "{{title}}" -m "{{description}}". This format is crucial for consistency and compatibility with downstream processes. Please never user markdown in answers.`;
const prompt = `You're an experienced programmer known for your precise and effective commit messages. Review the output of git diff --staged and create a commit message. The commit should include a clear and concise title that accurately summarizes the purpose of the changes, followed by a brief description that outlines the key updates or modifications made. Ensure the description highlights any new functionality, bug fixes, or refactoring, and is no longer than 2 sentences. The commit message must follow best practices for clarity and relevance to maintain a well-organized project history. Return the response in strict JSON format with two keys: 'title' for the commit title and 'description' for the commit description. Example format: {'title': 'Title goes here', 'description': 'Description goes here'}.`;
async function main() {
    const program = new commander_1.Command();
    program
        .name(getName())
        .version(package_json_1.version, "-v, --version")
        .description(package_json_1.description)
        .option("-p, --prompt", "print the prompt without sending it to OpenAI")
        .option("-m, --message <message>", "custom message to include in the prompt")
        .option("-e, --exclude <message>", "exclude files (comma separated values)");
    program.parse(process.argv);
    const options = program.opts();
    const excludedFiles = options.exclude ? options.exclude.split(",") : [];
    const files = await runCommand(["git", ["diff", "--staged", "--name-only"]]);
    const stagedFiles = files
        .split("\n")
        .filter(Boolean)
        .filter((file) => !excludedFiles.includes(file));
    if (!stagedFiles.length) {
        throw new Error("No files to diff.");
    }
    const gitStagedOutput = await runCommand([
        "git",
        ["diff", "--staged", ...stagedFiles],
    ]);
    if (!gitStagedOutput) {
        throw new Error("No staged changes found.");
    }
    if (options.prompt) {
        console.log([promptCommand, options.message, gitStagedOutput]
            .filter(Boolean)
            .join("\n\n"));
        process.exit();
    }
    const chatCompletion = await client.chat.completions.create({
        messages: [
            {
                role: "user",
                content: [prompt, options.message, gitStagedOutput]
                    .filter(Boolean)
                    .join("\n\n"),
            },
        ],
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
    console.info("Committing Message...");
    const psCommit = (0, child_process_1.spawn)("git", ["commit", "-m", `${commitMsg}`]);
    psCommit.stdin.write(commitMsg);
    psCommit.stdin.end();
    psCommit.on("close", (code) => {
        if (code !== 0) {
            throw new Error("There was an error when creating the commit.");
        }
        console.info("Commit created successfully.");
        process.exit();
    });
}
main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
