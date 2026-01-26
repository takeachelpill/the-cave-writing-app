# The Cave (A Writing App)

A distraction-free writing environment built with Electron, designed for authors who want to focus on their words without clutter. Current support is for Windows OS.

## Features

- **Distraction-free editing** - Clean, minimal interface that keeps you focused on writing
- **Chapter organization** - Organize your work into chapters with drag-and-drop reordering
- **TODO tracking** - Mark notes with `<angle brackets>` and find them in the sidebar
- **In-line headers** - Mark headers with `## ` and they'll be automatically generated
- **Auto-save** - Your work is automatically saved as you write (500ms debounce)
- **Writing timer** - Track your writing sessions with a small timer, with auto-pause on inactivity
- **Dark mode** - Easy on the eyes for late-night writing sessions
- **Customizable but not overboard** - Adjust font, size, and column width to your preference
- **Export to Word Doc** - Easily export full project to a .docx in the settings 

## Installation and launch

After you clone, for your first time using the tool, install dependencies with the following in the command line:

```bash
npm install
```

Every time after that, just run the following in the command line:

```bash
npm start
```

## Usage

Create a new project using the New Project button. In the future, your existing projects will appear under the "Recent Projects" heading.

From here, you are free to just start writing! 

- There is a small 'Settings' cog and a 'Keyboard Shortcuts' question mark in the bottom left corner. 
- The 'Settings' button will give you the ability to change your font, the column width (useful on a widescreen monitor), and the spaces after each paragraph for improved visibility. You can also toggle dark mode or the timer's autopause. When you're done, you can export the whole project as a DOCX file for upload to google docs, etc. There's also a 'Close project' button if you want to go back to the home page and start something else.
- the 'Keyboard Shortcuts' button is pretty much what it says on the tin. It also offers some advice about how to rename/reorder chapters, how to mark headings, and how to mark TODOs.
- On the topic of TODOs, while you write, if there's something you want to come back to, put it in `<angle brackets>` and the first part of the section will appear under the Todos in the sidebar. 
- In the bottom right, there's a writing timer. Useful for pomodoros or to track your actual writing time, if you're interested in that. It doesn't autostart or anything though if the thought of timing you writing is daunting; you can just ignore it.
- There's also a word count for your chapter. When you highlight text, this will change to show you the word count of your highlighted text instead, in the format of "50 words of 1,234" 
- Finally there is the clock time, so that if you're in Fullscreen mode, you don't lose track of time :)
-Happy writing!

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

## Authorship

Co-authored by Chel and Claude Code.
