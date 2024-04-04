const { Command } = require("commander");
const { spawn } = require("child_process");
const readline = require("readline");
const FreeGPT3 = require("freegptjs");

const openai = new FreeGPT3();

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const program = new Command();

  program
    .name("Auto Commit")
    .version("1.0.0")
    .description("Automagically generate commit messages.");

  program
    .option(
      "-d, --dry-run",
      "Output the generated message, but don't create a commit."
    )
    .option(
      "-r, --review",
      "Edit the generated commit message before committing."
    )
    .option("-f, --force", "Don't ask for confirmation before committing.");

  program.parse(process.argv);

  console.log("Loading Data...");

  const gitStagedCmd = spawn("git", ["diff", "--staged"]);

  const gitStagedOutput = await new Promise((resolve) =>
    gitStagedCmd.stdout.on("data", (data) => resolve(data.toString()))
  );

  const chatCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You're an experienced programmer known for your precise commit messages. Use the output of git diff --staged to create a commit. Provide a clear and concise title, followed by a brief description that outlines the changes made. Once prepared, execute the commit with both the title and description intact. Your commitment to clarity ensures a well-organized development history. Returns the response in json string format with the title and description keys. Never user markdown in answers.",
      },
      { role: "user", content: gitStagedOutput },
    ],
  });

  const commitMsgJson = JSON.parse(chatCompletion.choices[0].message.content);

  const commitMsg = commitMsgJson.title + "\n\n" + commitMsgJson.description;

  console.info(
    `Proposed Commit:\n------------------------------\n${commitMsg}\n------------------------------`
  );

  const answer = await new Promise((resolve) =>
    rl.question("Do you want to continue? (Y/n)", (_answer) => {
      rl.close();
      resolve(_answer);
    })
  );

  if (answer.toLowerCase() === "n") {
    console.error("Commit aborted by user.");
    process.exit(1);
  }

  console.info("Committing Message...");

  const psCommit = spawn("git", ["commit", "-m", `"${commitMsg}"`]);

  psCommit.stdin.write(commitMsg);
  psCommit.stdin.end();

  psCommit.on("close", (code) => {
    if (code !== 0) {
      console.error("There was an error when creating the commit.");
      process.exit(1);
    }
    console.info("Commit created successfully.");
    process.exit(0);
  });
}

main();
