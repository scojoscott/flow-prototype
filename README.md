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
- **Claude API**: an Anthropic API key.
- **Azure OpenAI**: endpoint, deployment name and key.

Keys and cases are saved in your own browser only. The same page also runs at the claude.ai artifact link, where it uses Claude through your claude.ai account with no key.

A complete demo pack is in `demo-pack/`. Three test packs (clean, incomplete, inconsistent) are built into the app under New case.

## Making changes

- `src/top.html`: styles and page layout.
- `src/app.html`: the engine (document reading, AI prompts, field rules, policy checks, recommendation). Only the script part from `"use strict";` up to the rendering section is used.
- `src/bottom.js`: the screens and interactions.
- `src/build.py`: stitches the three together, embeds the sample packs and writes `index.html` (hosted site) and `src/nashflow-deal-processor.html` (claude.ai artifact).
- `src/make_samples.py` and `src/make_demo_pack.py`: generate the fictional packs.
- `src/test.js`: runs the app in Playwright with simulated AI replies.

To rebuild: `cd src && python3 make_samples.py && python3 make_demo_pack.py && python3 build.py`.

The illustrative credit policy comes from the broker submission flow document v0.6, section 7.1. Proposed covenant levels (LTV 75%, ICR 1.35x) are placeholders, not a lender's.
