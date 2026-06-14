# cockpit-home

Public, frozen snapshot of my **Cockpit Home** dashboard.

The source is a private Obsidian vault. `Home.md` is rendered inside Obsidian
(DataviewJS, SVG charts, `cockpit.css`) and exported to self-contained HTML
with the *Webpage HTML Export* plugin. Only that exported output lives here —
no source notes, scripts, or other pages.

**Live site:** https://palprthi.github.io/cockpit-home/

## Refreshing the snapshot

1. In Obsidian, export `Home.md` via *Webpage HTML Export* into this folder
   (output the page as `index.html`).
2. Run `./publish.sh`.
3. GitHub Pages updates in ~1 minute.
