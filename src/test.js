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
    company_number: { state: "Found", value: "11456209", source: { doc: "D1", page: 1, quote: "company number 11456209" } },
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
  await page.exposeFunction("__mockAI", (purpose) => (purpose === "extract" ? extraction : memo));
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
  await page.screenshot({ path: OUT + "/3-source.png", fullPage: true });
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
  await page.click('input[value="Escalate to Credit Committee"]');
  await page.fill("#decRationale", "ICR below policy on passing rent.");
  await page.click('button[data-act="record"]');
  console.log("Status:", await page.locator(".casecard .chip.c-amber").first().innerText());
  await page.click('button[data-tab="audit"]');
  console.log("Audit rows:", await page.locator(".audit li").count());
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
