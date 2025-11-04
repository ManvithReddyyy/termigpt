# TermiGPT

**AI-Powered Terminal Assistant built with Node.js + Google Gemini API**  
*Chat, code, and create — all from your terminal ⚡*

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![API](https://img.shields.io/badge/API-Gemini-orange?logo=googlecloud)](#)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/manvithreddyyy/termigpt/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/manvithreddyyy/termigpt?style=social)](https://github.com/manvithreddyyy/termigpt/stargazers)

---

## About TermiGPT

**TermiGPT** brings the power of **Google Gemini AI** right into your terminal. You can chat, debug code, generate content, or learn — all from your command line.

It's like having your own AI terminal buddy that remembers context, supports multiple personalities, **and now has a Japanese NeoTokyo theme 🇯🇵**.

> 💻 "TermiGPT makes your terminal feel alive — type, ask, and think with AI."

---

## Features

✅ **Real-time AI responses** — powered by Gemini  
🧠 **Persistent chat mode** — context-aware  
🎭 **Custom personalities** — hacker, sarcastic, teacher, motivational, etc.  
🌸 **Japanese NeoTokyo mode** — switch instantly with `--tojapan`  
🖥️ **Fullscreen UI mode** — immersive chat with `--ui`  
🧾 **Markdown formatting** — clean and readable output  
🌀 **Auto model fallback** — always stays online  
💾 **Session logging** — saves every conversation  
🪄 **Simple setup** — just one `.env` key

---

## Installation

```bash
git clone https://github.com/manvithreddyyy/termigpt.git
cd termigpt
npm install
```

Then create a `.env` file:

```bash
echo GEMINI_API_KEY=your_gemini_api_key_here > .env
```

---

## Usage

### Ask a single question
```bash
node ask.js "Explain WebSockets simply"
```

### Start interactive chat
```bash
node ask.js --chat
```

### Launch fullscreen chat UI
```bash
node ask.js --ui
```

### Enable Japanese NeoTokyo Theme
```bash
node ask.js --ui --tojapan
```

### Long detailed responses
```bash
node ask.js "Explain microservices architecture" --long
```

---

## Personality Modes

| Style | Description |
|-------|-------------|
| default | Helpful and concise |
| hacker | Minimal and command-line focused |
| sarcastic | Witty and humorous |
| teacher | Beginner-friendly explanations |
| motivational | Positive and encouraging |

### Create Custom Personalities

You can create your own custom styles by adding a file in your home directory:

```bash
~/.askit_personalities.json
```

Example:

```json
{
  "elon": "You think like Elon Musk — ambitious, technical, and visionary."
}
```

---

## Japanese NeoTokyo Theme (--tojapan)

Switch to an aesthetic Japanese cyberpunk theme instantly:

```bash
node ask.js --ui --tojapan
```

### Features:
- 🌸 Sakura pink and cyan chat bubbles
- 🗾 Japanese prefixes (あなた ›, ＡＩ ›)
- ⚡ NeoTokyo banner

---

## Tech Stack

- Node.js (v18+)
- Google Gemini API
- Ink — for the fullscreen React-based TUI
- Chalk — colorful terminal output
- Commander — CLI command handling
- Dotenv — environment configuration
- Fetch API — for Gemini communication

---

## Roadmap

- 🔊 Add `--voice` (text-to-speech) support
- 🤝 Add multi-provider support (OpenAI, Claude, Mistral)
- 🧩 Add plugin system for terminal extensions
- 📦 Publish to npm (`npx termigpt`)

---

## Author

**Manvith Reddy**  
📍 Developer & Builder | Passionate about AI, Node.js, and Automation  
💬 GitHub [@manvithreddyyy](https://github.com/manvithreddyyy)

---

## License

This project is licensed under the MIT License — see the LICENSE file for details.
