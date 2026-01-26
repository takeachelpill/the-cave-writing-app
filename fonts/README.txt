The Cave (A Writing App) - Fonts Directory
==============================

This directory is set up for bundled fonts. The app currently uses system font
fallbacks, but you can add the following open-source fonts for the best experience:

1. Literata (fonts/literata/)
   - Included in this folder as the default
   - Downloaded from: https://fonts.google.com/specimen/Literata
   - A variable font designed for reading, excellent for long writing sessions

2. iA Writer Mono (fonts/ia-writer-mono/)
   - Download from: https://github.com/iaolo/iA-Fonts
   - A monospace font designed specifically for writing apps
   - Place .woff2 or .ttf files in the ia-writer-mono folder

3. Source Sans 3 (fonts/source-sans/)
   - Download from: https://fonts.google.com/specimen/Source+Sans+3
   - A clean sans-serif font from Adobe
   - Place .woff2 or .ttf files in the source-sans folder

After adding fonts, update the @font-face declarations in renderer/styles.css
to point to the actual font files instead of using local() fallbacks.
