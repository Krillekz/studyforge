\# All-in-One AI Homework Helper (Web \& Dual Desktop Builds)



> \*\*Note to AI Builder:\*\* Follow all startup, design interview, and dual-`.exe` build instructions in `AGENTS.md` before writing code.



\## Overview

An all-in-one academic assistant and homework helper designed to handle every part of a student's workflow. Users can type or paste homework questions, upload or screenshot worksheets for instant vision-based solving, and access 10 built-in study tools.



\### Deployment \& Executable Targets

1\. \*\*GitHub Pages Website (`github.io`):\*\* Live static web app powered by user-supplied API keys (BYOK).

2\. \*\*Public User `.exe` (`dist-public/`):\*\* Standalone Electron desktop wrapper of the GitHub version, available for public download directly from the website.

3\. \*\*Private Local `.exe` (`dist-private/`):\*\* Personal local-only Electron build stored in a private git-ignored folder, pre-configured with \*\*Ollama\*\* as the default local AI engine.



\---



\## Core Capabilities

\* \*\*Text \& Code Problem Solving:\*\* Ask any question, paste math equations, or submit programming prompts for step-by-step explanations and complete answers.

\* \*\*Image \& Screenshot Helper (Vision):\*\* Upload photos, drag-and-drop files, or press `Ctrl+V` anywhere to paste screenshots of textbook pages, handwritten problems, or diagrams for instant AI analysis.



\---



\## The 10 Key Features

1\. \*\*AI Homework Omni-Solver (Text \& Vision):\*\* Multi-subject problem solver supporting math, science, history, English, and coding with step-by-step breakdowns and image reading.

2\. \*\*Essay \& Paper Writer:\*\* Full essay generator with outline creation, tone controls, citation integration, and readability polishing.

3\. \*\*Math \& Graphing Calculator Suite:\*\* Scientific calculator, step-by-step algebra solver, and interactive 2D function grapher.

4\. \*\*Smart Summarizer \& Note Condenser:\*\* Turns long readings, articles, or pasted lecture notes into clean bulleted study guides.

5\. \*\*Flashcard \& Practice Quiz Generator:\*\* Converts any topic, pasted notes, or uploaded worksheet image into interactive flashcards and self-grading quizzes.

6\. \*\*Code Debugger \& Explainer:\*\* Dedicated coding workspace for Python, JavaScript, Java, C++, and HTML/CSS to write, fix, and explain code.

7\. \*\*Language Translator \& Grammar Checker:\*\* Multi-language translation paired with grammar, syntax, and vocabulary corrections.

8\. \*\*Citation \& Bibliography Generator:\*\* Formats sources in APA, MLA, and Chicago styles with one-click copy.

9\. \*\*Assignment \& Study Planner:\*\* Local task tracker, deadline organizer, and Pomodoro focus timer.

10\. \*\*Quick-Reference Cheat Sheet Hub:\*\* Built-in math formulas, periodic table, grammar rules, and historical timelines.



\---



\## Smaller Utility Features

\* \*\*Public Windows `.exe` Download Button:\*\* Direct link on the `.github.io` site to download the public Electron desktop app from GitHub Releases.

\* \*\*BYOK \& Ollama Provider Manager:\*\* Settings panel to save cloud API keys locally or connect to a local Ollama instance, with separate text and vision model selectors.

\* \*\*Local Session History \& Export:\*\* Auto-saves past homework chats locally with one-click export to `.txt`, `.md`, or `.pdf`.

\* \*\*Quick Scratchpad Drawer:\*\* Slide-out notepad for rough calculations and notes while using any tool.

\* \*\*Global Quick-Paste (`Ctrl+V`):\*\* Instantly captures clipboard screenshots into the image solver from anywhere in the app.



\---



\## Project Structure

```text

/

├── AGENTS.md           # AI builder rules, interview questions, and dual-exe specs

├── README.md           # Project overview and feature list

├── .gitignore          # Excludes node\_modules/, dist-public/, and dist-private/

├── index.html          # Main entry point (GitHub Pages \& Electron)

├── styles/             # Modular CSS stylesheets

├── scripts/            # Core logic, BYOK/Ollama API handlers, and the 10 tool modules

├── electron/           # main.js and preload.js handling public vs. private build flags

├── dist-public/        # Output folder for the public user .exe

├── dist-private/       # Local-only output folder for your private Ollama-default .exe

└── package.json        # Separate npm scripts for build:public and build:private

```

