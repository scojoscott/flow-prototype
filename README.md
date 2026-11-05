# NashFlow Deal Processor (prototype)

A working prototype of NashFlow for commercial property investment loans. Upload a broker's deal pack and the agents:

1. read every document (PDF, Word, Excel, text, images),
2. extract the application fields with links to their source, each marked Found, Not present, Not confident or Not applicable,
3. calculate the policy checks in code (loan size, term, LTV, ICR, DSCR, location, EPC, WAULT, concentration, document age) plus sensitivities and covenant headroom,
4. draft a credit memo with every figure linked to its source, and a request to the broker if anything is missing.

A person reviews, corrects and records the credit decision. Every agent and human action is audited.

Use made-up or anonymised deal packs only.

## Using the hosted site

Open the GitHub Pages address for this repository. In the sidebar, choose **Change AI provider** and paste a key:

- **Google Gemini**: free key from aistudio.google.com. On the free tier Google may use what you send to improve its models.
  If the chosen Gemini model is busy, the app retries and then switches to another available Gemini Flash model for the rest of the visit. The model in use shows under "AI provider" in the left-hand menu.
- **Claude API**: an Anthropic API key.
- **Azure OpenAI**: endpoint, deployment name and key.

Keys and cases are saved in your own browser only. The same page also runs at the claude.ai artifact link, where it uses Claude through your claude.ai account with no key.

## Deals inbox (Gmail demo)

Under **Administration, Deals inbox**, the app can read a Gmail account set up for demos. When a broker emails a pack to it, a case opens and the agents run with no clicks. Broker replies in the same thread are added to the case. With automatic follow-up on, NashFlow emails the broker for anything missing, reminds after 2 working days and flags the RM after 2 unanswered emails. The Deals inbox page lists each deal's email thread (the broker's emails and NashFlow's follow-ups). The Google Apps Script and set-up steps are in `gmail-intake/Code.gs` and behind **Inbox settings** on the Deals inbox page. It works on the hosted site and the downloaded copy, not inside the claude.ai link. Send it made-up or anonymised packs only.

The demo inbox is built into the page (`DEMO_INBOX` in `src/bottom.js`), so everyone who opens the hosted site is connected to it and sees the same emails. Each browser remembers which emails it has picked up and makes its own cases. The site is public, so anyone who reads the page can use that inbox: demo use only. Change the key in the script and in `DEMO_INBOX` before sharing the demo more widely. Automatic follow-up emails are off unless switched on in that browser. To give visitors a Gemini key without putting it in the code, share the link with the key after a #: `https://scojoscott.github.io/flow-prototype/#gk=YOUR-KEY`. The page saves the key in that browser and removes it from the address bar. Only people with that link get the key. A Claude API key works the same way with `#ck=YOUR-KEY`, which also switches that browser to Claude, and a Companies House key with `#chk=YOUR-KEY`. Combine them with &, for example `#ck=KEY&chk=KEY`.

A complete demo pack is in `demo-pack/`. Three test packs (clean, incomplete, inconsistent) are built into the app under New case.

## Making changes

- `src/top.html`: styles and page layout.
- `src/app.html`: the engine (document reading, AI prompts, field rules, policy checks, recommendation). Only the script part from `"use strict";` up to the rendering section is used.
- `src/bottom.js`: the screens and interactions.
- `src/build.py`: stitches the three together, embeds the sample packs and writes `index.html` (hosted site) and `src/nashflow-deal-processor.html` (claude.ai artifact).
- `src/make_samples.py` and `src/make_demo_pack.py`: generate the fictional packs.
- `gmail-intake/Code.gs`: the Google Apps Script for the demo inbox (embedded in the page by `build.py`).
- `src/test.js`: runs the app in Playwright with simulated AI replies and a simulated inbox.

To rebuild: `cd src && python3 make_samples.py && python3 make_demo_pack.py && python3 build.py`.

The illustrative credit policy comes from the broker submission flow document v0.6, section 7.1. Standard covenants (LTV 75%, ICR 1.35x, DSCR 1.15x) are in the illustrative policy as section 7.2, inferred from market norms, not from a lender.
