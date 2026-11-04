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
  await page.exposeFunction("__mockAI", (purpose) => (purpose === "extract" ? extraction : purpose === "conditions" ? conditions : purpose === "financials" ? financials : memo));
  await page.exposeFunction("__logPrompt", (p) => { prompts.push(p); });
  await page.addInitScript(() => { window.__testAI = async (prompt, images, purpose) => { await window.__logPrompt(prompt.slice(0, 200000)); await new Promise((r) => setTimeout(r, 400)); return window.__mockAI(purpose); }; });
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
  await page.click('button[data-tab="decision"]');
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
  await page.click('button[data-tab="decision"]');
  await page.fill("#rmNote", "Rent confirmed at £158k with the broker. Unit 6 lease renewal in hand.");
  await page.screenshot({ path: OUT + "/5a-rm-submit.png", fullPage: true });
  await page.click('button[data-act="submit-uw"]');
  console.log("Stage after submit:", await page.locator(".casecard .chip.c-amber").first().innerText());
  await page.click('.rolebox button[data-role="Underwriter"]');
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
  await page.click('button[data-tab="audit"]');
  console.log("Audit rows:", await page.locator(".audit li").count());
  // second case: policy exception and return to RM
  await page.click('.rolebox button[data-role="Relationship Manager"]');
  await page.click('button[data-view="new"]');
  await page.click('button[data-sample="inconsistent"]');
  await page.waitForSelector(".memo-sec", { timeout: 20000 });
  await page.click('button[data-tab="decision"]');
  await page.click('button[data-act="submit-uw"]');
  await page.click('.rolebox button[data-role="Underwriter"]');
  await page.waitForSelector(".cond", { timeout: 10000 });
  await page.click('input[value="Return to the RM"]');
  await page.fill("#decRationale", "Get the Unit 6 lease position from the broker.");
  await page.click('button[data-act="record"]');
  console.log("After return:", await page.locator(".casecard .chip.c-amber").first().innerText());
  await page.click('.rolebox button[data-role="Relationship Manager"]');
  console.log("RM sees return note:", await page.locator(".errbox").count());
  await page.click('button[data-act="submit-uw"]');
  await page.click('.rolebox button[data-role="Underwriter"]');
  await page.waitForSelector(".cond");
  while (await page.locator('.cond.suggested button[data-act="cond-accept"]').count()) await page.locator('.cond.suggested button[data-act="cond-accept"]').first().click();
  await page.selectOption("#decGrade", "6");
  await page.click('input[value="Approve"]');
  await page.fill("#decRationale", "Acceptable with conditions.");
  await page.click('button[data-act="record"]');
  console.log("Exception msg:", await page.locator("#decMsg").innerText());
  await page.fill("#decException", "ICR 1.32x mitigated by 65% LTV and guarantees.");
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
      body = { ok: true, messages: gas.round === 1 ? [{ id: "m1", threadId: "t1", from: "Ravi Sandhu <ravi@sandhufinance.example>", to: "nashflow.deals.demo@gmail.com", subject: "Refinance request - Redmere Estates Ltd - Hulme Parade", date: "2026-11-05T08:05:00Z", body: "Borrower: Redmere Estates Ltd. Loan: £1,600,000, term 7 years.", attachments: [{ name: "Tenancy schedule - Hulme Parade.pdf", type: "application/pdf", b64: pdfB64 }] }]
        : gas.round === 3 ? [{ id: "m2", threadId: "t1", from: "Ravi Sandhu <ravi@sandhufinance.example>", subject: "Re: Refinance request", date: "2026-11-05T10:00:00Z", body: "Unit 6 lease attached.", attachments: [{ name: "Unit 6 lease.pdf", type: "application/pdf", b64: pdfB64 }] }] : [] };
    }
    else if (p.action === "send") body = p.threadId === "t1" && p.body ? { ok: true } : { error: "bad send" };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.click('.rolebox button[data-role="Relationship Manager"]');
  await page.click('button[data-view="inbox"]');
  await page.fill("#ibUrl", "https://script.google.com/macros/s/TEST/exec");
  await page.fill("#ibKey", "demo-key");
  await page.check("#ibChase");
  await page.click('button[data-act="inbox-test"]');
  await page.waitForTimeout(300);
  await page.click('button[data-act="inbox-check"]');
  await page.waitForFunction(() => cases.some((c) => c.source && c.memo && c.chase && c.chase.sent.length), null, { timeout: 20000 });
  console.log("Inbox case:", await page.evaluate(() => { const c = cases.find((x) => x.source); return [c.ref, c.title, c.docs.length + " docs", c.chase.sent.length + " sent", c.status].join(" | "); }));
  await page.screenshot({ path: OUT + "/8-inbox.png", fullPage: true });
  await page.click('button[data-act="inbox-check"]');
  await page.waitForTimeout(800);
  await page.click('button[data-act="inbox-check"]');
  await page.waitForTimeout(1000);
  await page.waitForFunction(() => { const c = cases.find((x) => x.source); return c.docs.length === 4 && c.memo && !c.run.running; }, null, { timeout: 20000 });
  console.log("After reply:", await page.evaluate(() => { const c = cases.find((x) => x.source); return [c.docs.length + " docs", (c.chase.replies || []).length + " replies", c.chase.sent.length + " sent"].join(" | "); }));
  await page.evaluate(() => { const c = cases.find((x) => x.source); currentId = c.id; view = "case"; currentTab = "memo"; render(); });
  await page.click('button[data-act="chase-remind"]');
  await page.click('button[data-act="chase-remind"]');
  console.log("Flag RM:", await page.evaluate(() => cases.find((x) => x.source).chase.flagRM), "GAS calls:", gas.calls.join(","));
  await page.screenshot({ path: OUT + "/9-chase.png", fullPage: true });
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
