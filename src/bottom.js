/* ------------------------------------------------------------------ rendering */
let view = cases.length ? "cases" : "new";
let selectedField = "annual_rent";
let srcDocSel = null;
let editingSection = null;
let draftDecision = { choice: "", grade: "", rationale: "", exception: "" };
let commenting = null;
const shortMoney = (n) => (n == null || !isFinite(n) ? "-" : n >= 1e6 ? "£" + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 2).replace(/\.?0+$/, "") + "m" : n >= 1e3 ? "£" + Math.round(n / 1e3) + "k" : "£" + Math.round(n));

function refChip(doc, page, quote, label, ctx) {
  const c = cur(); const d = c && c.docs.find((x) => x.id === doc);
  const name = label || (d ? `${d.type && d.type !== "Other" ? d.type : d.name.replace(/\.[a-z]+$/i, "")} p.${page || 1}` : `${doc} p.${page || 1}`);
  return `<button class="ref" type="button" data-src="${esc(doc)}" data-page="${esc(page || 1)}" data-quote="${esc(quote || "")}"${ctx ? ` data-ctx="${esc(ctx.slice(0, 400))}"` : ""} title="Open ${esc(d ? d.name : doc)}">${esc(name)}</button>`;
}
function renderRich(text) {
  const blocks = String(text || "").replace(/\r/g, "").split(/\n\s*\n/);
  const inline = (s) => { const ctx = s.replace(/\[(D\d+)[^\]]*\]/gi, " ").replace(/\*\*/g, ""); return esc(s).replace(/\[(D\d+)\s*,?\s*p(?:age)?\.?\s*(\d+)\]/gi, (_, d, p) => refChip(d, p, "", "", ctx)).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); };
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
  return `<div class="pagehead"><h1>${esc(title)}</h1><div class="crumb">Demo › ${esc(crumb || title)}</div></div>${intro ? `<p class="intro">${intro}</p>` : ""}`;
}
const protoNote = `<div class="proto"><b>Prototype.</b> Use made-up or anonymised deal packs only. Documents are sent to the AI provider shown in the sidebar.</div>`;
function missingCount(c) { return c.fields ? FIELDS.filter((f) => { const x = c.fields[f.key]; const need = f.mandatory || (f.mandatoryIf === "purchase" && x.state !== "Not applicable"); return need && !x.edited && x.state !== "Found" && x.state !== "Not applicable"; }).length : 0; }

const ROLE_INFO = {
  "Relationship Manager": "Checks the agents' work, prepares the case, proposes pricing and issues terms.",
  Underwriter: "Reviews each submitted case, sets conditions and decides credit.",
  Commercial: "Approves pricing. Cannot decide credit.",
};
const ROLE_VIEWS = { "Relationship Manager": ["new", "cases", "case", "inbox", "policy", "agents"], Underwriter: ["cases", "case", "policy", "agents"], Commercial: ["cases", "case", "grid", "policy"] };
function renderNav() {
  const c = cur();
  const item = (id, label, badge, disabled) => `<button class="nav" type="button" data-view="${id}" ${view === id ? 'aria-current="page"' : ""} ${disabled ? "disabled" : ""}><span>${label}</span>${badge != null ? `<span class="badge">${badge}</span>` : ""}</button>`;
  $("#roleBox").innerHTML = `<div class="k">Working as</div><div class="roleseg">${ROLES.map((r) => `<button type="button" data-role="${esc(r)}" aria-pressed="${currentRole === r}">${esc(r)}</button>`).join("")}</div><small>${ROLE_INFO[currentRole]}</small>`;
  const mine = cases.filter((x) => myTurn(x)).length;
  if (currentRole === "Underwriter") {
    $("#navCases").innerHTML = `<div class="navlabel">Underwriting</div>${item("cases", "Review queue", mine || null)}${item("case", "Case management", null, !c)}`;
    $("#navAdmin").innerHTML = `<div class="navlabel">Reference</div>${item("policy", "Credit policies")}${item("agents", "AI governance")}`;
  } else if (currentRole === "Commercial") {
    $("#navCases").innerHTML = `<div class="navlabel">Pricing</div>${item("cases", "Pricing queue", mine || null)}${item("case", "Case management", null, !c)}`;
    $("#navAdmin").innerHTML = `<div class="navlabel">Reference</div>${item("grid", "Pricing grid")}${item("policy", "Credit policies")}`;
  } else {
    $("#navCases").innerHTML = `<div class="navlabel">Cases</div>${item("cases", "My cases", mine || cases.length)}${item("new", "New case")}${item("case", "Case management", null, !c)}`;
    $("#navAdmin").innerHTML = `<div class="navlabel">Administration</div>${item("inbox", "Deals inbox")}${item("policy", "Credit policies")}${item("agents", "AI governance")}`;
  }
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
  const vv = verdict(c);
  const rec = vv ? `<span class="chip ${recChipClass(vv.kind)}">${esc(vv.label)}</span>` : c.run && c.run.error ? `<span class="chip c-red">Run stopped</span>` : `<span class="chip c-grey">Pending</span>`;
  return `<tr><td class="num">${dateOf(c.createdAt)} ${timeOf(c.createdAt)}<span class="sub">uploaded</span></td>
    <td><b>${esc(c.title)}</b>${c.source && c.source.kind === "email" ? ` <span class="chip c-blue">By email</span>` : ""}${c.chase && c.chase.flagRM ? ` <span class="chip c-red">Broker not replying</span>` : ""}<span class="sub">${esc(c.ref)}${c.fields && usable(c, "broker") ? " · " + esc(usable(c, "broker")) : ""}</span></td>
    <td class="fv">${shortMoney(L)}</td><td>${complete}</td><td>${consistent}</td><td>${esc(STAGES[stageOf(c)])}${myTurn(c) ? ` <span class="chip c-red">Your action</span>` : c.memo && waitingOn(c) ? `<span class="sub">Waiting on ${esc(waitingOn(c))}</span>` : ""}</td><td>${rec}</td>
    <td><div class="row" style="flex-wrap:nowrap"><button class="btn primary small" type="button" data-case="${c.id}">Open case</button><button class="btn small" type="button" data-delcase="${c.id}" title="Delete this case">Delete</button></div></td></tr>`;
}
function ago(iso) {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  return m < 1 ? "just now" : m < 60 ? m + " min" : m < 1440 ? Math.round(m / 60) + " h" : Math.round(m / 1440) + " day" + (Math.round(m / 1440) > 1 ? "s" : "");
}
function todoList() {
  const mine = cases.filter((c) => myTurn(c) || (c.run && c.run.error));
  if (!mine.length) return `<div class="nextbar done"><div><span class="k">Your next step</span><p>Nothing waiting on you. Upload a deal pack or wait for the next broker email.</p></div></div>`;
  return `<div class="sectionhead"><h2>Waiting on you (${mine.length})</h2></div><div class="qcards" style="margin-bottom:16px">${mine.map((c) => { const n = nextStep(c); return `<div class="qcard mine"><div class="top"><h3>${esc(c.title)}</h3><span class="chip c-grey">${esc(c.ref)}</span><span class="chip c-amber">${esc(c.memo ? STAGES[stageOf(c)] : c.status)}</span></div><p class="why">${esc(n.text)}</p><div><button class="btn primary small" type="button" data-case="${c.id}"${n.tab ? ` data-opentab="${n.tab}"` : ""}>${esc(n.label || "Open case")}</button></div></div>`; }).join("")}</div>`;
}
function flagCount(c) { return reviewFlags(c).length; }
function renderQueueUW() {
  const sub = cases.filter((c) => c.memo && (c.submitted || c.decision));
  const waiting = sub.filter((c) => stageOf(c) === "uw").sort((a, b) => new Date(a.submitted.at) - new Date(b.submitted.at));
  const decided = sub.filter((c) => c.decision).sort((a, b) => new Date(b.decision.at) - new Date(a.decision.at));
  const withRM = cases.filter((c) => !c.decision && stageOf(c) !== "uw").length;
  const exc = waiting.filter((c) => c.rec.exceptions.length).length;
  const card = (c) => { const ltv = c.checks.find((k) => k.id === "ltv"), icr = c.checks.find((k) => k.id === "icr"); const fl = flagCount(c); const R = c.review;
    return `<div class="qcard mine"><div class="top"><h3>${esc(c.title)}</h3><span class="chip c-grey">${esc(c.ref)}</span><span class="chip ${recChipClass(c.rec.kind)}">Recommended: ${esc(c.rec.label)}</span>${c.rec.exceptions.length && c.rec.kind !== "escalate" ? `<span class="chip c-blue">Policy exception</span>` : ""}</div>
      <div class="meta"><span>Loan <b>${shortMoney(num(c, "loan_amount"))}</b></span><span>LTV <b>${ltv ? esc(ltv.value) : "-"}</b></span><span>ICR <b>${icr ? esc(icr.value) : "-"}</b></span><span>Flags <b>${fl}</b></span><span>Submitted by <b>${esc(c.submitted.by)}</b>, waiting <b>${ago(c.submitted.at)}</b></span></div>
      ${c.submitted.note ? `<p class="why">"${esc(c.submitted.note.slice(0, 200))}${c.submitted.note.length > 200 ? "..." : ""}"</p>` : ""}
      <div class="row"><button class="btn primary small" type="button" data-case="${c.id}" data-opentab="review">${R && R.max ? "Continue the review" : "Start the review"}</button>${R && R.max ? `<span class="note">Step ${R.step + 1} of ${RV_STEPS.length}</span>` : `<span class="note">${fl ? fl + " flag" + (fl === 1 ? "" : "s") + " to answer" : "Nothing flagged"}</span>`}</div></div>`; };
  return pageHead("Review queue", "Review queue", "Cases the Relationship Managers have submitted to you, oldest first. Each one opens as a guided review: NashFlow takes you through the flags, the numbers and the conditions, then asks for your decision.") +
    `<div class="stats">
      <div class="stat"><b>${waiting.length}</b><span>Waiting for your decision</span><small>${waiting.length ? "Oldest " + ago(waiting[0].submitted.at) : "Queue clear"}</small></div>
      <div class="stat"><b>${exc}</b><span>Policy exceptions</span><small>Need a recorded reason</small></div>
      <div class="stat"><b>${decided.length}</b><span>Decided</span><small>${decided.filter((c) => c.decision.choice === "Approve").length} approved</small></div>
      <div class="stat"><b>${withRM}</b><span>Being prepared</span><small>With the RMs, not yet submitted</small></div>
    </div>` +
    (waiting.length ? `<div class="sectionhead"><h2>Waiting for you</h2></div><div class="qcards">${waiting.map(card).join("")}</div>` : `<div class="nextbar done"><div><span class="k">Your next step</span><p>Nothing waiting for you. Cases appear here when a Relationship Manager submits them.</p></div></div>`) +
    (decided.length ? `<div class="sectionhead"><h2>Decided</h2></div><div class="tablewrap"><table class="t"><thead><tr><th>Decided</th><th>Borrower</th><th>Loan</th><th>Decision</th><th>Risk grade</th><th>Now</th><th></th></tr></thead><tbody>${decided.map((c) => `<tr><td class="num">${dateOf(c.decision.at)} ${timeOf(c.decision.at)}</td><td><b>${esc(c.title)}</b><span class="sub">${esc(c.ref)}</span></td><td class="fv">${shortMoney(num(c, "loan_amount"))}</td><td><span class="chip ${c.decision.choice === "Approve" ? "c-green" : "c-red"}">${esc(c.decision.choice)}</span>${c.decision.exception ? ` <span class="chip c-blue">Exception</span>` : ""}</td><td class="num">${esc(c.decision.grade || "-")}</td><td>${esc(STAGES[stageOf(c)])}</td><td><button class="btn small" type="button" data-case="${c.id}">Open</button></td></tr>`).join("")}</tbody></table></div>` : "");
}
function renderQueueCom() {
  const appr = cases.filter((c) => c.decision && c.decision.choice === "Approve");
  const awaiting = appr.filter((c) => c.pricing && c.pricing.status === "awaiting");
  const coming = appr.filter((c) => !c.pricing || c.pricing.status === "draft").length;
  const done = appr.filter((c) => c.pricing && c.pricing.status === "agreed");
  const below = awaiting.filter((c) => c.pricing.margin < gridPricing(c).margin - 1e-9).length;
  const row = (c) => { const p = c.pricing; const g = gridPricing(c); const f = priceFigures(c, p); const d = p.margin - g.margin;
    return `<tr><td><b>${esc(c.title)}</b><span class="sub">${esc(c.ref)} · grade ${esc(c.decision.grade || "-")}</span></td><td class="fv">${shortMoney(num(c, "loan_amount"))}</td><td class="num">${pctTxt(g.margin)}</td><td class="num">${pctTxt(p.margin)}${Math.abs(d) > 1e-9 ? ` <span class="chip ${d < 0 ? "c-amber" : "c-green"}">${d > 0 ? "+" : ""}${pctTxt(d)}</span>` : ""}</td><td class="num">${pctTxt(f.rate)}</td><td class="num">${pctTxt(p.feePct)}</td><td class="num">${f.icr == null ? "-" : f.icr.toFixed(2) + "x"}${f.icr != null && !f.icrOk ? ` <span class="chip c-red">Below policy</span>` : ""}</td><td>${p.status === "awaiting" ? `<span class="chip c-red">Your approval</span>` : `<span class="chip c-green">Approved</span>`}</td><td><button class="btn ${p.status === "awaiting" ? "primary " : ""}small" type="button" data-case="${c.id}" data-opentab="pricing">${p.status === "awaiting" ? "Review pricing" : "Open"}</button></td></tr>`; };
  const head = `<thead><tr><th>Case</th><th>Loan</th><th>Grid margin</th><th>Proposed margin</th><th>Rate</th><th>Fee</th><th>ICR at rate</th><th>Status</th><th></th></tr></thead>`;
  return pageHead("Pricing queue", "Pricing queue", "Cases the Underwriter has approved, with pricing proposed by the RM. You alone approve pricing: check it against the lender's grid, then approve it or send it back.") +
    `<div class="stats">
      <div class="stat"><b>${awaiting.length}</b><span>Waiting for your approval</span><small>${awaiting.length ? "Oldest " + ago(awaiting.map((c) => c.pricing.at).sort()[0]) : "Queue clear"}</small></div>
      <div class="stat"><b>${below}</b><span>Priced below the grid</span><small>The RM has given a reason</small></div>
      <div class="stat"><b>${done.length}</b><span>Approved by you</span><small>${done.filter((c) => c.terms && c.terms.issued).length} with terms issued</small></div>
      <div class="stat"><b>${coming}</b><span>Coming to you</span><small>Approved, RM still pricing</small></div>
    </div>` +
    (awaiting.length ? `<div class="sectionhead"><h2>Waiting for your approval</h2></div><div class="tablewrap"><table class="t">${head}<tbody>${awaiting.map(row).join("")}</tbody></table></div>` : `<div class="nextbar done"><div><span class="k">Your next step</span><p>No pricing waiting for you. Cases appear here once the Underwriter approves and the RM proposes pricing.</p></div></div>`) +
    (done.length ? `<div class="sectionhead"><h2>Approved by you</h2></div><div class="tablewrap"><table class="t">${head}<tbody>${done.map(row).join("")}</tbody></table></div>` : "");
}
function renderGridPage() {
  const P = POLICY.pricing;
  const rows = (list, f) => list.map(f).join("");
  return pageHead("Pricing grid", "Pricing grid", "The lender's pricing grid, credit policy section 7.3. NashFlow works out the grid price for every approved case from these figures, so you can see at a glance where the RM has priced away from it. Illustrative figures, not taken from a lender.") +
    `<div class="grid2 even"><div class="stack">
      <div class="card"><h2>Margin by LTV</h2><div class="tablewrap bare"><table class="t"><thead><tr><th>LTV up to</th><th class="num">Margin over ${pctTxt(P.referenceRate)} reference rate</th></tr></thead><tbody>${rows(P.bands, (b) => `<tr><td>${b[0]}%</td><td class="num">${pctTxt(b[1])}</td></tr>`)}</tbody></table></div><p class="hint">Floor margin ${pctTxt(P.floorMargin)}.</p></div>
      <div class="card"><h2>Risk grade adjustment</h2><div class="tablewrap bare"><table class="t"><thead><tr><th>Grade up to</th><th class="num">Adjustment</th></tr></thead><tbody>${rows(P.grade, (g) => `<tr><td>${g[0]}</td><td class="num">${g[1] > 0 ? "+" : ""}${pctTxt(g[1])}</td></tr>`)}</tbody></table></div></div>
    </div><div class="stack">
      <div class="card"><h2>Other adjustments</h2><div class="tablewrap bare"><table class="t"><tbody>
        <tr><td>WAULT under 3 years</td><td class="num">+${pctTxt(P.adj.shortWAULT)}</td></tr><tr><td>One tenant pays over half the rent</td><td class="num">+${pctTxt(P.adj.concentration)}</td></tr><tr><td>EPC below C</td><td class="num">+${pctTxt(P.adj.epcBelowC)}</td></tr><tr><td>Approved policy exception</td><td class="num">+${pctTxt(P.adj.exception)}</td></tr></tbody></table></div></div>
      <div class="card"><h2>Fees</h2><div class="tablewrap bare"><table class="t"><tbody><tr><td>Arrangement fee under ${shortMoney(P.feeThreshold)}</td><td class="num">${pctTxt(P.feeSmall)}</td></tr><tr><td>Arrangement fee from ${shortMoney(P.feeThreshold)}</td><td class="num">${pctTxt(P.feeLarge)}</td></tr><tr><td>Minimum fee</td><td class="num">${money(P.feeMin)}</td></tr><tr><td>Terms valid for</td><td class="num">${P.validityDays} days</td></tr></tbody></table></div></div>
    </div></div>`;
}
function renderCases() { return currentRole === "Underwriter" ? renderQueueUW() : currentRole === "Commercial" ? renderQueueCom() : renderCasesRM(); }
function renderCasesRM() {
  const done = cases.filter((c) => c.rec && c.memo);
  const cc = done.filter((c) => c.rec.complete && c.rec.consistent).length;
  const more = done.filter((c) => c.rec.kind === "more").length;
  const exc = done.filter((c) => c.rec.kind === "escalate" || c.rec.kind === "decline").length;
  const mine = done.filter((c) => myTurn(c)).length;
  return pageHead("My cases", "My cases", "Every deal pack the agents have read, with what they found. You check the agents' work, prepare the case and submit it to the Underwriter.") + todoList() +
    `<div class="stats">
      <div class="stat"><b>${mine}</b><span>Waiting on you</span><small>As ${esc(currentRole)}</small></div>
      <div class="stat"><b>${cc}</b><span>Complete and consistent</span><small>Of ${cases.length} in this browser</small></div>
      <div class="stat"><b>${more}</b><span>Need more information</span><small>Request drafted for the broker</small></div>
      <div class="stat"><b>${exc}</b><span>Exceptions or declines</span><small>Outside policy or appetite</small></div>
    </div>` +
    (cases.length ? `<div class="tablewrap"><table class="t"><thead><tr><th>Received</th><th>Borrower and broker</th><th>Loan</th><th>Complete</th><th>Consistent</th><th>Status</th><th>Outcome</th><th></th></tr></thead><tbody>${cases.map(caseRow).join("")}</tbody></table></div>`
      : `<div class="card"><h2>No cases yet</h2><p class="hint">Upload a deal pack or run one of the sample packs.</p><div><button class="btn primary" type="button" data-view="new">New case</button></div></div>`);
}

/* Only the fields that drive the credit decision need an RM to confirm them. */
const KEY_FIELDS = new Set(["purpose", "loan_amount", "loan_term_years", "owned_by_borrower", "purchase_price", "borrower_name", "property_address", "property_value", "annual_rent"]);
function isKey(c, key) { return KEY_FIELDS.has(key) && !(key === "purchase_price" && c.fields && c.fields[key].state === "Not applicable"); }
function needsCheck(c, key) { const x = c.fields[key]; return isKey(c, key) && !x.edited && (x.state === "Not confident" || x.state === "Not present"); }
function toCheckCount(c) { return c.fields ? FIELDS.filter((f) => needsCheck(c, f.key)).length : 0; }
/* What the current role should do next on a case. Shown as a banner on the case and as the to-do list on the RM's home page. */
function nextStep(c) {
  const st = stageOf(c), r = currentRole, p = c.pricing;
  if (!c.memo) return c.run && c.run.error ? { text: "The agents stopped before the case was ready. Run them again to carry on.", tab: "agents", label: "See what happened", mine: r === "Relationship Manager" } : { text: "The agents are reading the deal pack. The case is ready in a minute or two." };
  if (r === "Relationship Manager") {
    if (st === "returned") return { text: "The Underwriter returned this case" + (c.returned ? ": " + c.returned.reason : ".") + " Get what they need, then send it to credit again.", tab: "memo", label: "Send to credit again", mine: true };
    if (st === "rm") { const n = toCheckCount(c); const m = c.consistency.length; return n || m ? { text: `Check ${[n ? n + " key field" + (n > 1 ? "s" : "") : "", m ? m + " mismatch" + (m > 1 ? "es" : "") + " between documents" : ""].filter(Boolean).join(" and ")}, then send it to credit.`, tab: "source", label: "Check the fields", mine: true } : { text: "The agents' work is complete and consistent. Review the credit memo, add your note and send it to credit.", tab: "memo", label: "Go to the credit memo", mine: true }; }
    if (st === "uw") return { text: "With the Underwriter. Nothing for you to do unless they return it." };
    if (st === "approved") {
      if (!p || p.status === "draft") return { text: p && p.sentBack ? "Commercial sent the pricing back: " + p.sentBack.reason : "Approved by the Underwriter. Propose pricing for Commercial to approve.", tab: "pricing", label: "Propose pricing", mine: true };
      if (p.status === "awaiting") return { text: "Pricing is with Commercial for approval." };
      return { text: c.terms ? "Pricing approved. Issue the terms letter to the broker." : "Pricing approved by Commercial. Generate the terms letter.", tab: "pricing", label: c.terms ? "Issue the terms letter" : "Generate the terms letter", mine: true };
    }
    if (st === "terms") return { text: "Terms issued to the broker.", done: true };
    return { text: "Declined by the Underwriter.", done: true };
  }
  if (r === "Underwriter") {
    if (st === "uw") return { text: "This case is waiting for your decision. The guided review takes you through it one question at a time.", tab: "review", label: c.review && c.review.max ? "Continue the review" : "Start the review", mine: true };
    if (st === "rm" || st === "returned") return { text: st === "returned" ? "You returned this case to the RM. It comes back to you when they resubmit it." : "Still with the Relationship Manager. It comes to you when they submit it." };
    if (st === "declined") return { text: "You declined this case.", done: true };
    return { text: "You approved this case. The RM prices it and Commercial approves the pricing.", done: true };
  }
  if (st === "approved" && p && p.status === "awaiting") return { text: "The RM has proposed pricing. It needs your approval.", tab: "pricing", label: "Review the pricing", mine: true };
  if (st === "approved" && p && p.status === "agreed") return { text: "You approved the pricing. The RM issues the terms letter.", done: true };
  if (st === "approved") return { text: "Approved by the Underwriter. Waiting for the RM to propose pricing." };
  if (st === "terms") return { text: "Terms issued to the broker.", done: true };
  if (st === "declined") return { text: "Declined by the Underwriter. No pricing needed.", done: true };
  return { text: "Not at pricing yet. It comes to you once the Underwriter approves it and the RM proposes pricing." };
}
function nextBar(c) {
  const n = nextStep(c);
  return `<div class="nextbar ${n.mine ? "mine" : n.done ? "done" : ""}"><div><span class="k">${n.mine ? "Your next step" : n.done ? "Done" : "Where this case is"}</span><p>${esc(n.text)}</p></div>${n.mine && n.tab && n.tab !== currentTab ? `<button class="btn primary" type="button" data-tab="${n.tab}">${esc(n.label)}</button>` : ""}</div>`;
}
function tabsFor(c) {
  const toCheck = toCheckCount(c);
  const flags = c.checks.concat(c.judgements).filter((k) => k.flag === "red" || k.flag === "amber").length + c.consistency.length;
  const T = {
    review: ["review", "Guided review", stageOf(c) === "uw" ? `<span class="chip c-red">Your decision</span>` : ""],
    memo: ["memo", "Credit memo", currentRole === "Relationship Manager" && ["rm", "returned"].includes(stageOf(c)) && c.memo ? `<span class="chip c-red">Send to credit</span>` : ""],
    source: ["source", "Source check", toCheck && currentRole === "Relationship Manager" ? `<span class="chip c-amber">${toCheck} to check</span>` : ""],
    fin: ["fin", "Financials", c.financials && c.financials.flags.length ? `<span class="chip c-amber">${c.financials.flags.length} flag${c.financials.flags.length > 1 ? "s" : ""}</span>` : ""],
    policy: ["policy", "Policy checks", flags ? `<span class="chip c-amber">${flags} flag${flags > 1 ? "s" : ""}</span>` : ""],
    decision: ["decision", currentRole === "Relationship Manager" && !c.decision ? "Submit" : currentRole === "Underwriter" ? "Decision form" : "Decision"],
    pricing: ["pricing", currentRole === "Commercial" ? "Pricing approval" : "Pricing and terms", c.pricing && c.pricing.status === "awaiting" ? `<span class="chip ${currentRole === "Commercial" ? "c-red" : "c-amber"}">${currentRole === "Commercial" ? "Your approval" : "With Commercial"}</span>` : c.terms && c.terms.issued ? `<span class="chip c-green">Issued</span>` : ""],
    docs: ["docs", "Documents", `<span class="chip c-grey">${c.docs.length}</span>`],
    comms: ["comms", "Communication", c.chase && c.chase.flagRM ? `<span class="chip c-red">Not replying</span>` : c.chase && c.chase.awaiting ? `<span class="chip c-amber">Waiting on broker</span>` : ""],
    agents: ["agents", "Agents at work", c.run && c.run.running ? `<span class="chip c-amber">Working</span>` : c.run && c.run.error ? `<span class="chip c-red">Stopped</span>` : ""],
    audit: ["audit", "Audit"],
  };
  const approved = c.decision && c.decision.choice === "Approve";
  const ids = currentRole === "Underwriter" ? ["review", "decision", "memo", "source", "fin", "policy", "docs", "comms", "agents"].concat(approved ? ["pricing"] : [], ["audit"])
    : currentRole === "Commercial" ? ["pricing", "memo", "fin", "policy", "docs", "comms", "audit"]
    : ["memo", "source", "fin", "policy", "docs", "comms", "agents", "pricing", "audit"];
  return ids.map((id) => T[id]);
}
function defaultTab(c) {
  if (currentRole === "Underwriter") return stageOf(c) === "uw" || c.decision ? "review" : "memo";
  if (currentRole === "Commercial") return "pricing";
  return "memo";
}
/* What to show for the outcome: the agents' recommendation until the Underwriter decides, then the decision. */
function verdict(c) {
  if (!c.rec || !c.memo) return null;
  const d = c.decision;
  if (d) return { decided: true, label: d.choice === "Approve" ? "Approved" : "Declined", kind: d.choice === "Approve" ? "approve" : "decline", sub: "by the Underwriter" + (d.grade ? ", risk grade " + d.grade : ""), differs: !!d.override };
  if (stageOf(c) === "returned") return { decided: false, label: "Returned to RM", kind: "more", sub: "by the Underwriter, for more information" };
  return { decided: false, label: c.rec.label, kind: c.rec.kind, sub: "from the policy checks" };
}
function recBar(c, max) {
  const v = verdict(c); const d = c.decision;
  if (d) return `<div class="recbar"><div class="line"><span>Decision</span><span class="chip ${recChipClass(v.kind)}">${esc(v.label)}</span><span class="note">${esc(v.sub)}, ${dateOf(d.at)}</span></div>${d.rationale ? `<p>${esc(d.rationale.length > 260 ? d.rationale.slice(0, 260) + "..." : d.rationale)}</p>` : ""}${v.differs ? `<p class="note">The agents recommended ${esc(c.rec.label)}. The Underwriter decided differently and gave the reason above.</p>` : ""}</div>`;
  const r = c.rec; const extra = r.reasons.length - max;
  return `<div class="recbar"><div class="line"><span>Recommendation</span><span class="chip ${recChipClass(v.kind)}">${esc(v.label)}</span>${v.kind === "more" && stageOf(c) === "returned" ? "" : ""}</div>
    ${r.reasons.length ? `<div class="label">Why</div><ol>${r.reasons.slice(0, max).map((x) => `<li>${esc(x.text)}</li>`).join("")}</ol>${extra > 0 ? `<div><button class="btn small" type="button" data-tab="policy">See ${extra} more in Policy checks</button></div>` : ""}` : `<p class="note">Within policy on every check, with nothing flagged.</p>`}</div>`;
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
  const sub = [broker ? "From " + broker : "Uploaded", "received " + dateOf(c.createdAt) + " " + timeOf(c.createdAt)].concat(ready ? [] : ["agents reading"]).join(" · ");
  const rb = ready ? String(usable(c, "repayment_basis") || "").toLowerCase() : "";
  const recTone = c.rec && c.memo ? { approve: "green", decline: "red", more: "amber", escalate: "blue" }[c.rec.kind] : "";
  const tabs = tabsFor(c);
  if (!tabs.some((x) => x[0] === currentTab)) currentTab = defaultTab(c);
  let body;
  if (!ready && !["audit", "agents", "docs", "comms"].includes(currentTab)) body = renderWorking(c);
  else body = { review: renderReview, memo: renderMemoTab, source: renderSource, fin: renderFinancials, policy: renderPolicyTab, docs: renderDocsTab, comms: renderComms, agents: renderAgentsTab, decision: renderDecision, pricing: renderPricing, audit: renderAudit }[currentTab](c);
  return pageHead("Case management", "Case management") + `
  <div class="casecard">
    <div class="titleline"><span class="cref">${esc(c.ref)}</span><h2>${esc(c.title)}</h2><span class="chip c-grey">Commercial property investment loan</span><span class="chip c-amber">${esc(c.memo ? STAGES[stageOf(c)] : c.status)}</span>${myTurn(c) ? `<span class="chip c-red">Your action</span>` : ""}${c.source && c.source.kind === "email" ? `<span class="chip c-blue">By email</span>` : ""}${c.chase && c.chase.flagRM ? `<span class="chip c-red">Broker not replying</span>` : ""}</div>
    <div class="subline">${esc(sub)}</div>
    <div class="tiles">${caseTiles(c, { L, T, V, ltv, icr, rb, recTone, toCheck: ready ? toCheckCount(c) : 0, ready })}
    </div>
  </div>
  ${nextBar(c)}
  <div class="tabs" role="tablist">${tabs.map(([id, name, extra]) => `<button class="tab" role="tab" type="button" aria-selected="${currentTab === id}" data-tab="${id}">${name}${extra || ""}</button>`).join("")}</div>
  ${body}`;
}
function caseTiles(c, o) {
  const { L, T, V, ltv, icr, rb, recTone, toCheck, ready } = o;
  const rag = (...ks) => { ks = ks.filter(Boolean); if (!ready || !ks.length) return ""; if (ks.some((k) => k.outcome === "Fail")) return "red"; if (ks.some((k) => k.outcome === "Unclear" || k.flag === "amber")) return "amber"; return "green"; };
  const chk = (id) => c.checks.find((k) => k.id === id);
  const fac = tile("Facility", shortMoney(L), T != null ? `${T} years${rb ? ", " + esc(rb) : ""}` : "", rag(chk("size"), chk("term")));
  const ltvT = tile("LTV", ltv ? esc(ltv.value) : "-", V != null ? `on ${shortMoney(V)} ${/estimate/i.test(String(usable(c, "value_basis") || "")) ? "estimate" : "valuation"}` : "", rag(ltv));
  const icrT = tile("Interest cover", icr ? esc(icr.value) : "-", `policy minimum ${POLICY.minICR}x`, rag(icr));
  const vd = verdict(c);
  const recT = vd ? tile(vd.decided ? "Decision" : "Recommendation", esc(vd.label), esc(vd.sub), { approve: "green", decline: "red", more: "amber", escalate: "amber" }[vd.kind]) : tile("Recommendation", "-", "");
  const gradeT = tile("Risk grade", c.decision && c.decision.grade ? c.decision.grade + " of 10" : "Not set", "set by the Underwriter");
  if (currentRole === "Underwriter") {
    const fl = ready && c.memo ? reviewFlags(c).length : 0;
    return fac + ltvT + icrT + recT + (c.decision ? tile("Flags", String(fl), "answered in the review") : tile("Flags to answer", ready && c.memo ? String(fl) : "-", fl ? "in the guided review" : "nothing flagged", fl ? "amber" : "")) + tile("Waiting", c.submitted && stageOf(c) === "uw" ? ago(c.submitted.at) : c.decision ? "Decided" : "-", c.submitted ? "submitted by " + esc(c.submitted.by) : "not submitted yet");
  }
  if (currentRole === "Commercial" && c.decision && c.decision.choice === "Approve") {
    const g = gridPricing(c); const p = c.pricing; const f = p ? priceFigures(c, p) : null;
    return fac + ltvT + gradeT + tile("Grid margin", pctTxt(g.margin), "policy section 7.3") + tile("Proposed rate", p ? pctTxt(f.rate) : "-", p ? "margin " + pctTxt(p.margin) : "RM still pricing", p && p.margin < g.margin - 1e-9 ? "amber" : "") + tile("ICR at that rate", f && f.icr != null ? f.icr.toFixed(2) + "x" : "-", `policy minimum ${POLICY.minICR}x`, f && f.icr != null && !f.icrOk ? "red" : "");
  }
  return fac + ltvT + icrT + recT + gradeT + tile("Fields found", ready ? `${FIELDS.filter((f) => c.fields[f.key].state === "Found").length} of ${FIELDS.length}` : "-", ready ? [toCheck ? `${toCheck} key field${toCheck > 1 ? "s" : ""} to confirm` : "key fields confirmed"].concat(c.consistency.length ? [`${c.consistency.length} mismatch${c.consistency.length > 1 ? "es" : ""}`] : []).join(", ") : "", ready ? (toCheck || c.consistency.length ? "amber" : "green") : "");
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
  const recbar = recBar(c, 3);
  const stale = c.memoStale ? `<div class="stale"><span>Figures changed after the memo was drafted. The policy assessment and recommendation are updated; the written sections are not.</span><button class="btn small" type="button" data-act="redraft">Redraft agent sections</button></div>` : "";
  const memo = `<div class="card memocard"><div class="cardhead"><h2>Credit memo</h2><div class="row"><span class="chip c-amber">Draft</span><button class="btn small" type="button" data-act="copy-memo">Copy memo</button></div></div>
    <div class="legend"><span><i style="background:var(--muted)"></i>Drafted by the memo agent until a person edits a section. Every edit is audited.</span><span><i style="background:var(--accent)"></i>Red tags open the source document and page.</span></div>
    ${MEMO_SECTIONS.map(([k, name]) => {
      let s = c.memo[k] || { text: "", by: "Memo agent" };
      if (k === "recommendation" && c.decision && s.by === "System") s = { by: "System", text: `Decision: ${c.decision.choice === "Approve" ? "approved" : "declined"} by the Underwriter, ${dateOf(c.decision.at)}${c.decision.grade ? ", risk grade " + c.decision.grade : ""}.\n\n${c.decision.rationale || ""}${c.decision.exception ? "\n\nReason for the policy exception: " + c.decision.exception : ""}\n\nThe agents recommended: ${c.rec.label}.` };
      const by = s.by === "System" ? "From the calculated checks" : s.by === "Memo agent" ? "Memo agent" : `Edited by ${s.by === "You" ? "you" : s.by} at ${timeOf(s.at)}`;
      const cm = ((c.comments || {})[k] || []);
      const cmHtml = (cm.length ? `<div class="comments">${cm.map((x) => `<div class="cmt"><b>${esc(x.who)}</b><span class="note"> ${dateOf(x.at)} ${timeOf(x.at)}</span><p>${esc(x.text)}</p></div>`).join("")}</div>` : "") + (commenting === k ? `<div class="cmt-ed"><textarea class="ed" id="cmtEdit" aria-label="Comment on ${esc(name)}" placeholder="Your comment as ${esc(currentRole)}"></textarea><div class="row"><button class="btn primary small" type="button" data-act="save-cmt" data-key="${k}">Add comment</button><button class="btn small" type="button" data-act="cancel-cmt">Cancel</button></div></div>` : "");
      const body = editingSection === k ? `<textarea class="ed" id="memoEdit" aria-label="${esc(name)}">${esc(s.text)}</textarea><div class="row"><button class="btn primary small" type="button" data-act="save-sec" data-key="${k}">Save</button><button class="btn small" type="button" data-act="cancel-sec">Cancel</button></div>` : `<div class="memo-body">${renderRich(s.text) || '<p class="note">Empty</p>'}</div>`;
      return `<section class="memo-sec"><header><h3>${esc(name)}</h3><span class="by">${by}</span><span class="grow"></span>${editingSection === k ? "" : `${cm.length ? `<span class="chip c-blue">${cm.length} comment${cm.length > 1 ? "s" : ""}</span>` : ""}<button class="btn small" type="button" data-act="comment" data-key="${k}">Comment</button><button class="btn small" type="button" data-act="edit-sec" data-key="${k}">Edit</button>`}</header>${body}${cmHtml}</section>`;
    }).join("")}</div>`;
  return `<div class="stack">${recbar}${stale}${memo}${currentRole === "Relationship Manager" ? sendToCredit(c) : ""}</div>`;
}
function sendToCredit(c) {
  const st = stageOf(c);
  if (st === "uw") return `<div class="card"><div class="cardhead"><h2>Sent to credit</h2><span class="chip c-amber">With the Underwriter</span></div><p class="hint">Sent by ${esc(c.submitted ? c.submitted.by : "the RM")}${c.submitted ? ", " + dateOf(c.submitted.at) + " " + timeOf(c.submitted.at) : ""}. You can still comment on the memo. The Underwriter can return it to you for more information.</p><div><button class="btn" type="button" data-role="Underwriter">Continue as the Underwriter</button></div></div>`;
  if (st === "approved" || st === "terms") return `<div class="card"><h2>Next: pricing and terms</h2><p class="hint">${c.terms && c.terms.issued ? "Terms letter issued." : c.pricing && c.pricing.status === "agreed" ? "Pricing agreed. You can issue the terms letter." : c.pricing && c.pricing.status === "awaiting" ? "Pricing is waiting for approval by Commercial." : "Propose pricing from the lender's grid, then Commercial approves it."}</p><div><button class="btn primary small" type="button" data-tab="pricing">Go to pricing and terms</button></div></div>` + conditionsCard(c, false);
  if (st === "declined") return "";
  const ret = st === "returned" && c.returned ? `<div class="errbox"><b>Returned by the Underwriter, ${dateOf(c.returned.at)} ${timeOf(c.returned.at)}.</b> ${esc(c.returned.reason)}</div>` : "";
  const toCheck = toCheckCount(c); const mism = c.consistency.length; const reqSent = (c.audit || []).some((a) => /request to the broker as sent/i.test(a.what)) || (c.chase && c.chase.sent && c.chase.sent.length);
  const item = (ok, text) => `<li class="${ok ? "ok" : "todo"}">${ok ? "Done" : "Open"}: ${esc(text)}</li>`;
  return `<div class="card sendcredit">${ret}<h2>Send to credit</h2><p class="hint">When you're happy with the memo and its recommendation, send the case to the Underwriter for a decision.</p>
    <ul class="ready">${item(!toCheck, toCheck ? `${toCheck} key field${toCheck > 1 ? "s" : ""} to confirm in Source check` : "Key fields confirmed")}${item(!mism, mism ? `${mism} mismatch${mism > 1 ? "es" : ""} between documents` : "No mismatches")}${c.rec.kind === "more" ? item(reqSent, reqSent ? "Request sent to the broker" : "Request to the broker not sent yet (see Communication)") : ""}</ul>
    <div class="field"><label for="rmNote">Note to the Underwriter</label><textarea class="ed" id="rmNote" placeholder="What the Underwriter should know: your view, open points, anything you've checked with the broker"></textarea></div>
    <div class="row"><button class="btn primary" type="button" data-act="submit-uw">Send to credit</button><span class="note">Open items are shown to the Underwriter. The conditions agent runs when you send it.</span></div></div>`;
}
function renderAgentsTab(c) {
  return c.run ? `<div class="stack">${renderAgents(c)}</div>` : `<div class="card"><h2>Agents at work</h2><p class="hint">The agents have not run on this case yet.</p></div>`;
}
function renderDocsTab(c) {
  return `<div class="stack">${renderDocs(c)}${c.fields ? `<div><button class="btn small" type="button" data-tab="source">Check the extracted fields against these documents</button></div>` : ""}</div>`;
}
function renderComms(c) {
  const req = c.source && c.source.kind === "email" ? chaseCard(c) : c.brokerRequest ? `<div class="card"><div class="cardhead"><h2>Request to the broker</h2><span class="chip c-amber">Drafted</span></div><p class="hint">Drafted by the memo agent. Edit it, then copy it into your email. Nothing is sent from here.</p><textarea class="ed" id="brokerReq" aria-label="Request to the broker">${esc(c.brokerRequest)}</textarea><div class="row"><button class="btn" type="button" data-act="copy-req">Copy email</button><button class="btn" type="button" data-act="log-req">Mark as sent</button></div></div>` : "";
  const t = c.terms;
  const terms = t && t.issued ? `<div class="card"><div class="cardhead"><h2>Terms letter</h2><span class="chip c-green">Issued</span></div><p class="hint">${t.issued.how === "email" ? "Emailed to the broker" : "Marked as issued"} by ${esc(t.issued.by)}, ${dateOf(t.issued.at)} ${timeOf(t.issued.at)}.</p><div><button class="btn small" type="button" data-tab="pricing">Open the terms letter</button></div></div>` : "";
  const none = !req && !terms ? `<div class="card"><h2>Communication</h2><p class="hint">${c.memo ? "Nothing to send to the broker. The pack is complete." : "The agents are still reading the pack. Any request to the broker appears here."}</p></div>` : "";
  return `<div class="stack">${req}${terms}${none}</div>`;
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
  const f = FIELDS.find((f) => needsCheck(c, f.key));
  return f ? f.key : "annual_rent";
}
function renderSource(c) {
  if (!FIELD[selectedField] || selectedField === "__auto") selectedField = pickField(c);
  let g = ""; let list = "";
  const ordered = FIELDS.filter((f) => isKey(c, f.key)).concat(FIELDS.filter((f) => !isKey(c, f.key)));
  ordered.forEach((f) => {
    const x = c.fields[f.key];
    const grp = isKey(c, f.key) ? "Key fields to confirm" : "Other fields (no need to check unless something looks wrong)";
    if (grp !== g) { g = grp; list += `<div class="fgroup">${g}</div>`; }
    const val = x.value == null || x.value === "" ? "" : f.type === "money" ? money(x.value) : String(x.value);
    const more = (x.candidates || []).filter((k) => k.doc).length - 1;
    const d = x.source ? c.docs.find((y) => y.id === x.source.doc) : null;
    const chip = !x.edited && c.consistency.some((y) => y.key === f.key) ? `<span class="chip c-amber">Mismatch</span>` : x.edited ? `<span class="chip c-green">${x.edited.confirmed ? "Confirmed" : "Corrected"}</span>` : !isKey(c, f.key) && x.state !== "Found" ? `<span class="chip c-grey">${esc(x.state)}</span>` : `<span class="chip ${stateClass(x.state)}">${esc(x.state)}</span>`;
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
  return `<p class="intro">Confirm the key fields the credit decision depends on${toCheckCount(c) ? `: ${toCheckCount(c)} still to confirm` : ". All confirmed or found"}. Pick any field to see the document it came from, with the text highlighted. Corrections are audited and the checks recalculate.</p>
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
/* ------------------------------------------------------------------ guided Underwriter review */
const RV_STEPS = ["Handover", "Flags", "Numbers", "Conditions", "Risk grade", "Decision"];
function reviewFlags(c) {
  const out = [];
  (c.consistency || []).forEach((x) => out.push({ key: "mm:" + x.key, tone: "amber", title: "Documents disagree: " + (FIELD[x.key] ? FIELD[x.key].label.toLowerCase() : "rent"), text: x.text, refs: (x.cands || []).filter((k) => k.doc).slice(0, 4), q: "The documents give different figures. Are you happy with the figure the case uses?" }));
  (c.checks || []).concat(c.judgements || []).forEach((k) => {
    const red = k.flag === "red" || k.outcome === "Fail";
    if (red || k.flag === "amber" || k.outcome === "Unclear") out.push({ key: "ck:" + (k.id || k.area), tone: red ? "red" : "amber", title: k.area + (k.value && k.type !== "Reasoned" ? " " + k.value : ""), text: k.type === "Reasoned" ? k.explanation : k.why, refs: k.source && k.source.doc ? [k.source] : [], q: red ? "This is outside policy. Can you accept it, and on what basis?" : k.outcome === "Unclear" ? "The agents couldn't tell from the pack. Are you comfortable going ahead?" : "Is this acceptable for this case?" });
  });
  ((c.financials && c.financials.flags) || []).forEach((x, i) => out.push({ key: "fin:" + i, tone: x.flag === "red" ? "red" : "amber", title: "From the accounts", text: x.text, refs: [], q: "Is this acceptable for this case?" }));
  return out;
}
function reviewState(c) {
  if (!c.review) c.review = { step: 0, flag: 0, max: 0, answers: {}, comfort: null, grade: "" };
  return c.review;
}
function gradeGuide(c) {
  const ltv = num(c, "loan_amount") / num(c, "property_value") * 100;
  const icr = c.checks.find((k) => k.id === "icr");
  const icrV = icr ? parseFloat(icr.value) : NaN;
  let g = !isFinite(ltv) ? 5 : ltv <= 50 ? 2 : ltv <= 60 ? 3 : ltv <= 65 ? 4 : ltv <= 70 ? 5 : 6;
  if (isFinite(icrV) && icrV < 1.6) g++;
  g += c.rec.exceptions.length;
  g += reviewFlags(c).filter((f) => f.tone === "red").length ? 1 : 0;
  g = Math.min(9, Math.max(1, g));
  return { lo: g, hi: Math.min(10, g + 1), why: `LTV ${isFinite(ltv) ? ltv.toFixed(1) + "%" : "unknown"}, ICR ${icr ? icr.value : "unknown"}, ${c.rec.exceptions.length} policy exception${c.rec.exceptions.length === 1 ? "" : "s"}` };
}
function reviewRationale(c, choice) {
  const R = reviewState(c); const fl = reviewFlags(c);
  const ans = fl.map((f) => ({ f, a: R.answers[f.key] })).filter((x) => x.a);
  const ltv = c.checks.find((k) => k.id === "ltv"), icr = c.checks.find((k) => k.id === "icr");
  if (choice === "Return to the RM") {
    const asks = ans.filter((x) => x.a.choice === "rm").map((x) => `- ${x.a.note || x.f.title}`);
    return asks.length ? "Please get the following before I decide:\n" + asks.join("\n") : "";
  }
  if (choice === "Decline") return R.comfort && R.comfort.choice === "no" ? "Not comfortable with the security and income cover: " + (R.comfort.note || "") : "";
  const parts = [];
  parts.push(`LTV ${ltv ? ltv.value : "-"} and ICR ${icr ? icr.value : "-"}${R.comfort && R.comfort.choice === "yes" ? ", which I'm comfortable with" : R.comfort && R.comfort.note ? ". " + R.comfort.note : ""}.`);
  const acc = ans.filter((x) => x.a.choice === "accept"); const cond = ans.filter((x) => x.a.choice === "condition");
  if (acc.length) parts.push("Accepted: " + acc.map((x) => x.f.title + (x.a.note ? " (" + x.a.note + ")" : "")).join("; ") + ".");
  if (cond.length) parts.push("Covered by conditions: " + cond.map((x) => x.f.title).join("; ") + ".");
  const nAcc = (c.conditions || []).filter((x) => x.status === "accepted").length;
  if (nAcc) parts.push(`${nAcc} conditions accepted.`);
  if (R.grade) parts.push(`Risk grade ${R.grade}.`);
  return parts.join(" ");
}
function renderReview(c) {
  if (!c.rec || !c.memo) return renderWorking(c);
  const st = stageOf(c);
  if (c.decision) return `<div class="grid2"><div class="stack">${decisionSummary(c)}</div><div class="stack">${flowCard(c)}</div></div>`;
  if (st !== "uw") return `<div class="card"><h2>Nothing to review yet</h2><p class="hint">${st === "returned" ? "You returned this case to the RM. Your answers so far are kept, and the review starts again when they resubmit it." : "The Relationship Manager hasn't submitted this case yet. It appears in your review queue when they do."}</p>${st === "returned" && c.returned ? `<div class="errbox"><b>What you asked for:</b> ${esc(c.returned.reason)}</div>` : ""}</div>`;
  const R = reviewState(c); const fl = reviewFlags(c);
  const stepper = `<ol class="stepper">${RV_STEPS.map((n, i) => `<li class="${i < R.step ? "done" : i === R.step ? "now" : ""}"><button type="button" data-act="rv-goto" data-step="${i}" ${i > R.max ? "disabled" : ""}>${i + 1}. ${esc(n)}${i === 1 && fl.length ? ` (${fl.length})` : ""}</button></li>`).join("")}</ol>`;
  const nav = (nextLabel, nextAct = "rv-next") => `<div class="row">${R.step > 0 ? `<button class="btn" type="button" data-act="rv-back">Back</button>` : ""}<button class="btn primary" type="button" data-act="${nextAct}">${esc(nextLabel)}</button><span class="note" id="rvMsg"></span></div>`;
  const opt = (act, val, label, on, extra = "") => `<button class="opt" type="button" data-act="${act}" data-choice="${val}" aria-pressed="${!!on}"${extra}>${esc(label)}</button>`;
  let main = "", side = "";
  const ltv = c.checks.find((k) => k.id === "ltv"), icr = c.checks.find((k) => k.id === "icr");
  if (R.step === 0) {
    const n = toCheckCount(c), m = c.consistency.length;
    main = `<div class="card"><h2>Step 1 of 6: read the handover</h2>
      <div class="memo-sec"><header><h3>Note from ${esc(c.submitted ? c.submitted.by : "the RM")}</h3></header><div class="memo-body">${c.submitted && c.submitted.note ? renderRich(c.submitted.note) : '<p class="note">The RM didn\'t add a note.</p>'}</div></div>
      <div class="label">What the RM left open</div>
      <ul class="ready"><li class="${n ? "todo" : "ok"}">${n ? `${n} field${n > 1 ? "s" : ""} not checked by the RM` : "Every field checked by the RM"}</li><li class="${m ? "todo" : "ok"}">${m ? `${m} mismatch${m > 1 ? "es" : ""} between documents` : "No mismatches between documents"}</li><li class="${c.rec.exceptions.length ? "todo" : "ok"}">${c.rec.exceptions.length ? "Policy exception: " + esc(c.rec.exceptions.join(", ")) : "No policy exception"}</li></ul>
      <div class="ask"><h3>Is the case ready for you to review?</h3><p class="hint">If something big is missing, send it straight back. Otherwise NashFlow takes you through ${fl.length ? fl.length + " flag" + (fl.length > 1 ? "s" : "") : "the numbers"} next.</p>
        <div class="opts"><button class="btn primary" type="button" data-act="rv-next">Yes, start the review</button><button class="btn" type="button" data-act="rv-return">No, return it to the RM</button></div></div></div>`;
    side = `<div class="recbar"><div class="line"><span>The agents recommend</span><span class="chip ${recChipClass(c.rec.kind)}">${esc(c.rec.label)}</span></div>${c.rec.reasons.length ? `<ol>${c.rec.reasons.slice(0, 5).map((x) => `<li>${esc(x.text)}</li>`).join("")}</ol>` : `<p class="note">All provisions pass.</p>`}</div>`;
  } else if (R.step === 1) {
    if (!fl.length) main = `<div class="card"><h2>Step 2 of 6: flags</h2><p class="hint">Nothing flagged. The agents found no mismatches, failed checks or concerns in the accounts.</p>${nav("Next: the numbers")}</div>`;
    else {
      R.flag = Math.min(R.flag, fl.length - 1);
      const f = fl[R.flag]; const a = R.answers[f.key] || {};
      const lbl = a.choice === "condition" ? "Condition to add (required)" : a.choice === "rm" ? "What should the RM get? (required)" : "Your reason (optional, goes into your rationale)";
      const ph = a.choice === "condition" ? `For example: before drawdown, evidence satisfactory to the lender on ${f.title.toLowerCase()}` : a.choice === "rm" ? "For example: a copy of the Unit 6 lease" : "For example: the tenancy schedule is the more recent document";
      main = `<div class="card"><div class="cardhead"><h2>Step 2 of 6: flag ${R.flag + 1} of ${fl.length}</h2><span class="chip ${f.tone === "red" ? "c-red" : "c-amber"}">${f.tone === "red" ? "Red" : "Amber"}</span></div>
        <h3 style="font-size:15px">${esc(f.title)}</h3><p>${esc(f.text || "")}</p>${f.refs.length ? `<div class="row">${f.refs.map((r) => refChip(r.doc, r.page, r.quote)).join("")}</div>` : ""}
        <div class="ask"><h3>${esc(f.q)}</h3>
          <div class="opts">${opt("rv-ans", "accept", "Yes, accept it", a.choice === "accept")}${opt("rv-ans", "condition", "Accept with a condition", a.choice === "condition")}${opt("rv-ans", "rm", "Ask the RM to check", a.choice === "rm")}</div>
          ${a.choice ? `<div class="field"><label for="rvNote">${esc(lbl)}</label><textarea class="ed" id="rvNote" placeholder="${esc(ph)}">${esc(a.note || "")}</textarea></div>` : ""}</div>
        ${nav(R.flag < fl.length - 1 ? "Next flag" : "Next: the numbers", "rv-flag-next")}</div>`;
      side = `<div class="card"><h2>All flags</h2><div class="flagpills">${fl.map((x, i) => { const y = R.answers[x.key]; return `<button type="button" class="${i === R.flag ? "on" : ""}" data-act="rv-flagjump" data-i="${i}">${i + 1}. ${y ? { accept: "Accepted", condition: "Condition", rm: "Ask RM" }[y.choice] : "To answer"}</button>`; }).join("")}</div><p class="hint">Red tags open the source document on the right.</p></div>`;
    }
  } else if (R.step === 2) {
    const k = (id) => c.checks.find((x) => x.id === id);
    const rows = ["ltv", "icr", "dscr", "wault", "conc"].map(k).filter((x) => x && x.outcome !== "N/A").map((x) => `<tr><td><b>${esc(x.area)}</b><span class="sub">${esc(x.rule)}</span></td><td class="fv">${esc(x.value)}</td><td>${outcomeChip(x)}</td></tr>`).join("");
    const sens = (c.analysis || []).map((x) => `<tr><td><b>${esc(x.label)}</b><span class="sub">${esc(x.note)}</span></td><td class="fv">${esc(x.value)}</td><td></td></tr>`).join("");
    const fr = c.financials ? c.financials.ratios.map((r) => `<tr><td><b>${esc(r.label)}</b><span class="sub">From the accounts, latest year</span></td><td class="fv">${esc(r.values[r.values.length - 1] || "-")}</td><td></td></tr>`).join("") : "";
    const cf = R.comfort || {};
    main = `<div class="card"><h2>Step 3 of 6: the numbers</h2><p class="hint">Calculated in code from the checked figures. Covenants from the credit policy, section 7.2.</p>
      <div class="tablewrap bare"><table class="t"><tbody>${rows}${sens}${fr}</tbody></table></div>
      <div class="ask"><h3>Are you comfortable with the security and the income cover?</h3>
        <div class="opts">${opt("rv-comfort", "yes", "Yes", cf.choice === "yes")}${opt("rv-comfort", "comments", "Yes, with comments", cf.choice === "comments")}${opt("rv-comfort", "no", "No", cf.choice === "no")}</div>
        ${cf.choice && cf.choice !== "yes" ? `<div class="field"><label for="rvNote">${cf.choice === "no" ? "What worries you? (required)" : "Your comments (required)"}</label><textarea class="ed" id="rvNote">${esc(cf.note || "")}</textarea></div>` : ""}</div>
      ${nav("Next: conditions")}</div>`;
    side = `<div class="card"><h2>Where to look</h2><p class="hint">The full spread is in Financials and every check is in Policy checks. Both stay open while you review.</p><div class="row"><button class="btn small" type="button" data-tab="fin">Financials</button><button class="btn small" type="button" data-tab="policy">Policy checks</button></div></div>`;
  } else if (R.step === 3) {
    const list = c.conditions || []; const pend = list.filter((x) => x.status === "suggested");
    const base = pend.filter((x) => x.from === "Base set").length;
    main = `<div class="ask" style="margin-bottom:12px"><h3>${c.conditionsRun && c.conditionsRun.running ? "The conditions agent is still working." : pend.length ? `Which of these ${pend.length} suggested conditions should apply?` : "All conditions answered."}</h3>
      <p class="hint">${pend.length ? "Accept or reject each one, or add your own. Conditions you added from the flags are already accepted." : "You can still add your own below."}</p>
      ${base ? `<div><button class="btn small" type="button" data-act="cond-accept-base">Accept the ${base} from the base set</button></div>` : ""}</div>` + conditionsCard(c, true) + `<div class="card">${nav("Next: risk grade")}</div>`;
    side = `<div class="card"><h2>Step 4 of 6: conditions</h2><p class="hint">The conditions agent picked these from the lender's base set of ${BASE_CONDITIONS.length} and added ones for this case's risks. Accepted conditions go into the terms letter.</p></div>`;
  } else if (R.step === 4) {
    const g = gradeGuide(c);
    main = `<div class="card"><h2>Step 5 of 6: risk grade</h2>
      <div class="ask"><h3>What risk grade do you give this case?</h3><p class="hint">1 is the strongest and 10 the weakest. The grade also feeds the pricing grid.</p>
        <div class="grades">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<button class="opt ${n >= g.lo && n <= g.hi ? "guide" : ""}" type="button" data-act="rv-grade" data-grade="${n}" aria-pressed="${String(R.grade) === String(n)}">${n}</button>`).join("")}</div>
        <p class="note">Dashed: where the figures usually put a case like this (${esc(g.why)}).</p></div>
      ${nav("Next: your decision")}</div>`;
    side = `<div class="card"><h2>Grade scale</h2><ul class="ready"><li class="ok">1 to 3: strong, well within policy</li><li class="ok">4 to 6: acceptable, normal risks</li><li class="todo">7 to 8: weaker, needs strong mitigants</li><li class="todo">9 to 10: high risk</li></ul></div>`;
  } else {
    const ans = fl.map((f) => ({ f, a: R.answers[f.key] }));
    const asks = ans.filter((x) => x.a && x.a.choice === "rm");
    const dd = draftDecision;
    const suggested = asks.length ? "Return to the RM" : R.comfort && R.comfort.choice === "no" ? "Decline" : c.rec.kind === "decline" ? "Decline" : c.rec.kind === "more" ? "Return to the RM" : "Approve";
    if (!dd.choice) dd.choice = suggested;
    const au = authority(c);
    if (dd.choice === "Approve" && !au.canApprove) dd.choice = "Decline";
    const auto = reviewRationale(c, dd.choice);
    if (!dd.rationale || dd.rationale === dd.auto) dd.rationale = auto;
    dd.auto = auto; dd.grade = R.grade;
    const exc = c.rec.exceptions.length && dd.choice === "Approve";
    const opts = [["Approve", "Indicative terms can be prepared. The RM prices it and Commercial approves the pricing.", !au.canApprove, au.why], ["Decline", "The broker gets a polite decline.", false, ""], ["Return to the RM", "The case goes back to the RM with your questions.", false, ""]];
    const accN = (c.conditions || []).filter((x) => x.status === "accepted").length;
    main = `<div class="card"><h2>Step 6 of 6: your decision</h2>
      <div class="label">What you said</div>
      <ul class="ready">${ans.length ? ans.map((x) => `<li class="${!x.a ? "todo" : x.a.choice === "rm" ? "todo" : "ok"}"><b>${esc(x.f.title)}:</b> ${!x.a ? "not answered" : { accept: "accepted", condition: "accepted with a condition", rm: "ask the RM" }[x.a.choice]}${x.a && x.a.note ? ` <span class="note">"${esc(x.a.note)}"</span>` : ""}</li>`).join("") : `<li class="ok">No flags</li>`}
        <li class="${R.comfort && R.comfort.choice !== "no" ? "ok" : "todo"}"><b>Security and income cover:</b> ${R.comfort ? { yes: "comfortable", comments: "comfortable, with comments", no: "not comfortable" }[R.comfort.choice] : "not answered"}</li>
        <li class="ok"><b>Conditions:</b> ${accN} accepted</li><li class="${R.grade ? "ok" : "todo"}"><b>Risk grade:</b> ${R.grade || "not set"}</li></ul>
      <div class="ask"><h3>What do you want to do?</h3><p class="hint">Based on your answers, NashFlow suggests <b>${esc(suggested)}</b>. The agents suggested ${esc(c.rec.label.split(" (")[0])}.</p>
        <input type="hidden" id="decGrade" value="${esc(R.grade)}">
        <div class="choices">${opts.map(([name, desc, dis, why]) => `<label class="choice ${dis ? "disabled" : ""}"><input type="radio" name="decChoice" value="${esc(name)}" ${dis ? "disabled" : ""} ${dd.choice === name ? "checked" : ""}><span><b>${esc(name)}${name === suggested ? " (suggested)" : ""}</b><small>${esc(dis && why ? why : desc)}</small></span></label>`).join("")}</div>
        ${exc ? `<div class="field"><label for="decException">Reason for approving outside policy (required): ${esc(c.rec.exceptions.join(", "))}</label><textarea class="ed" id="decException" placeholder="Why the exception is acceptable, and any mitigants">${esc(dd.exception)}</textarea></div>` : ""}
        <div class="field"><label for="decRationale">${dd.choice === "Return to the RM" ? "What the RM needs to get (drafted from your answers, edit as you like)" : "Rationale (drafted from your answers, edit as you like)"}</label><textarea class="ed" id="decRationale" rows="5">${esc(dd.rationale)}</textarea></div>
        <div class="row"><button class="btn" type="button" data-act="rv-back">Back</button><button class="btn primary" type="button" data-act="record">${dd.choice === "Return to the RM" ? "Return to the RM" : "Record my decision"}</button><span class="note" id="decMsg"></span></div></div></div>`;
    side = flowCard(c);
  }
  return stepper + `<div class="grid2"><div class="stack">${main}</div><div class="stack">${side}</div></div>`;
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
  const steps = [["rm", "Relationship Manager prepares the case"], ["uw", "Underwriter reviews and decides"], ["pricing", "RM proposes pricing, Commercial approves it"], ["terms", "Terms letter issued to the broker"]];
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
  const recbar = recBar(c, 3);
  const sub = c.submitted ? `<div class="card"><h2>Note from the Relationship Manager</h2><p class="hint">Submitted by ${esc(c.submitted.by)}, ${dateOf(c.submitted.at)} ${timeOf(c.submitted.at)}.</p><div class="memo-body">${c.submitted.note ? renderRich(c.submitted.note) : '<p class="note">No note.</p>'}</div></div>` : "";
  const ret = st === "returned" && c.returned ? `<div class="errbox"><b>Returned by the Underwriter, ${dateOf(c.returned.at)} ${timeOf(c.returned.at)}.</b> ${esc(c.returned.reason)}</div>` : "";
  const switchTo = (r, why) => `<div class="card"><h2>${esc(why)}</h2><p class="hint">In the product each person sees only their own work. In this prototype, switch role to carry on.</p><div><button class="btn primary" type="button" data-role="${esc(r)}">Switch to ${esc(r)}</button></div></div>`;
  let main;
  if (st === "approved" || st === "declined" || st === "terms") main = decisionSummary(c) + (st !== "declined" ? `<div class="card"><h2>Next: pricing and terms</h2><p class="hint">${c.terms && c.terms.issued ? "Terms letter issued." : c.pricing && c.pricing.status === "agreed" ? "Pricing agreed. The RM can issue the terms letter." : c.pricing && c.pricing.status === "awaiting" ? "Pricing is waiting for approval by Commercial." : "The RM proposes pricing from the lender's grid, then Commercial approves it."}</p><div><button class="btn primary small" type="button" data-tab="pricing">Go to pricing and terms</button></div></div>` : "") + (currentRole === "Underwriter" ? "" : conditionsCard(c, false));
  else if (currentRole === "Relationship Manager") {
    if (st === "uw") main = sub + `<div class="card"><h2>With the Underwriter</h2><p class="hint">You submitted this case. You can still read it and add comments. The Underwriter can return it to you for more information.</p></div>` + switchTo("Underwriter", "Continue as the Underwriter");
    else {
      const toCheck = toCheckCount(c);
      const mism = c.consistency.length; const reqSent = (c.audit || []).some((a) => /request to the broker as sent/i.test(a.what));
      const edits = MEMO_SECTIONS.filter(([k]) => c.memo[k] && !["Memo agent", "System"].includes(c.memo[k].by)).length;
      const item = (ok, text) => `<li class="${ok ? "ok" : "todo"}">${ok ? "Done" : "Open"}: ${esc(text)}</li>`;
      main = ret + `<div class="card"><h2>Submit to the Underwriter</h2>
        <ul class="ready">${item(!toCheck, toCheck ? `${toCheck} field${toCheck > 1 ? "s" : ""} to check in Source check` : "All fields checked")}${item(!mism, mism ? `${mism} mismatch${mism > 1 ? "es" : ""} between documents` : "No mismatches")}${c.rec.kind === "more" ? item(reqSent, reqSent ? "Request sent to the broker" : "Request to the broker not sent yet") : ""}${item(edits > 0, edits ? `You edited ${edits} memo section${edits > 1 ? "s" : ""}` : "Memo not reviewed yet (optional)")}</ul>
        <div class="field"><label for="rmNote">Note to the Underwriter</label><textarea class="ed" id="rmNote" placeholder="What the Underwriter should know: your view, open points, anything you've checked with the broker"></textarea></div>
        <div class="row"><button class="btn primary" type="button" data-act="submit-uw">Submit to the Underwriter</button><span class="note">Open items are shown to the Underwriter. The conditions agent runs when you submit.</span></div></div>`;
    }
  } else if (currentRole !== "Underwriter") {
    main = sub + `<div class="card"><h2>Credit decision</h2><p class="hint">Only the Underwriter decides credit. Commercial approves the pricing once the case is approved.</p></div>` + (st === "uw" ? switchTo("Underwriter", "Continue as the Underwriter") : "");
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
  return `<div class="grid2"><div class="stack">${c.decision ? "" : recbar}${main}</div>${side}</div>`;
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
    `Demo · ${today} · Reference ${c.ref}`,
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
    `The lending team, Demo`,
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
  const icrLine = f.icr == null ? "" : `<p class="${f.icrOk ? "hint" : "errbox"}">Interest cover at the priced rate: <b>${f.icr.toFixed(2)}x</b> (${money(f.interest)} interest a year). ${f.icrOk ? `Meets the ${POLICY.minICR}x policy minimum.` : `Below the ${POLICY.minICR}x policy minimum, so check with the Underwriter before approving.`}</p>`;
  const prop = `<div class="card"><div class="cardhead"><h2>Proposed pricing</h2><span class="chip ${p.status === "agreed" ? "c-green" : p.status === "awaiting" ? "c-amber" : "c-grey"}">${p.status === "agreed" ? "Approved by Commercial" : p.status === "awaiting" ? "With Commercial" : "Draft"}</span></div>
    ${p.sentBack && p.status === "draft" ? `<div class="errbox"><b>Sent back by ${esc(p.sentBack.by)}.</b> ${esc(p.sentBack.reason)}</div>` : ""}
    ${editable ? `<div class="cfg"><label for="prMargin">Margin over the reference rate (%)</label><input id="prMargin" type="number" step="0.05" value="${p.margin}"><label for="prFee">Arrangement fee (%)</label><input id="prFee" type="number" step="0.25" value="${p.feePct}"><label for="prExit">Exit fee (%)</label><input id="prExit" type="number" step="0.25" value="${p.exitPct}"><label for="prReason">Reason, if different from the grid</label><input id="prReason" type="text" value="${esc(p.reason || "")}" placeholder="For example, competitive pressure from another lender"></div>`
      : `<div class="tablewrap bare"><table class="t"><tbody><tr><td>Margin</td><td class="num">${pctTxt(p.margin)}${p.margin !== g.margin ? ` <span class="chip c-amber">Grid ${pctTxt(g.margin)}</span>` : ""}</td></tr><tr><td><b>Interest rate</b></td><td class="num"><b>${pctTxt(f.rate)}</b></td></tr><tr><td>Arrangement fee</td><td class="num">${pctTxt(p.feePct)} (${money(f.fee)})</td></tr><tr><td>Exit fee</td><td class="num">${p.exitPct ? pctTxt(p.exitPct) : "None"}</td></tr></tbody></table></div>${p.reason ? `<p class="hint">Reason: ${esc(p.reason)}</p>` : ""}`}
    ${icrLine}
    ${editable ? `<div class="row"><button class="btn primary" type="button" data-act="price-submit">Send to Commercial for approval</button><span class="note" id="prMsg"></span></div>` : ""}
    ${currentRole !== "Relationship Manager" && p.status === "draft" ? `<p class="note">Waiting for the RM to propose pricing.</p>` : ""}</div>`;
  const ap = p.approval;
  const dm = p.margin - g.margin;
  const checks = `<ul class="ready"><li class="${Math.abs(dm) < 1e-9 ? "ok" : dm < 0 ? "todo" : "ok"}">${Math.abs(dm) < 1e-9 ? "Margin is on the grid" : `Margin is ${pctTxt(Math.abs(dm))} ${dm < 0 ? "below" : "above"} the grid${p.reason ? ". RM's reason: " + esc(p.reason) : ""}`}</li><li class="${f.icr == null || f.icrOk ? "ok" : "todo"}">${f.icr == null ? "Interest cover not calculated" : `Interest cover at ${pctTxt(f.rate)} is ${f.icr.toFixed(2)}x, ${f.icrOk ? "within" : "below"} the ${POLICY.minICR}x policy minimum`}</li><li class="${Math.abs(p.feePct - g.feePct) < 1e-9 ? "ok" : "todo"}">Arrangement fee ${pctTxt(p.feePct)} (${money(f.fee)})${Math.abs(p.feePct - g.feePct) < 1e-9 ? ", on the grid" : `, grid ${pctTxt(g.feePct)}`}</li><li class="ok">Risk grade ${esc(c.decision.grade || "-")} from the Underwriter</li></ul>`;
  const signs = `<div class="card"><h2>Pricing approval</h2><p class="hint">Commercial alone approves pricing. The RM proposes it after the Underwriter approves the credit. Any change to the pricing needs approving again.</p>
    <div class="signoff"><div><b>Relationship Manager</b><span>Proposes</span></div>${p.status !== "draft" ? `<span class="chip c-green">Proposed ${p.at ? dateOf(p.at) + " " + timeOf(p.at) : ""}</span>` : `<span class="chip c-grey">Not yet</span>`}</div>
    <div class="signoff"><div><b>Commercial</b><span>Approves pricing</span></div>${ap ? `<span class="chip c-green">Approved ${dateOf(ap.at)} ${timeOf(ap.at)}</span>` : p.status === "awaiting" ? `<span class="chip c-amber">Waiting</span>` : `<span class="chip c-grey">Not yet</span>`}</div>
    ${p.status === "awaiting" && currentRole === PRICING_APPROVER ? `<div class="ask"><h3>Do you approve this pricing?</h3>${checks}<div class="field"><label for="prBack">Comment (needed to send it back)</label><input id="prBack" type="text" placeholder="For example: hold the margin at the grid, the LTV doesn't justify a discount"></div><div class="opts"><button class="btn primary" type="button" data-act="price-sign">Approve the pricing</button><button class="btn" type="button" data-act="price-back">Send it back to the RM</button><span class="note" id="prMsg"></span></div></div>` : ""}
    ${p.status === "awaiting" && currentRole !== PRICING_APPROVER ? `<p class="note">Waiting for Commercial to approve. Switch to Commercial to carry on.</p>` : ""}</div>`;
  let terms = "";
  if (p.status === "agreed") {
    const t = c.terms;
    terms = `<div class="card"><div class="cardhead"><h2>Terms letter</h2>${t && t.issued ? `<span class="chip c-green">Issued ${dateOf(t.issued.at)} ${timeOf(t.issued.at)}</span>` : t ? `<span class="chip c-amber">Draft</span>` : ""}</div>
      ${!t ? `<p class="hint">Generated from the approved case: facility, agreed pricing, security, covenants and the conditions the Underwriter accepted.</p>${currentRole === "Relationship Manager" ? `<div><button class="btn primary" type="button" data-act="terms-make">Generate the terms letter</button></div>` : `<p class="note">The RM generates and issues the terms letter.</p>`}`
      : `<div class="pagetext paper termsdoc">${renderRich(t.text)}</div>
        <div class="row"><button class="btn small" type="button" data-act="terms-print">Print or save as PDF</button><button class="btn small" type="button" data-act="terms-word">Download as Word</button><button class="btn small" type="button" data-act="terms-copy">Copy</button>${currentRole === "Relationship Manager" && !t.issued ? `<button class="btn small" type="button" data-act="terms-make">Regenerate</button>${c.source && c.source.kind === "email" && settings.inboxUrl ? `<button class="btn primary small" type="button" data-act="terms-email">Email to the broker</button>` : ""}<button class="btn ${c.source && c.source.kind === "email" && settings.inboxUrl ? "" : "primary "}small" type="button" data-act="terms-issue">Mark as issued</button>` : ""}</div>`}</div>`;
  }
  return `<div class="grid2"><div class="stack">${currentRole === PRICING_APPROVER && p.status === "awaiting" ? signs + prop : prop + signs}${terms}</div><div class="stack">${grid}${flowCard(c)}</div></div>`;
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
    ["Pricing grid (7.3)", `Margin over a ${pctTxt(P.pricing.referenceRate)} reference rate by LTV band (${P.pricing.bands.map((x) => "up to " + x[0] + "%: " + pctTxt(x[1])).join(", ")}), adjusted for risk grade, short WAULT, tenant concentration, EPC below C and approved exceptions; floor ${pctTxt(P.pricing.floorMargin)}. Arrangement fee ${pctTxt(P.pricing.feeSmall)} under £1m, ${pctTxt(P.pricing.feeLarge)} from £1m, minimum £5,000. Proposed by the RM and approved by Commercial`, "Calculated"],
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
  if (!ROLE_VIEWS[currentRole].includes(view)) view = "cases";
  if (view === "case" && !c) view = cases.length || currentRole !== "Relationship Manager" ? "cases" : "new";
  const html = { new: renderNew, cases: renderCases, inbox: renderInbox, policy: renderPolicyAdmin, agents: renderAgentsAdmin, grid: renderGridPage }[view];
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
/* A memo tag has no quote of its own, so find the passage on that page that best matches the memo sentence. */
function numsIn(s) {
  const out = [];
  String(s).replace(/(\d[\d,]*(?:\.\d+)?)\s*(m|k|%|x)?/gi, (m, n, u) => { let v = parseFloat(n.replace(/,/g, "")); if (!isFinite(v)) return m; if (u && /m/i.test(u)) v *= 1e6; else if (u && /k/i.test(u)) v *= 1e3; if (v >= 10 || /\./.test(n) || u) out.push(v); return m; });
  return out;
}
const STOP = new Set(["which", "their", "there", "these", "those", "about", "under", "after", "before", "where", "while", "would", "should", "could", "being", "between", "within", "against", "other"]);
function wordsIn(s) { return new Set((String(s).toLowerCase().match(/[a-z][a-z'-]{4,}/g) || []).filter((w) => !STOP.has(w))); }
function quoteFor(c, doc, page, ctx) {
  if (!c) return "";
  const d = c.docs.find((x) => x.id === doc); if (!d) return "";
  const pg = Math.min(Math.max(1, +page || 1), d.pages.length); const text = d.pages[pg - 1] || "";
  const cn = numsIn(ctx), cw = wordsIn(ctx);
  const close = (a, b) => Math.abs(a - b) <= Math.max(Math.abs(b) * 0.006, 0.006);
  const score = (q, n) => { let s = 0; if (n != null && cn.some((x) => close(x, n))) s += 6; numsIn(q).forEach((v) => { if (cn.some((x) => close(x, v))) s += 3; }); const qw = wordsIn(q); qw.forEach((w) => { if (cw.has(w)) s += 1; }); return s; };
  const opts = [];
  const on = (src) => src && src.doc === doc && String(src.page || 1) === String(pg) && src.quote;
  if (c.fields) FIELDS.forEach((f) => { const x = c.fields[f.key]; [x.source].concat(x.candidates || []).forEach((k) => { if (on(k)) opts.push({ q: k.quote, n: k.num != null ? k.num : typeof x.value === "number" ? x.value : null, bonus: 1 }); }); });
  (c.tenants || []).forEach((t) => { if (on(t.source)) opts.push({ q: t.source.quote, n: t.annual_rent, bonus: 0 }); });
  if (c.financials) Object.values(c.financials.lines || {}).forEach((l) => { if (on(l.source)) opts.push({ q: l.source.quote, n: null, bonus: 0 }); });
  text.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 6 && l.length < 300).forEach((l) => opts.push({ q: l, n: null, bonus: 0 }));
  let best = null, bs = 1;
  opts.forEach((o) => { const s = score(o.q, o.n); const v = s ? s + o.bonus : 0; if (v > bs && highlight(text, o.q).found) { best = o.q; bs = v; } });
  return best || "";
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
/* Built-in demo inbox, so everyone who opens the page sees the same emails. Demo use only: the page is public, so anyone who reads it can use this inbox. */
const DEMO_INBOX = { url: "https://script.google.com/macros/s/AKfycbyG7UV-PqSRIcpCq5RJ-fd63eKydUqUamHiM0vNCRappOT0-6XHNIGtYoEJWqhJQFlm/exec", key: "brokerflowgetsitdone" };
if (DEMO_INBOX.url && !settings.inboxUrl) { settings.inboxUrl = DEMO_INBOX.url; settings.inboxKey = DEMO_INBOX.key; if (settings.inboxAuto == null) settings.inboxAuto = true; }
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
    let picked = 0;
    for (let m of r.messages || []) {
      if (inboxSeen.has(m.id)) { if (!r.version) await inboxCall("done", { id: m.id }).catch(() => {}); continue; }
      if (m.body == null) m = (await inboxCall("get", { id: m.id })).message; // version 2 script: the list has no attachments
      picked++;
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
    if (manual) toast(picked ? `Picked up ${picked} email${picked > 1 ? "s" : ""}` : "No new emails");
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
    String(c.brokerRequest || "").replace(/\[Your name\]/g, "The lending team, Demo\n(Sent by NashFlow)");
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
  if (t.dataset.src) { openSource(t.dataset.src, t.dataset.page, t.dataset.quote || (t.dataset.ctx ? quoteFor(cur(), t.dataset.src, t.dataset.page, t.dataset.ctx) : "")); return; }
  if (t.dataset.pagesel) {
    if (t.closest("#srcBody")) { openSource(t.dataset.doc, t.dataset.pagesel, ""); return; }
    srcDocSel = { field: selectedField, doc: t.dataset.doc, page: t.dataset.pagesel, quote: "" }; render(); return;
  }
  if (t.dataset.view) { view = t.dataset.view; editingSection = null; render(); window.scrollTo(0, 0); return; }
  if (t.dataset.case) { currentId = t.dataset.case; currentTab = t.dataset.opentab || defaultTab(cases.find((x) => x.id === t.dataset.case)); view = "case"; editingSection = null; srcDocSel = null; selectedField = "__auto"; save(); render(); window.scrollTo(0, 0); return; }
  if (t.dataset.tab) { currentTab = t.dataset.tab; editingSection = null; render(); return; }
  if (t.dataset.field) { selectedField = t.dataset.field; srcDocSel = null; render(); return; }
  if (t.dataset.showdoc) { srcDocSel = { field: selectedField, doc: t.dataset.showdoc, page: t.dataset.page, quote: t.dataset.quote }; render(); return; }
  if (t.dataset.role) { currentRole = t.dataset.role; store("nashflow.role", currentRole); draftDecision = { choice: "", grade: "", rationale: "", exception: "" }; const rc = cur(); if (rc && view === "case") currentTab = defaultTab(rc); render(); window.scrollTo(0, 0); toast("Working as " + currentRole); return; }
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
    c.submitted = { by: actor(), at: nowISO(), note }; if (c.review) { c.review.step = 0; c.review.flag = 0; } c.stage = "uw"; c.status = STAGES.uw; c.returned = null;
    (c.handoffs = c.handoffs || []).push({ at: nowISO(), who: actor(), what: "Submitted to the Underwriter", note });
    audit(c, actor(), "Submitted the case to the Underwriter" + (note ? `. Note: ${note}` : ""));
    save(); render(); toast("Submitted to the Underwriter");
    if (!c.conditions || !c.conditions.length) runConditions(c);
  }
  else if (act && act.startsWith("rv-") || act === "cond-accept-base") {
    const R = reviewState(c); const fl = reviewFlags(c);
    const msg = (m) => { const el = $("#rvMsg"); if (el) el.textContent = m; };
    const keepNote = () => { const el = $("#rvNote"); if (!el) return; if (R.step === 1 && fl[R.flag] && R.answers[fl[R.flag].key]) R.answers[fl[R.flag].key].note = el.value.trim(); if (R.step === 2 && R.comfort) R.comfort.note = el.value.trim(); };
    const go = (n) => { R.step = Math.max(0, Math.min(RV_STEPS.length - 1, n)); R.max = Math.max(R.max || 0, R.step); save(); render(); window.scrollTo(0, 0); };
    keepNote();
    if (act === "cond-accept-base") { const xs = (c.conditions || []).filter((x) => x.status === "suggested" && x.from === "Base set"); xs.forEach((x) => (x.status = "accepted")); audit(c, actor(), `Accepted ${xs.length} conditions from the base set`); save(); render(); return; }
    if (act === "rv-goto") { go(+t.dataset.step); return; }
    if (act === "rv-return") { draftDecision = { choice: "Return to the RM", grade: "", rationale: "", exception: "" }; go(5); return; }
    if (act === "rv-back") { if (R.step === 1 && R.flag > 0) { R.flag--; save(); render(); return; } if (R.step === 2 && fl.length) { R.flag = fl.length - 1; } go(R.step - 1); return; }
    if (act === "rv-flagjump") { R.flag = +t.dataset.i; save(); render(); return; }
    if (act === "rv-ans") { const f = fl[R.flag]; const prev = R.answers[f.key] || {}; R.answers[f.key] = { choice: t.dataset.choice, note: prev.choice === t.dataset.choice ? prev.note : "" }; save(); render(); const el = $("#rvNote"); if (el && t.dataset.choice !== "accept") el.focus(); return; }
    if (act === "rv-comfort") { R.comfort = { choice: t.dataset.choice, note: (R.comfort && R.comfort.note) || "" }; save(); render(); return; }
    if (act === "rv-grade") { R.grade = t.dataset.grade; draftDecision.grade = R.grade; audit(c, actor(), "Set risk grade " + R.grade + " in the guided review"); save(); render(); return; }
    if (act === "rv-flag-next") {
      const f = fl[R.flag]; const a = R.answers[f.key];
      if (!a) { msg("Choose an answer to carry on."); return; }
      if (a.choice !== "accept" && !a.note) { msg(a.choice === "condition" ? "Write the condition to add." : "Say what the RM should get."); return; }
      c.conditions = c.conditions || [];
      const cid = "RV-" + f.key; const ex = c.conditions.find((x) => x.id === cid);
      if (a.choice === "condition") { if (ex) ex.text = a.note; else c.conditions.push({ id: cid, type: "Condition precedent", text: a.note, from: "Added by Underwriter", reason: "From the guided review: " + f.title, status: "accepted", by: actor() }); }
      else if (ex) c.conditions = c.conditions.filter((x) => x.id !== cid);
      audit(c, actor(), `Guided review, ${f.title}: ${{ accept: "accepted", condition: "accepted with a condition", rm: "asked the RM to check" }[a.choice]}${a.note ? ". " + a.note : ""}`);
      if (R.flag < fl.length - 1) { R.flag++; save(); render(); return; }
      go(2); return;
    }
    if (act === "rv-next") {
      if (R.step === 2) { if (!R.comfort) { msg("Choose an answer to carry on."); return; } if (R.comfort.choice !== "yes" && !R.comfort.note) { msg("Add your comments."); return; } audit(c, actor(), `Guided review, security and income cover: ${R.comfort.choice === "no" ? "not comfortable" : "comfortable"}${R.comfort.note ? ". " + R.comfort.note : ""}`); }
      if (R.step === 3) { if (c.conditionsRun && c.conditionsRun.running) { msg("Wait for the conditions agent to finish."); return; } if ((c.conditions || []).some((x) => x.status === "suggested")) { msg("Accept or reject each suggested condition first."); return; } }
      if (R.step === 4 && !R.grade) { msg("Choose a risk grade."); return; }
      if (R.step === 1) R.flag = 0;
      go(R.step + 1); return;
    }
    return;
  }
  else if (act === "cond-run") { runConditions(c); }
  else if (act === "price-submit") {
    const g = gridPricing(c);
    const margin = parseFloat($("#prMargin").value), feePct = parseFloat($("#prFee").value), exitPct = parseFloat($("#prExit").value) || 0, reason = ($("#prReason").value || "").trim();
    if (!isFinite(margin) || !isFinite(feePct)) { $("#prMsg").textContent = "Enter a margin and an arrangement fee."; return; }
    if ((Math.abs(margin - g.margin) > 1e-9 || Math.abs(feePct - g.feePct) > 1e-9 || exitPct !== g.exitPct) && !reason) { $("#prMsg").textContent = "Give a reason for pricing away from the grid."; return; }
    c.pricing = { margin, feePct, exitPct, reason, grid: g.margin, status: "awaiting", proposedBy: actor(), at: nowISO(), approval: null };
    c.terms = null;
    (c.handoffs = c.handoffs || []).push({ at: nowISO(), who: actor(), what: `Proposed pricing: margin ${pctTxt(margin)}, rate ${pctTxt(priceFigures(c, c.pricing).rate)}, fee ${pctTxt(feePct)}`, note: reason });
    audit(c, actor(), `Proposed pricing: margin ${pctTxt(margin)} (grid ${pctTxt(g.margin)}), arrangement fee ${pctTxt(feePct)}, exit fee ${pctTxt(exitPct)}${reason ? ". Reason: " + reason : ""}`);
    save(); render(); toast("Pricing sent to Commercial");
  }
  else if (act === "price-sign") {
    const p = c.pricing; if (!p || p.status !== "awaiting" || currentRole !== PRICING_APPROVER) return;
    p.approval = { by: actor(), at: nowISO() }; p.status = "agreed";
    (c.handoffs = c.handoffs || []).push({ at: nowISO(), who: actor(), what: "Approved the pricing", note: "" });
    audit(c, actor(), `Approved the pricing (rate ${pctTxt(priceFigures(c, p).rate)}, margin ${pctTxt(p.margin)}, fee ${pctTxt(p.feePct)})`);
    toast("Pricing approved"); save(); render();
  }
  else if (act === "price-back") {
    const why = ($("#prBack").value || "").trim(); if (!why) { $("#prMsg").textContent = "Add a comment saying why."; return; }
    const p = c.pricing; p.status = "draft"; p.approval = null; p.sentBack = { by: actor(), at: nowISO(), reason: why };
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
/* keep what the Underwriter types in the guided review, so a background update does not lose it */
document.addEventListener("input", (e) => {
  if (e.target.id !== "rvNote") return;
  const c = cur(); if (!c || !c.review) return;
  const R = c.review;
  if (R.step === 1) { const f = reviewFlags(c)[R.flag]; if (f && R.answers[f.key]) R.answers[f.key].note = e.target.value.trim(); }
  else if (R.step === 2 && R.comfort) R.comfort.note = e.target.value.trim();
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
