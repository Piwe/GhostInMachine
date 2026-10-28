# Deploying to Render on a .tech domain

The web UI is a single zero-dependency Node server, so it fits Render's free web service.

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

## 3. Give the hosted site a real narrator (optional)

Render's free instances have no GPU, so the model runs somewhere else and the site calls it:

| Option | Settings |
|---|---|
| Your own machine running Ollama, through a tunnel (e.g. `cloudflared tunnel --url http://localhost:11434`) | `GHOST_PROVIDER=ollama`, `GHOST_BASE_URL=<tunnel URL>`, `GHOST_MODEL=gemma4:e4b` |
| A GPU server running llama.cpp `llama-server` or vLLM | `GHOST_PROVIDER=openai`, `GHOST_BASE_URL=<server URL>`, `GHOST_MODEL=<model name>`, `GHOST_API_KEY=<key>` |

A quick tunnel is public: anyone with the URL can use your Ollama. Put it behind a key or shut it down after the demo.

## 4. Point your .tech domain at it

1. Claim the free first-year .tech domain at <https://hacktoberfest.com/my/promos> (it renews at $29.99/year).
2. In Render: the service → **Settings → Custom Domains → Add**, enter `www.yourname.tech` (and `yourname.tech` if you want the bare domain). Render shows the DNS records it expects.
3. In the .tech registrar's DNS manager, add exactly those records: a `CNAME` for `www` pointing to your `onrender.com` host, and for the bare domain the `A` record (or `ALIAS`/`ANAME`) Render lists.
4. Back in Render, click **Verify**. HTTPS certificates are issued automatically once DNS propagates (minutes to a few hours).

Link the .tech URL in your DEV post.
