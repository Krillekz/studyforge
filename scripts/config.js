/* ==========================================================================
   StudyForge — static configuration
   Everything here can be edited without touching app logic.
   ========================================================================== */

window.SF = window.SF || {};

SF.config = {
  appName: 'StudyForge',
  tagline: 'Every subject. Every question. Solved.',
  version: '1.0.0',

  /* Replace "your-username" with the GitHub account that hosts the repo.
     The asset name matches the NSIS artifact produced by `npm run build:public`. */
  releasesUrl: 'https://github.com/Krillekz/studyforge/releases/latest',
  downloadUrl:
    'https://github.com/Krillekz/studyforge/releases/latest/download/StudyForge-Setup-1.0.0.exe',

  /* Provider metadata. textModel / visionModel are the pre-filled defaults. */
  providers: {
    openai: {
      label: 'OpenAI',
      kind: 'openai',
      keyUrl: 'https://platform.openai.com/api-keys',
      textModel: 'gpt-4o-mini',
      visionModel: 'gpt-4o',
      needsKey: true
    },
    gemini: {
      label: 'Google Gemini',
      kind: 'gemini',
      keyUrl: 'https://aistudio.google.com/app/apikey',
      textModel: 'gemini-2.0-flash',
      visionModel: 'gemini-2.0-flash',
      needsKey: true
    },
    anthropic: {
      label: 'Anthropic Claude',
      kind: 'anthropic',
      keyUrl: 'https://console.anthropic.com/settings/keys',
      textModel: 'claude-sonnet-4-20250514',
      visionModel: 'claude-sonnet-4-20250514',
      needsKey: true
    },
    openrouter: {
      label: 'OpenRouter',
      kind: 'openrouter',
      keyUrl: 'https://openrouter.ai/keys',
      textModel: 'openai/gpt-4o-mini',
      visionModel: 'openai/gpt-4o',
      needsKey: true
    },
    ollama: {
      label: 'Ollama (local)',
      kind: 'ollama',
      textModel: 'llama3.2',
      visionModel: 'llama3.2-vision',
      baseUrl: 'http://localhost:11434',
      needsKey: false
    }
  },

  /* Human labels for history entries. */
  toolLabels: {
    solver: 'Omni-Solver',
    essay: 'Essay writer',
    summarize: 'Summarizer',
    flashcards: 'Flashcards',
    code: 'Code debugger',
    translate: 'Translate & grammar',
    algebra: 'Algebra solver'
  },

  systemPrompt:
    'You are StudyForge, a patient expert tutor for students. ' +
    'Give correct, complete answers with clear reasoning. ' +
    'For math, show every algebraic step and state the final answer on its own line. ' +
    'For science, name the concept or law you are using. ' +
    'For essays and writing, write in the requested tone and never invent citations. ' +
    'If an image is attached, first transcribe the problem you see, then solve it. ' +
    'Use Markdown: short paragraphs, headings when useful, and fenced code blocks for code. ' +
    'Never mention that you are an AI model. End with a one-line check or key takeaway when helpful.'
};
