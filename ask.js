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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration Constants ---
const CONFIG_PATH = path.join(os.homedir(), ".askit_config");
const USER_PERSONAS = path.join(os.homedir(), ".askit_personalities.json");
const LOG_DIR = path.join(os.homedir(), ".askit_logs");

// --- Model Constants ---
// Use the current stable, free-tier model
const DEFAULT_MODEL = "gemini-2.5-flash"; 
const STABLE_FALLBACK_MODEL = "gemini-2.5-flash"; 

const DEFAULT_PERSONALITIES = {
    default: "You are a helpful, concise assistant. Prefer short, actionable answers with examples when relevant.",
    sarcastic: "You're a witty, sarcastic assistant. Roast gently but always provide correct, practical help.",
    motivational: "You're a high-energy coach. Be supportive, positive, and give step-by-step guidance.",
    hacker: "You're a cool, terse, command-line-loving hacker mentor. Prefer shell snippets and minimal prose.",
    teacher: "You're a patient teacher. Explain concepts like to a beginner, with analogies and checks for understanding."
};

// --------------------------- Helpers ----------------------------

function banner() {
    return chalk.magentaBright(`
╭────────────────────────────────────╮
│  🤖 AskIt — AI via Gemini          │
╰────────────────────────────────────╯
`);
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
    // 1️⃣ Try from .env file (GEMINI_API_KEY)
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "") {
        return process.env.GEMINI_API_KEY.trim();
    }
    // 2️⃣ Try from saved config file (~/.askit_config)
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            const saved = fs.readFileSync(CONFIG_PATH, "utf-8").trim();
            if (saved) return saved;
        } catch (_) {}
    }
    // 3️⃣ Ask user to input manually
    const entered = await promptHidden("Enter your Gemini API key: ");
    if (!entered) throw new Error("❌ No API key provided. Please set GEMINI_API_KEY in .env or enter manually.");

    try {
        fs.writeFileSync(CONFIG_PATH, entered, { mode: 0o600 });
        console.log(chalk.green("✅ API key saved to ~/.askit_config"));
    } catch (e) {
        console.log(chalk.yellow("⚠️ Could not save key; will use it for this session only."));
    }

    return entered;
}

// --------------------------- Gemini Query ----------------------------

async function queryGemini(model, prompt, apiKey) {
    let endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    let currentModel = model;
    
    // Fallback model logic: Correct common outdated names or use the requested model
    if (currentModel.toLowerCase() !== STABLE_FALLBACK_MODEL) {
        // If the user requests an old name like 'gemini-pro', update it to 'gemini-2.5-pro'
        if (currentModel.toLowerCase().includes('pro') && !currentModel.toLowerCase().includes('2.5')) {
            currentModel = "gemini-2.5-pro";
        }
    }
    
    // Update endpoint if model name was corrected
    if (currentModel !== model) {
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
    }

    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            // CORRECTED: Removed the invalid 'config' block. 
            // The prompt contains the system instruction and user question combined.
            contents: [{ role: "user", parts: [{ text: prompt }] }] 
        })
    });

    const responseText = await res.text();

    if (!res.ok) {
        // If 404 error, try auto fallback to the free, stable model
        if (res.status === 404 && currentModel !== STABLE_FALLBACK_MODEL) {
            console.log(chalk.yellow(`⚠️ Model "${model}" not found. Falling back to "${STABLE_FALLBACK_MODEL}"...`));
            return await queryGemini(STABLE_FALLBACK_MODEL, prompt, apiKey);
        }
        throw new Error(`Gemini API error: ${res.status} ${res.statusText}\n${responseText}`);
    }

    try {
        const data = JSON.parse(responseText);
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return text || "(No text response from Gemini. The API may have returned a blocked or empty response.)";
    } catch (e) {
        throw new new Error(`Failed to parse Gemini response: ${responseText.substring(0, 100)}...`);
    }
}

// --------------------------- Modes ----------------------------

async function singleShot({ question, style, long, model }) {
    const apiKey = await getAPIKey();
    const personalities = loadPersonalities();
    
    const systemPrompt = buildSystemPrompt(style, personalities);

    console.log(banner());
    console.log(chalk.cyanBright(`🤖 Style: ${style}`));
    console.log(chalk.gray(`> ${question}\n`));

    // Combine system prompt and user question to form the full prompt
    const prompt = `${systemPrompt}\n\nUser: ${question}${long ? "\nBe detailed and thorough." : ""}`;
    
    const answer = await queryGemini(model, prompt, apiKey);

    console.log(chalk.green(`💬 ${answer}\n`));
    logLine(`Q: ${question}`);
    logLine(`A: ${answer}`);
}

async function chatMode({ style, long, model }) {
    const apiKey = await getAPIKey();
    const personalities = loadPersonalities();

    console.log(banner());
    console.log(chalk.cyanBright(`🤖 Chat mode — Style: ${style}`));
    console.log(chalk.gray("Type :exit to quit, :clear to reset context.\n"));

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk.bold("you › ")
    });

    let context = buildSystemPrompt(style, personalities); 
    rl.prompt();

    rl.on("line", async (line) => {
        const text = line.trim();
        if (!text) return rl.prompt();
        if (text === ":exit") return rl.close();
        if (text === ":clear") {
            context = buildSystemPrompt(style, personalities);
            console.log(chalk.yellow("↺ Context cleared."));
            return rl.prompt();
        }

        const fullPrompt = `${context}\nUser: ${text}${long ? "\nBe detailed and thorough." : ""}`;
        try {
            const answer = await queryGemini(model, fullPrompt, apiKey);
            console.log(chalk.greenBright(`ai › ${answer}\n`));
            logLine(`Q: ${text}`);
            logLine(`A: ${answer}`);
        } catch (err) {
            console.error(chalk.red("Error:"), err.message);
        }
        rl.prompt();
    }).on("close", () => {
        console.log(chalk.gray("bye!"));
        process.exit(0);
    });
}

// --------------------------- CLI Setup ----------------------------

const program = new Command();
program
    .name("askit")
    .description("AI-powered terminal assistant (Gemini version)")
    .argument("[question...]", "Your question. If omitted, use --chat.")
    .option("-s, --style <style>", "Choose a personality style", "default")
    .option("-m, --model <model>", "Choose Gemini model", DEFAULT_MODEL) 
    .option("--chat", "Interactive chat mode")
    .option("--long", "Ask for more detailed responses")
    .action(async (questionParts, opts) => {
        try {
            if (opts.chat || questionParts.length === 0) {
                await chatMode({ style: opts.style, long: opts.long, model: opts.model });
            } else {
                const question = questionParts.join(" ");
                await singleShot({ question, style: opts.style, long: opts.long, model: opts.model });
            }
        } catch (err) {
            console.error(chalk.red("Error:"), err?.message || err);
            process.exit(1);
        }
    });

program.parseAsync(process.argv);