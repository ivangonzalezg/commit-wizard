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

  const options = program.opts();

  const gitStagedCmd = spawn("git", ["diff", "--staged"]);

  console.log("gitStagedOutput");

  const gitStagedOutput = await new Promise((resolve) =>
    gitStagedCmd.stdout.on("data", (data) => {
      console.log(data.toString());
      resolve(data.toString());
    })
  );

  console.log(gitStagedOutput);

  gitStagedCmd.on("close", (code) => {
    if (code !== 0) {
      console.error(
        "There are no staged files to commit.\nTry running `git add` to stage some files."
      );
      process.exit(1);
    }
  });

  const isRepoCmd = spawn("git", ["rev-parse", "--is-inside-work-tree"]);
  let isRepo = "";

  isRepoCmd.stdout.on("data", (data) => {
    isRepo += data.toString();
  });

  isRepoCmd.on("close", (code) => {
    if (code !== 0 || isRepo.trim() !== "true") {
      console.error(
        "It looks like you are not in a git repository.\nPlease run this command from the root of a git repository, or initialize one using `git init`."
      );
      process.exit(1);
    }
  });

  const chatCompletion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are an experienced programmer who writes great commit messages. Creates a commit with the given title and a description.",
      },
      { role: "user", content: "Hello, Free GPT !" },
    ],
    model: "gpt-3.5-turbo",
  });
  console.log(chatCompletion.choices[0].message.content);

  const commitMsg = ""; // Your logic to generate commit message here

  if (options["dry-run"]) {
    console.info(commitMsg);
    process.exit(0);
  } else {
    console.info(
      `Proposed Commit:\n------------------------------\n${commitMsg}\n------------------------------`
    );

    if (!options.force) {
      rl.question("Do you want to continue? (Y/n)", (answer) => {
        if (answer.toLowerCase() === "n") {
          console.error("Commit aborted by user.");
          process.exit(1);
        }
        console.info("Committing Message...");
        rl.close();
      });
    }
  }

  const psCommit = spawn("git", [
    "commit",
    ...(options.review ? ["-e"] : []),
    "-F",
    "-",
  ]);

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
