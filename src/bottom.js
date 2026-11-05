/* ------------------------------------------------------------------ rendering */
let view = cases.length ? "cases" : "new";
let selectedField = "annual_rent";
let srcDocSel = null;
let editingSection = null;
let draftDecision = { choice: "", grade: "", rationale: "", exception: "" };
let commenting = null;
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
  $("#roleBox").innerHTML = `<div class="k">Working as</div><div class="roleseg">${ROLES.map((r) => `<button type="button" data-role="${esc(r)}" aria-pressed="${currentRole === r}">${r === "Relationship Manager" ? "Relationship Manager" : r}</button>`).join("")}</div><small>${currentRole === "Underwriter" ? "Reviews, sets conditions and decides." : currentRole === "Head of Lending" ? "Holds the Approve pricing permission. Signs off pricing." : "Checks the agents' work, prepares the case and submits it."}</small>`;
  const mine = cases.filter((x) => myTurn(x)).length;
  $("#navCases").innerHTML = `<div class="navlabel">Cases</div>${item("new", "New case")}${item("cases", "My cases", mine || cases.length)}${item("case", "Case management", null, !c)}`;
  $("#navAdmin").innerHTML = `<div class="navlabel">Administration</div>${item("inbox", "Deals inbox")}${item("policy", "Credit policies")}${item("agents", "AI governance")}`;
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
    <td><b>${esc(c.title)}</b>${c.source && c.source.kind === "email" ? ` <span class="chip c-blue">By email</span>` : ""}${c.chase && c.chase.flagRM ? ` <span class="chip c-red">Broker not replying</span>` : ""}<span class="sub">${esc(c.ref)}${c.fields && usable(c, "broker") ? " · " + esc(usable(c, "broker")) : ""}</span></td>
    <td class="fv">${shortMoney(L)}</td><td>${complete}</td><td>${consistent}</td><td>${esc(STAGES[stageOf(c)])}${myTurn(c) ? ` <span class="chip c-red">Your action</span>` : c.memo && waitingOn(c) ? `<span class="sub">Waiting on ${esc(waitingOn(c))}</span>` : ""}</td><td>${rec}</td>
    <td><div class="row" style="flex-wrap:nowrap"><button class="btn primary small" type="button" data-case="${c.id}">Open case</button><button class="btn small" type="button" data-delcase="${c.id}" title="Delete this case">Delete</button></div></td></tr>`;
}
function renderCases() {
  const done = cases.filter((c) => c.rec && c.memo);
  const cc = done.filter((c) => c.rec.complete && c.rec.consistent).length;
  const more = done.filter((c) => c.rec.kind === "more").length;
  const exc = done.filter((c) => c.rec.kind === "escalate" || c.rec.kind === "decline").length;
  const mine = done.filter((c) => myTurn(c)).length;
  return pageHead("My cases", "My cases", currentRole === "Underwriter" ? "Cases the Relationship Managers have submitted to you, and the ones you have decided. Cases waiting on you are marked." : currentRole === "Head of Lending" ? "Approved cases with pricing waiting for your sign-off are marked." : "Every deal pack the agents have read, with what they found. You check the agents' work, prepare the case and submit it to the Underwriter.") +
    `<div class="stats">
      <div class="stat"><b>${mine}</b><span>Waiting on you</span><small>As ${esc(currentRole)}</small></div>
      <div class="stat"><b>${cc}</b><span>Complete and consistent</span><small>Of ${cases.length} in this browser</small></div>
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
  const tabs = [["memo", "Credit memo"], ["source", "Source check", toCheck ? `<span class="chip c-amber">${toCheck} to check</span>` : ""], ["fin", "Financials", c.financials && c.financials.flags.length ? `<span class="chip c-amber">${c.financials.flags.length} flag${c.financials.flags.length > 1 ? "s" : ""}</span>` : ""], ["policy", "Policy checks", flags ? `<span class="chip c-amber">${flags} flag${flags > 1 ? "s" : ""}</span>` : ""], ["decision", "Decision"], ["pricing", "Pricing and terms", c.pricing && c.pricing.status === "awaiting" ? `<span class="chip c-amber">Sign-off</span>` : c.terms && c.terms.issued ? `<span class="chip c-green">Issued</span>` : ""], ["audit", "Audit"]];
  let body;
  if (!ready && currentTab !== "audit") body = renderWorking(c);
  else body = { memo: renderMemoTab, source: renderSource, fin: renderFinancials, policy: renderPolicyTab, decision: renderDecision, pricing: renderPricing, audit: renderAudit }[currentTab](c);
  return pageHead("Case management", "Case management") + `
  <div class="casecard">
    <div class="titleline"><span class="cref">${esc(c.ref)}</span><h2>${esc(c.title)}</h2><span class="chip c-grey">Commercial property investment loan</span><span class="chip c-amber">${esc(c.memo ? STAGES[stageOf(c)] : c.status)}</span>${myTurn(c) ? `<span class="chip c-red">Your action</span>` : ""}${c.source && c.source.kind === "email" ? `<span class="chip c-blue">By email</span>` : ""}${c.chase && c.chase.flagRM ? `<span class="chip c-red">Broker not replying</span>` : ""}<span style="flex:1"></span><button class="btn small" type="button" data-act="delete-case">Delete case</button></div>
    <div class="subline">${esc(sub)}</div>
    <div class="tiles">
      ${tile("Facility", shortMoney(L), T != null ? `${T} years${rb ? ", " + esc(rb) : ""}` : "")}
      ${tile("LTV", ltv ? esc(ltv.value) : "-", V != null ? `on ${shortMoney(V)} ${/estimate/i.test(String(usable(c, "value_basis") || "")) ? "estimate" : "valuation"}` : "", ltv && ltv.outcome === "Fail" ? "red" : "")}
      ${tile("Interest cover", icr ? esc(icr.value) : "-", `policy minimum ${POLICY.minICR}x`, icr && icr.outcome === "Fail" ? "red" : "")}
      ${tile("Recommendation", c.rec && c.memo ? esc(c.rec.label.split(" (")[0]) : "-", c.rec && c.memo ? "Underwriter decides" : "", recTone)}
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
    ${c.run.running ? `<div><button class="btn small" type="button" data-act="stop-run">Stop the agents</button></div>` : ""}
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
      const by = s.by === "System" ? "From the calculated checks" : s.by === "Memo agent" ? "Memo agent" : `Edited by ${s.by === "You" ? "you" : s.by} at ${timeOf(s.at)}`;
      const cm = ((c.comments || {})[k] || []);
      const cmHtml = (cm.length ? `<div class="comments">${cm.map((x) => `<div class="cmt"><b>${esc(x.who)}</b><span class="note"> ${dateOf(x.at)} ${timeOf(x.at)}</span><p>${esc(x.text)}</p></div>`).join("")}</div>` : "") + (commenting === k ? `<div class="cmt-ed"><textarea class="ed" id="cmtEdit" aria-label="Comment on ${esc(name)}" placeholder="Your comment as ${esc(currentRole)}"></textarea><div class="row"><button class="btn primary small" type="button" data-act="save-cmt" data-key="${k}">Add comment</button><button class="btn small" type="button" data-act="cancel-cmt">Cancel</button></div></div>` : "");
      const body = editingSection === k ? `<textarea class="ed" id="memoEdit" aria-label="${esc(name)}">${esc(s.text)}</textarea><div class="row"><button class="btn primary small" type="button" data-act="save-sec" data-key="${k}">Save</button><button class="btn small" type="button" data-act="cancel-sec">Cancel</button></div>` : `<div class="memo-body">${renderRich(s.text) || '<p class="note">Empty</p>'}</div>`;
      return `<section class="memo-sec"><header><h3>${esc(name)}</h3><span class="by">${by}</span><span class="grow"></span>${editingSection === k ? "" : `${cm.length ? `<span class="chip c-blue">${cm.length} comment${cm.length > 1 ? "s" : ""}</span>` : ""}<button class="btn small" type="button" data-act="comment" data-key="${k}">Comment</button><button class="btn small" type="button" data-act="edit-sec" data-key="${k}">Edit</button>`}</header>${body}${cmHtml}</section>`;
    }).join("")}</div>`;
  const req = c.source && c.source.kind === "email" ? chaseCard(c) : c.brokerRequest ? `<div class="card"><div class="cardhead"><h2>Request to the broker</h2><span class="chip c-amber">Drafted</span></div><p class="hint">Drafted by the memo agent. Edit it, then copy it into your email. Nothing is sent from here.</p><textarea class="ed" id="brokerReq" aria-label="Request to the broker">${esc(c.brokerRequest)}</textarea><div class="row"><button class="btn" type="button" data-act="copy-req">Copy email</button><button class="btn" type="button" data-act="log-req">Mark as sent</button></div></div>` : "";
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
function renderFinancials(c) {
  const f = c.financials;
  if (!f) return `<div class="card"><h2>Financial analysis</h2><p class="hint">${c.run && c.run.running ? "The financial analysis agent is working." : "No financial spread for this case. Run all agents again to create one."}</p></div>`;
  const cell = (x) => (x == null ? '<span class="note">-</span>' : money(x));
  const spread = FIN_LINES.filter(([k]) => f.lines[k]).map(([k, label]) => `<tr><td><b>${esc(label)}</b></td>${f.periods.map((_, i) => `<td class="num">${cell(f.lines[k].values[i])}</td>`).join("")}<td>${f.lines[k].source && f.lines[k].source.doc ? refChip(f.lines[k].source.doc, f.lines[k].source.page, f.lines[k].source.quote) : ""}</td></tr>`).join("");
  const head = `<tr><th></th>${f.periods.map((p) => `<th class="num">${esc(p.label)}${p.end ? `<br><span class="note">${esc(p.end)}</span>` : ""}</th>`).join("")}<th>Source</th></tr>`;
  const ratios = f.ratios.map((r) => `<tr><td><b>${esc(r.label)}</b></td>${f.periods.map((_, i) => `<td class="num">${esc(r.values[i])}</td>`).join("")}<td><span class="chip c-blue">Calculated</span></td></tr>`).join("");
  const flags = f.flags.length ? `<ul class="ready">${f.flags.map((x) => `<li class="${x.flag === "red" ? "todo" : "todo"}">${esc(x.text)}</li>`).join("")}</ul>` : `<p class="hint">No flags from the accounts.</p>`;
  const g = f.guarantors.length ? `<div class="tablewrap bare"><table class="t"><thead><tr><th>Guarantor</th><th class="num">Assets</th><th class="num">Liabilities</th><th class="num">Net worth</th><th class="num">Liquid</th><th>Source</th></tr></thead><tbody>${f.guarantors.map((x) => `<tr><td><b>${esc(x.name)}</b></td><td class="num">${cell(x.assets)}</td><td class="num">${cell(x.liabilities)}</td><td class="num">${cell(x.net_worth)}</td><td class="num">${cell(x.liquid)}</td><td>${x.source && x.source.doc ? refChip(x.source.doc, x.source.page, x.source.quote) : ""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="hint">No guarantor statement of assets and liabilities in the pack.</p>`;
  const obs = f.observations.length ? `<ul class="obs">${f.observations.map((o) => `<li>${esc(o.text)} ${o.source && o.source.doc ? refChip(o.source.doc, o.source.page, o.source.quote || "") : ""}</li>`).join("")}</ul>` : "";
  return `<p class="intro">Spread by the financial analysis agent from the accounts${f.entity ? ` of ${esc(f.entity)}` : ""}${f.basis ? ` (${esc(f.basis.toLowerCase())})` : ""}. Ratios are calculated in code from the spread, not by the AI. Red tags open the page each figure came from.</p>
    <div class="grid2"><div class="stack">
      <div class="card"><h2>Accounts spread</h2><div class="tablewrap bare"><table class="t"><thead>${head}</thead><tbody>${spread || `<tr><td colspan="${f.periods.length + 2}" class="note">No figures found.</td></tr>`}</tbody></table></div></div>
      <div class="card"><h2>Ratios</h2><div class="tablewrap bare"><table class="t"><thead>${head}</thead><tbody>${ratios}</tbody></table></div></div>
      <div class="card"><h2>Guarantors</h2>${g}</div>
    </div><div class="stack">
      <div class="card"><h2>Flags</h2>${flags}</div>
      ${obs ? `<div class="card"><h2>What the agent noticed</h2>${obs}</div>` : ""}
      ${f.missing.length ? `<div class="card"><h2>Still needed</h2><ul class="obs">${f.missing.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></div>` : ""}
    </div></div>`;
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
    ${(c.analysis || []).length ? `<div class="card"><h2>Sensitivities and covenant headroom</h2><p class="hint">Calculated in code. Covenants from the credit policy, section 7.2: LTV ${COVENANTS.ltv}%, ICR ${COVENANTS.icr}x.</p><div class="tablewrap"><table class="t"><thead><tr><th>Measure</th><th>Result</th><th>Comment</th></tr></thead><tbody>${c.analysis.map((a) => `<tr><td><b>${esc(a.label)}</b></td><td class="fv">${esc(a.value)}</td><td>${esc(a.note)}</td></tr>`).join("")}</tbody></table></div></div>` : ""}
    <div class="card"><h2>Judgement areas</h2><p class="hint">Assessed by the memo agent and explained, for a person to read and agree or not.</p>${c.judgements.length ? `<div class="tablewrap"><table class="t"><thead><tr><th>Provision</th><th>Policy</th><th></th><th>Outcome</th><th>Explanation</th></tr></thead><tbody>${c.judgements.map(row).join("")}</tbody></table></div>` : `<p class="hint">Not assessed yet.</p>`}</div>
  </div>`;
}
function authority(c) {
  const L = num(c, "loan_amount") || 0;
  if (L > POLICY.maxLoan) return { canApprove: false, why: "Over £10m is outside appetite. No one can approve it." };
  return { canApprove: true, why: "" };
}
function decisionSummary(c) {
  const d = c.decision; if (!d) return "";
  const acc = (c.conditions || []).filter((x) => x.status === "accepted");
  return `<div class="card"><div class="cardhead"><h2>Decision recorded</h2><span class="chip ${d.choice === "Approve" ? "c-green" : "c-red"}">${esc(d.choice)}</span></div>
    <p class="hint">By ${esc(d.by || "the Underwriter")}, ${dateOf(d.at)} ${timeOf(d.at)}. Risk grade ${esc(d.grade || "not set")}.${d.override ? ` This differs from the suggestion (${esc(c.rec.label)}). Overrides are recorded and are a normal part of the process.` : ""}</p>
    <div class="memo-sec"><header><h3>Rationale</h3></header><div class="memo-body">${renderRich(d.rationale)}</div></div>
    ${d.exception ? `<div class="memo-sec"><header><h3>Reason for approving a policy exception</h3></header><div class="memo-body">${renderRich(d.exception)}</div></div>` : ""}
    ${acc.length ? `<div class="memo-sec"><header><h3>Conditions (${acc.length})</h3></header><div class="memo-body"><ul>${acc.map((x) => `<li><b>${esc(x.type)}:</b> ${esc(x.text)}</li>`).join("")}</ul></div></div>` : ""}
    ${currentRole === "Underwriter" ? `<div><button class="btn small" type="button" data-act="reopen">Reopen the decision</button></div>` : ""}</div>`;
}
function flowCard(c) {
  const st = stageOf(c);
  const steps = [["rm", "Relationship Manager prepares the case"], ["uw", "Underwriter reviews and decides"], ["pricing", "Pricing agreed by RM, Underwriter and Head of Lending"], ["terms", "Terms letter issued to the broker"]];
  const at = st === "rm" || st === "returned" ? 0 : st === "uw" ? 1 : st === "approved" ? 2 : st === "terms" ? 4 : 1;
  const hist = (c.handoffs || []).map((h) => `<li><span class="note">${dateOf(h.at)} ${timeOf(h.at)}</span> <b>${esc(h.who)}</b>: ${esc(h.what)}${h.note ? ` <span class="sub">"${esc(h.note)}"</span>` : ""}</li>`).join("");
  return `<div class="card"><h2>Case flow</h2><ol class="flow">${steps.map(([id, t], i) => `<li class="${i < at ? "done" : i === at ? "now" : ""}">${esc(t)}${i === at && st === "returned" ? " (returned for more information)" : ""}</li>`).join("")}</ol>
    ${hist ? `<div class="label">Hand-offs</div><ul class="handoffs">${hist}</ul>` : ""}
    <p class="hint">The Underwriter approves every case up to £10m, including policy exceptions with a recorded reason. There is no Credit Committee. Neither admin role can approve credit.</p></div>`;
}
function conditionsCard(c, editable) {
  const run = c.conditionsRun || {};
  const list = c.conditions || [];
  const rowsFor = (x) => `<div class="cond ${x.status}"><div class="ct"><span class="chip c-grey">${esc(x.type)}</span><span class="chip ${x.from === "Base set" ? "c-blue" : x.from === "Case specific" ? "c-amber" : "c-green"}">${esc(x.from)}</span>${x.status === "accepted" ? `<span class="chip c-green">Accepted</span>` : x.status === "rejected" ? `<span class="chip c-red">Rejected</span>` : ""}</div><p>${esc(x.text)}</p>${x.reason ? `<span class="note">${esc(x.reason)}</span>` : ""}
    ${editable ? `<div class="row">${x.status !== "accepted" ? `<button class="btn small" type="button" data-act="cond-accept" data-id="${x.id}">Accept</button>` : ""}${x.status !== "rejected" ? `<button class="btn small" type="button" data-act="cond-reject" data-id="${x.id}">Reject</button>` : ""}</div>` : ""}</div>`;
  const acc = list.filter((x) => x.status === "accepted").length, pend = list.filter((x) => x.status === "suggested").length;
  return `<div class="card"><div class="cardhead"><h2>Conditions</h2>${run.running ? `<span class="chip c-amber">Conditions agent working <span class="spin" aria-hidden="true"></span></span>` : list.length ? `<span class="chip c-grey">${acc} accepted, ${pend} to review</span>` : ""}</div>
    <p class="hint">Suggested by the conditions agent from the lender's base set of ${BASE_CONDITIONS.length} standard conditions, plus case-specific ones for this case's risks. ${editable ? "Accept or reject each one, and add your own." : "The Underwriter accepts or rejects each one."}</p>
    ${run.error ? `<div class="errbox"><b>The conditions agent stopped.</b> ${esc(run.error)}</div>` : ""}
    <div class="conds">${list.map(rowsFor).join("")}</div>
    ${editable ? `<div class="edit-inline"><select id="condType" aria-label="Condition type">${["Condition precedent", "Condition subsequent", "Financial covenant", "Information covenant", "Undertaking"].map((t) => `<option>${t}</option>`).join("")}</select><input id="condText" type="text" placeholder="Add a condition" aria-label="New condition"><button class="btn small" type="button" data-act="cond-add">Add</button></div>
    <div><button class="btn small" type="button" data-act="cond-run" ${run.running ? "disabled" : ""}>${list.length ? "Ask the conditions agent again" : "Ask the conditions agent"}</button></div>` : ""}</div>`;
}
function renderDecision(c) {
  if (!c.rec || !c.memo) return renderWorking(c);
  const st = stageOf(c);
  const L = num(c, "loan_amount");
  const side = `<div class="stack">${flowCard(c)}<div class="card"><h2>Approval authority</h2>
      <div class="signoff"><div><b>Underwriter</b><span>Every case up to £10m, including policy exceptions with a recorded reason</span></div><span class="chip c-green">Decides this case</span></div>
      <p class="hint">Loan ${money(L)}${c.rec.exceptions.length ? "; policy exception: " + esc(c.rec.exceptions.join(", ")) : "; no policy exception"}. Over £10m is outside appetite.</p></div></div>`;
  const recbar = `<div class="recbar"><div class="line"><span>Recommendation (a suggestion; a person decides)</span><span class="chip ${recChipClass(c.rec.kind)}">${esc(c.rec.label)}</span></div>${c.rec.reasons.length ? `<ol>${c.rec.reasons.slice(0, 4).map((x) => `<li>${esc(x.text)}</li>`).join("")}</ol>` : ""}</div>`;
  const sub = c.submitted ? `<div class="card"><h2>Note from the Relationship Manager</h2><p class="hint">Submitted by ${esc(c.submitted.by)}, ${dateOf(c.submitted.at)} ${timeOf(c.submitted.at)}.</p><div class="memo-body">${c.submitted.note ? renderRich(c.submitted.note) : '<p class="note">No note.</p>'}</div></div>` : "";
  const ret = st === "returned" && c.returned ? `<div class="errbox"><b>Returned by the Underwriter, ${dateOf(c.returned.at)} ${timeOf(c.returned.at)}.</b> ${esc(c.returned.reason)}</div>` : "";
  const switchTo = (r, why) => `<div class="card"><h2>${esc(why)}</h2><p class="hint">In the product each person sees only their own work. In this prototype, switch role to carry on.</p><div><button class="btn primary" type="button" data-role="${esc(r)}">Switch to ${esc(r)}</button></div></div>`;
  let main;
  if (st === "approved" || st === "declined" || st === "terms") main = decisionSummary(c) + (st !== "declined" ? `<div class="card"><h2>Next: pricing and terms</h2><p class="hint">${c.terms && c.terms.issued ? "Terms letter issued." : c.pricing && c.pricing.status === "agreed" ? "Pricing agreed. The RM can issue the terms letter." : c.pricing && c.pricing.status === "awaiting" ? "Pricing is waiting for sign-off: " + esc(waitingOn(c) || "") + "." : "The RM proposes pricing from the lender's grid, then the Underwriter and Head of Lending sign it off."}</p><div><button class="btn primary small" type="button" data-tab="pricing">Go to pricing and terms</button></div></div>` : "") + (currentRole === "Underwriter" ? "" : conditionsCard(c, false));
  else if (currentRole === "Relationship Manager") {
    if (st === "uw") main = sub + `<div class="card"><h2>With the Underwriter</h2><p class="hint">You submitted this case. You can still read it and add comments. The Underwriter can return it to you for more information.</p></div>` + switchTo("Underwriter", "Continue as the Underwriter");
    else {
      const toCheck = FIELDS.filter((f) => { const x = c.fields[f.key]; return !x.edited && (x.state === "Not confident" || (x.state === "Not present" && (f.mandatory || f.mandatoryIf))); }).length;
      const mism = c.consistency.length; const reqSent = (c.audit || []).some((a) => /request to the broker as sent/i.test(a.what));
      const edits = MEMO_SECTIONS.filter(([k]) => c.memo[k] && !["Memo agent", "System"].includes(c.memo[k].by)).length;
      const item = (ok, text) => `<li class="${ok ? "ok" : "todo"}">${ok ? "Done" : "Open"}: ${esc(text)}</li>`;
      main = ret + `<div class="card"><h2>Submit to the Underwriter</h2>
        <ul class="ready">${item(!toCheck, toCheck ? `${toCheck} field${toCheck > 1 ? "s" : ""} to check in Source check` : "All fields checked")}${item(!mism, mism ? `${mism} mismatch${mism > 1 ? "es" : ""} between documents` : "No mismatches")}${c.rec.kind === "more" ? item(reqSent, reqSent ? "Request sent to the broker" : "Request to the broker not sent yet") : ""}${item(edits > 0, edits ? `You edited ${edits} memo section${edits > 1 ? "s" : ""}` : "Memo not reviewed yet (optional)")}</ul>
        <div class="field"><label for="rmNote">Note to the Underwriter</label><textarea class="ed" id="rmNote" placeholder="What the Underwriter should know: your view, open points, anything you've checked with the broker"></textarea></div>
        <div class="row"><button class="btn primary" type="button" data-act="submit-uw">Submit to the Underwriter</button><span class="note">Open items are shown to the Underwriter. The conditions agent runs when you submit.</span></div></div>`;
    }
  } else if (currentRole !== "Underwriter") {
    main = sub + `<div class="card"><h2>Credit decision</h2><p class="hint">Only the Underwriter decides credit. The ${esc(currentRole)} signs off pricing once the case is approved.</p></div>` + (st === "uw" ? switchTo("Underwriter", "Continue as the Underwriter") : "");
  } else {
    if (st !== "uw") main = ret + switchTo("Relationship Manager", "The Relationship Manager hasn't submitted this case yet");
    else {
      const dd = draftDecision; const au = authority(c);
      const opts = [
        ["Approve", "Indicative terms can be prepared.", !au.canApprove, au.why],
        ["Decline", "The broker gets a polite decline.", false, ""],
        ["Return to the RM", "For more information from the broker. The case goes back to the RM.", false, ""],
      ];
      if (dd.choice && opts.find((o) => o[0] === dd.choice && o[2])) dd.choice = "";
      const exc = c.rec.exceptions.length && dd.choice === "Approve";
      main = sub + conditionsCard(c, true) + `<div class="card"><h2>Credit decision</h2>
        <div class="field"><label for="decGrade">Risk grade (1 best, 10 worst)</label><select id="decGrade"><option value="">Choose a grade</option>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option ${String(dd.grade) === String(n) ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        <div class="choices">${opts.map(([name, desc, dis, why]) => `<label class="choice ${dis ? "disabled" : ""}"><input type="radio" name="decChoice" value="${esc(name)}" ${dis ? "disabled" : ""} ${dd.choice === name ? "checked" : ""}><span><b>${esc(name)}</b><small>${esc(dis && why ? why : desc)}</small></span></label>`).join("")}</div>
        ${exc ? `<div class="field"><label for="decException">Reason for approving outside policy (required): ${esc(c.rec.exceptions.join(", "))}</label><textarea class="ed" id="decException" placeholder="Why the exception is acceptable, and any mitigants">${esc(dd.exception)}</textarea></div>` : ""}
        <div class="field"><label for="decRationale">${dd.choice === "Return to the RM" ? "What the RM needs to get (required)" : "Rationale (required)"}</label><textarea class="ed" id="decRationale" placeholder="${dd.choice === "Return to the RM" ? "What is missing or needs checking" : "Why you made this decision"}">${esc(dd.rationale)}</textarea></div>
        <div class="row"><button class="btn primary" type="button" data-act="record">${dd.choice === "Return to the RM" ? "Return to the RM" : "Record decision"}</button><span class="note" id="decMsg"></span></div></div>`;
    }
  }
  return `<div class="grid2"><div class="stack">${recbar}${main}</div>${side}</div>`;
}
const pctTxt = (x, d = 2) => (x == null || !isFinite(x) ? "-" : Number(x).toFixed(d).replace(/\.?0+$/, "") + "%");
function termsText(c) {
  const F = (k) => usable(c, k); const p = c.pricing; const f = priceFigures(c, p); const P = POLICY.pricing;
  const L = num(c, "loan_amount"); const T = num(c, "loan_term_years");
  const acc = (c.conditions || []).filter((x) => x.status === "accepted");
  const group = (types) => acc.filter((x) => types.includes(x.type)).map((x) => "- " + x.text).join("\n");
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const until = new Date(Date.now() + P.validityDays * 864e5).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const broker = F("broker"); const bname = c.source && c.source.from ? brokerName(c.source.from) : broker || "the broker";
  return [
    `**Indicative terms: ${F("borrower_name") || c.title}**`,
    `Demo lender (prototype) · ${today} · Reference ${c.ref}`,
    c.source && c.source.from ? `Dear ${bname.split(" ")[0]},` : broker ? `Dear ${broker} team,` : "Dear colleague,",
    `Thank you for introducing this loan. We are pleased to set out the indicative terms on which we would be willing to lend, subject to the conditions below. These terms are not an offer of finance. They are subject to contract, a satisfactory valuation, legal due diligence and final credit approval.`,
    `**Facility**`,
    [`- Borrower: ${F("borrower_name") || "to be confirmed"}${F("company_number") ? " (company " + F("company_number") + ")" : ""}`,
     `- Property: ${F("property_address") || "to be confirmed"}`,
     `- Facility: ${money(L)} commercial property investment loan`,
     `- Purpose: ${F("purpose") || "to be confirmed"}`,
     `- Term: ${T != null ? T + " years" : "to be confirmed"}`,
     `- Repayment: ${F("repayment_basis") || "Interest only"}`].join("\n"),
    `**Pricing**`,
    [`- Interest rate: ${pctTxt(f.rate)} a year (${P.referenceName} of ${pctTxt(P.referenceRate)} plus a margin of ${pctTxt(p.margin)})`,
     `- Arrangement fee: ${pctTxt(p.feePct)} of the facility (${money(f.fee)}), payable on completion`,
     `- Exit fee: ${p.exitPct ? pctTxt(p.exitPct) + " of the amount repaid" : "none"}`,
     `- The borrower pays the lender's valuation and legal costs`].join("\n"),
    `**Security**`,
    group(["Condition precedent"]).split("\n").filter((l) => /charge|debenture|guarantee/i.test(l)).join("\n") || "- First legal charge over the property and a debenture from the borrower",
    `**Financial covenants**`,
    [`- Loan to value no more than ${COVENANTS.ltv}%, tested annually on a lender-instructed valuation`, `- Interest cover at least ${COVENANTS.icr}x, tested quarterly`].concat(/amortis/i.test(F("repayment_basis") || "") ? [`- Debt service cover at least ${COVENANTS.dscr}x, tested quarterly`] : [])
      .concat(acc.filter((x) => x.type === "Financial covenant" && !/ltv|loan to value|icr|interest cover|dscr|debt service/i.test(x.text)).map((x) => "- " + x.text)).join("\n"),
    `**Conditions before drawdown**`,
    group(["Condition precedent"]) || "- As set out in the facility letter",
    acc.some((x) => x.type === "Condition subsequent") ? `**Conditions after drawdown**` : "",
    group(["Condition subsequent"]),
    acc.some((x) => ["Information covenant", "Undertaking"].includes(x.type)) ? `**Undertakings**` : "",
    group(["Information covenant", "Undertaking"]),
    `These indicative terms are valid until ${until}. To proceed, please ask the borrower to sign and return them, and we will instruct the valuation and legal work.`,
    `Yours sincerely,`,
    `The lending team, Demo lender`,
  ].filter(Boolean).join("\n\n");
}
function renderPricing(c) {
  const st = stageOf(c);
  if (!c.decision || c.decision.choice !== "Approve") return `<div class="card"><h2>Pricing and terms</h2><p class="hint">Pricing opens once the Underwriter approves the case.</p></div>`;
  const g = gridPricing(c); const P = POLICY.pricing;
  const p = c.pricing || { margin: g.margin, feePct: g.feePct, exitPct: g.exitPct, reason: "", status: "draft", signoffs: {} };
  const f = priceFigures(c, p); const fg = priceFigures(c, g);
  const editable = currentRole === "Relationship Manager" && p.status === "draft";
  const grid = `<div class="card"><h2>Pricing grid</h2><p class="hint">From the lender's pricing grid, credit policy section 7.3 (illustrative). Calculated in code.</p>
    <div class="tablewrap bare"><table class="t"><tbody>${g.lines.map((x) => `<tr><td>${esc(x.label)}</td><td class="num">${x.base ? "" : x.add > 0 ? "+" : ""}${pctTxt(x.add)}</td></tr>`).join("")}
    <tr><td><b>Grid margin</b>${g.margin === P.floorMargin ? `<span class="sub">At the ${pctTxt(P.floorMargin)} floor</span>` : ""}</td><td class="num"><b>${pctTxt(g.margin)}</b></td></tr>
    <tr><td>${esc(P.referenceName)}</td><td class="num">${pctTxt(P.referenceRate)}</td></tr>
    <tr><td><b>Grid rate</b></td><td class="num"><b>${pctTxt(fg.rate)}</b></td></tr>
    <tr><td>Arrangement fee</td><td class="num">${pctTxt(g.feePct)} (${money(fg.fee)})</td></tr></tbody></table></div></div>`;
  const icrLine = f.icr == null ? "" : `<p class="${f.icrOk ? "hint" : "errbox"}">Interest cover at the priced rate: <b>${f.icr.toFixed(2)}x</b> (${money(f.interest)} interest a year). ${f.icrOk ? `Meets the ${POLICY.minICR}x policy minimum.` : `Below the ${POLICY.minICR}x policy minimum, so the Underwriter should check this before signing off.`}</p>`;
  const prop = `<div class="card"><div class="cardhead"><h2>Proposed pricing</h2><span class="chip ${p.status === "agreed" ? "c-green" : p.status === "awaiting" ? "c-amber" : "c-grey"}">${p.status === "agreed" ? "Agreed" : p.status === "awaiting" ? "Waiting for sign-off" : "Draft"}</span></div>
    ${p.sentBack && p.status === "draft" ? `<div class="errbox"><b>Sent back by ${esc(p.sentBack.by)}.</b> ${esc(p.sentBack.reason)}</div>` : ""}
    ${editable ? `<div class="cfg"><label for="prMargin">Margin over the reference rate (%)</label><input id="prMargin" type="number" step="0.05" value="${p.margin}"><label for="prFee">Arrangement fee (%)</label><input id="prFee" type="number" step="0.25" value="${p.feePct}"><label for="prExit">Exit fee (%)</label><input id="prExit" type="number" step="0.25" value="${p.exitPct}"><label for="prReason">Reason, if different from the grid</label><input id="prReason" type="text" value="${esc(p.reason || "")}" placeholder="For example, competitive pressure from another lender"></div>`
      : `<div class="tablewrap bare"><table class="t"><tbody><tr><td>Margin</td><td class="num">${pctTxt(p.margin)}${p.margin !== g.margin ? ` <span class="chip c-amber">Grid ${pctTxt(g.margin)}</span>` : ""}</td></tr><tr><td><b>Interest rate</b></td><td class="num"><b>${pctTxt(f.rate)}</b></td></tr><tr><td>Arrangement fee</td><td class="num">${pctTxt(p.feePct)} (${money(f.fee)})</td></tr><tr><td>Exit fee</td><td class="num">${p.exitPct ? pctTxt(p.exitPct) : "None"}</td></tr></tbody></table></div>${p.reason ? `<p class="hint">Reason: ${esc(p.reason)}</p>` : ""}`}
    ${icrLine}
    ${editable ? `<div class="row"><button class="btn primary" type="button" data-act="price-submit">Submit pricing for sign-off</button><span class="note" id="prMsg"></span></div>` : ""}
    ${currentRole !== "Relationship Manager" && p.status === "draft" ? `<p class="note">Waiting for the RM to propose pricing.</p>` : ""}</div>`;
  const signs = `<div class="card"><h2>Pricing sign-off</h2><p class="hint">Three people sign off pricing: the RM who proposes it, the Underwriter for credit, and the Head of Lending, who holds the Approve pricing permission. Any change to the pricing restarts the sign-off.</p>
    ${SIGNERS.map((r) => { const so = (p.signoffs || {})[r]; return `<div class="signoff"><div><b>${esc(r)}</b><span>${r === "Relationship Manager" ? "Proposes" : r === "Underwriter" ? "Credit" : "Commercial (Approve pricing permission)"}</span></div>${so ? `<span class="chip c-green">Signed ${dateOf(so.at)} ${timeOf(so.at)}</span>` : p.status === "awaiting" ? `<span class="chip c-amber">Waiting</span>` : `<span class="chip c-grey">Not yet</span>`}</div>`; }).join("")}
    ${p.status === "awaiting" && SIGNERS.includes(currentRole) && !(p.signoffs || {})[currentRole] ? `<div class="field"><label for="prBack">Comment (needed to send back)</label><input id="prBack" type="text"></div><div class="row"><button class="btn primary" type="button" data-act="price-sign">Approve pricing as ${esc(currentRole)}</button><button class="btn" type="button" data-act="price-back">Send back to the RM</button><span class="note" id="prMsg"></span></div>` : ""}
    ${p.status === "awaiting" && !SIGNERS.filter((r) => !(p.signoffs || {})[r]).includes(currentRole) ? `<p class="note">Waiting for: ${esc(waitingOn(c) || "")}. Switch role to sign as them.</p>` : ""}</div>`;
  let terms = "";
  if (p.status === "agreed") {
    const t = c.terms;
    terms = `<div class="card"><div class="cardhead"><h2>Terms letter</h2>${t && t.issued ? `<span class="chip c-green">Issued ${dateOf(t.issued.at)} ${timeOf(t.issued.at)}</span>` : t ? `<span class="chip c-amber">Draft</span>` : ""}</div>
      ${!t ? `<p class="hint">Generated from the approved case: facility, agreed pricing, security, covenants and the conditions the Underwriter accepted.</p>${currentRole === "Relationship Manager" ? `<div><button class="btn primary" type="button" data-act="terms-make">Generate the terms letter</button></div>` : `<p class="note">The RM generates and issues the terms letter.</p>`}`
      : `<div class="pagetext paper termsdoc">${renderRich(t.text)}</div>
        <div class="row"><button class="btn small" type="button" data-act="terms-print">Print or save as PDF</button><button class="btn small" type="button" data-act="terms-word">Download as Word</button><button class="btn small" type="button" data-act="terms-copy">Copy</button>${currentRole === "Relationship Manager" && !t.issued ? `<button class="btn small" type="button" data-act="terms-make">Regenerate</button>${c.source && c.source.kind === "email" && settings.inboxUrl ? `<button class="btn primary small" type="button" data-act="terms-email">Email to the broker</button>` : ""}<button class="btn ${c.source && c.source.kind === "email" && settings.inboxUrl ? "" : "primary "}small" type="button" data-act="terms-issue">Mark as issued</button>` : ""}</div>`}</div>`;
  }
  return `<div class="grid2"><div class="stack">${prop}${signs}${terms}</div><div class="stack">${grid}${flowCard(c)}</div></div>`;
}
function wordDoc(title, html) {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.4}p{margin:0 0 8pt}ul{margin:0 0 8pt 18pt}</style></head><body>${html}</body></html>`;
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
    ["Standard covenants (7.2)", `LTV no more than ${P.covLTV}%, ICR at least ${P.covICR}x, DSCR at least ${P.covDSCR}x if amortising. ${P.covTesting}. Set with headroom over the day-one limits so a small dip does not cause a breach`, "Calculated"],
    ["Pricing grid (7.3)", `Margin over a ${pctTxt(P.pricing.referenceRate)} reference rate by LTV band (${P.pricing.bands.map((x) => "up to " + x[0] + "%: " + pctTxt(x[1])).join(", ")}), adjusted for risk grade, short WAULT, tenant concentration, EPC below C and approved exceptions; floor ${pctTxt(P.pricing.floorMargin)}. Arrangement fee ${pctTxt(P.pricing.feeSmall)} under £1m, ${pctTxt(P.pricing.feeLarge)} from £1m, minimum £5,000. Signed off by the RM, Underwriter and Head of Lending`, "Calculated"],
    ["Approval authority", "Underwriter approves every case up to £10m, including policy exceptions with a recorded reason; over £10m outside appetite. No Credit Committee", "Calculated"],
  ];
  return pageHead("Credit policies", "Credit policies", "The policy the agents test each case against. This prototype uses the illustrative UK market standard policy from the broker submission flow doc. In the product, the Client Admin uploads the lender's own policy and an agent extracts the rules with links to each clause.") +
    `<div class="tablewrap"><table class="t"><thead><tr><th>Policy area</th><th>Criterion</th><th>Check type</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td><span class="chip ${r[2] === "Calculated" ? "c-blue" : r[2] === "Mixed" ? "c-amber" : "c-grey"}">${r[2]}</span></td></tr>`).join("")}</tbody></table></div>
    <p class="note" style="margin-top:10px">${esc(P.version)}. Figures are inferred from market norms, not taken from a lender.</p>`;
}
function renderAgentsAdmin() {
  const p = activeProvider();
  const agents = [
    ["Intake agent", "Reads the deals inbox, checks each email is a deal (automated senders are skipped and the AI checks the rest), opens a case for each broker email, adds broker replies to their case, emails the broker for missing information and sends reminders. Reads each document: PDF text, Word, Excel, emails and scanned images.", "In the browser, with a Google Apps Script for the demo inbox"],
    ["Extraction agent", "Classifies each document and extracts the application fields with the document, page and exact text, using four states.", PROVIDERS[p].name],
    ["Policy agent", "Calculates loan size, term, LTV, ICR, DSCR, location, EPC, WAULT, concentration and document age, and suggests a recommendation.", "Code, no AI"],
    ["Financial analysis agent", "Spreads up to three years of accounts and the guarantors' statements of assets and liabilities, with sources. Ratios are then calculated in code.", PROVIDERS[p].name],
    ["Memo agent", "Assesses the judgement areas, drafts the credit memo with sources and drafts a request to the broker.", PROVIDERS[p].name],
    ["Conditions agent", `Runs when the RM submits a case. Suggests conditions from the lender's base set of ${BASE_CONDITIONS.length} and adds case-specific ones. The Underwriter accepts or rejects each.`, PROVIDERS[p].name],
  ];
  return pageHead("AI governance", "AI governance", "The agents in this prototype, what each one does and what runs it. Every agent action is in each case's audit trail.") +
    `<div class="tablewrap"><table class="t"><thead><tr><th>Agent</th><th>What it does</th><th>Runs on</th></tr></thead><tbody>${agents.map((a) => `<tr><td><b>${a[0]}</b></td><td>${a[1]}</td><td>${esc(a[2])}</td></tr>`).join("")}</tbody></table></div>
    <div class="row" style="margin-top:14px"><button class="btn" type="button" data-act="settings">Change AI provider</button></div>`;
}
function render() {
  renderNav();
  const c = cur();
  if (view === "case" && !c) view = cases.length ? "cases" : "new";
  const html = { new: renderNew, cases: renderCases, inbox: renderInbox, policy: renderPolicyAdmin, agents: renderAgentsAdmin }[view];
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
function deleteCase(x) {
  if (x.run && x.run.running) x.run.cancel = "Case deleted.";
  fileStore.delCase(x.id); closeSource();
  cases = cases.filter((y) => y.id !== x.id);
  if (currentId === x.id) { currentId = cases[0] ? cases[0].id : null; if (view === "case") view = cases.length ? "cases" : "new"; }
  save(); render(); toast("Case deleted");
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

/* ------------------------------------------------------------------ deals inbox (Gmail demo inbox via Google Apps Script) */
const INBOX_SCRIPT = /*__GAS__*/"";
let inboxBusy = false;
let inboxState = Object.assign({ last: null, error: "", log: [] }, load("nashflow.inbox.state", {}));
const inboxSeen = new Set(load("nashflow.inbox.seen", []));
function inboxLog(text) { inboxState.log.unshift({ at: nowISO(), text }); inboxState.log = inboxState.log.slice(0, 30); store("nashflow.inbox.state", inboxState); }
function addWorkingDays(iso, n) { const d = new Date(iso); let k = 0; while (k < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) k++; } return d; }
async function inboxCall(action, params = {}) {
  if (!settings.inboxUrl || !settings.inboxKey) throw new Error("Add the inbox web app address and key first.");
  let res;
  try {
    if (action === "send") res = await fetch(settings.inboxUrl, { method: "POST", body: JSON.stringify(Object.assign({ key: settings.inboxKey, action }, params)) });
    else res = await fetch(settings.inboxUrl + "?" + new URLSearchParams(Object.assign({ key: settings.inboxKey, action }, params)).toString());
  } catch (e) { throw new Error("Could not reach the inbox. It works on the hosted page or the downloaded copy, not inside the claude.ai link. Check the web app address and that it is deployed for Anyone."); }
  const d = await res.json().catch(() => { throw new Error("The inbox did not reply with data. Check the web app address ends in /exec and the deployment allows Anyone."); });
  if (d.error) throw new Error("The inbox said: " + d.error);
  return d;
}
function emailFile(m) {
  const head = `From: ${m.from}\nTo: ${m.to || ""}\nDate: ${m.date}\nSubject: ${m.subject}\n\n`;
  return new File([head + (m.body || "")], "Broker email" + (m.subject ? " - " + m.subject.replace(/[\\/:*?"<>|]/g, " ").slice(0, 60) : "") + ".txt", { type: "text/plain" });
}
const brokerName = (from) => { const n = String(from || "").replace(/<.*>/, "").replace(/"/g, "").trim(); return n || String(from || ""); };
/* Triage: only broker deal emails become cases */
const AUTOMATED_SENDER = /no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?@|accounts\.google\.com|@google\.com|@.*\.google\.com|calendar-notification|newsletter/i;
function triagePrompt(m) {
  return `You are the intake agent in NashFlow, a commercial property lending tool for a UK specialist lender. Decide whether this email is a broker or borrower submitting a commercial property loan deal or enquiry (or sending documents for one). Account notices, security alerts, newsletters, marketing, calendar invites, receipts and personal emails are not deals.

From: ${m.from}
Subject: ${m.subject}
Attachments: ${(m.attachments || []).map((a) => a.name).join(", ") || "none"}
Body (start):
${String(m.body || "").slice(0, 2500)}

Reply with only this JSON: {"is_deal": true or false, "reason": "one short sentence"}`;
}
async function triageEmail(m) {
  if (AUTOMATED_SENDER.test(m.from || "")) return { deal: false, reason: "Automated sender" };
  try { const r = await askAI(triagePrompt(m), [], "triage"); return { deal: r.is_deal !== false, reason: r.reason || "" }; }
  catch (e) { return { deal: true, reason: "Could not check, so opened as a case: " + (e.message || e) }; }
}
const ignoredMsgs = {}; // id -> message, this visit only, so a wrongly ignored email can still be opened
async function openEmailAsCase(m) {
  const files = [emailFile(m)].concat((m.attachments || []).map((a) => new File([b64ToBytes(a.b64)], a.name, { type: a.type || "application/octet-stream" })));
  const prev = { id: currentId, view, tab: currentTab };
  const c = await newCaseFromFiles(files, m.subject || "Email from " + brokerName(m.from), { source: { kind: "email", id: m.id, threadId: m.threadId, from: m.from, subject: m.subject, at: m.date } });
  audit(c, "Intake agent", `Picked up an email from ${brokerName(m.from)}: "${m.subject}" with ${(m.attachments || []).length} attachment${(m.attachments || []).length === 1 ? "" : "s"}. Case opened automatically.`, "agent");
  inboxLog(`New case ${c.ref} from ${brokerName(m.from)}: ${m.subject}`);
  if (prev.view === "case" && prev.id) { currentId = prev.id; view = "case"; currentTab = prev.tab; } else view = prev.view === "new" ? "cases" : prev.view;
  save(); render(); toast(`New case from ${brokerName(m.from)}. The agents are reading it.`);
  return c;
}
async function pollInbox(manual) {
  if (!settings.inboxUrl || !settings.inboxKey) { if (manual) toast("Add the inbox address and key first"); return; }
  if (inboxBusy) return;
  inboxBusy = true;
  try {
    const r = await inboxCall("list");
    for (const m of r.messages || []) {
      if (inboxSeen.has(m.id)) { await inboxCall("done", { id: m.id }).catch(() => {}); continue; }
      const files = [emailFile(m)].concat((m.attachments || []).map((a) => new File([b64ToBytes(a.b64)], a.name, { type: a.type || "application/octet-stream" })));
      const existing = cases.find((x) => x.source && x.source.threadId === m.threadId);
      inboxSeen.add(m.id); store("nashflow.inbox.seen", [...inboxSeen]);
      await inboxCall("done", { id: m.id }).catch(() => {});
      if (existing) {
        existing.chase = existing.chase || { sent: [], replies: [] };
        existing.chase.awaiting = false; existing.chase.flagRM = false; existing.chase.replies.push(nowISO()); existing.chase.sinceReply = 0;
        audit(existing, "Intake agent", `The broker replied by email with ${m.attachments.length} attachment${m.attachments.length === 1 ? "" : "s"}. Added to the case and running the agents again.`, "agent");
        inboxLog(`Reply from ${brokerName(m.from)} added to ${existing.ref} ${existing.title}`);
        toast(`Broker replied on ${existing.ref}. The agents are updating the case.`);
        addFilesToCase(existing, files);
      } else {
        const t = await triageEmail(m);
        if (!t.deal) {
          ignoredMsgs[m.id] = m;
          inboxState.ignored = [{ id: m.id, at: nowISO(), from: m.from, subject: m.subject, reason: t.reason }].concat(inboxState.ignored || []).slice(0, 20);
          inboxLog(`Ignored, not a deal: ${brokerName(m.from)}, "${m.subject}" (${t.reason})`);
          continue;
        }
        await openEmailAsCase(m);
      }
    }
    await chaseReminders();
    inboxState.last = nowISO(); inboxState.error = "";
    if (manual) toast((r.messages || []).length ? `Picked up ${r.messages.length} email${r.messages.length > 1 ? "s" : ""}` : "No new emails");
  } catch (e) {
    inboxState.error = e.message || String(e);
    if (manual) toast(inboxState.error);
  } finally {
    inboxBusy = false; store("nashflow.inbox.state", inboxState);
    const el = document.getElementById("inboxStatus"); if (el) el.innerHTML = inboxStatusHtml();
  }
}
async function sendToBroker(c, kind) {
  const body = (kind === "Reminder" ? "Just a reminder about the items below, which we need before we can take this further.\n\n" : "") +
    String(c.brokerRequest || "").replace(/\[Your name\]/g, "The lending team, Demo lender\n(Sent by NashFlow)");
  await inboxCall("send", { threadId: c.source.threadId, body });
  c.chase = c.chase || { sent: [], replies: [] };
  c.chase.sent.push({ at: nowISO(), kind, body }); c.chase.awaiting = true; c.chase.sinceReply = (c.chase.sinceReply || 0) + 1;
  audit(c, "Intake agent", `${kind === "Reminder" ? "Sent a reminder" : "Emailed the broker"} asking for the missing information`, "agent");
  inboxLog(`${kind} sent to ${brokerName(c.source.from)} for ${c.ref}`);
  c.status = "Waiting on broker"; save();
}
async function chaseReminders() {
  if (!settings.chaseAuto) return;
  for (const c of cases) {
    const ch = c.chase; if (!ch || !ch.awaiting || !c.source) continue;
    const last = ch.sent[ch.sent.length - 1]; if (!last || new Date() < addWorkingDays(last.at, 2)) continue;
    if ((ch.sinceReply || 0) < 2) await sendToBroker(c, "Reminder").catch((e) => audit(c, "System", "Reminder not sent: " + e.message, "agent"));
    else if (!ch.flagRM) { ch.flagRM = true; audit(c, "Intake agent", "No reply from the broker after 2 emails. Flagged to the RM.", "agent"); inboxLog(`${c.ref}: no reply after 2 emails, flagged to the RM`); save(); }
  }
  render();
}
async function afterRun(c) {
  if (!c.source || c.source.kind !== "email" || !c.memo || !cases.includes(c) || (c.run && c.run.error)) return;
  c.chase = c.chase || { sent: [], replies: [] };
  if (!c.brokerRequest) { if (c.chase.awaiting) { c.chase.awaiting = false; save(); } return; }
  if (!settings.chaseAuto || c.chase.awaiting) return;
  try { await sendToBroker(c, "Request"); toast(`Emailed ${brokerName(c.source.from)} for the missing information on ${c.ref}`); }
  catch (e) { audit(c, "System", "Could not email the broker: " + e.message, "agent"); }
  save(); render();
}
function chaseCard(c) {
  const ch = c.chase || { sent: [], replies: [] };
  const hist = ch.sent.map((x) => ({ at: x.at, t: `${x.kind} sent to ${brokerName(c.source.from)}` })).concat((ch.replies || []).map((at) => ({ at, t: "Broker replied" }))).sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)).map((x) => `<li><span class="note">${dateOf(x.at)} ${timeOf(x.at)}</span> ${esc(x.t)}</li>`).join("");
  const next = ch.awaiting && ch.sent.length ? addWorkingDays(ch.sent[ch.sent.length - 1].at, 2) : null;
  return `<div class="card"><div class="cardhead"><h2>Emails with the broker</h2>${ch.flagRM ? `<span class="chip c-red">Not replying</span>` : ch.awaiting ? `<span class="chip c-amber">Waiting on broker</span>` : c.brokerRequest ? `<span class="chip c-grey">Not sent</span>` : `<span class="chip c-green">Nothing missing</span>`}</div>
    <p class="hint">This case came in by email from ${esc(brokerName(c.source.from))}: "${esc(c.source.subject || "")}". ${settings.chaseAuto ? "NashFlow emails the broker for anything missing, reminds after 2 working days, and flags the RM after 2 unanswered emails." : "Automatic follow-up is off in Deals inbox."}</p>
    ${ch.flagRM ? `<div class="errbox"><b>No reply after 2 emails.</b> Call the broker or decide whether to carry on.</div>` : ""}
    ${hist ? `<ul class="handoffs">${hist}</ul>` : ""}
    ${next && !ch.flagRM ? `<p class="note">Next reminder from ${dateOf(next.toISOString())} if there is no reply.</p>` : ""}
    ${c.brokerRequest ? `<details><summary class="note">What NashFlow asks for</summary><div class="memo-body">${renderRich(c.brokerRequest)}</div></details>` : ""}
    <div class="row">${c.brokerRequest && !ch.awaiting ? `<button class="btn small" type="button" data-act="chase-send">Send to the broker now</button>` : ""}${ch.awaiting && !ch.flagRM ? `<button class="btn small" type="button" data-act="chase-remind">${(ch.sinceReply || 0) >= 2 ? "Skip ahead: still no reply (demo)" : "Skip ahead: send the reminder now (demo)"}</button>` : ""}</div></div>`;
}
function inboxStatusHtml() {
  const on = settings.inboxUrl && settings.inboxKey;
  return `${!on ? `<span class="chip c-grey">Not connected</span>` : inboxState.error ? `<span class="chip c-red">Problem</span>` : settings.inboxAuto ? `<span class="chip c-green">Checking every 30 seconds</span>` : `<span class="chip c-amber">Connected, checking only when you click</span>`}
    ${inboxState.last ? `<span class="note">Last checked ${dateOf(inboxState.last)} ${timeOf(inboxState.last)}</span>` : ""}${inboxState.error ? `<div class="errbox">${esc(inboxState.error)}</div>` : ""}`;
}
function renderInbox() {
  const ck = (id, on, label, desc) => `<label class="choice"><input type="checkbox" id="${id}" ${on ? "checked" : ""}><span><b>${label}</b><small>${desc}</small></span></label>`;
  return pageHead("Deals inbox", "Deals inbox", "NashFlow reads a deals inbox. When a broker emails a deal pack, the intake agent opens a case and runs the agents with no clicks. If anything is missing, NashFlow emails the broker, reminds after 2 working days, and flags the RM after 2 unanswered emails.") +
    `<div class="proto"><b>Demo inbox.</b> This prototype uses a Gmail account set up for demos, through a small Google Apps Script. Send it made-up or anonymised packs only. It works on the hosted page and the downloaded copy, not inside the claude.ai link.</div>
    <div class="grid2 even"><div class="stack">
      <div class="card"><div class="cardhead"><h2>Connection</h2></div><div id="inboxStatus" class="row">${inboxStatusHtml()}</div>
        <div class="cfg"><label for="ibUrl">Web app address (ends in /exec)</label><input id="ibUrl" type="url" value="${esc(settings.inboxUrl || "")}" placeholder="https://script.google.com/macros/s/.../exec"><label for="ibKey">Key (the same phrase as in the script)</label><input id="ibKey" type="password" autocomplete="off" value="${esc(settings.inboxKey || "")}"></div>
        ${ck("ibAuto", settings.inboxAuto, "Check for new emails every 30 seconds", "While this page is open.")}
        ${ck("ibChase", settings.chaseAuto, "Email the broker automatically for missing information", "Sent from the demo inbox as a reply in the broker's thread. Reminder after 2 working days, then the RM is flagged.")}
        <div class="row"><button class="btn primary" type="button" data-act="inbox-save">Save</button><button class="btn" type="button" data-act="inbox-test">Test the connection</button><button class="btn" type="button" data-act="inbox-check">Check now</button></div></div>
      ${(inboxState.ignored || []).length ? `<div class="card"><h2>Ignored emails</h2><p class="hint">The intake agent decided these are not deals, so no case was opened.</p><ul class="handoffs">${inboxState.ignored.map((x) => `<li><span class="note">${dateOf(x.at)} ${timeOf(x.at)}</span> <b>${esc(brokerName(x.from))}</b>: ${esc(x.subject || "(no subject)")}<span class="sub">${esc(x.reason)}</span>${ignoredMsgs[x.id] ? ` <button class="btn small" type="button" data-act="inbox-open" data-id="${esc(x.id)}">Open as a case</button>` : ""}</li>`).join("")}</ul></div>` : ""}
      <div class="card"><h2>Activity</h2>${inboxState.log.length ? `<ul class="handoffs">${inboxState.log.map((x) => `<li><span class="note">${dateOf(x.at)} ${timeOf(x.at)}</span> ${esc(x.text)}</li>`).join("")}</ul>` : `<p class="hint">Nothing yet.</p>`}</div>
    </div><div class="stack">
      <div class="card"><h2>Set up the demo inbox (about 10 minutes)</h2>
        <ol class="obs"><li>Create a Gmail account just for demos, for example nashflow.deals.demo@gmail.com.</li><li>Signed in as that account, open <b>script.google.com</b> and click <b>New project</b>.</li><li>Delete what is there and paste in the script below. Change <b>KEY</b> near the top to a long random phrase, then click <b>Save</b>.</li><li>Click <b>Deploy</b>, <b>New deployment</b>, type <b>Web app</b>. Execute as <b>Me</b>, who has access <b>Anyone</b>. Click <b>Deploy</b> and allow the permissions.</li><li>Copy the web app address and paste it here with the same key. Click <b>Test the connection</b>, then tick <b>Check every 30 seconds</b>.</li><li>Email a deal pack to the demo address from another account. The case appears in My cases within about a minute.</li></ol>
        <div class="row"><button class="btn" type="button" data-act="inbox-copy">Copy the script</button></div>
        <details><summary class="note">Show the script</summary><pre class="pagetext">${esc(INBOX_SCRIPT)}</pre></details>
        <p class="hint">Anyone with the web app address and key could read the demo inbox, so keep both private and use the account for demos only.</p></div>
    </div></div>`;
}
setInterval(() => { if (settings.inboxAuto && !document.hidden) pollInbox(false); }, 30000);
if (settings.inboxAuto) setTimeout(() => pollInbox(false), 1500);

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
  if (t.dataset.role) { currentRole = t.dataset.role; store("nashflow.role", currentRole); draftDecision = { choice: "", grade: "", rationale: "", exception: "" }; render(); toast("Working as " + currentRole); return; }
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
  if (t.dataset.delcase) {
    const x = cases.find((y) => y.id === t.dataset.delcase); if (!x) return;
    if (t.dataset.confirm !== "1") { t.dataset.confirm = "1"; t.textContent = "Click again"; return; }
    deleteCase(x); return;
  }
  if (t.dataset.act && t.dataset.act.startsWith("inbox-")) {
    const a = t.dataset.act;
    if (a === "inbox-save" || a === "inbox-test" || a === "inbox-check") {
      settings.inboxUrl = ($("#ibUrl").value || "").trim(); settings.inboxKey = ($("#ibKey").value || "").trim();
      settings.inboxAuto = $("#ibAuto").checked; settings.chaseAuto = $("#ibChase").checked; store("nashflow.settings", settings);
    }
    if (a === "inbox-save") { toast("Inbox settings saved"); render(); }
    else if (a === "inbox-test") { try { const r = await inboxCall("ping"); inboxState.error = ""; toast("Connected to " + (r.inbox || "the inbox")); inboxLog("Connected to " + (r.inbox || "the inbox")); } catch (err) { inboxState.error = err.message; toast(err.message); } store("nashflow.inbox.state", inboxState); render(); }
    else if (a === "inbox-check") { await pollInbox(true); render(); }
    else if (a === "inbox-copy") copyText(INBOX_SCRIPT, "Script copied");
    else if (a === "inbox-open") { const m = ignoredMsgs[t.dataset.id]; if (m) { delete ignoredMsgs[m.id]; inboxState.ignored = (inboxState.ignored || []).filter((x) => x.id !== m.id); store("nashflow.inbox.state", inboxState); await openEmailAsCase(m); } }
    return;
  }
  const c = cur(); if (!c) return;
  const act = t.dataset.act;
  if (act === "rerun") { runAgents(c); }
  else if (act === "redraft") { runAgents(c, true); }
  else if (act === "stop-run") { if (c.run && c.run.running) { c.run.cancel = "Stopped by " + actor() + "."; t.disabled = true; t.textContent = "Stopping after the current step"; audit(c, actor(), "Stopped the agents"); } }
  else if (act === "delete-case") {
    if (t.dataset.confirm !== "1") { t.dataset.confirm = "1"; t.textContent = "Click again to delete"; return; }
    deleteCase(c); return;
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
    if (after !== before) { c.memo[k] = { text: after, by: actor(), at: nowISO() }; audit(c, actor(), `Edited memo section "${MEMO_SECTIONS.find((x) => x[0] === k)[1]}". Before: "${before.slice(0, 160)}${before.length > 160 ? "..." : ""}" After: "${after.slice(0, 160)}${after.length > 160 ? "..." : ""}"`); }
    editingSection = null; save(); render();
  }
  else if (act === "copy-memo") {
    const txt = `CREDIT MEMO: ${c.title} (${c.ref})\n\n` + MEMO_SECTIONS.map(([k, n]) => `${n.toUpperCase()}\n${(c.memo[k] || {}).text || ""}`).join("\n\n");
    copyText(txt, "Memo copied");
  }
  else if (act === "copy-req") { c.brokerRequest = $("#brokerReq").value; save(); copyText(c.brokerRequest, "Email copied"); }
  else if (act === "log-req") { c.brokerRequest = $("#brokerReq").value; c.status = "More information requested"; audit(c, actor(), "Marked the request to the broker as sent"); save(); render(); toast("Marked as sent to the broker"); }
  else if (act === "chase-send" || act === "chase-remind") {
    if (act === "chase-remind" && c.chase && (c.chase.sinceReply || 0) >= 2) { c.chase.flagRM = true; audit(c, "Intake agent", "No reply from the broker after 2 emails. Flagged to the RM.", "agent"); inboxLog(`${c.ref}: no reply after 2 emails, flagged to the RM`); }
    else { try { await sendToBroker(c, act === "chase-remind" ? "Reminder" : "Request"); toast(act === "chase-remind" ? "Reminder sent" : "Sent to the broker"); } catch (err) { toast(err.message); } }
    save(); render();
  }
  else if (act === "comment") { commenting = t.dataset.key; render(); const el = $("#cmtEdit"); if (el) el.focus(); }
  else if (act === "cancel-cmt") { commenting = null; render(); }
  else if (act === "save-cmt") {
    const txt = ($("#cmtEdit").value || "").trim(); if (!txt) return;
    const k = t.dataset.key; c.comments = c.comments || {}; (c.comments[k] = c.comments[k] || []).push({ who: actor(), at: nowISO(), text: txt });
    audit(c, actor(), `Commented on "${MEMO_SECTIONS.find((x) => x[0] === k)[1]}": ${txt}`); commenting = null; save(); render();
  }
  else if (act === "submit-uw") {
    const note = ($("#rmNote") && $("#rmNote").value || "").trim();
    c.submitted = { by: actor(), at: nowISO(), note }; c.stage = "uw"; c.status = STAGES.uw; c.returned = null;
    (c.handoffs = c.handoffs || []).push({ at: nowISO(), who: actor(), what: "Submitted to the Underwriter", note });
    audit(c, actor(), "Submitted the case to the Underwriter" + (note ? `. Note: ${note}` : ""));
    save(); render(); toast("Submitted to the Underwriter");
    if (!c.conditions || !c.conditions.length) runConditions(c);
  }
  else if (act === "cond-run") { runConditions(c); }
  else if (act === "price-submit") {
    const g = gridPricing(c);
    const margin = parseFloat($("#prMargin").value), feePct = parseFloat($("#prFee").value), exitPct = parseFloat($("#prExit").value) || 0, reason = ($("#prReason").value || "").trim();
    if (!isFinite(margin) || !isFinite(feePct)) { $("#prMsg").textContent = "Enter a margin and an arrangement fee."; return; }
    if ((Math.abs(margin - g.margin) > 1e-9 || Math.abs(feePct - g.feePct) > 1e-9 || exitPct !== g.exitPct) && !reason) { $("#prMsg").textContent = "Give a reason for pricing away from the grid."; return; }
    c.pricing = { margin, feePct, exitPct, reason, grid: g.margin, status: "awaiting", proposedBy: actor(), at: nowISO(), signoffs: { "Relationship Manager": { at: nowISO() } } };
    c.terms = null;
    (c.handoffs = c.handoffs || []).push({ at: nowISO(), who: actor(), what: `Proposed pricing: margin ${pctTxt(margin)}, rate ${pctTxt(priceFigures(c, c.pricing).rate)}, fee ${pctTxt(feePct)}`, note: reason });
    audit(c, actor(), `Proposed pricing: margin ${pctTxt(margin)} (grid ${pctTxt(g.margin)}), arrangement fee ${pctTxt(feePct)}, exit fee ${pctTxt(exitPct)}${reason ? ". Reason: " + reason : ""}`);
    save(); render(); toast("Pricing sent for sign-off");
  }
  else if (act === "price-sign") {
    const p = c.pricing; if (!p || p.status !== "awaiting") return;
    p.signoffs[actor()] = { at: nowISO() };
    audit(c, actor(), `Approved the pricing (rate ${pctTxt(priceFigures(c, p).rate)}, fee ${pctTxt(p.feePct)})`);
    if (SIGNERS.every((r) => p.signoffs[r])) { p.status = "agreed"; (c.handoffs = c.handoffs || []).push({ at: nowISO(), who: "System", what: "Pricing agreed by all three", note: "" }); audit(c, "System", "Pricing agreed by the RM, Underwriter and Head of Lending"); toast("Pricing agreed"); }
    else toast("Pricing approved");
    save(); render();
  }
  else if (act === "price-back") {
    const why = ($("#prBack").value || "").trim(); if (!why) { $("#prMsg").textContent = "Add a comment saying why."; return; }
    const p = c.pricing; p.status = "draft"; p.signoffs = {}; p.sentBack = { by: actor(), at: nowISO(), reason: why };
    (c.handoffs = c.handoffs || []).push({ at: nowISO(), who: actor(), what: "Sent the pricing back to the RM", note: why });
    audit(c, actor(), "Sent the pricing back to the RM: " + why); save(); render();
  }
  else if (act === "terms-make") { c.terms = { text: termsText(c), at: nowISO(), by: actor() }; audit(c, actor(), "Generated the terms letter"); save(); render(); }
  else if (act === "terms-copy") { copyText(c.terms.text.replace(/\*\*/g, ""), "Terms letter copied"); }
  else if (act === "terms-word") {
    const blob = new Blob([wordDoc("Indicative terms " + c.ref, renderRich(c.terms.text))], { type: "application/msword" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `Indicative terms ${c.ref} ${String(c.title).replace(/[\\/:*?"<>|]/g, " ")}.doc`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  else if (act === "terms-print") {
    const w = window.open("", "_blank");
    if (!w) { toast("Allow pop-ups to print, or use Download as Word"); return; }
    w.document.write(wordDoc("Indicative terms " + c.ref, renderRich(c.terms.text))); w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }
  else if (act === "terms-email" || act === "terms-issue") {
    if (act === "terms-email") {
      try { await inboxCall("send", { threadId: c.source.threadId, body: c.terms.text.replace(/\*\*/g, "") }); } catch (err) { toast(err.message); return; }
    }
    c.terms.issued = { at: nowISO(), by: actor(), how: act === "terms-email" ? "email" : "marked" };
    c.stage = "terms"; c.status = STAGES.terms;
    (c.handoffs = c.handoffs || []).push({ at: nowISO(), who: actor(), what: act === "terms-email" ? "Emailed the terms letter to the broker" : "Issued the terms letter", note: "" });
    audit(c, actor(), act === "terms-email" ? "Emailed the terms letter to the broker" : "Marked the terms letter as issued");
    save(); render(); toast("Terms letter issued");
  }
  else if (act === "cond-accept" || act === "cond-reject") {
    const x = (c.conditions || []).find((y) => y.id === t.dataset.id); if (!x) return;
    x.status = act === "cond-accept" ? "accepted" : "rejected";
    audit(c, actor(), `${x.status === "accepted" ? "Accepted" : "Rejected"} condition (${x.from}): ${x.text}`); readDecisionForm(); save(); render();
  }
  else if (act === "cond-add") {
    const txt = ($("#condText").value || "").trim(); if (!txt) return;
    c.conditions = c.conditions || []; const x = { id: "K" + (c.conditions.length + 1) + "u", type: $("#condType").value, text: txt, from: "Added by Underwriter", reason: "", status: "accepted", by: actor() };
    c.conditions.push(x); audit(c, actor(), `Added condition (${x.type}): ${txt}`); readDecisionForm(); save(); render();
  }
  else if (act === "record") {
    readDecisionForm();
    const dd = draftDecision;
    if (!dd.choice) { $("#decMsg").textContent = "Choose a decision."; return; }
    if (!dd.rationale.trim()) { $("#decMsg").textContent = dd.choice === "Return to the RM" ? "Say what the RM needs to get." : "Add your rationale. It is required."; return; }
    if (dd.choice === "Approve" && !dd.grade) { $("#decMsg").textContent = "Choose a risk grade before approving."; return; }
    if (dd.choice === "Approve" && c.rec.exceptions.length && !dd.exception.trim()) { $("#decMsg").textContent = "Give your reason for approving outside policy."; return; }
    if (dd.choice === "Approve" && (c.conditions || []).some((x) => x.status === "suggested")) { $("#decMsg").textContent = "Accept or reject each suggested condition first."; return; }
    if (dd.choice === "Return to the RM") {
      c.stage = "returned"; c.status = STAGES.returned; c.returned = { at: nowISO(), by: actor(), reason: dd.rationale };
      (c.handoffs = c.handoffs || []).push({ at: nowISO(), who: actor(), what: "Returned to the RM for more information", note: dd.rationale });
      audit(c, actor(), `Returned the case to the RM. Needed: ${dd.rationale}`);
      draftDecision = { choice: "", grade: "", rationale: "", exception: "" }; save(); render(); toast("Returned to the RM"); return;
    }
    const kind = dd.choice === "Approve" ? (c.rec.kind === "approve" || c.rec.kind === "escalate") : c.rec.kind === "decline";
    c.decision = { choice: dd.choice, grade: dd.grade, rationale: dd.rationale, exception: dd.choice === "Approve" ? dd.exception : "", by: actor(), role: actor(), at: nowISO(), override: !kind };
    c.stage = dd.choice === "Approve" ? "approved" : "declined"; c.status = STAGES[c.stage];
    (c.handoffs = c.handoffs || []).push({ at: nowISO(), who: actor(), what: dd.choice === "Approve" ? "Approved" : "Declined", note: "" });
    audit(c, actor(), `Recorded decision: ${dd.choice}${dd.grade ? ", risk grade " + dd.grade : ""}${c.decision.override ? " (differs from suggestion " + c.rec.label + ")" : ""}. Rationale: ${dd.rationale}${c.decision.exception ? ". Exception reason: " + c.decision.exception : ""}`);
    draftDecision = { choice: "", grade: "", rationale: "", exception: "" };
    save(); render();
  }
  else if (act === "reopen") { audit(c, actor(), `Reopened the decision (${c.decision.choice})`); c.decision = null; c.stage = "uw"; c.status = STAGES.uw; save(); render(); }
});
document.addEventListener("change", (e) => {
  if (e.target.name === "decChoice") { readDecisionForm(); render(); }
});
function readDecisionForm() {
  const g = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
  if (!document.getElementById("decRationale")) return;
  const ch = document.querySelector('input[name="decChoice"]:checked'); draftDecision.choice = ch ? ch.value : "";
  draftDecision.grade = g("decGrade"); draftDecision.rationale = g("decRationale"); if (document.getElementById("decException")) draftDecision.exception = g("decException");
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
