#!/usr/bin/env node
import 'dotenv/config';
import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import { Command } from "commander";
import chalk from "chalk";
import fetch from "node-fetch";
import { spawn } from "child_process"; // 👈 For launching UI

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(os.homedir(), ".askit_config");
const USER_PERSONAS = path.join(os.homedir(), ".askit_personalities.json");
const LOG_DIR = path.join(os.homedir(), ".askit_logs");

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_PERSONALITIES = {
  default: "You are a helpful, concise assistant. Prefer short, actionable answers with examples when relevant.",
  sarcastic: "You're a witty, sarcastic assistant. Roast gently but always provide correct, practical help.",
  motivational: "You're a high-energy coach. Be supportive, positive, and give step-by-step guidance.",
  hacker: "You're a cool, terse, command-line-loving hacker mentor. Prefer shell snippets and minimal prose.",
  teacher: "You're a patient teacher. Explain concepts like to a beginner, with analogies and checks for understanding."
};

// ---------- Helpers ----------
function banner(tojapan = false) {
  if (tojapan) {
    return chalk.hex("#ff66cc")(`
╭──────────────────────────────────────────────╮
│  🗾 ネオ東京 — TermiGPT                      │
│  ✨ 日本のAIターミナル  |  “NeoTokyo CLI”     │
╰──────────────────────────────────────────────╯
`);
  } else {
    return chalk.magentaBright(`
╭────────────────────────────────────╮
│  🤖 TermiGPT — Gemini CLI          │
╰────────────────────────────────────╯
`);
  }
}

function ensureLogDir() {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (_) {}
}

function logLine(text) {
  ensureLogDir();
  const now = new Date();
  const file = path.join(LOG_DIR, `${now.toISOString().slice(0, 10)}.txt`);
  fs.appendFileSync(file, `[${now.toISOString()}] ${text}\n`);
}

function buildSystemPrompt(style, personalities) {
  const persona = personalities[style] || personalities["default"];
  return `${persona}\nAdditional rules:\n- Use bullet points when helpful.\n- Provide runnable examples when code is requested.\n- Keep answers short unless --long is used.`;
}

function loadPersonalities() {
  let extra = {};
  try {
    if (fs.existsSync(USER_PERSONAS)) {
      extra = JSON.parse(fs.readFileSync(USER_PERSONAS, "utf-8"));
    }
  } catch (_) {}
  return { ...DEFAULT_PERSONALITIES, ...extra };
}

async function promptHidden(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  process.stdout.write(query);
  const key = await new Promise((res) => rl.question("", res));
  rl.close();
  return key.trim();
}

async function getAPIKey() {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "")
    return process.env.GEMINI_API_KEY.trim();

  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const saved = fs.readFileSync(CONFIG_PATH, "utf-8").trim();
      if (saved) return saved;
    } catch (_) {}
  }

  const entered = await promptHidden("Enter your Gemini API key: ");
  if (!entered) throw new Error("❌ No API key provided. Please set GEMINI_API_KEY in .env or enter manually.");
  fs.writeFileSync(CONFIG_PATH, entered, { mode: 0o600 });
  console.log(chalk.green("✅ API key saved to ~/.askit_config"));
  return entered;
}

// ---------- Gemini Query ----------
async function queryGemini(model, prompt, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    })
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Gemini API error: ${res.status} ${res.statusText}\n${text}`);
  const data = JSON.parse(text);
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "(no response)";
}

// ---------- Modes ----------
async function singleShot({ question, style, long, model, tojapan }) {
  const apiKey = await getAPIKey();
  const personalities = loadPersonalities();
  console.log(banner(tojapan));

  if (tojapan) {
    console.log(chalk.hex("#00ccff")(`🤖 スタイル: ${style}`));
    console.log(chalk.hex("#9999cc")(`❓ 質問: ${question}\n`));
  } else {
    console.log(chalk.cyanBright(`🤖 Style: ${style}`));
    console.log(chalk.gray(`> ${question}\n`));
  }

  const prompt = `${buildSystemPrompt(style, personalities)}\n\nUser: ${question}${long ? "\nBe detailed and thorough." : ""}`;
  const answer = await queryGemini(model, prompt, apiKey);

  if (tojapan) {
    console.log(chalk.hex("#ff99ff")(`ＡＩ › ${answer}\n`));
    process.stdout.write('\x07'); // bell sound
  } else {
    console.log(chalk.green(`💬 ${answer}\n`));
  }

  logLine(`Q: ${question}`);
  logLine(`A: ${answer}`);
}

async function chatMode({ style, long, model, tojapan }) {
  const apiKey = await getAPIKey();
  const personalities = loadPersonalities();
  console.log(banner(tojapan));

  if (tojapan) {
    console.log(chalk.hex("#00ccff")(`🤖 チャットモード — スタイル: ${style}`));
    console.log(chalk.hex("#9999cc")("入力 :exit で終了, :clear でリセット。\n"));
  } else {
    console.log(chalk.cyanBright(`🤖 Chat mode — Style: ${style}`));
    console.log(chalk.gray("Type :exit to quit, :clear to reset context.\n"));
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.bold(tojapan ? "あなた › " : "you › ")
  });

  let context = buildSystemPrompt(style, personalities);
  rl.prompt();

  rl.on("line", async (line) => {
    const text = line.trim();
    if (!text) return rl.prompt();
    if (text === ":exit") return rl.close();
    if (text === ":clear") {
      context = buildSystemPrompt(style, personalities);
      console.log(chalk.yellow(tojapan ? "↺ コンテキストをリセットしました。" : "↺ Context cleared."));
      return rl.prompt();
    }

    const fullPrompt = `${context}\nUser: ${text}${long ? "\nBe detailed and thorough." : ""}`;
    try {
      const answer = await queryGemini(model, fullPrompt, apiKey);
      if (tojapan) {
        console.log(chalk.hex("#ff99ff")(`ＡＩ › ${answer}\n`));
        process.stdout.write('\x07');
      } else {
        console.log(chalk.greenBright(`ai › ${answer}\n`));
      }
      logLine(`Q: ${text}`);
      logLine(`A: ${answer}`);
    } catch (err) {
      console.error(chalk.red("Error:"), err.message);
    }
    rl.prompt();
  }).on("close", () => {
    console.log(chalk.gray(tojapan ? "さようなら 👋" : "bye!"));
    process.exit(0);
  });
}

// ---------- CLI ----------
const program = new Command();
program
  .name("termigpt")
  .description("AI-powered terminal assistant (Gemini version)")
  .argument("[question...]", "Your question. If omitted, use --chat or --ui.")
  .option("-s, --style <style>", "Choose a personality style", "default")
  .option("-m, --model <model>", "Choose Gemini model", DEFAULT_MODEL)
  .option("--chat", "Interactive chat mode")
  .option("--long", "Ask for more detailed responses")
  .option("--ui", "Launch fullscreen chat UI")
  .option("--tojapan", "Enable Japanese NeoTokyo theme 🌸")
  .action(async (questionParts, opts) => {
    try {
      // Launch UI mode
      if (opts.ui) {
        const uiPath = path.join(__dirname, "ui.jsx");
        const args = ["tsx", uiPath];
        if (opts.tojapan) args.push("--tojapan");
        spawn("npx", args, { stdio: "inherit", shell: true });
        return;
      }

      // Normal chat or Q&A
      if (opts.chat || questionParts.length === 0) {
        await chatMode({ style: opts.style, long: opts.long, model: opts.model, tojapan: opts.tojapan });
      } else {
        const question = questionParts.join(" ");
        await singleShot({ question, style: opts.style, long: opts.long, model: opts.model, tojapan: opts.tojapan });
      }
    } catch (err) {
      console.error(chalk.red("Error:"), err?.message || err);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
