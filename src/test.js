const { chromium } = require("playwright");
const path = require("path");
const OUT = path.join(__dirname, "shots");
require("fs").mkdirSync(OUT, { recursive: true });

const extraction = {
  documents: [
    { id: "D1", type: "Broker email", date: "2026-11-04", summary: "Refinance request from Sandhu Commercial Finance" },
    { id: "D2", type: "Accounts", date: "2026-06-30", summary: "Redmere Estates accounts to 30 June 2026" },
    { id: "D3", type: "Tenancy schedule", date: "2026-09-01", summary: "Six let units totalling £158,000" },
    { id: "D4", type: "Valuation report", date: "2026-08-20", summary: "Market value £2,450,000" },
  ],
  fields: {
    broker: { state: "Found", value: "Sandhu Commercial Finance", source: { doc: "D1", page: 1, quote: "Sandhu Commercial Finance" } },
    purpose: { state: "Found", value: "Refinance", source: { doc: "D1", page: 1, quote: "to refinance the existing loan" } },
    loan_amount: { state: "Found", value: 1600000, source: { doc: "D1", page: 1, quote: "Loan: £1,600,000, term 7 years" } },
    loan_term_years: { state: "Found", value: 7, source: { doc: "D1", page: 1, quote: "term 7 years" } },
    repayment_basis: { state: "Found", value: "Interest only", source: { doc: "D1", page: 1, quote: "interest only" } },
    interest_rate_pct: { state: "Found", value: 7.5, source: { doc: "D1", page: 1, quote: "looking for: 7.5%" } },
    owned_by_borrower: { state: "Found", value: "Yes", source: { doc: "D1", page: 1, quote: "Owned by the borrower since 2017" } },
    purchase_price: { state: "Not applicable", value: null, note: "Refinance" },
    borrower_name: { state: "Found", value: "Redmere Estates Ltd", source: { doc: "D1", page: 1, quote: "Borrower: Redmere Estates Ltd" }, others: [{ value: "Redmere Estates Ltd", doc: "D2", page: 1, quote: "Redmere Estates Ltd" }] },
    company_number: { state: "Found", value: "11456209", source: { doc: "D2", page: 1, quote: "Company number 11456209" } },
    registered_address: { state: "Found", value: "88 Wilmslow Road, Manchester M14 5TQ", source: { doc: "D1", page: 1, quote: "88 Wilmslow Road" } },
    directors: { state: "Found", value: "Joanne Redmond and Patrick Redmond", source: { doc: "D1", page: 1, quote: "Joanne Redmond and Patrick Redmond" } },
    experience: { state: "Found", value: "Over 15 years in Greater Manchester retail property", source: { doc: "D1", page: 1, quote: "for over 15 years" } },
    adverse_credit: { state: "Found", value: "None", source: { doc: "D2", page: 1, quote: "No county court judgments recorded" } },
    accounts_year_end: { state: "Found", value: "2026-06-30", source: { doc: "D2", page: 1, quote: "year ended 30 June 2026" } },
    property_address: { state: "Found", value: "1 to 7 Hulme Parade, Stockport Road, Manchester M13 0QX", source: { doc: "D4", page: 1, quote: "1 to 7 Hulme Parade, Stockport Road" } },
    property_country: { state: "Found", value: "England", source: { doc: "D4", page: 1, quote: "Manchester M13 0QX" } },
    property_type: { state: "Found", value: "Retail parade", source: { doc: "D4", page: 1, quote: "Parade of seven ground floor shops" } },
    tenure: { state: "Found", value: "Freehold", source: { doc: "D4", page: 1, quote: "Freehold" } },
    property_value: { state: "Found", value: 2450000, source: { doc: "D1", page: 1, quote: "£2,450,000 (August 2026)" }, others: [{ value: "2450000", doc: "D4", page: 1, quote: "Market value £2,450,000" }] },
    value_basis: { state: "Found", value: "Valuation", source: { doc: "D4", page: 1, quote: "Valuation report" } },
    valuation_date: { state: "Found", value: "2026-08-20", source: { doc: "D4", page: 1, quote: "20 August 2026" } },
    valuer: { state: "Found", value: "Pennington Rhodes LLP", source: { doc: "D4", page: 1, quote: "Pennington Rhodes LLP" } },
    epc_rating: { state: "Found", value: "D", source: { doc: "D4", page: 1, quote: "D (all units)" } },
    annual_rent: { state: "Found", value: 186000, source: { doc: "D1", page: 1, quote: "Income: £186,000 per annum" }, others: [{ value: 158000, doc: "D3", page: 1, quote: "Total 158,000" }, { value: "£158,000", doc: "D4", page: 1, quote: "£158,000 per annum (six units let)" }] },
  },
  tenants: [
    { name: "Kaya Pharmacy Ltd", annual_rent: 32000, lease_end: "2033-03-24", source: { doc: "D3", page: 1, quote: "Kaya Pharmacy Ltd" } },
    { name: "Mama Rosa's (Manchester) Ltd", annual_rent: 38000, lease_end: "2032-09-28", source: { doc: "D3", page: 1, quote: "Mama Rosa's" } },
    { name: "Hulme Convenience Ltd", annual_rent: 27000, lease_end: "2029-06-23" },
    { name: "Bright Smile Dental Ltd", annual_rent: 29000, lease_end: "2031-12-24" },
    { name: "Northern Vape Co Ltd", annual_rent: 14000, lease_end: "2027-03-24" },
    { name: "Ironside Barbers (sole trader)", annual_rent: 18000, lease_end: null, note: "Holding over, lease end to be confirmed" },
  ],
};
const memo = {
  judgements: [
    { area: "Property type", outcome: "Pass", evidence: "Retail parade", explanation: "Retail is within appetite.", source: { doc: "D4", page: 1 } },
    { area: "Borrower", outcome: "Pass", evidence: "UK limited company, two director guarantees", explanation: "UK company with personal guarantees offered.", source: { doc: "D1", page: 1 } },
    { area: "Tenant covenant", outcome: "Unclear", evidence: "Local independent tenants", explanation: "Mostly small local tenants; covenant strength not evidenced.", source: { doc: "D3", page: 1 } },
    { area: "Experience", outcome: "Pass", evidence: "15 years", explanation: "Long track record in local retail property.", source: { doc: "D1", page: 1 } },
    { area: "Adverse credit", outcome: "Pass", evidence: "No CCJs", explanation: "No adverse recorded.", source: { doc: "D2", page: 1 } },
  ],
  memo: {
    proposal: "£1,600,000 [D1 p1] interest only loan over 7 years [D1 p1] to refinance 1 to 7 Hulme Parade. Pay rate 7.5% [D1 p1]. LTV 65.3% on the £2,450,000 valuation [D4 p1]. ICR 1.32x on passing rent of £158,000 [D3 p1], below the 1.5x minimum.",
    financial_analysis: "Passing rent is £158,000 [D3 p1], not the £186,000 in the broker's email [D1 p1], which appears to include the vacant Unit 7 at its estimated rental value of £28,000 [D4 p1].\n\n- Red: ICR 1.32x against 1.5x minimum.\n- Amber: LTV 65.3% is within 10% of the 70% limit.",
    borrower: "Redmere Estates Ltd, company 11456209 [D1 p1]. Directors Joanne and Patrick Redmond, both offering guarantees [D1 p1]. Rental income fell from £183,900 to £171,200 [D2 p1].",
    property: "Freehold parade of seven shops [D4 p1], valued at £2,450,000 on 20 August 2026 by Pennington Rhodes LLP [D4 p1]. EPC D [D4 p1].",
    income: "Six of seven units let for £158,000 [D3 p1]. Unit 6 is holding over [D3 p1]. Unit 7 vacant since May 2026 [D4 p1].",
    risks: "- Risk: Interest cover below policy. Mitigant: Reduce the loan or let Unit 7 before drawdown.\n- Risk: Vacancy and holding over. Mitigant: New lease for Unit 6 as a condition.",
    conditions: "- New lease for Unit 6 before drawdown\n- Personal guarantees from both directors\n- Rent account confirming £158,000 passing rent",
  },
  broker_request: "Hi Ravi,\n\nThanks for sending Hulme Parade through. Before we go further, could you help with:\n- The rent: your email says £186,000 but the tenancy schedule shows £158,000\n- The position on Unit 6, which is holding over\n\nThanks,\n[Your name]",
};

const financials = { entity: "Redmere Estates Ltd", basis: "Summary", periods: [{ label: "FY2026", end: "2026-06-30" }, { label: "FY2025", end: "2025-06-30" }],
  lines: [
    { key: "rental_income", values: [171200, 183900], source: { doc: "D2", page: 1, quote: "Rental income" } },
    { key: "property_costs", values: [22400, 19800], source: { doc: "D2", page: 1, quote: "Property costs" } },
    { key: "finance_costs", values: [96300, 94100], source: { doc: "D2", page: 1, quote: "Finance costs" } },
    { key: "profit_before_tax", values: [52500, 70000], source: { doc: "D2", page: 1, quote: "Profit before tax" } },
    { key: "net_assets", values: [1104000, 1061000], source: { doc: "D2", page: 1, quote: "Net assets" } },
  ],
  guarantors: [], observations: [{ text: "Rental income fell from £183,900 to £171,200.", source: { doc: "D2", page: 1 } }], missing: ["Balance sheet detail, including bank debt", "Guarantor statements of assets and liabilities"] };
const conditions = { conditions: [
  { type: "Condition precedent", text: "First legal charge over 1 to 7 Hulme Parade", from: "B1", reason: "Standard security" },
  { type: "Condition precedent", text: "Personal guarantees from Joanne and Patrick Redmond", from: "B9", reason: "Directors offered guarantees" },
  { type: "Financial covenant", text: "ICR not below 1.35x, tested quarterly", from: "B17", reason: "ICR is below policy" },
  { type: "Condition subsequent", text: "New lease for Unit 6 within 3 months of drawdown", from: "Case specific", reason: "Tenant holding over" },
  { type: "Condition precedent", text: "Redemption statement from the existing lender", from: "B6", reason: "Refinance" },
] };
(async () => {
  const browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {});
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const V = process.env.PDFJS_DIR || path.join(__dirname, "..", "vendor", "package", "build");
  await ctx.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\/3\.11\.174\/(pdf(\.worker)?\.min\.js)/, (route) => { const f = route.request().url().split("/").pop(); route.fulfill({ path: path.join(V, f), contentType: "application/javascript" }); });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  let prompts = [];
  await page.exposeFunction("__mockAI", (purpose, prompt) => (purpose === "triage" ? { is_deal: /Refinance|Re:/.test(prompt), reason: /Refinance|Re:/.test(prompt) ? "Broker refinance request" : "Not a loan request" } : purpose === "extract" ? extraction : purpose === "conditions" ? conditions : purpose === "financials" ? financials : memo));
  await page.exposeFunction("__logPrompt", (p) => { prompts.push(p); });
  await page.addInitScript(() => { window.__testAI = async (prompt, images, purpose) => { await window.__logPrompt(prompt.slice(0, 200000)); await new Promise((r) => setTimeout(r, 400)); return window.__mockAI(purpose, prompt); }; });
  await page.goto("file://" + path.join(__dirname, "../index.html"));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: OUT + "/1-new.png" });
  await page.click('button[data-sample="inconsistent"]');
  await page.waitForSelector(".memo-sec", { timeout: 20000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + "/2-memo.png", fullPage: true });
  await page.click('button[data-tab="source"]');
  await page.waitForSelector("#main .pdfpage img", { timeout: 10000 });
  console.log("Source tab page image:", await page.locator("#main .pdfpage img").count(), "highlights:", await page.locator("#main .hlbox").count());
  await page.screenshot({ path: OUT + "/3-source.png" });
  await page.click('button[data-field="company_number"]');
  console.log("Company number line:", await page.locator('button[data-field="company_number"] .from').innerText(), "|", await page.locator(".card.sticky .hint").first().innerText());
  await page.click('button[data-tab="memo"]');
  await page.locator('.memo-body button.ref').first().click();
  await page.waitForSelector("#srcBody .pdfpage img, #srcBody .pagetext.paper", { timeout: 10000 });
  await page.waitForTimeout(400);
  console.log("Panel open:", await page.locator("#sourceModal:not([hidden])").count(), "image:", await page.locator("#srcBody .pdfpage img").count(), "highlights:", await page.locator("#srcBody .hlbox").count());
  await page.screenshot({ path: OUT + "/3b-panel.png" });
  await page.evaluate(() => openSource("D2", 1, "Company number 11456209"));
  await page.waitForSelector("#srcBody .pdfpage img", { timeout: 10000 });
  console.log("PDF panel highlights:", await page.locator("#srcBody .hlbox").count());
  await page.screenshot({ path: OUT + "/3c-panel-pdf.png" });
  await page.keyboard.press("Escape");
  await page.click('button[data-tab="source"]');
  await page.click('button[data-tab="fin"]');
  console.log("Financials rows:", await page.locator("#main table.t tbody tr").count(), "flags:", await page.locator("#main .ready li").count());
  await page.screenshot({ path: OUT + "/3d-financials.png", fullPage: true });
  await page.click('button[data-tab="policy"]');
  await page.screenshot({ path: OUT + "/4-policy.png", fullPage: true });
  await page.click('button[data-tab="memo"]');
  await page.screenshot({ path: OUT + "/5-decision.png", fullPage: true });
  await page.click('button[data-view="cases"]');
  await page.screenshot({ path: OUT + "/6-cases.png" });
  // edit field: fix rent to 186000 to see recompute
  await page.click('button[data-case]');
  await page.click('button[data-tab="source"]');
  await page.click('button[data-act="edit-field"]');
  await page.fill("#fieldEdit", "186000");
  await page.click('button[data-act="save-field"]');
  const icr = await page.locator(".tile").nth(2).innerText();
  console.log("ICR tile after edit:", icr.replace(/\n/g, " | "));
  await page.click('button[data-tab="memo"]');
  console.log("Stale banner:", await page.locator(".stale").count());
  console.log("Memo refs highlighted:", await page.evaluate(() => { const bs = [...document.querySelectorAll(".memocard button.ref[data-ctx]")]; return bs.filter((b) => quoteFor(cur(), b.dataset.src, b.dataset.page, b.dataset.ctx)).length + " of " + bs.length; }));
  await page.locator(".memocard button.ref[data-ctx]").first().click();
  console.log("Memo ref panel:", await page.locator("#srcBody .qnote").count() ? await page.locator("#srcBody .qnote").innerText() : "no highlight");
  await page.screenshot({ path: OUT + "/3e-memo-ref.png" });
  await page.keyboard.press("Escape");
  // Companies House (mocked)
  await page.route("https://api.company-information.service.gov.uk/**", async (route) => {
    const u = route.request().url(); const auth = route.request().headers()["authorization"] || "";
    const j = (b) => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(b) });
    if (!auth.startsWith("Basic ")) return route.fulfill({ status: 401, body: "" });
    if (u.includes("/officers")) return j({ items: [{ name: "REDMOND, Joanne", officer_role: "director", appointed_on: "2017-03-01" }, { name: "REDMOND, Patrick", officer_role: "director", appointed_on: "2017-03-01" }, { name: "SHAW, Alan", officer_role: "director", appointed_on: "2024-01-10" }] });
    if (u.includes("/persons-with-significant-control")) return j({ items: [{ name: "Mrs Joanne Redmond", natures_of_control: ["ownership-of-shares-50-to-75-percent"] }] });
    if (u.includes("/charges")) return j({ items: [{ status: "outstanding", created_on: "2019-05-02", persons_entitled: [{ name: "Northern High Street Bank plc" }] }] });
    if (u.includes("/search/companies")) return j({ items: [{ title: "REDMERE ESTATES LIMITED", company_number: "11456209" }] });
    return j({ company_name: "REDMERE ESTATES LIMITED", company_number: "11456209", company_status: "active", date_of_creation: "2017-02-14", registered_office_address: { address_line_1: "88 Wilmslow Road", locality: "Manchester", postal_code: "M14 5TQ" }, has_insolvency_history: false, accounts: { overdue: false } });
  });
  await page.evaluate(() => { settings.chKey = "test-ch-key"; });
  await page.click('button[data-tab="policy"]');
  await page.waitForFunction(() => cur().ch && !cur().ch.running, null, { timeout: 10000 });
  console.log("Companies House:", await page.evaluate(() => cur().ch.error || cur().ch.findings.map((f) => f.tone + ": " + f.text).join(" | ")));
  console.log("Memo external:", await page.evaluate(() => cur().memo.external.text.slice(0, 90)));
  await page.screenshot({ path: OUT + "/4b-companies-house.png", fullPage: true });
  // rerun a single agent from Agents at work
  await page.click('button[data-tab="agents"]');
  const memoAt = await page.evaluate(() => cur().memo.summary && cur().memo.summary.at);
  const aiCalls0 = await page.evaluate(() => (window.__aiCalls || 0));
  await page.click('button[data-act="rerun-one"][data-step="ch"]');
  await page.waitForFunction(() => !cur().run.running, null, { timeout: 10000 });
  await page.click('button[data-act="rerun-one"][data-step="policy"]');
  await page.waitForFunction(() => !cur().run.running, null, { timeout: 10000 });
  const rr = await page.evaluate(() => ({ steps: cur().run.steps.map((s) => s.id + ":" + s.state).join(","), stale: !!cur().memoStale, memoSame: (cur().memo.summary && cur().memo.summary.at), buttons: document.querySelectorAll('[data-act="rerun-one"]').length }));
  console.log("Rerun one agent:", JSON.stringify(rr), "memo kept:", rr.memoSame === memoAt);
  if (rr.memoSame !== memoAt || !rr.stale || rr.buttons !== 5 || /error|active/.test(rr.steps)) throw new Error("single-agent rerun failed");
  await page.screenshot({ path: OUT + "/4c-rerun-one.png", fullPage: true });
  await page.evaluate(() => { cur().memoStale = false; });
  await page.click('button[data-tab="memo"]');
  // the RM's own view
  await page.click('button[data-act="submit-uw"]');
  console.log("Blocked without view, now on:", await page.evaluate(() => currentTab));
  await page.click('button[data-act="rmv-choice"][data-key="sponsor"][data-choice="Met them"]');
  await page.fill('textarea[data-rmv="sponsor"]', "Known to us for 8 years through two previous loans, both repaid early. Patrick runs the portfolio day to day.");
  await page.fill('textarea[data-rmv="story"]', "Refinance away from a high street bank that is exiting secondary retail. Exit by refinance or sale of the parade once Unit 7 is let.");
  for (const el of await page.locator("textarea[data-rmq]").all()) await el.fill("Discussed with the broker on 4 Nov: covered in the conditions.");
  await page.click('button[data-act="rmv-rec"][data-choice="Support with conditions"]');
  await page.fill('input[data-wi="rate"]', "7.5");
  await page.click('button[data-act="wi-max"]');
  console.log("What-if max loan:", await page.evaluate(() => rmView(cur()).wi.L), "|", (await page.locator("#wiOut .hint").innerText()));
  await page.click('button[data-act="wi-propose"]');
  console.log("View missing:", await page.evaluate(() => rmViewMissing(cur()).join(", ") || "none"));
  await page.screenshot({ path: OUT + "/5w-rm-view.png", fullPage: true });
  await page.click('button[data-tab="fin"]');
  console.log("Stress rows:", await page.evaluate(() => stressRows(cur()).map((r) => r.label + " " + times(r.icr) + " " + r.icrRag).slice(0, 4).join(" / ")));
  await page.fill('input[data-stress="rent"]', "-15");
  console.log("Custom stress:", await page.locator("#stressOut").innerText());
  await page.screenshot({ path: OUT + "/3f-stress.png", fullPage: true });
  await page.click('button[data-tab="memo"]');
  console.log("Memo has RM assessment:", (await page.locator(".memocard .rmsec").innerText()).slice(0, 120).replace(/\n/g, " / "));
  await page.fill("#rmNote", "Rent confirmed at £158k with the broker. Unit 6 lease renewal in hand.");
  await page.screenshot({ path: OUT + "/5a-rm-submit.png", fullPage: true });
  await page.click('button[data-act="submit-uw"]');
  console.log("Stage after submit:", await page.locator(".casecard .chip.c-amber").first().innerText());
  await page.click('.rolebox button[data-role="Underwriter"]');
  console.log("UW lands on:", await page.evaluate(() => currentTab), "| next bar:", await page.locator(".nextbar p").innerText());
  await page.screenshot({ path: OUT + "/5r-review-start.png", fullPage: true });
  await page.click('button[data-tab="decision"]');
  await page.waitForSelector(".cond", { timeout: 10000 });
  console.log("Your action chip:", await page.locator(".casecard .chip.c-red").count());
  await page.click('button[data-tab="memo"]');
  await page.locator('button[data-act="comment"]').first().click();
  await page.fill("#cmtEdit", "Please confirm the Unit 6 position before completion.");
  await page.click('button[data-act="save-cmt"]');
  console.log("Comments:", await page.locator(".cmt").count());
  await page.click('button[data-tab="decision"]');
  const n = await page.locator('button[data-act="cond-accept"]').count();
  console.log("Conditions suggested:", n);
  await page.locator('button[data-act="cond-reject"]').last().click();
  while (await page.locator('.cond.suggested button[data-act="cond-accept"]').count()) await page.locator('.cond.suggested button[data-act="cond-accept"]').first().click();
  await page.fill("#condText", "Rent deposit of six months from Ironside Barbers");
  await page.click('button[data-act="cond-add"]');
  await page.selectOption("#decGrade", "5");
  await page.click('input[value="Approve"]');
  await page.fill("#decRationale", "Strong LTV and experienced sponsor.");
  if (await page.locator("#decException").count()) {
    await page.click('button[data-act="record"]');
    console.log("Msg without exception reason:", await page.locator("#decMsg").innerText());
    await page.fill("#decException", "ICR 1.32x on passing rent; mitigated by 65% LTV and guarantees.");
  } else console.log("No policy exception after the rent correction");
  await page.screenshot({ path: OUT + "/5b-uw-decide.png", fullPage: true });
  await page.click('button[data-act="record"]');
  console.log("Status:", await page.locator(".casecard .chip.c-amber").first().innerText());
  await page.screenshot({ path: OUT + "/5c-decided.png", fullPage: true });
  // pricing and terms
  await page.click('.rolebox button[data-role="Relationship Manager"]');
  await page.click('button[data-tab="pricing"]');
  console.log("Grid margin:", await page.locator("#prMargin").inputValue());
  await page.fill("#prMargin", "3.5");
  await page.click('button[data-act="price-submit"]');
  console.log("Reason msg:", await page.locator("#prMsg").innerText());
  await page.fill("#prReason", "Matching a competing lender's terms");
  await page.click('button[data-act="price-submit"]');
  await page.click('.rolebox button[data-role="Commercial"]');
  console.log("Commercial lands on:", await page.evaluate(() => currentTab), "action chip:", await page.locator(".casecard .chip.c-red").count());
  await page.screenshot({ path: OUT + "/5p-commercial.png", fullPage: true });
  await page.click('button[data-act="price-sign"]');
  console.log("Pricing status:", await page.evaluate(() => cur().pricing.status));
  await page.click('button[data-view="cases"]');
  await page.screenshot({ path: OUT + "/6c-pricing-queue.png", fullPage: true });
  await page.click('.rolebox button[data-role="Relationship Manager"]');
  await page.click('button[data-view="case"]');
  await page.click('button[data-tab="pricing"]');
  await page.click('button[data-act="terms-make"]');
  const terms = await page.locator(".termsdoc").innerText();
  console.log("Terms has rate:", /7\.5% a year/.test(terms), "has Unit 6 condition:", /Unit 6/.test(terms), "has rent deposit:", /Rent deposit/.test(terms));
  await page.screenshot({ path: OUT + "/5e-terms.png", fullPage: true });
  await page.click('button[data-act="terms-issue"]');
  console.log("Final status:", await page.locator(".casecard .chip.c-amber").first().innerText());
  await page.click('button[data-tab="audit"]');
  console.log("Audit rows:", await page.locator(".audit li").count());
  // second case: policy exception and return to RM
  await page.click('.rolebox button[data-role="Relationship Manager"]');
  await page.click('button[data-view="new"]');
  await page.click('button[data-sample="inconsistent"]');
  await page.waitForSelector(".memo-sec", { timeout: 20000 });
  await page.waitForFunction(() => cur().run && !cur().run.running, null, { timeout: 20000 });
  console.log("CH agent step:", await page.evaluate(() => { const st = cur().run.steps.find((x) => x.id === "ch"); const k = cur().checks.find((x) => x.id === "ch"); return st.state + " | " + st.detail + " | check: " + (k ? k.outcome + "/" + k.flag : "none"); }));
  await page.click('button[data-tab="memo"]');
  await page.evaluate(() => { const v = rmView(cur()); v.a.sponsor = "Known sponsor."; v.a.story = "Refinance."; creditQuestions(cur()).forEach((q) => (v.qa[q.key] = "Answered.")); v.rec = "Support"; save(); render(); });
  await page.click('button[data-act="submit-uw"]');
  await page.click('.rolebox button[data-role="Underwriter"]');
  await page.click('button[data-view="cases"]');
  await page.screenshot({ path: OUT + "/6d-review-queue.png", fullPage: true });
  await page.locator('.qcard button[data-opentab="review"]').first().click();
  console.log("Opened on:", await page.evaluate(() => currentTab));
  await page.click('button[data-act="rv-next"]');
  const nf = await page.evaluate(() => reviewFlags(cur()).length);
  console.log("Flags to answer:", nf);
  await page.click('button[data-act="rv-flag-next"]');
  console.log("No answer msg:", await page.locator("#rvMsg").innerText());
  for (let i = 0; i < nf; i++) {
    const ch = i === 0 ? "rm" : i === 1 ? "condition" : "accept";
    await page.click(`button[data-act="rv-ans"][data-choice="${ch}"]`);
    if (ch !== "accept") await page.fill("#rvNote", ch === "rm" ? "A copy of the Unit 6 lease" : "Before drawdown: six months' rent deposit from the Unit 6 tenant");
    if (i === 0) await page.screenshot({ path: OUT + "/5s-review-flag.png", fullPage: true });
    await page.click('button[data-act="rv-flag-next"]');
  }
  await page.click('button[data-act="rv-comfort"][data-choice="yes"]');
  await page.screenshot({ path: OUT + "/5t-review-numbers.png", fullPage: true });
  await page.click('button[data-act="rv-next"]');
  await page.waitForFunction(() => !(cur().conditionsRun || {}).running, null, { timeout: 15000 });
  await page.waitForTimeout(300);
  if (await page.locator('button[data-act="cond-accept-base"]').count()) await page.click('button[data-act="cond-accept-base"]');
  while (await page.locator('.cond.suggested button[data-act="cond-accept"]').count()) await page.locator('.cond.suggested button[data-act="cond-accept"]').first().click();
  await page.click('button[data-act="rv-next"]');
  await page.click('button[data-act="rv-grade"][data-grade="6"]');
  await page.screenshot({ path: OUT + "/5u-review-grade.png", fullPage: true });
  await page.click('button[data-act="rv-next"]');
  console.log("Suggested:", await page.locator('input[name="decChoice"]:checked').getAttribute("value"), "| rationale:", (await page.locator("#decRationale").inputValue()).replace(/\n/g, " / "));
  await page.screenshot({ path: OUT + "/5v-review-decide.png", fullPage: true });
  await page.click('button[data-act="record"]');
  console.log("After return:", await page.locator(".casecard .chip.c-amber").first().innerText());
  await page.click('.rolebox button[data-role="Relationship Manager"]');
  console.log("RM next bar:", await page.locator(".nextbar p").innerText());
  if (await page.locator('.nextbar button[data-tab="memo"]').count()) await page.click('.nextbar button[data-tab="memo"]'); else await page.click('button[data-tab="memo"]');
  console.log("RM sees return note:", await page.locator(".errbox").count());
  await page.click('button[data-act="submit-uw"]');
  await page.click('.rolebox button[data-role="Underwriter"]');
  console.log("Resubmitted, review at step:", await page.evaluate(() => cur().review.step), await page.evaluate(() => currentTab));
  await page.click('button[data-act="rv-next"]');
  for (let i = 0; i < nf; i++) {
    if (i === 0) await page.click('button[data-act="rv-ans"][data-choice="accept"]');
    await page.click('button[data-act="rv-flag-next"]');
  }
  await page.click('button[data-act="rv-next"]');
  await page.click('button[data-act="rv-next"]');
  await page.click('button[data-act="rv-next"]');
  console.log("Second suggested:", await page.locator('input[name="decChoice"]:checked').getAttribute("value"));
  await page.click('button[data-act="record"]');
  console.log("Exception msg:", await page.locator("#decMsg").innerText());
  if (await page.locator("#decException").count()) await page.fill("#decException", "ICR 1.32x mitigated by 65% LTV and guarantees.");
  await page.screenshot({ path: OUT + "/5d-exception.png", fullPage: true });
  await page.click('button[data-act="record"]');
  console.log("Second status:", await page.locator(".casecard .chip.c-amber").first().innerText());
  await page.click('button[data-view="cases"]');
  await page.screenshot({ path: OUT + "/6b-cases-uw.png" });
  // deals inbox: mocked Google Apps Script web app
  const fs = require("fs");
  const pdfB64 = fs.readFileSync(path.join(__dirname, "samples/inconsistent/Tenancy schedule - Hulme Parade.pdf")).toString("base64");
  const gas = { calls: [], round: 0 };
  await ctx.route(/script\.google\.com\/macros/, async (route) => {
    const req = route.request(); const u = new URL(req.url());
    const p = req.method() === "POST" ? JSON.parse(req.postData() || "{}") : Object.fromEntries(u.searchParams);
    gas.calls.push(p.action);
    let body = { ok: true };
    if (p.key !== "demo-key") body = { error: "The key does not match the one in the script." };
    else if (p.action === "ping") body = { ok: true, inbox: "nashflow.deals.demo@gmail.com" };
    else if (p.action === "list") {
      gas.round++;
      const all = [{ id: "m1", threadId: "t1", from: "Ravi Sandhu <ravi@sandhufinance.example>", to: "nashflow.deals.demo@gmail.com", subject: "Refinance request - Redmere Estates Ltd - Hulme Parade", date: "2026-11-05T08:05:00Z", body: "Borrower: Redmere Estates Ltd. Loan: £1,600,000, term 7 years.", attachments: [{ name: "Tenancy schedule - Hulme Parade.pdf", type: "application/pdf", b64: pdfB64 }] }, { id: "g1", threadId: "tg", from: "Google <no-reply@accounts.google.com>", subject: "Security alert", date: "2026-11-05T08:00:00Z", body: "Recovery email was set up", attachments: [] }, { id: "g2", threadId: "tg2", from: "Pat Jones <pat@example.com>", subject: "Lunch on Friday?", date: "2026-11-05T08:01:00Z", body: "Fancy lunch?", attachments: [] }].concat(gas.round >= 3 ? [{ id: "m2", threadId: "t1", from: "Ravi Sandhu <ravi@sandhufinance.example>", subject: "Re: Refinance request", date: "2026-11-05T10:00:00Z", body: "Unit 6 lease attached.", attachments: [{ name: "Unit 6 lease.pdf", type: "application/pdf", b64: pdfB64 }] }] : []);
      gas.all = all; body = { ok: true, version: 2, messages: all.map((x) => ({ id: x.id, threadId: x.threadId, from: x.from, subject: x.subject, date: x.date })) };
    }
    else if (p.action === "get") body = { ok: true, message: gas.all.find((x) => x.id === p.id) };
    else if (p.action === "send") body = p.threadId === "t1" && p.body ? { ok: true } : { error: "bad send" };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.click('.rolebox button[data-role="Relationship Manager"]');
  await page.click('button[data-view="inbox"]');
  await page.click('button[data-act="inbox-settings"]');
  await page.fill("#ibUrl", "https://script.google.com/macros/s/TEST/exec");
  await page.fill("#ibKey", "demo-key");
  await page.check("#ibChase");
  await page.click('button[data-act="inbox-test"]');
  await page.waitForTimeout(300);
  await page.click('button[data-act="inbox-check"]');
  await page.waitForFunction(() => cases.some((c) => c.source && c.memo && c.chase && c.chase.sent.length), null, { timeout: 20000 });
  console.log("Cases from email:", await page.evaluate(() => cases.filter((x) => x.source).length), "ignored:", await page.evaluate(() => (inboxState.ignored || []).map((x) => x.reason).join(" / ")));
  console.log("Inbox case:", await page.evaluate(() => { const c = cases.find((x) => x.source); return [c.ref, c.title, c.docs.length + " docs", c.chase.sent.length + " sent", c.status].join(" | "); }));
  await page.screenshot({ path: OUT + "/8-inbox.png", fullPage: true });
  await page.click('button[data-act="inbox-check"]');
  await page.waitForTimeout(800);
  await page.click('button[data-act="inbox-check"]');
  await page.waitForTimeout(1000);
  await page.waitForFunction(() => { const c = cases.find((x) => x.source); return c.docs.length === 4 && c.memo && !c.run.running; }, null, { timeout: 20000 });
  console.log("After reply:", await page.evaluate(() => { const c = cases.find((x) => x.source); return [c.docs.length + " docs", (c.chase.replies || []).length + " replies", c.chase.sent.length + " sent"].join(" | "); }));
  await page.evaluate(() => { const c = cases.find((x) => x.source); currentId = c.id; view = "case"; currentTab = "comms"; render(); });
  await page.click('button[data-act="chase-remind"]');
  await page.click('button[data-act="chase-remind"]');
  await page.click('button[data-view="inbox"]');
  console.log("Inbox threads:", await page.locator(".thr").count(), "| mails in first:", await page.locator(".mail").count(), "| settings shown:", await page.locator("#ibUrl").count());
  await page.screenshot({ path: OUT + "/8b-inbox-thread.png", fullPage: true });
  console.log("Flag RM:", await page.evaluate(() => cases.find((x) => x.source).chase.flagRM), "GAS calls:", gas.calls.join(","));
  await page.screenshot({ path: OUT + "/9-chase.png", fullPage: true });
  // stop and delete
  await page.click('button[data-view="new"]');
  await page.evaluate(() => { window.__slow = true; });
  await page.click('button[data-sample="clean"]');
  await page.waitForSelector('button[data-act="stop-run"]');
  await page.click('button[data-act="stop-run"]');
  await page.waitForFunction(() => cur().run && !cur().run.running, null, { timeout: 15000 });
  console.log("Stopped run error:", await page.evaluate(() => cur().run.error));
  const before = await page.evaluate(() => cases.length);
  await page.click('button[data-view="cases"]');
  await page.locator('button[data-delcase]').first().click();
  await page.locator('button[data-delcase]').first().click();
  console.log("Deleted from list:", before, "->", await page.evaluate(() => cases.length));
  // mobile
  const m = await browser.newPage({ viewport: { width: 400, height: 860 } });
  await m.addInitScript(() => { window.__testAI = async () => { throw new Error("x"); }; });
  await m.goto("file://" + path.join(__dirname, "../index.html"));
  await m.waitForTimeout(1200);
  await m.click('button[data-view="cases"]').catch(() => {});
  await m.screenshot({ path: OUT + "/7-mobile.png", fullPage: true });
  const sw = await m.evaluate(() => document.documentElement.scrollWidth);
  console.log("mobile scrollWidth", sw);
  // extracted text sample
  const p0 = prompts[0] || "";
  console.log("PROMPT excerpt:", p0.slice(p0.indexOf("DOCUMENT D3"), p0.indexOf("DOCUMENT D3") + 700));
  console.log("errors:", errors);
  await browser.close();
})();
