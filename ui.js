#!/usr/bin/env node
import React, { useState, useEffect } from "react";
import { render, Box, Text, useApp } from "ink";
import TextInput from "ink-text-input";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import 'dotenv/config';

const LOG_DIR = path.join(process.env.HOME || process.env.USERPROFILE, ".askit_logs");
const MODEL = "gemini-2.0-flash";
const API_KEY = process.env.GEMINI_API_KEY;

// --- Gemini API Call ---
async function queryGemini(prompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    })
  });
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "(no response)";
}

// --- UI Component ---
const ChatUI = () => {
  const { exit } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setLoading(true);

    const reply = await queryGemini(input);
    setMessages(m => [...m, { role: "assistant", text: reply }]);
    setLoading(false);
  };

  const saveLog = () => {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const file = path.join(LOG_DIR, `ui_chat_${Date.now()}.txt`);
    const data = messages.map(m => `${m.role}: ${m.text}`).join("\n\n");
    fs.writeFileSync(file, data);
  };

  useEffect(() => {
    const handleExit = () => {
      saveLog();
      exit();
    };
    process.on("SIGINT", handleExit);
    process.on("exit", handleExit);
    return () => process.off("exit", handleExit);
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="magentaBright">🤖 TermiGPT — Gemini Chat UI</Text>
      <Box flexDirection="column" marginTop={1}>
        {messages.map((msg, i) => (
          <Box key={i} marginBottom={1}>
            <Text color={msg.role === "user" ? "cyan" : "greenBright"}>
              {msg.role === "user" ? "you › " : "ai › "}
            </Text>
            <Text>{msg.text}</Text>
          </Box>
        ))}
        {loading && <Text color="yellow">Thinking...</Text>}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">› </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Type your message and hit Enter..."
        />
      </Box>
    </Box>
  );
};

// --- Run the UI ---
render(<ChatUI />);
