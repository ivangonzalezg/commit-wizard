# 🧙‍♂️ Commit Wizard

![Build Status](https://img.shields.io/github/actions/workflow/status/ivangonzalezg/commit-wizard/deploy.yml?branch=master)
![npm downloads](https://img.shields.io/npm/dm/commit-wizard)
![GitHub Release Date](https://img.shields.io/github/release-date/ivangonzalezg/commit-wizard)
![npm package](https://img.shields.io/npm/v/commit-wizard)
![NPM License](https://img.shields.io/npm/l/commit-wizard)
![GitHub Repo stars](https://img.shields.io/github/stars/ivangonzalezg/commit-wizard)

> Automagically generate clear and concise commit messages using your preferred AI provider (Gemini or OpenAI) and Git. Perfect for keeping your Git history clean, organized, and magical! ✨

![Commit Wizard Screenshot](.github/screenshots/image.png)

## 🚀 Features

- ✨ **AI-powered**: Generate meaningful commit messages from your staged changes with Google Gemini (default) or OpenAI.
- ⚙️ **Configurable workflow**: Choose providers, print prompts locally, or add context before contacting an API.
- 📋 **Consistent formatting**: Optional Conventional Commits enforcement keeps history tidy and predictable.
- 💻 **CLI tool**: Simple command-line interface that fits into any Git workflow.
- 📝 **Custom messages**: Inject project-specific instructions directly into the prompt.
- 🗂 **Exclude files**: Skip changelog noise (lockfiles, docs, etc.) while the tool inspects your diff.

---

## 📦 Installation

You can install **Commit Wizard** globally using npm:

```bash
npm install -g commit-wizard
```

Or use it directly with `npx` without installation:

```bash
npx commit-wizard
```

---

## 🔑 API Key Setup

Commit Wizard talks to third-party LLMs. Set the environment variable that matches the provider you plan to use.

### Default provider: Gemini

1. Create a key at the [Google AI Studio](https://aistudio.google.com/).
2. Export it as `GEMINI_API_KEY` in your shell:

   ```bash
   export GEMINI_API_KEY="your-gemini-api-key"
   ```

### Alternate provider: OpenAI

1. Create a key at the [OpenAI platform](https://platform.openai.com/).
2. Export it as `OPENAI_API_KEY` in your shell:

   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   ```

Add the export line to your `.bashrc`, `.zshrc`, or shell profile if you want the variable set automatically for future sessions.

---

## ⚙️ Usage

Once installed, you can use the tool in any git repository.

1. **Stage your changes** as usual:

   ```bash
   git add .
   ```

2. **Run Commit Wizard** (uses Gemini unless you select otherwise):

   ```bash
   commit-wizard
   ```

   Or, with `npx`:

   ```bash
   npx commit-wizard
   ```

3. **Confirm the commit message**:
   After generating the commit message, you'll be asked to confirm if you want to proceed with the commit.

   ![Commit Wizard Screenshot](.github/screenshots/image.png)

---

## 🛠️ Options

- `--dry-run, -d`: Print the composed prompt without calling an AI provider.
- `--message <text>, -m`: Add extra context for the model (e.g. project goals or tricky areas).
- `--exclude <files>, -e`: Provide a comma-separated list of files to skip when building the diff.
- `--conventional-commits, -c`: Ask the model to format the title using the Conventional Commits spec.
- `--provider <openai|gemini>, -p`: Choose the AI backend. Defaults to `gemini`.

Examples:

```bash
commit-wizard --dry-run --message "Focus on API breaking changes"
commit-wizard --provider openai --conventional-commits
commit-wizard --exclude "README.md"
```

---

## 📸 Demo

Check out how easy it is to use **Commit Wizard**:

![Commit Wizard Demo](.github/screenshots/demo.gif)

---

## 🧑‍💻 Contributing

We welcome contributions! To get started:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Submit a pull request!

---

## 👩‍🚀 Author

Made with ❤️ by [Ivan Gonzalez](https://github.com/ivangonzalezg).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
