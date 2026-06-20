# maulclaw

A fast, type‑safe CLI tool that walks the path of OpenClaw so MaulClaw can run people over.  
Built with **bun** and powered by modern TypeScript libraries.

## Features

- Interactive banner wake‑up using `figlet` and `@clack/prompts`
- Multiple execution modes: **CLI**, **Telegram**, and **Agent** orchestration
- Modular command system (`wakeup`, `agent`, `plan`, `ask`, …)
- Rich terminal output with `chalk`, `marked-terminal`, and custom theming
- Easy installation and execution via the `maulclaw` binary

## Installation

```bash
bun install
```

## Usage

### Run the interactive wake‑up screen

```bash
bun run index.ts
# or, after installation:
maulclaw wakeup
```

### Available commands

| Command | Description |
|---------|-------------|
| `wakeup` | Show the animated banner and select a mode (CLI, Telegram, Exit) |
| `agent` | Enter agent mode (full orchestration) |
| `plan` | (placeholder) Plan mode – currently prints “plan” |
| `ask`  | (placeholder) Ask mode – currently prints “ask” |
| `back` | Return to the main menu |

### Example interaction

```text
$ maulclaw wakeup
🔤  (banner art appears)
Which mode you want to proceed with?
  » cli
  » telegram
  » exit
```

## Development

- **Build** the project: `bun build index.ts --target=bundler`
- **Run** in watch mode: `bun run index.ts`
- **Test** (when tests are added) using your preferred test runner
- **Contribute**: fork the repo, create a feature branch, and submit a pull request.

## License

MIT © 2024

---

*Created with ❤️ using modern JavaScript tooling.*