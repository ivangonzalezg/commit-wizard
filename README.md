# 🧙‍♂️ Commit Wizard

![Build Status](https://img.shields.io/github/actions/workflow/status/ivangonzalezg/commit-wizard/deploy.yml?branch=master)
![npm downloads](https://img.shields.io/npm/dm/commit-wizard)
![GitHub Release Date](https://img.shields.io/github/release-date/ivangonzalezg/commit-wizard)
![npm package](https://img.shields.io/npm/v/commit-wizard)
![NPM License](https://img.shields.io/npm/l/commit-wizard)
![GitHub Repo stars](https://img.shields.io/github/stars/ivangonzalezg/commit-wizard)

> Automagically generate clear and concise commit messages using OpenAI and Git. Perfect for keeping your Git history clean, organized, and magical! ✨

![Commit Wizard Screenshot](.github/screenshots/image.png)

## 🚀 Features

- ✨ **AI-powered**: Uses OpenAI to generate meaningful commit messages based on your staged changes.
- 💻 **CLI tool**: Simple command-line interface for fast and efficient workflow.
- 📋 **Consistent formatting**: Ensures your commit history follows best practices.
- 🎯 **Customizable prompts**: Option to print the prompt without sending it to the AI, giving you full control over the commit message generation process.
- 📝 **Custom messages**: Add a custom message to include in the AI-generated prompt, allowing for more personalized commit messages.
- 🗂 **Exclude files**: Easily exclude specific files from being considered when generating the commit message.

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

To use Commit Wizard, you will need to set up your OpenAI API key. This is required to enable AI-powered commit message generation.

1. **Obtain your OpenAI API key**:

   - Go to the [OpenAI platform](https://platform.openai.com/signup) and sign up or log in.
   - Navigate to the API section and create a new API key.

2. **Set your API key as an environment variable**:
   Add the API key to your environment by setting the `OPENAI_API_KEY` variable:

   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

   Or, you can add it to your `.bashrc`, `.zshrc`, or other shell configuration files to automatically set it for future sessions.

### Add API Key to Your Shell Configuration (Optional)

To avoid having to set the API key manually each time, you can add it to your shell configuration file:

1. **For Bash users**:
   Open your `.bashrc` file and add the following line:

   ```bash
   echo 'export OPENAI_API_KEY="your-api-key-here"' >> ~/.bashrc
   ```

   Then, apply the changes:

   ```bash
   source ~/.bashrc
   ```

2. **For Zsh users**:
   Open your `.zshrc` file and add the following line:

   ```bash
   echo 'export OPENAI_API_KEY="your-api-key-here"' >> ~/.zshrc
   ```

   Then, apply the changes:

   ```bash
   source ~/.zshrc
   ```

After this, your API key will be set automatically each time you open a new terminal session.

---

## ⚙️ Usage

Once installed, you can use the tool in any git repository.

1. **Stage your changes** as usual:

   ```bash
   git add .
   ```

2. **Run Commit Wizard**:

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

- **Custom Prompt**: You can customize the AI prompt by passing the `--message` or `-m` flag.

  ```bash
  commit-wizard --message "Explain what changed in the codebase"
  ```

- **Exclude Files**: Exclude specific files from the commit message generation.

  ```bash
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
