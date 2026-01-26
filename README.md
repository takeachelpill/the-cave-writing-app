# The Cave (A Writing App)

A distraction-free writing environment built with Electron, designed for authors who want to focus on their words without clutter.

## Features

- **Distraction-free editing** - Clean, minimal interface that keeps you focused on writing
- **Chapter organization** - Organize your work into chapters with drag-and-drop reordering
- **Auto-save** - Your work is automatically saved as you write (500ms debounce)
- **TODO tracking** - Mark notes with `<angle brackets>` and find them in the sidebar
- **Writing timer** - Track your writing sessions with auto-pause on inactivity
- **Dark mode** - Easy on the eyes for late-night writing sessions
- **Customizable** - Adjust font, size, and column width to your preference
- **Recent projects** - Quick access to your last 10 projects

## Installation

```bash
npm install
```

## Usage

### Development

```bash
npm start
```

### Package for Distribution

```bash
npm run package
```

### Command Line

Open a specific project directly:

```bash
npm start -- --project=<path-to-project>
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `F11` | Toggle fullscreen |
| `Ctrl+P` | Toggle sidebar |
| `Ctrl+N` | New chapter |
| `Ctrl+O` | Open project |
| `Ctrl+,` | Open settings |
| `?` | Show help |

## Project Structure

Projects are stored as folders with the following structure:

```
my-novel/
├── project.json          # Metadata and settings
└── chapters/
    ├── 001-chapter-one.md
    ├── 002-chapter-two.md
    └── ...
```

Chapters are plain text files with newlines as paragraph separators.

## License

MIT
