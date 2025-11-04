# AskIt CLI — AI in your terminal

**Ask anything from your terminal.** Pick a personality (`default`, `sarcastic`, `motivational`, `hacker`, `teacher`) or add your own.

## Quick start

```bash
# Download or clone
npm install

# First run will prompt for your OpenAI API key and save it to ~/.askit_config
npx askit-cli "Explain React like I'm 5"
```

## Global install

```bash
npm link         # from the project folder
askit "What is recursion?" -s motivational
```

## Usage

```bash
askit "Fix this Node.js error" -s hacker
askit --chat -s sarcastic
askit "What is Docker?" --long
askit --help
```

### Custom personalities

Create `~/.askit_personalities.json`:

```json
{
  "gandalf": "You are wise and poetic like Gandalf from LOTR.",
  "dev": "You're a senior developer who explains tradeoffs and best practices."
}
```

Then run:

```bash
askit "Teach me recursion" -s gandalf
```

## Logs

Q&A are saved to `~/.askit_logs/YYYY-MM-DD.txt`. In chat mode, type `:save` to save the transcript.

## Notes

- Requires Node 18+
- Set `OPENAI_API_KEY` env var to override the saved key.
- Uses OpenAI `gpt-4o-mini` by default.
