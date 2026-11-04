/* ------------------------------------------------------------------ rendering */
let view = cases.length ? "cases" : "new";
let selectedField = "annual_rent";
let srcDocSel = null;
let editingSection = null;
let draftDecision = { role: "Underwriter", choice: "", grade: "", rationale: "", conditions: "" };
const shortMoney = (n) => (n == null || !isFinite(n) ? "-" : n >= 1e6 ? "£" + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 2).replace(/\.?0+$/, "") + "m" : n >= 1e3 ? "£" + Math.round(n / 1e3) + "k" : "£" + Math.round(n));

function refChip(doc, page, quote, label) {
  const c = cur(); const d = c && c.docs.find((x) => x.id === doc);
  const name = label || (d ? `${d.type && d.type !== "Other" ? d.type : d.name.replace(/\.[a-z]+$/i, "")} p.${page || 1}` : `${doc} p.${page || 1}`);
  return `<button class="ref" type="button" data-src="${esc(doc)}" data-page="${esc(page || 1)}" data-quote="${esc(quote || "")}" title="Open ${esc(d ? d.name : doc)}">${esc(name)}</button>`;
}
function renderRich(text) {
  const blocks = String(text || "").replace(/\r/g, "").split(/\n\s*\n/);
  const inline = (s) => esc(s).replace(/\[(D\d+)\s*,?\s*p(?:age)?\.?\s*(\d+)\]/gi, (_, d, p) => refChip(d, p, "")).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  const isB = (l) => /^\s*[-•*]\s+/.test(l) && !/^\s*\*\*/.test(l);
  return blocks.map((b) => {
    const lines = b.split("\n").filter((l) => l.trim());
    let html = "", list = [], para = [];
    const flushL = () => { if (list.length) html += "<ul>" + list.map((l) => "<li>" + inline(l.replace(/^\s*[-•*]\s+/, "")) + "</li>").join("") + "</ul>"; list = []; };
    const flushP = () => { if (para.length) html += "<p>" + para.map(inline).join("<br>") + "</p>"; para = []; };
    lines.forEach((l) => { if (isB(l)) { flushP(); list.push(l); } else { flushL(); para.push(l); } });
    flushP(); flushL();
    return html;
  }).join("");
}
function outcomeChip(k) {
  if (k.outcome === "Pass" && k.flag === "amber") return `<span class="chip c-amber">Pass, watch</span>`;
  const cls = { Pass: "o-pass", Fail: "o-fail", Unclear: "o-unclear", "N/A": "o-na" }[k.outcome] || "o-na";
  return `<span class="chip ${cls}">${esc(k.outcome === "N/A" ? "Not applicable" : k.outcome)}</span>`;
}
const recChipClass = (kind) => ({ approve: "c-green", decline: "c-red", more: "c-amber", escalate: "c-blue" }[kind] || "c-grey");
function pageHead(title, crumb, intro) {
  return `<div class="pagehead"><h1>${esc(title)}</h1><div class="crumb">Demo lender › ${esc(crumb || title)}</div></div>${intro ? `<p class="intro">${intro}</p>` : ""}`;
}
const protoNote = `<div class="proto"><b>Prototype.</b> Use made-up or anonymised deal packs only. Documents are sent to the AI provider shown in the sidebar. The agents prepare the case; a person makes every credit decision.</div>`;
function missingCount(c) { return c.fields ? FIELDS.filter((f) => { const x = c.fields[f.key]; const need = f.mandatory || (f.mandatoryIf === "purchase" && x.state !== "Not applicable"); return need && !x.edited && x.state !== "Found" && x.state !== "Not applicable"; }).length : 0; }

function renderNav() {
  const c = cur();
  const item = (id, label, badge, disabled) => `<button class="nav" type="button" data-view="${id}" ${view === id ? 'aria-current="page"' : ""} ${disabled ? "disabled" : ""}><span>${label}</span>${badge != null ? `<span class="badge">${badge}</span>` : ""}</button>`;
  $("#navCases").innerHTML = `<div class="navlabel">Cases</div>${item("new", "New case")}${item("cases", "My cases", cases.length)}${item("case", "Case management", null, !c)}`;
  $("#navAdmin").innerHTML = `<div class="navlabel">Administration</div>${item("policy", "Credit policies")}${item("agents", "AI governance")}`;
}

function renderNew() {
  const samples = SAMPLES ? Object.entries(SAMPLES).map(([k, s]) => `<div class="sample"><b>${esc(s.label)}</b><span>${esc(s.blurb)}</span><button class="btn small" type="button" data-sample="${k}">Run the agents</button></div>`).join("") : `<p class="hint">Sample packs are not included in this copy.</p>`;
  return pageHead("New case", "New case", "Upload the broker's deal pack. The agents read every document, extract the application fields with links to their source, run the credit policy checks and draft the credit memo. You check their work and make the decision.") + protoNote +
    `<div class="grid2 even">
      <div class="card"><h2>Upload a deal pack</h2>
        <div class="drop" id="drop"><p>Drop the broker email and attachments here: valuation, tenancy schedule, leases, accounts. PDF, Word, Excel, text or images.</p><button class="btn primary" type="button" data-act="pick">Choose files</button></div>
        <p class="hint">Tip: save the broker's email as a PDF or text file and include it with the attachments.</p>
      </div>
      <div class="card"><h2>Sample packs</h2><p class="hint">Fictional packs based on the test cases in the broker submission requirements: clean, incomplete and inconsistent.</p>${samples}</div>
    </div>`;
}

function caseRow(c) {
  const L = c.fields ? num(c, "loan_amount") : null;
  const miss = missingCount(c); const mism = c.consistency ? c.consistency.length : 0;
  const complete = !c.fields ? `<span class="chip c-grey">Reading</span>` : miss ? `<span class="chip c-amber">${miss} missing</span>` : `<span class="chip c-green">Complete</span>`;
  const consistent = !c.fields ? "" : mism ? `<span class="chip c-amber">${mism} mismatch</span>` : `<span class="chip c-green">Consistent</span>`;
  const rec = c.rec && c.memo ? `<span class="chip ${recChipClass(c.rec.kind)}">${esc(c.rec.label.split(" (")[0])}</span>` : c.run && c.run.error ? `<span class="chip c-red">Run stopped</span>` : `<span class="chip c-grey">Pending</span>`;
  return `<tr><td class="num">${dateOf(c.createdAt)} ${timeOf(c.createdAt)}<span class="sub">uploaded</span></td>
    <td><b>${esc(c.title)}</b><span class="sub">${esc(c.ref)}${c.fields && usable(c, "broker") ? " · " + esc(usable(c, "broker")) : ""}</span></td>
    <td class="fv">${shortMoney(L)}</td><td>${complete}</td><td>${consistent}</td><td>${esc(c.status)}</td><td>${rec}</td>
    <td><button class="btn primary small" type="button" data-case="${c.id}">Open case</button></td></tr>`;
}
function renderCases() {
  const done = cases.filter((c) => c.rec && c.memo);
  const cc = done.filter((c) => c.rec.complete && c.rec.consistent).length;
  const more = done.filter((c) => c.rec.kind === "more").length;
  const exc = done.filter((c) => c.rec.kind === "escalate" || c.rec.kind === "decline").length;
  return pageHead("My cases", "My cases", "Every deal pack you have run through the agents, with what they found. You check the agents' work and prepare the case.") +
    `<div class="stats">
      <div class="stat"><b>${cases.length}</b><span>Cases in this browser</span><small>Read by the agents</small></div>
      <div class="stat"><b>${cc}</b><span>Complete and consistent</span><small>Ready for you to check</small></div>
      <div class="stat"><b>${more}</b><span>Need more information</span><small>Request drafted for the broker</small></div>
      <div class="stat"><b>${exc}</b><span>Exceptions or declines</span><small>Outside policy or appetite</small></div>
    </div>` +
    (cases.length ? `<div class="tablewrap"><table class="t"><thead><tr><th>Received</th><th>Borrower and broker</th><th>Loan</th><th>Complete</th><th>Consistent</th><th>Status</th><th>Recommendation</th><th></th></tr></thead><tbody>${cases.map(caseRow).join("")}</tbody></table></div>`
      : `<div class="card"><h2>No cases yet</h2><p class="hint">Upload a deal pack or run one of the sample packs.</p><div><button class="btn primary" type="button" data-view="new">New case</button></div></div>`);
}

function tile(k, v, s, tone) { return `<div class="tile ${tone || ""}"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s || "&nbsp;"}</div></div>`; }
function renderCaseView(c) {
  const ready = !!c.fields;
  const L = ready ? num(c, "loan_amount") : null, T = ready ? num(c, "loan_term_years") : null, V = ready ? num(c, "property_value") : null;
  const ltv = c.checks.find((k) => k.id === "ltv"), icr = c.checks.find((k) => k.id === "icr");
  const miss = missingCount(c), mism = c.consistency.length;
  const toCheck = ready ? FIELDS.filter((f) => { const x = c.fields[f.key]; return !x.edited && (x.state === "Not confident" || (x.state === "Not present" && (f.mandatory || f.mandatoryIf))); }).length : 0;
  const flags = c.checks.concat(c.judgements).filter((k) => k.flag === "red" || k.flag === "amber").length + mism;
  const broker = ready ? usable(c, "broker") : null;
  const sub = [broker ? "From " + broker : "Uploaded", "received " + dateOf(c.createdAt) + " " + timeOf(c.createdAt), ready ? (miss || mism ? [miss ? miss + " missing" : "", mism ? mism + " mismatch" : ""].filter(Boolean).join(", ") : "complete and consistent") : "agents reading", "policy: illustrative UK market standard"].join(" · ");
  const rb = ready ? String(usable(c, "repayment_basis") || "").toLowerCase() : "";
  const recTone = c.rec && c.memo ? { approve: "green", decline: "red", more: "amber", escalate: "blue" }[c.rec.kind] : "";
  const tabs = [["memo", "Credit memo"], ["source", "Source check", toCheck ? `<span class="chip c-amber">${toCheck} to check</span>` : ""], ["policy", "Policy checks", flags ? `<span class="chip c-amber">${flags} flag${flags > 1 ? "s" : ""}</span>` : ""], ["decision", "Decision"], ["audit", "Audit"]];
  let body;
  if (!ready && currentTab !== "audit") body = renderWorking(c);
  else body = { memo: renderMemoTab, source: renderSource, policy: renderPolicyTab, decision: renderDecision, audit: renderAudit }[currentTab](c);
  return pageHead("Case management", "Case management") + `
  <div class="casecard">
    <div class="titleline"><span class="cref">${esc(c.ref)}</span><h2>${esc(c.title)}</h2><span class="chip c-grey">Commercial property investment loan</span><span class="chip c-amber">${esc(c.status)}</span><span style="flex:1"></span><button class="btn small" type="button" data-act="delete-case">Delete case</button></div>
    <div class="subline">${esc(sub)}</div>
    <div class="tiles">
      ${tile("Facility", shortMoney(L), T != null ? `${T} years${rb ? ", " + esc(rb) : ""}` : "")}
      ${tile("LTV", ltv ? esc(ltv.value) : "-", V != null ? `on ${shortMoney(V)} ${/estimate/i.test(String(usable(c, "value_basis") || "")) ? "estimate" : "valuation"}` : "", ltv && ltv.outcome === "Fail" ? "red" : "")}
      ${tile("Interest cover", icr ? esc(icr.value) : "-", `policy minimum ${POLICY.minICR}x`, icr && icr.outcome === "Fail" ? "red" : "")}
      ${tile("Recommendation", c.rec && c.memo ? esc(c.rec.label.split(" (")[0]) : "-", c.rec && c.memo ? esc(c.rec.approver.split(" (")[0]) + " decides" : "", recTone)}
      ${tile("Risk grade", c.decision && c.decision.grade ? c.decision.grade + " of 10" : "Not set", "set by the Underwriter")}
      ${tile("Fields found", ready ? `${FIELDS.filter((f) => c.fields[f.key].state === "Found").length} of ${FIELDS.length}` : "-", ready ? (toCheck ? `${toCheck} for you to check` : "nothing to check") : "")}
    </div>
  </div>
  <div class="tabs" role="tablist">${tabs.map(([id, name, extra]) => `<button class="tab" role="tab" type="button" aria-selected="${currentTab === id}" data-tab="${id}">${name}${extra || ""}</button>`).join("")}</div>
  ${body}`;
}
function renderAgents(c) {
  if (!c.run) return "";
  return `<div class="card"><div class="cardhead"><h2>Agents at work</h2>${c.run.running ? `<span class="chip c-amber">Working</span>` : c.run.error ? `<span class="chip c-red">Stopped</span>` : `<span class="chip c-green">Case ready</span>`}</div>
    <div class="timeline">${c.run.steps.map((s) => `<div class="tl"><span class="time">${s.at ? timeOf(s.at) : ""}</span><div><b>${esc(s.agent)}</b>${s.state === "done" ? `<span class="chip c-green">Done</span>` : s.state === "active" ? `<span class="spin" aria-label="Working"></span>` : s.state === "error" ? `<span class="chip c-red">Stopped</span>` : `<span class="chip c-grey">Waiting</span>`}<p>${esc(s.detail || s.text)}</p></div></div>`).join("")}</div>
    ${c.run.error ? `<div class="errbox"><b>The run stopped.</b> ${esc(c.run.error)}</div><div class="row"><button class="btn primary" type="button" data-act="rerun">Run the agents again</button><button class="btn" type="button" data-act="settings">Change AI provider</button></div>` : ""}
    ${!c.run.running && !c.run.error ? `<div><button class="btn small" type="button" data-act="rerun">Run all agents again</button></div>` : ""}</div>`;
}
function renderDocs(c) {
  return `<div class="card"><h2>Documents</h2><div class="tablewrap bare"><table class="t"><tbody>${c.docs.map((d) => `<tr><td>${refChip(d.id, 1, "", d.id)}</td><td><b>${esc(d.name)}</b><span class="sub">${esc(d.type || "Not classified yet")}${d.date ? " · " + esc(d.date) : ""} · ${d.pages.length} page${d.pages.length > 1 ? "s" : ""}</span>${d.summary ? `<span class="sub">${esc(d.summary)}</span>` : ""}</td></tr>`).join("")}</tbody></table></div></div>`;
}
function renderWorking(c) {
  return `<div class="grid2"><div class="stack">${renderAgents(c)}</div><div class="stack">${renderDocs(c)}</div></div>`;
}
function renderMemoTab(c) {
  const r = c.rec;
  if (!c.memo) return renderWorking(c);
  const recbar = `<div class="recbar"><div class="line"><span>Recommendation (a suggestion; a person decides)</span><span class="chip ${recChipClass(r.kind)}">${esc(r.label)}</span><span class="note">Approver: ${esc(r.approver)}</span></div>
    ${r.reasons.length ? `<ol>${r.reasons.slice(0, 6).map((x) => `<li>${esc(x.text)}</li>`).join("")}</ol>` : `<p class="note">All provisions pass and no material issues were found.</p>`}</div>`;
  const stale = c.memoStale ? `<div class="stale"><span>Figures changed after the memo was drafted. The policy assessment and recommendation are updated; the written sections are not.</span><button class="btn small" type="button" data-act="redraft">Redraft agent sections</button></div>` : "";
  const memo = `<div class="card"><div class="cardhead"><h2>Credit memo</h2><div class="row"><span class="chip c-amber">Draft</span><button class="btn small" type="button" data-act="copy-memo">Copy memo</button></div></div>
    <div class="legend"><span><i style="background:var(--muted)"></i>Drafted by the memo agent until a person edits a section. Every edit is audited.</span><span><i style="background:var(--accent)"></i>Red tags open the source document and page.</span></div>
    ${MEMO_SECTIONS.map(([k, name]) => {
      const s = c.memo[k] || { text: "", by: "Memo agent" };
      const by = s.by === "You" ? `Edited by you at ${timeOf(s.at)}` : s.by === "System" ? "From the calculated checks" : "Memo agent";
      const body = editingSection === k ? `<textarea class="ed" id="memoEdit" aria-label="${esc(name)}">${esc(s.text)}</textarea><div class="row"><button class="btn primary small" type="button" data-act="save-sec" data-key="${k}">Save</button><button class="btn small" type="button" data-act="cancel-sec">Cancel</button></div>` : `<div class="memo-body">${renderRich(s.text) || '<p class="note">Empty</p>'}</div>`;
      return `<section class="memo-sec"><header><h3>${esc(name)}</h3><span class="by">${by}</span><span class="grow"></span>${editingSection === k ? "" : `<button class="btn small" type="button" data-act="edit-sec" data-key="${k}">Edit</button>`}</header>${body}</section>`;
    }).join("")}</div>`;
  const req = c.brokerRequest ? `<div class="card"><div class="cardhead"><h2>Request to the broker</h2><span class="chip c-amber">Drafted</span></div><p class="hint">Drafted by the memo agent. Edit it, then copy it into your email. Nothing is sent from here.</p><textarea class="ed" id="brokerReq" aria-label="Request to the broker">${esc(c.brokerRequest)}</textarea><div class="row"><button class="btn" type="button" data-act="copy-req">Copy email</button><button class="btn" type="button" data-act="log-req">Mark as sent</button></div></div>` : "";
  return `<div class="grid2"><div class="stack">${recbar}${stale}${memo}</div><div class="stack">${renderAgents(c)}${req}${renderDocs(c)}</div></div>`;
}

function highlight(text, quote) {
  let html = esc(text); let found = false;
  if (quote) {
    const words = quote.trim().split(/\s+/).map((w) => esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    for (const n of [words.length, Math.min(5, words.length), Math.min(3, words.length)]) {
      if (!n) break;
      const re = new RegExp(words.slice(0, n).join("\\s+"), "i");
      if (re.test(html)) { html = html.replace(re, (m) => `<mark>${m}</mark>`); found = true; break; }
    }
  }
  return { html, found };
}
function findQuote(text, quote) {
  if (!quote) return null;
  const words = quote.trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  for (const n of [words.length, Math.min(5, words.length), Math.min(3, words.length)]) {
    if (!n) break;
    const m = new RegExp(words.slice(0, n).join("\\s+"), "i").exec(text);
    if (m) return [m.index, m.index + m[0].length];
  }
  return null;
}
const pageImgCache = {};
async function pdfPageImage(caseId, docId, page, quote) {
  const key = [caseId, docId, page, quote || ""].join("|");
  if (pageImgCache[key]) return pageImgCache[key];
  const pdf = await pdfFor(caseId, docId);
  if (!pdf) return null;
  const pg = await pdf.getPage(page);
  const vp = pg.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas"); canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
  const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await pg.render({ canvasContext: ctx, viewport: vp }).promise;
  const rects = [];
  if (quote) {
    const tc = await pg.getTextContent();
    let txt = ""; const spans = [];
    tc.items.forEach((it) => { if (typeof it.str !== "string") return; spans.push({ it, a: txt.length, b: txt.length + it.str.length }); txt += it.str + (it.hasEOL ? "\n" : " "); });
    const hit = findQuote(txt, quote);
    if (hit) spans.filter((sp) => sp.b > hit[0] && sp.a < hit[1] && sp.it.str.length).forEach((sp) => {
      const tx = window.pdfjsLib.Util.transform(vp.transform, sp.it.transform);
      const h = Math.hypot(tx[2], tx[3]); const w = sp.it.width * vp.scale; const n = sp.it.str.length;
      const f0 = Math.max(0, hit[0] - sp.a) / n, f1 = Math.min(n, hit[1] - sp.a + 1) / n;
      rects.push({ x: (tx[4] + w * f0) / vp.width, y: (tx[5] - h * 1.05) / vp.height, w: (w * (f1 - f0)) / vp.width, h: (h * 1.3) / vp.height });
    });
  }
  const out = { url: canvas.toDataURL("image/jpeg", 0.88), ratio: vp.width / vp.height, rects };
  pageImgCache[key] = out;
  return out;
}
/* Swap each PDF page placeholder for an image of the real page, with the quote highlighted */
function hydratePages(root) {
  (root || document).querySelectorAll(".pdfslot[data-doc]:not([data-done])").forEach(async (el) => {
    el.dataset.done = "1";
    const c = cur(); if (!c || c.id !== el.dataset.case) return;
    try {
      const r = await pdfPageImage(el.dataset.case, el.dataset.doc, +el.dataset.page, el.dataset.quote);
      if (!r || !el.isConnected) return;
      el.innerHTML = `<div class="pdfpage" style="aspect-ratio:${r.ratio}"><img alt="${esc(el.dataset.name)} page ${esc(el.dataset.page)}" src="${r.url}">${r.rects.map((q) => `<span class="hlbox" style="left:${(q.x * 100).toFixed(2)}%;top:${(q.y * 100).toFixed(2)}%;width:${(q.w * 100).toFixed(2)}%;height:${(q.h * 100).toFixed(2)}%"></span>`).join("")}</div>`;
      el.classList.add("img");
      const note = el.parentElement && el.parentElement.querySelector(".qnote");
      if (note && el.dataset.quote) note.innerHTML = r.rects.length ? `Highlighted on the page: "${esc(el.dataset.quote)}"` : `The agent quoted "${esc(el.dataset.quote)}", which is not word for word on this page.`;
      const hl = el.querySelector(".hlbox");
      if (hl) { const sc = el.closest(".pdfscroll"); if (sc) sc.scrollTop = Math.max(0, hl.offsetTop - sc.clientHeight / 3); }
    } catch (e) { /* keep the text view */ }
  });
}
function pageView(c, docId, page, quote) {
  const d = c.docs.find((x) => x.id === docId); if (!d) return `<p class="hint">Document not found.</p>`;
  page = Math.min(Math.max(1, +page || 1), d.pages.length);
  const img = (memImages[c.id] || []).find((im) => im.doc === docId && im.page === page);
  const h = highlight(d.pages[page - 1] || "", quote);
  const nav = d.pages.length > 1 ? d.pages.map((_, i) => `<button class="btn small ${i + 1 === page ? "primary" : ""}" type="button" data-pagesel="${i + 1}" data-doc="${d.id}">p.${i + 1}</button>`).join("") : "";
  const kindLabel = { pdf: "PDF", word: "Word document", sheet: "Spreadsheet", image: "Image" }[d.kind] || "Text";
  const textView = `<div class="pagetext ${d.kind === "sheet" ? "" : "paper"}">${h.html || "(No text on this page)"}</div>`;
  let viewer;
  if (d.kind === "pdf") viewer = `<div class="pdfslot" data-case="${esc(c.id)}" data-doc="${esc(d.id)}" data-page="${page}" data-quote="${esc(quote || "")}" data-name="${esc(d.name)}">${img ? `<img class="pageimg" alt="${esc(d.name)} page ${page}" src="data:${img.mime};base64,${img.b64}">` : textView}</div>`;
  else if (img) viewer = `<img class="pageimg" alt="${esc(d.name)} page ${page}" src="data:${img.mime};base64,${img.b64}">`;
  else viewer = textView;
  const qnote = quote ? `<p class="qnote">${h.found ? `Highlighted: "${esc(quote)}"` : d.kind === "pdf" ? `Looking for "${esc(quote)}" on the page` : `The agent quoted "${esc(quote)}", which is not word for word on this page.`}</p>` : "";
  return `<div class="pagebox"><div class="ph"><span>${esc(d.name)} <span class="note">· ${kindLabel} · page ${page} of ${d.pages.length}</span></span><span class="row">${nav}</span></div>${qnote}<div class="pdfscroll">${viewer}</div></div>`;
}
function pickField(c) {
  if (!c.fields) return "annual_rent";
  const m = c.consistency.find((y) => FIELD[y.key]); if (m) return m.key;
  const f = FIELDS.find((f) => ["Not present", "Not confident"].includes(c.fields[f.key].state) && !c.fields[f.key].edited);
  return f ? f.key : "annual_rent";
}
function renderSource(c) {
  if (!FIELD[selectedField] || selectedField === "__auto") selectedField = pickField(c);
  let g = ""; let list = "";
  FIELDS.forEach((f) => {
    const x = c.fields[f.key];
    if (f.group !== g) { g = f.group; list += `<div class="fgroup">${g}</div>`; }
    const val = x.value == null || x.value === "" ? "" : f.type === "money" ? money(x.value) : String(x.value);
    const more = (x.candidates || []).filter((k) => k.doc).length - 1;
    const d = x.source ? c.docs.find((y) => y.id === x.source.doc) : null;
    const chip = !x.edited && c.consistency.some((y) => y.key === f.key) ? `<span class="chip c-amber">Mismatch</span>` : x.edited ? `<span class="chip c-green">${x.edited.confirmed ? "Confirmed" : "Corrected"}</span>` : `<span class="chip ${stateClass(x.state)}">${esc(x.state)}</span>`;
    list += `<button type="button" class="frow ${selectedField === f.key ? "sel" : ""}" data-field="${f.key}"><span class="k">${esc(f.label)}</span>${chip}<span class="v">${esc(val) || '<span class="note">Blank</span>'}</span>${x.source ? `<span class="from">From ${esc(d ? d.type || d.name : x.source.doc)} p.${esc(x.source.page)}${more > 0 ? ` + ${more} more` : ""}${x.backfilled ? " (not given by the broker)" : ""}</span>` : x.note ? `<span class="note">${esc(x.note)}</span>` : ""}</button>`;
  });
  const f = FIELD[selectedField]; const x = c.fields[selectedField];
  const val = x.value == null || x.value === "" ? "Blank" : f.type === "money" ? money(x.value) : String(x.value);
  const cands = (x.candidates || []).filter((k) => k.doc);
  const flag = c.consistency.find((y) => y.key === selectedField);
  const showDoc = srcDocSel && srcDocSel.field === selectedField ? srcDocSel : x.source ? { doc: x.source.doc, page: x.source.page, quote: x.source.quote } : cands[0] ? { doc: cands[0].doc, page: cands[0].page, quote: cands[0].quote } : null;
  const usedLine = x.backfilled && !x.edited ? esc(x.note) : x.edited ? `${x.edited.confirmed ? "Confirmed" : "Corrected"} by you at ${timeOf(x.edited.at)}${!x.edited.confirmed ? `. Was "${esc(x.edited.old ?? "blank")}".` : "."}` : flag ? esc(flag.text) : x.source && cands.length > 1 ? `Found in ${cands.length} places and they agree.` : x.source ? "Found in one document." : esc(x.note || "Not found in the pack.");
  const detail = `<div class="card sticky">
    <div class="cardhead"><h2>${esc(f.label)}: ${esc(val)}</h2>${x.edited ? `<span class="chip c-green">${x.edited.confirmed ? "Confirmed" : "Corrected"}</span>` : flag ? `<span class="chip c-amber">Mismatch</span>` : `<span class="chip ${stateClass(x.state)}">${esc(x.state)}</span>`}</div>
    <p class="hint">${usedLine}</p>
    ${cands.length ? `<div class="label">Found in ${cands.length} place${cands.length > 1 ? "s" : ""}</div><div class="docbtns">${cands.map((k, i) => { const d = c.docs.find((y) => y.id === k.doc); const isUsed = x.source && k.doc === x.source.doc && String(k.page) === String(x.source.page) && i === cands.indexOf(cands.find((z) => z.doc === x.source.doc && String(z.page) === String(x.source.page))); const v = NUMERIC.has(f.key) && k.num != null ? (f.type === "money" ? money(k.num) : k.num) : k.value; return `<button class="docbtn ${isUsed ? "used" : ""} ${showDoc && showDoc.doc === k.doc && String(showDoc.page) === String(k.page) ? "on" : ""}" type="button" data-showdoc="${esc(k.doc)}" data-page="${esc(k.page || 1)}" data-quote="${esc(k.quote || "")}">${esc(d ? d.type || d.name : k.doc)} p.${esc(k.page || 1)}: ${esc(v)}${isUsed ? " (used)" : ""}</button>`; }).join("")}</div>` : ""}
    ${showDoc ? pageView(c, showDoc.doc, showDoc.page, showDoc.quote) : ""}
    <div id="editArea" class="row"><button class="btn small" type="button" data-act="edit-field" data-key="${f.key}">Correct value</button>${x.state === "Not confident" && !x.edited ? `<button class="btn small" type="button" data-act="confirm-field" data-key="${f.key}">Confirm value</button>` : ""}</div>
  </div>`;
  const tenants = `<div class="card"><h2>Tenants</h2>${c.tenants.length ? `<div class="tablewrap bare"><table class="t"><thead><tr><th>Tenant</th><th>Rent pa</th><th>Lease end</th><th>Break</th><th>Source</th></tr></thead><tbody>${c.tenants.map((t) => `<tr><td>${esc(t.name)}${t.note ? `<span class="sub">${esc(t.note)}</span>` : ""}</td><td class="num">${money(t.annual_rent)}</td><td class="num">${t.lease_end ? esc(t.lease_end) : '<span class="chip c-amber">Not confident</span>'}</td><td class="num">${esc(t.break_date || "-")}</td><td>${t.source && t.source.doc ? refChip(t.source.doc, t.source.page, t.source.quote) : ""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="hint">No tenancy schedule or leases in the pack.</p>`}</div>`;
  return `<p class="intro">Check the agents' work. Pick any field to see the document it came from, with the text highlighted, and every other document that mentions it. Corrections are audited and the checks recalculate.</p>
    <div class="grid2 even"><div class="stack"><div class="fieldlist">${list}</div>${tenants}</div><div>${detail}</div></div>`;
}
function renderPolicyTab(c) {
  const flagCards = [];
  c.consistency.forEach((x) => flagCards.push({ tone: "amber", label: "Amber", title: "Mismatch: " + (FIELD[x.key] ? FIELD[x.key].label : "Rent"), text: x.text, refs: (x.cands || []).filter((k) => k.doc) }));
  c.checks.concat(c.judgements).forEach((k) => {
    if (k.flag === "red" || k.outcome === "Fail") flagCards.push({ tone: "red", label: "Red", title: k.area, text: k.type === "Reasoned" ? k.explanation : k.why, refs: k.source && k.source.doc ? [k.source] : [] });
    else if (k.flag === "amber") flagCards.push({ tone: "amber", label: "Amber", title: k.area, text: k.why || k.explanation, refs: [] });
  });
  ["ltv", "icr", "wault"].forEach((id) => { const k = c.checks.find((x) => x.id === id); if (k && k.outcome === "Pass" && !k.flag) flagCards.push({ tone: "green", label: "Green", title: k.area + " " + k.value, text: k.why, refs: [] }); });
  const row = (k) => `<tr><td><b>${esc(k.area)}</b><span class="sub">${esc(k.clause)}</span></td><td>${esc(k.rule)}</td><td class="fv">${esc(k.type === "Reasoned" ? "" : k.value)}</td><td>${outcomeChip(k)}</td><td>${esc(k.type === "Reasoned" ? k.explanation : k.why)}${k.type === "Reasoned" && k.value ? `<span class="sub">Evidence: ${esc(k.value)}</span>` : ""}${k.source && k.source.doc ? " " + refChip(k.source.doc, k.source.page, "") : ""}</td></tr>`;
  return `<div class="stack">
    ${flagCards.length ? `<div class="flags">${flagCards.map((f) => `<div class="flag ${f.tone}"><div class="row"><span class="chip ${f.tone === "red" ? "c-red" : f.tone === "amber" ? "c-amber" : "c-green"}">${f.label}</span><b>${esc(f.title)}</b></div><p>${esc(f.text)}</p>${f.refs.length ? `<div class="row">${f.refs.map((r) => refChip(r.doc, r.page, r.quote)).join("")}</div>` : ""}</div>`).join("")}</div>` : ""}
    <div class="card"><h2>Calculated checks</h2><p class="hint">Worked out in code from the extracted figures, so the answer is exact and repeatable. The AI does not judge these. ${esc(POLICY.name)}, ${esc(POLICY.version)}.</p><div class="tablewrap"><table class="t"><thead><tr><th>Provision</th><th>Policy</th><th>Case</th><th>Outcome</th><th>Explanation</th></tr></thead><tbody>${c.checks.map(row).join("")}</tbody></table></div></div>
    ${(c.analysis || []).length ? `<div class="card"><h2>Sensitivities and covenant headroom</h2><p class="hint">Calculated in code. Proposed covenants (LTV ${COVENANTS.ltv}%, ICR ${COVENANTS.icr}x) are illustrative, not from a lender.</p><div class="tablewrap"><table class="t"><thead><tr><th>Measure</th><th>Result</th><th>Comment</th></tr></thead><tbody>${c.analysis.map((a) => `<tr><td><b>${esc(a.label)}</b></td><td class="fv">${esc(a.value)}</td><td>${esc(a.note)}</td></tr>`).join("")}</tbody></table></div></div>` : ""}
    <div class="card"><h2>Judgement areas</h2><p class="hint">Assessed by the memo agent and explained, for a person to read and agree or not.</p>${c.judgements.length ? `<div class="tablewrap"><table class="t"><thead><tr><th>Provision</th><th>Policy</th><th></th><th>Outcome</th><th>Explanation</th></tr></thead><tbody>${c.judgements.map(row).join("")}</tbody></table></div>` : `<p class="hint">Not assessed yet.</p>`}</div>
  </div>`;
}
function authority(c, role) {
  const L = num(c, "loan_amount") || 0; const exc = c.rec && c.rec.exceptions.length;
  if (L > POLICY.maxLoan) return { canApprove: false, why: "Over £10m is outside appetite. No one can approve it." };
  if (role === "Underwriter") {
    if (L > POLICY.uwLimit) return { canApprove: false, why: "Over £1m, so only Credit Committee can approve. You can escalate." };
    if (exc) return { canApprove: false, why: "Policy exception, so only Credit Committee can approve. You can escalate." };
  }
  return { canApprove: true, why: "" };
}
function renderDecision(c) {
  if (!c.rec || !c.memo) return renderWorking(c);
  const L = num(c, "loan_amount");
  const side = `<div class="stack"><div class="card"><h2>Approval authority</h2>
      <div class="signoff"><div><b>Underwriter</b><span>Up to £1m within policy</span></div>${c.rec.approver.startsWith("Underwriter") ? `<span class="chip c-green">Can decide</span>` : `<span class="chip c-grey">Escalate</span>`}</div>
      <div class="signoff"><div><b>Credit Committee</b><span>Over £1m to £10m, and all policy exceptions</span></div>${c.rec.approver.startsWith("Credit") ? `<span class="chip c-green">Decides this case</span>` : `<span class="chip c-grey">If escalated</span>`}</div>
      <p class="hint">Loan ${money(L)}${c.rec.exceptions.length ? "; policy exception: " + esc(c.rec.exceptions.join(", ")) : "; no policy exception"}. Limits come from the lender's credit policy. Neither admin role can approve credit.</p></div></div>`;
  if (c.decision) {
    const d = c.decision;
    return `<div class="grid2"><div class="card"><div class="cardhead"><h2>Decision recorded</h2><span class="chip ${recChipClass({ "Approve": "approve", "Decline": "decline", "Request more information": "more", "Escalate to Credit Committee": "escalate" }[d.choice])}">${esc(d.choice)}</span></div>
      <p class="hint">By you as ${esc(d.role)}, ${dateOf(d.at)} ${timeOf(d.at)}. Risk grade ${esc(d.grade || "not set")}.${d.override ? ` This differs from the suggestion (${esc(c.rec.label)}). Overrides are recorded and are a normal part of the process.` : ""}</p>
      <div class="memo-sec"><header><h3>Rationale</h3></header><div class="memo-body">${renderRich(d.rationale)}</div></div>
      ${d.conditions ? `<div class="memo-sec"><header><h3>Conditions</h3></header><div class="memo-body">${renderRich(d.conditions)}</div></div>` : ""}
      <div><button class="btn small" type="button" data-act="reopen">Reopen the decision</button></div></div>${side}</div>`;
  }
  const dd = draftDecision; const au = authority(c, dd.role);
  const opts = [
    ["Approve", "Indicative terms can be prepared.", !au.canApprove, au.why],
    ["Decline", "The broker gets a polite decline.", false, ""],
    ["Request more information", "Back to the RM to ask the broker.", false, ""],
    ["Escalate to Credit Committee", "Above your limit or a policy exception.", dd.role !== "Underwriter", "Already with Credit Committee."],
  ];
  if (dd.choice && opts.find((o) => o[0] === dd.choice && o[2])) dd.choice = "";
  const condSuggest = c.memo && c.memo.conditions ? c.memo.conditions.text : "";
  return `<div class="grid2"><div class="stack">
    <div class="recbar"><div class="line"><span>Recommendation (a suggestion; a person decides)</span><span class="chip ${recChipClass(c.rec.kind)}">${esc(c.rec.label)}</span></div><p class="note">You can agree with it or override it. Either way, record your reasons.</p></div>
    <div class="card"><h2>Risk grade and conditions</h2>
      <div class="field"><label for="decGrade">Risk grade (1 best, 10 worst)</label><select id="decGrade"><option value="">Choose a grade</option>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option ${String(dd.grade) === String(n) ? "selected" : ""}>${n}</option>`).join("")}</select></div>
      <div class="field"><label for="decConditions">Conditions</label><textarea class="ed" id="decConditions" placeholder="One condition per line, starting with -">${esc(dd.conditions)}</textarea>${condSuggest ? `<div><button class="btn small" type="button" data-act="use-conds">Use the memo's suggested conditions</button></div>` : ""}</div>
    </div>
    <div class="card"><h2>Credit decision</h2>
      <div class="field"><label for="decRole">Acting as</label><select id="decRole"><option ${dd.role === "Underwriter" ? "selected" : ""}>Underwriter</option><option ${dd.role === "Credit Committee" ? "selected" : ""}>Credit Committee</option></select></div>
      <div class="choices">${opts.map(([name, desc, dis, why]) => `<label class="choice ${dis ? "disabled" : ""}"><input type="radio" name="decChoice" value="${esc(name)}" ${dis ? "disabled" : ""} ${dd.choice === name ? "checked" : ""}><span><b>${esc(name)}</b><small>${esc(dis && why ? why : desc)}</small></span></label>`).join("")}</div>
      <div class="field"><label for="decRationale">Rationale (required)</label><textarea class="ed" id="decRationale" placeholder="Why you made this decision">${esc(dd.rationale)}</textarea></div>
      <div class="row"><button class="btn primary" type="button" data-act="record">Record decision</button><span class="note" id="decMsg"></span></div>
    </div></div>${side}</div>`;
}
function renderAudit(c) {
  return `<div class="card"><h2>Audit trail</h2><p class="hint">Every agent and human action on this case, oldest first. Policy version: ${esc(POLICY.version)}.</p><ul class="audit">${c.audit.map((a) => `<li><span class="num note">${timeOf(a.at)}</span><span class="who ${a.kind === "agent" ? "agent" : ""}">${esc(a.who)}</span><span class="what">${esc(a.what)}</span></li>`).join("")}</ul></div>`;
}
function renderPolicyAdmin() {
  const P = POLICY;
  const rows = [
    ["Loan size", "£250,000 to £10,000,000", "Calculated"], ["Loan term", "3 to 15 years; up to 25 years capital repayment", "Calculated"],
    ["Loan to value (LTV)", `Up to ${P.maxLTV}% of market value; up to ${P.maxLTVSingle}% for specialist or single-let property`, "Calculated"],
    ["Interest cover (ICR)", `Rent covers interest at least ${P.minICR} times, at the higher of the pay rate or a ${P.stressRate}% stressed rate`, "Calculated"],
    ["Debt service cover (DSCR)", `At least ${P.minDSCR} times where the loan amortises`, "Calculated"],
    ["Location", "England, Wales, Scotland and Northern Ireland", "Calculated"],
    ["Energy rating", "EPC E or better", "Calculated"],
    ["Income quality", `WAULT of at least ${P.minWAULT} years; flag where one tenant pays over ${P.concentration}% of rent; tenant covenant strength`, "Mixed"],
    ["Document age", `Accounts year end within the last ${P.accountsMonths} months`, "Calculated"],
    ["Property type", "Retail, office, industrial and mixed use. Specialist uses by exception", "Reasoned"],
    ["Borrower", "UK limited company or SPV; personal guarantees from principal directors", "Reasoned"],
    ["Experience", "Borrower or directors have relevant property investment experience", "Reasoned"],
    ["Adverse credit", "No unsatisfied CCJs or insolvency events; explained historic adverse considered", "Reasoned"],
    ["Approval authority", "Underwriter up to £1m within policy; Credit Committee over £1m to £10m and all exceptions; over £10m outside appetite", "Calculated"],
  ];
  return pageHead("Credit policies", "Credit policies", "The policy the agents test each case against. This prototype uses the illustrative UK market standard policy from the broker submission flow doc. In the product, the Client Admin uploads the lender's own policy and an agent extracts the rules with links to each clause.") +
    `<div class="tablewrap"><table class="t"><thead><tr><th>Policy area</th><th>Criterion</th><th>Check type</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td><span class="chip ${r[2] === "Calculated" ? "c-blue" : r[2] === "Mixed" ? "c-amber" : "c-grey"}">${r[2]}</span></td></tr>`).join("")}</tbody></table></div>
    <p class="note" style="margin-top:10px">${esc(P.version)}. Figures are inferred from market norms, not taken from a lender.</p>`;
}
function renderAgentsAdmin() {
  const p = activeProvider();
  const agents = [
    ["Intake agent", "Reads each uploaded document: PDF text, Word, Excel, emails and scanned images.", "In the browser"],
    ["Extraction agent", "Classifies each document and extracts the application fields with the document, page and exact text, using four states.", PROVIDERS[p].name],
    ["Policy agent", "Calculates loan size, term, LTV, ICR, DSCR, location, EPC, WAULT, concentration and document age, and suggests a recommendation.", "Code, no AI"],
    ["Memo agent", "Assesses the judgement areas, drafts the credit memo with sources and drafts a request to the broker.", PROVIDERS[p].name],
  ];
  return pageHead("AI governance", "AI governance", "The agents in this prototype, what each one does and what runs it. Every agent action is in each case's audit trail.") +
    `<div class="tablewrap"><table class="t"><thead><tr><th>Agent</th><th>What it does</th><th>Runs on</th></tr></thead><tbody>${agents.map((a) => `<tr><td><b>${a[0]}</b></td><td>${a[1]}</td><td>${esc(a[2])}</td></tr>`).join("")}</tbody></table></div>
    <div class="row" style="margin-top:14px"><button class="btn" type="button" data-act="settings">Change AI provider</button></div>`;
}
function render() {
  renderNav();
  const c = cur();
  if (view === "case" && !c) view = cases.length ? "cases" : "new";
  const html = { new: renderNew, cases: renderCases, policy: renderPolicyAdmin, agents: renderAgentsAdmin }[view];
  $("#main").innerHTML = view === "case" ? renderCaseView(c) : html();
  hydratePages($("#main"));
}

/* ------------------------------------------------------------------ source pop-out (from memo and policy tags) */
function openSource(docId, page, quote) {
  const c = cur(); if (!c) return;
  const d = c.docs.find((x) => x.id === docId);
  if (!d) { toast("That document is not in this case"); return; }
  $("#srcTitle").textContent = `${d.type ? d.type + ": " : ""}${d.name}`;
  $("#srcBody").innerHTML = pageView(c, docId, page, quote) + (d.kind !== "pdf" ? "" : `<details class="readtext"><summary>Text the agent read from this page</summary><div class="pagetext">${highlight(d.pages[Math.min(Math.max(1, +page || 1), d.pages.length) - 1] || "", quote).html}</div></details>`);
  $("#srcBody").dataset.doc = docId;
  $("#sourceModal").hidden = false;
  document.body.classList.add("src-open");
  hydratePages($("#srcBody"));
  const m = $("#srcBody .pdfscroll mark"); if (m) { const sc = m.closest(".pdfscroll"); sc.scrollTop = Math.max(0, m.offsetTop - sc.clientHeight / 3); }
}
function closeSource() { $("#sourceModal").hidden = true; document.body.classList.remove("src-open"); }

/* ------------------------------------------------------------------ settings */
function renderSettings() {
  const p = settings.provider;
  const opt = (id, name, desc, extra = "") => `<label class="choice"><input type="radio" name="prov" value="${id}" ${p === id ? "checked" : ""}><span><b>${esc(name)}</b><small>${esc(desc)}</small></span></label>${extra}`;
  $("#providerOpts").innerHTML =
    opt("auto", "Automatic", "Claude (built in) inside the NashFlow link; Gemini when you open the downloaded copy.") +
    opt("claude-builtin", PROVIDERS["claude-builtin"].name, PROVIDERS["claude-builtin"].desc) +
    opt("gemini", PROVIDERS.gemini.name, PROVIDERS.gemini.desc) +
    `<div class="cfg"><label for="gKey">Gemini API key</label><input id="gKey" type="password" autocomplete="off" value="${esc(settings.geminiKey)}" placeholder="Paste the key from aistudio.google.com"><label for="gModel">Gemini model</label><input id="gModel" type="text" value="${esc(settings.geminiModel)}"></div>` +
    opt("claude-api", PROVIDERS["claude-api"].name, PROVIDERS["claude-api"].desc) +
    `<div class="cfg"><label for="cKey">Claude API key</label><input id="cKey" type="password" autocomplete="off" value="${esc(settings.claudeKey)}"><label for="cModel">Claude model</label><input id="cModel" type="text" value="${esc(settings.claudeModel)}"></div>` +
    opt("azure", PROVIDERS.azure.name, PROVIDERS.azure.desc) +
    `<div class="cfg"><label for="aEnd">Endpoint</label><input id="aEnd" type="text" value="${esc(settings.azureEndpoint)}" placeholder="https://your-resource.openai.azure.com"><label for="aDep">Deployment name</label><input id="aDep" type="text" value="${esc(settings.azureDeployment)}"><label for="aKey">Key</label><input id="aKey" type="password" autocomplete="off" value="${esc(settings.azureKey)}"></div>`;
}

/* ------------------------------------------------------------------ events */
document.addEventListener("click", async (e) => {
  const t = e.target.closest("button, [data-close]");
  if (!t) return;
  if (t.hasAttribute("data-close")) { if (t.closest("#sourceModal")) closeSource(); else t.closest(".modal").hidden = true; return; }
  if (t.dataset.src) { openSource(t.dataset.src, t.dataset.page, t.dataset.quote); return; }
  if (t.dataset.pagesel) {
    if (t.closest("#srcBody")) { openSource(t.dataset.doc, t.dataset.pagesel, ""); return; }
    srcDocSel = { field: selectedField, doc: t.dataset.doc, page: t.dataset.pagesel, quote: "" }; render(); return;
  }
  if (t.dataset.view) { view = t.dataset.view; editingSection = null; render(); window.scrollTo(0, 0); return; }
  if (t.dataset.case) { currentId = t.dataset.case; currentTab = "memo"; view = "case"; editingSection = null; srcDocSel = null; selectedField = "__auto"; save(); render(); window.scrollTo(0, 0); return; }
  if (t.dataset.tab) { currentTab = t.dataset.tab; editingSection = null; render(); return; }
  if (t.dataset.field) { selectedField = t.dataset.field; srcDocSel = null; render(); return; }
  if (t.dataset.showdoc) { srcDocSel = { field: selectedField, doc: t.dataset.showdoc, page: t.dataset.page, quote: t.dataset.quote }; render(); return; }
  if (t.dataset.sample) {
    const s = SAMPLES[t.dataset.sample];
    const files = s.files.map((f) => new File([f.text != null ? f.text : b64ToBytes(f.b64)], f.name, { type: f.type }));
    newCaseFromFiles(files, s.label); return;
  }
  if (t.dataset.act === "pick") { $("#fileInput").click(); return; }
  if (t.id === "openSettings" || t.dataset.act === "settings") { renderSettings(); $("#settingsModal").hidden = false; return; }
  if (t.id === "saveSettings") {
    settings.provider = (document.querySelector('input[name="prov"]:checked') || {}).value || "auto";
    settings.geminiKey = $("#gKey").value.trim(); settings.geminiModel = $("#gModel").value.trim() || GEMINI_DEFAULT;
    settings.claudeKey = $("#cKey").value.trim(); settings.claudeModel = $("#cModel").value.trim() || "claude-sonnet-5-5";
    settings.azureEndpoint = $("#aEnd").value.trim(); settings.azureDeployment = $("#aDep").value.trim(); settings.azureKey = $("#aKey").value.trim();
    store("nashflow.settings", settings); renderProviderPill(); $("#settingsModal").hidden = true; render(); toast("AI provider saved"); return;
  }
  const c = cur(); if (!c) return;
  const act = t.dataset.act;
  if (act === "rerun") { runAgents(c); }
  else if (act === "redraft") { runAgents(c, true); }
  else if (act === "delete-case") {
    if (t.dataset.confirm !== "1") { t.dataset.confirm = "1"; t.textContent = "Click again to delete"; return; }
    fileStore.delCase(c.id); closeSource();
    cases = cases.filter((x) => x.id !== c.id); currentId = cases[0] ? cases[0].id : null; view = cases.length ? "cases" : "new"; save(); render();
  }
  else if (act === "edit-field") {
    const k = t.dataset.key; const f = c.fields[k];
    $("#editArea").innerHTML = `<div class="edit-inline" style="width:100%"><input id="fieldEdit" type="text" value="${esc(f.value ?? "")}" aria-label="${esc(FIELD[k].label)}"><button class="btn primary small" type="button" data-act="save-field" data-key="${k}">Save</button><button class="btn small" type="button" data-act="cancel-field">Cancel</button></div>`;
    $("#fieldEdit").focus();
  }
  else if (act === "cancel-field") { render(); }
  else if (act === "save-field") { editField(c, t.dataset.key, $("#fieldEdit").value); }
  else if (act === "confirm-field") { confirmField(c, t.dataset.key); }
  else if (act === "edit-sec") { editingSection = t.dataset.key; render(); const ta = $("#memoEdit"); if (ta) ta.focus(); }
  else if (act === "cancel-sec") { editingSection = null; render(); }
  else if (act === "save-sec") {
    const k = t.dataset.key; const before = (c.memo[k] || {}).text || ""; const after = $("#memoEdit").value;
    if (after !== before) { c.memo[k] = { text: after, by: "You", at: nowISO() }; audit(c, "You", `Edited memo section "${MEMO_SECTIONS.find((x) => x[0] === k)[1]}". Before: "${before.slice(0, 160)}${before.length > 160 ? "..." : ""}" After: "${after.slice(0, 160)}${after.length > 160 ? "..." : ""}"`); }
    editingSection = null; save(); render();
  }
  else if (act === "copy-memo") {
    const txt = `CREDIT MEMO: ${c.title} (${c.ref})\n\n` + MEMO_SECTIONS.map(([k, n]) => `${n.toUpperCase()}\n${(c.memo[k] || {}).text || ""}`).join("\n\n");
    copyText(txt, "Memo copied");
  }
  else if (act === "copy-req") { c.brokerRequest = $("#brokerReq").value; save(); copyText(c.brokerRequest, "Email copied"); }
  else if (act === "log-req") { c.brokerRequest = $("#brokerReq").value; c.status = "More information requested"; audit(c, "You", "Marked the request to the broker as sent"); save(); render(); toast("Status: More information requested"); }
  else if (act === "use-conds") { $("#decConditions").value = c.memo.conditions.text; draftDecision.conditions = c.memo.conditions.text; }
  else if (act === "record") {
    readDecisionForm();
    const dd = draftDecision;
    if (!dd.choice) { $("#decMsg").textContent = "Choose a decision."; return; }
    if (!dd.rationale.trim()) { $("#decMsg").textContent = "Add your rationale. It is required."; return; }
    if (dd.choice === "Approve" && !dd.grade) { $("#decMsg").textContent = "Choose a risk grade before approving."; return; }
    const map = { "Approve": "approve", "Decline": "decline", "Request more information": "more", "Escalate to Credit Committee": "escalate" };
    c.decision = Object.assign({}, dd, { at: nowISO(), override: map[dd.choice] !== c.rec.kind });
    c.status = { "Approve": "Approved, pricing in progress", "Decline": "Declined", "Request more information": "More information requested", "Escalate to Credit Committee": "With Credit Committee" }[dd.choice];
    audit(c, "You", `Recorded decision as ${dd.role}: ${dd.choice}${dd.grade ? ", risk grade " + dd.grade : ""}${c.decision.override ? " (differs from suggestion " + c.rec.label + ")" : ""}. Rationale: ${dd.rationale}`);
    draftDecision = { role: dd.role === "Underwriter" && dd.choice.startsWith("Escalate") ? "Credit Committee" : dd.role, choice: "", grade: "", rationale: "", conditions: "" };
    save(); render();
  }
  else if (act === "reopen") { audit(c, "You", `Reopened the decision (${c.decision.choice})`); c.decision = null; c.status = "In credit review"; save(); render(); }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "decRole" || e.target.name === "decChoice") { readDecisionForm(); render(); }
});
function readDecisionForm() {
  const g = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
  draftDecision.role = g("decRole") || draftDecision.role;
  const ch = document.querySelector('input[name="decChoice"]:checked'); draftDecision.choice = ch ? ch.value : "";
  draftDecision.grade = g("decGrade"); draftDecision.rationale = g("decRationale"); draftDecision.conditions = g("decConditions");
}
function copyText(txt, msg) {
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast(msg), () => fallbackCopy(txt, msg)); else fallbackCopy(txt, msg);
}
function fallbackCopy(txt, msg) { const ta = document.createElement("textarea"); ta.value = txt; document.body.append(ta); ta.select(); try { document.execCommand("copy"); toast(msg); } catch (e) { toast("Select the text and copy it yourself"); } ta.remove(); }
$("#fileInput").addEventListener("change", (e) => { const files = [...e.target.files]; e.target.value = ""; if (files.length) newCaseFromFiles(files); });
["dragenter", "dragover"].forEach((ev) => document.addEventListener(ev, (e) => { const d = e.target.closest && e.target.closest("#drop"); if (d) { e.preventDefault(); d.classList.add("over"); } }));
["dragleave", "drop"].forEach((ev) => document.addEventListener(ev, (e) => { const d = e.target.closest && e.target.closest("#drop"); if (d) { e.preventDefault(); d.classList.remove("over"); } }));
document.addEventListener("drop", (e) => { const d = e.target.closest && e.target.closest("#drop"); if (d) { const files = [...e.dataTransfer.files]; if (files.length) newCaseFromFiles(files); } });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { document.querySelectorAll(".modal").forEach((m) => (m.hidden = true)); document.body.classList.remove("src-open"); } });
document.querySelectorAll(".modal").forEach((m) => m.addEventListener("click", (e) => { if (e.target === m) m.hidden = true; }));

/* interrupted runs from a previous visit */
cases.forEach((c) => { if (c.run && c.run.running) { c.run.running = false; c.run.error = "The page was closed while the agents were working."; const s = c.run.steps.find((x) => x.state === "active"); if (s) s.state = "error"; } });
renderProviderPill(); render();
</script>
