# Deploying to Render

The web UI is a single zero-dependency Node server, so it fits Render's free web service. The live instance is at <https://ghost-in-the-machine-bwff.onrender.com>.

## 1. Put the code on GitHub

```bash
git init && git add . && git commit -m "Ghost in the Machine"
gh repo create ghost-in-the-machine --public --source . --push
```

`.venv/` and `voices/` are git-ignored; Render doesn't need them.

## 2. Create the service from the blueprint

1. Claim your Render credits at <https://hacktoberfest.com/my/promos>.
2. In Render: **New → Blueprint**, pick the repo. Render reads `render.yaml`.
3. It asks for the optional values marked `sync: false`. Leave them empty to start; the site works with the template narrator, the JS anomaly baseline and the browser's voice.
4. When the deploy finishes, open `https://ghost-in-the-machine.onrender.com` (the exact URL is on the service page).

Free instances sleep when idle; the first visit after a while takes ~30 seconds to wake. That's on brand.

If you create the service from a public repo URL (or through the Render API) instead of connecting your GitHub account, Render isn't told about new pushes. Trigger a deploy from the dashboard (**Manual Deploy → Deploy latest commit**) after each change, or connect GitHub under **Settings → Build & Deploy**.

## 3. Give the hosted site a real narrator (optional)

Render's free instances have no GPU, so the model runs somewhere else and the site calls it:

| Option | Settings |
|---|---|
| Your own machine running Ollama, through a tunnel (e.g. `cloudflared tunnel --url http://localhost:11434`) | `GHOST_PROVIDER=ollama`, `GHOST_BASE_URL=<tunnel URL>`, `GHOST_MODEL=gemma4:e4b` |
| Gemma 4 on Google AI Studio (what the live site uses; free key at <https://aistudio.google.com/apikey>) | `GHOST_PROVIDER=openai`, `GHOST_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`, `GHOST_MODEL=gemma-4-26b-a4b-it`, `GHOST_API_KEY=<key>` |
| A GPU server running llama.cpp `llama-server` or vLLM | `GHOST_PROVIDER=openai`, `GHOST_BASE_URL=<server URL>`, `GHOST_MODEL=<model name>`, `GHOST_API_KEY=<key>` |

A quick tunnel is public: anyone with the URL can use your Ollama. Put it behind a key or shut it down after the demo.
