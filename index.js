const { Command } = require("commander");
const { spawn } = require("child_process");
const readline = require("readline");
const { main: chatGpt } = require("./chat-gpt");

function markdownToJson(content) {
  if (content.includes("```json")) {
    try {
      return JSON.parse(
        content.replace("```json", "").replace("```", "").trim()
      );
    } catch (_) {}
  }
  return null;
}

function getJson(content) {
  try {
    return JSON.parse(content);
  } catch (_) {
    return markdownToJson(content);
  }
}

// const prompt = `You're an experienced programmer known for your precise commit messages. Use the output of git diff --staged to create a commit. Provide a clear and concise title, followed by a brief description that outlines the changes made. Once prepared, execute the commit with both the title and description intact. Your commitment to clarity ensures a well-organized development history. The description should not be bigget than 2 sentences. Returns the response replacing title and description in following terminal command: gcmsg "{{title}}" -m "{{description}}". This format is crucial for consistency and compatibility with downstream processes. Please never user markdown in answers.`;
const prompt = `You're an experienced programmer known for your precise commit messages. Use the output of git diff --staged to create a commit. Provide a clear and concise title, followed by a brief description that outlines the changes made. Once prepared, execute the commit with both the title and description intact. Your commitment to clarity ensures a well-organized development history. The description should not be bigget than 2 sentences. Returns the response in JSON string format with the title and description keys. Ensure that the response adheres strictly to JSON formatting, for example: {'title': 'Title goes here', 'description': 'Description goes here'}.`;

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const program = new Command();

  program
    .name("Smart Commit")
    .version("1.0.0")
    .description("Automagically generate commit messages.");

  program.option("-p, --prompt", "Include the prompt in the result.");

  program.parse(process.argv);

  const options = program.opts();

  // console.log("Loading Data...");

  const gitStagedCmd = spawn("git", ["diff", "--staged"]);

  const gitStagedOutput = await Promise.race([
    new Promise((resolve) => setTimeout(resolve, 500, "")),
    new Promise((resolve) =>
      gitStagedCmd.stdout.on("data", (data) => resolve(data.toString()))
    ),
  ]);

  if (!gitStagedOutput) {
    process.exit(1);
  }

  // if (options.prompt) {
  //   console.log(prompt + "\n\n" + gitStagedOutput);
  // } else {
  //   console.log(gitStagedOutput);
  // }

  // process.exit(0);

  const chatCompletion = await chatGpt({
    messages: [{ role: "user", content: prompt + "\n\n" + gitStagedOutput }],
  });

  const commitMsgJson = await getJson(
    chatCompletion.choices[0].message.content
  );

  // console.log(chatCompletion.choices[0]);

  // console.log(prompt + "\r\n" + gitStagedOutput);

  if (!commitMsgJson) {
    console.log(chatCompletion.choices[0].message.content);
    console.error("Error parsing Chat GPT response");
    process.exit(0);
  }

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

  const psCommit = spawn("git", ["commit", "-m", `${commitMsg}`]);

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
