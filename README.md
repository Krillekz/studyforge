# StudyForge

**Every subject. Every question. Solved.**

StudyForge is a homework workspace that runs entirely in your browser — one place to solve problems, write essays, check code, drill flashcards, cite sources and plan the week. It has no account, no server, and no subscription. You connect your own AI provider (or a local Ollama model) and the app talks to it directly.

- **Web app:** https://krillekz.github.io/studyforge/
- **Windows app:** [StudyForge-Setup-1.0.0.exe](https://github.com/Krillekz/studyforge/releases/latest/download/StudyForge-Setup-1.0.0.exe)

---

## What it actually does

Twelve views, one shared history:

| View | What it's for |
| --- | --- |
| **Omni-Solver** | Any subject — math, science, history, English, code. Type a question, paste a screenshot of a worksheet, or drop in a photo. |
| **Essay writer** | Outline first, then draft with tone controls; polish a draft you already wrote. |
| **Math suite** | Scientific calculator, step-by-step algebra solver, and a 2D function grapher. |
| **Summarizer** | Turn readings or lecture notes into condensed study guides. |
| **Flashcards & quiz** | Build a deck from a topic, your notes, or a photo of the page; then self-quiz. |
| **Code debugger** | Paste broken Python/JS/Java/C++/HTML, get a fix plus an explanation of the bug. |
| **Translate & grammar** | Translation with grammar, syntax and vocabulary corrections. |
| **Citations** | APA, MLA and Chicago formatting with one-click copy. |
| **Study planner** | Assignment tracker, deadlines, and a Pomodoro timer that remembers today's count. |
| **Cheat sheets** | Formula library, full periodic table, grammar rules and history timelines — built in, offline. |
| **History** | Everything you generated, saved locally, exportable to `.txt`, `.md`, or PDF via print. |
| **Home** | Launcher, quick start, and a live demo of the solver. |

Plus a **scratchpad** drawer for working, a **Ctrl+K command palette** to jump anywhere, and **global Ctrl+V** — paste a screenshot from anywhere in the app and it lands in the solver.

## Why it's better than what's out there

Most students end up with a pile of tabs: a general chatbot, a math app, a citation site, a flashcard site, a planner, a grammar checker. Each one wants an account, most want a subscription, and none of them know what you did five minutes ago in the other one.

**One workspace, not ten tabs.** The solver, writer, math suite, flashcards, citations and planner share one history and one visual language. A worksheet you photographed in the solver and the essay you drafted from it live in the same place.

**You pay the model, not a middleman.** StudyForge has no credits and no monthly fee. Bring an OpenAI, Gemini, Anthropic or OpenRouter key and you're billed by the provider at their own rates — usually a fraction of what an "AI homework" subscription charges for the same model. Or point it at **Ollama** and pay nothing at all.

**Nothing is stored on someone else's server.** Requests go from your browser or desktop app straight to the provider you chose. API keys sit in your own `localStorage`. There is no StudyForge backend to log them, no account to create, and no email to hand over. This isn't a policy promise — there is simply no server in the middle.

**It can run completely offline.** With Ollama installed locally, a whole homework session can happen without a single packet leaving the machine. No cloud study tool offers that.

**It doesn't lose your work when the network hiccups.** Answers stream in, and every streaming tool has a visible **Stop** button. If you stop a run — or the connection drops — the partial answer stays on screen with a clear note that it's incomplete and wasn't saved, instead of the chat app failure mode of a blinking caret and a vanished response.

**Vision without an upload step.** `Ctrl+V` anywhere in the app captures a clipboard screenshot and sends it to the solver. No file picker, no drag-and-drop detour, no "attach image" menu.

**No build step, no framework, no tracking.** The web app is plain HTML, CSS and ES5-era JavaScript with zero runtime dependencies. It loads instantly, works on a school Chromebook, and can be self-hosted by copying a folder. The Windows app is the same code in an Electron shell — not a separate, worse product.

### Compared to the obvious options

| | StudyForge | General AI chat (ChatGPT, Claude, Gemini) | Math apps (Photomath, Mathway) | Chegg | Quizlet |
| --- | --- | --- | --- | --- | --- |
| Cost | Your provider's price, at cost — or free with Ollama | Free tier or ~$20/mo | Free tier with upsells | Paid subscription | Free tier with ads/upsells |
| Account required | No | Yes | Usually | Yes | Yes |
| Subjects | All (text, math, science, code, writing) | All, but no study workflow | Math only | Broad, but answer-bank style | Flashcards only |
| Screenshot solving | Yes, via paste | Yes | Yes | Yes | Limited |
| Local / offline mode | Yes (Ollama) | No | No | No | No |
| Where your data goes | Straight to your provider | Provider's servers | Their servers | Their servers | Their servers |
| Built-in planner, citations, cheat sheets | Yes | No | No | No | No |
| Desktop app included | Yes | Separate app | No | No | No |

The honest summary: the underlying models are the same ones everyone else resells. What's different is the workflow around them, the fact that you own the key, and the fact that there's no company between you and the model.

## Getting started

### Use the web app

Open https://krillekz.github.io/studyforge/, click **AI keys** in the header (the sliders icon, or press `Ctrl+K` and type "settings"), pick a provider and paste an API key. Then ask a question.

### Install the Windows app

Download [StudyForge-Setup-1.0.0.exe](https://github.com/Krillekz/studyforge/releases/latest/download/StudyForge-Setup-1.0.0.exe) and run it. The installer isn't code-signed, so SmartScreen may ask you to confirm — choose **More info → Run anyway**.

### Use a local model

Install [Ollama](https://ollama.com), pull a model, and allow the browser to reach it:

```bash
ollama pull llama3.2
OLLAMA_ORIGINS=* ollama serve
```

Then choose **Ollama (local)** in Settings. Vision needs a vision-capable model, e.g. `ollama pull llama3.2-vision`. The desktop app talks to `http://localhost:11434` by default.

## Supported providers

| Provider | Text default | Vision default |
| --- | --- | --- |
| OpenAI | `gpt-4o-mini` | `gpt-4o` |
| Google Gemini | `gemini-2.0-flash` | `gemini-2.0-flash` |
| Anthropic Claude | `claude-sonnet-4-20250514` | `claude-sonnet-4-20250514` |
| OpenRouter | `openai/gpt-4o-mini` | `openai/gpt-4o` |
| Ollama (local) | `llama3.2` | `llama3.2-vision` |

Model names are editable in Settings, so new releases work without a code change.

## Run it locally

There's nothing to compile. Serve the folder over HTTP:

```bash
npm run dev          # http://127.0.0.1:5173
```

To build the Windows installer yourself:

```bash
npm install
npm run build:public   # -> dist-public/StudyForge-Setup-1.0.0.exe
```

## How it's built

- `index.html` + `styles/` + `scripts/` — the app; plain JavaScript, no framework, no bundler
- `scripts/ai.js` — one streaming interface over four provider APIs plus Ollama, with abort and timeout handling
- `scripts/tools/` — one module per study tool
- `scripts/store.js` — `localStorage` persistence for settings, history, tasks, scratchpad
- `electron/` — desktop shell (the Ollama-default private build uses `scripts/build.js --mode=private`)

All paths are relative, which is what lets the same files run at `krillekz.github.io/studyforge/`, from a local folder, and inside Electron.

## Privacy, plainly

- No analytics, no telemetry, no third-party scripts.
- API keys are stored in your device's `localStorage` and sent only to the provider you selected.
- History and settings stay on your device; clearing site data deletes them.
- The app has no backend, so there is nothing for the project to collect.

## Limitations

- You need an API key or a running local model. Nothing is bundled.
- Provider browser access depends on their CORS rules; if a provider blocks direct browser calls, use the desktop app.
- The Windows installer is unsigned, so SmartScreen warns on first run.
- History and settings live in browser storage, so they don't sync between devices by design.

## License

No license has been added to this repository yet. Until one is, the code is published for viewing and personal use, and all rights are reserved.
