\# FreeBuff AI — Agent Directions \& Discovery Protocol



\## 1. Mandatory Startup Order

Before generating any code, HTML, CSS, or configuration files, you \*\*must\*\*:

1\. Read this `AGENTS.md` file completely.

2\. Read `README.md` to understand the project scope, dual-`.exe` desktop strategy, GitHub Pages target, and the 10 core features.

3\. \*\*STOP\*\* and conduct the \*\*Interactive Discovery Interview\*\* below with the user. Do not assume any visual layouts, color palettes, or branding until the user answers these questions.



\---



\## 2. Interactive Discovery Interview (Ask the User First)

Present the following questions clearly to the user in your first response before writing code:



1\. \*\*Application Name \& Branding:\*\*

&#x20;  \* What is the official \*\*name\*\* of this homework helper website/app?

&#x20;  \* Do you have a tagline, icon idea, or logo style in mind?

2\. \*\*Visual Design \& Layout:\*\*

&#x20;  \* What color palette and default theme do you want (e.g., dark mode default, light mode default, minimalist, vibrant, academic)?

&#x20;  \* How should the main dashboard be organized (e.g., left sidebar for the 10 tools, top navigation bar, or a card-based home hub)?

&#x20;  \* Where should the \*\*Download Windows `.exe`\*\* button (for the public user version) be placed on the website?

3\. \*\*AI, BYOK \& Private Ollama Preferences:\*\*

&#x20;  \* For the \*\*Public Version\*\* (`.github.io` + User `.exe`), which AI providers should the Settings modal support out of the box (e.g., OpenAI, Google Gemini, Anthropic Claude, OpenRouter, custom endpoints)?

&#x20;  \* For your \*\*Private Local `.exe`\*\* (Ollama default), which default Ollama text model and vision model names should be pre-filled (e.g., `llama3.2`, `qwen2.5-coder`, `llava` / `llama3.2-vision`)?

4\. \*\*Feature \& Scope Confirmation:\*\*

&#x20;  \* Do you want to keep all \*\*10 key features\*\* and smaller utilities listed in `README.md`, or would you like to swap, rename, or prioritize any specific tools first?



\---



\## 3. Dual-`.exe` Architecture \& AI Provider Rules

You must configure the application and `package.json` build scripts to output \*\*two separate Windows `.exe` builds\*\* from the same shared codebase:



\### Build 1: Public User `.exe` (GitHub Version as Desktop App)

\* \*\*Output Folder:\*\* `dist-public/` (uploaded to GitHub Releases and linked on the `.github.io` website).

\* \*\*Behavior:\*\* Mirrors the exact GitHub Pages web app. Defaults to \*\*Bring-Your-Own-API (BYOK)\*\* mode where users supply their own cloud API keys in `localStorage`.

\* \*\*Visibility:\*\* Publicly downloadable via the website's "Download Desktop App (.exe)" button.



\### Build 2: Private Local `.exe` (Creator-Only Ollama Edition)

\* \*\*Output Folder:\*\* `dist-private/` (kept strictly on the creator's local machine; \*\*must\*\* be added to `.gitignore` so it is never pushed to GitHub or exposed publicly).

\* \*\*Behavior:\*\* Built with a compile-time flag or environment config (`APP\_MODE=private`) that sets \*\*Ollama (`http://localhost:11434`)\*\* as the default active AI provider out of the box—requiring no external API key—while still allowing manual switching in settings.

\* \*\*Visibility:\*\* Never linked or referenced in the public `.github.io` UI.



\---



\## 4. Coding \& Packaging Directives

\* \*\*Relative Paths Only:\*\* Always use relative file paths (`./styles/main.css`, `./scripts/app.js`) so the app renders identically on `username.github.io/repo-name/` and inside both Electron `.exe` builds.

\* \*\*Separate Build Commands in `package.json`:\*\*

&#x20; \* `npm run build:public` → Outputs the public user `.exe` into `dist-public/`.

&#x20; \* `npm run build:private` → Outputs the private Ollama-default `.exe` into `dist-private/`.

\* \*\*Vision Payload Handling:\*\* Convert uploaded or pasted images (`Ctrl+V`, drag-and-drop, file picker) to Base64 client-side so both cloud vision APIs and local Ollama vision models can process homework screenshots seamlessly.

\* \*\*Phased Execution:\*\* After the user answers the discovery questions, build the project step-by-step:

&#x20; 1. Dashboard Shell, BYOK Settings Modal \& Ollama Connector

&#x20; 2. Core Text + Image Homework Omni-Solver

&#x20; 3. The 10 Key Study Modules

&#x20; 4. Smaller Utilities \& Local History

&#x20; 5. Dual Electron `.exe` Build Scripts (`dist-public/` \& `dist-private/`) + `.gitignore`



