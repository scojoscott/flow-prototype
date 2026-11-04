"""Complete, consistent fictional demo pack: Nene Valley Estates Ltd, Ferris Way Trade Park, Northampton. £920k refinance."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from make_samples import pdf, table, kv, P, H1, H2, B, SMALL, FICTION
from reportlab.platypus import Paragraph, Spacer, PageBreak
from openpyxl import Workbook
from openpyxl.styles import Font

D = os.path.join(os.path.dirname(__file__), "demo-pack")
os.makedirs(D, exist_ok=True)

# 1 Broker email (as printed PDF)
pdf(os.path.join(D, "01 Broker email - Ferris Way Trade Park.pdf"), [
    kv([
        ["From", "Lucy Carrow <lucy@carrowfinance.example>"],
        ["To", "deals@lender.example"],
        ["Date", "Wednesday 4 November 2026, 08:47"],
        ["Subject", "New application: Nene Valley Estates Ltd, Ferris Way Trade Park, Northampton, £920,000 refinance"],
        ["Attachments", "Application form, valuation report, tenancy schedule, accounts, EPC, Companies House overview, redemption statement, directors' portfolio and asset statement"],
    ]),
    Spacer(1, 10),
    P("Good morning,"),
    Spacer(1, 6),
    P("Please find attached a full application for a refinance on behalf of my client, Nene Valley Estates Ltd (company number 12603318)."),
    Spacer(1, 6),
    P("The company owns Ferris Way Trade Park, Ferris Way, Northampton NN4 7XA, a freehold estate of six industrial units which it bought in 2020. "
      "All six units are let, with a passing rent of £126,600 per annum. The property was valued by Ashby Kerr Chartered Surveyors at £1,560,000 on 2 October 2026."),
    Spacer(1, 6),
    P("We are looking for a loan of £920,000 over a 5 year term, interest only, to repay the existing facility with Northgate Commercial Bank (redemption figure £901,580, statement attached). "
      "My client would like a fixed pay rate of 7.4%."),
    Spacer(1, 6),
    P("The directors, Helen Marsh and Tobias Adeyemi, will both give personal guarantees. They have owned and managed industrial investment property in the "
      "East Midlands since 2016 and the company now holds four estates. There is no adverse credit. Accounts to 31 March 2026 are attached."),
    Spacer(1, 6),
    P("Everything you need should be attached, but let me know if not."),
    Spacer(1, 6),
    P("Kind regards,<br/>Lucy Carrow<br/>Director, Carrow Finance Partners<br/>01604 000 123"),
])

# 2 Application form
pdf(os.path.join(D, "02 Application form - Nene Valley Estates.pdf"), [
    Paragraph("Commercial investment loan application", H1),
    P("Submitted by Carrow Finance Partners on 4 November 2026."),
    Paragraph("1. Borrower", H2),
    kv([
        ["Borrower name", "Nene Valley Estates Ltd"],
        ["Company number", "12603318"],
        ["Registered office", "7 Market Square, Northampton NN1 2DL"],
        ["Company type", "Private limited company (property investment)"],
        ["Directors", "Helen Marsh; Tobias Adeyemi"],
        ["Guarantors", "Helen Marsh and Tobias Adeyemi (personal guarantees)"],
        ["Experience", "Industrial property investors since 2016. Four estates owned, all let."],
        ["Adverse credit", "None. No CCJs, defaults or insolvency events."],
    ]),
    Paragraph("2. Loan requested", H2),
    kv([
        ["Purpose", "Refinance of existing loan"],
        ["Loan amount", "£920,000"],
        ["Term", "5 years"],
        ["Repayment basis", "Interest only"],
        ["Proposed pay rate", "7.4% fixed"],
        ["Security", "First legal charge over Ferris Way Trade Park; debenture over the borrower; personal guarantees"],
        ["Existing lender", "Northgate Commercial Bank plc, redemption figure £901,580 at 30 November 2026"],
    ]),
    Paragraph("Use of funds", H2),
    table([["Item", "£"], ["Repay Northgate Commercial Bank", "901,580"], ["Arrangement fee (1.5%)", "13,800"], ["Legal and valuation costs (estimate)", "4,620"], ["Total", "920,000"]]),
    Paragraph("3. Property", H2),
    kv([
        ["Address", "Ferris Way Trade Park, Ferris Way, Northampton NN4 7XA"],
        ["Property type", "Multi-let industrial estate (six units)"],
        ["Tenure", "Freehold"],
        ["Already owned by the borrower?", "Yes, purchased March 2020"],
        ["Purchase price", "Not applicable (refinance)"],
        ["Value", "£1,560,000, Ashby Kerr Chartered Surveyors, 2 October 2026"],
        ["Annual passing rent", "£126,600"],
        ["EPC rating", "C"],
    ]),
    Spacer(1, 8),
    P("Declaration: the information above is true and complete to the best of the applicant's knowledge. Signed: Helen Marsh, Director."),
])

# 3 Valuation report
pdf(os.path.join(D, "03 Valuation report - Ferris Way Trade Park.pdf"), [
    Paragraph("Ashby Kerr Chartered Surveyors", H1),
    P("Valuation report for secured lending purposes. Reference AK/26/1002. Prepared in accordance with the RICS Valuation Global Standards (Red Book)."),
    Spacer(1, 6),
    kv([
        ["Property", "Ferris Way Trade Park, Ferris Way, Northampton NN4 7XA"],
        ["Instructed by", "Nene Valley Estates Ltd (borrower instructed; lender reliance to be confirmed)"],
        ["Date of inspection", "28 September 2026"],
        ["Date of valuation", "2 October 2026"],
        ["Basis", "Market value, subject to the existing tenancies"],
        ["Tenure", "Freehold, title NN123456 (sample)"],
        ["Description", "Estate of six single-storey industrial and warehouse units, built 2004, steel portal frame, 6.5m eaves, roller shutter loading to each unit"],
        ["Floor area", "18,400 sq ft gross internal area in total"],
        ["EPC rating", "C (all units)"],
        ["Market value", "£1,560,000 (one million, five hundred and sixty thousand pounds)"],
        ["Capital value", "£85 per sq ft"],
        ["Passing rent", "£126,600 per annum (£6.88 per sq ft)"],
        ["Market rent (ERV)", "£131,000 per annum (£7.12 per sq ft)"],
        ["Net initial yield", "7.6% (after purchaser's costs of 6.8%)"],
        ["Vacant possession value", "£1,250,000 (special assumption: all units vacant)"],
        ["Reinstatement cost", "£2,100,000 for insurance purposes"],
    ]),
    Paragraph("Location", H2),
    P("Ferris Way is an established trade and industrial location two miles south of Northampton town centre and 1.5 miles from junction 15 of the M1. "
      "Northampton is one of the strongest small and mid-box industrial markets in the East Midlands, supported by the M1 and the Golden Triangle logistics area. "
      "Availability of units under 5,000 sq ft in the town is low, at about 3% of stock."),
    PageBreak(),
    Paragraph("Tenancies and tenant covenants", H2),
    P("All six units are let on full repairing and insuring leases. The largest tenant pays about 19% of the rent, so the income is well spread. "
      "Weighted unexpired lease term is 4.3 years to expiry and 3.9 years to break. Our comments on the tenants are based on their latest filed accounts at Companies House:"),
    table([
        ["Unit", "Tenant", "Rent pa (£)", "Comment"],
        ["1", "Apex Print Solutions Ltd", "24,000", P("Trading since 2009. Net assets £640k at Dec 2025. Good covenant for the size of unit.")],
        ["2", "Kettering Kitchens Ltd", "21,500", P("Trading since 2015. Net assets £310k. Tenant break in September 2028.")],
        ["3", "Midshires Auto Parts Ltd", "23,000", P("Regional distributor, 11 branches. Net assets £2.1m. Strongest covenant on the estate.")],
        ["4", "Halden Logistics Ltd", "19,800", P("Small parcel operator. Net assets £95k. Weaker covenant; lease ends December 2029.")],
        ["5", "Copperleaf Brewing Co Ltd", "18,300", P("Craft brewer, trading since 2017. Net assets £180k. Has invested in fit-out, so likely to stay.")],
        ["6", "Swift Scaffold Hire Ltd", "20,000", P("Trading since 2012. Net assets £420k.")],
    ], widths=[28, 120, 55, 260]),
    Paragraph("Comparable evidence: lettings", H2),
    table([
        ["Date", "Property", "Size (sq ft)", "Rent (£ per sq ft)"],
        ["Aug 2026", "Unit 9, Harlestone Court, Northampton", "3,200", "7.25"],
        ["May 2026", "Unit 4, Weston Mill Court, Northampton", "2,850", "7.00"],
        ["Feb 2026", "Unit 12, Spinney Hill Works, Northampton", "3,600", "6.95"],
    ]),
    Paragraph("Comparable evidence: investment sales", H2),
    table([
        ["Date", "Property", "Price (£)", "Net initial yield", "£ per sq ft"],
        ["Jul 2026", "Multi-let estate, Wellingborough (6 units)", "1,420,000", "7.8%", "79"],
        ["Apr 2026", "Multi-let estate, Daventry (8 units)", "2,350,000", "7.3%", "92"],
        ["Jan 2026", "Multi-let estate, Kettering (5 units)", "1,180,000", "7.9%", "76"],
    ]),
    P("The subject sits within the range of the investment evidence. It is better located than the Wellingborough and Kettering estates, which supports a yield of 7.6%."),
    PageBreak(),
    Paragraph("Condition", H2),
    P("The units are in good condition for their age. Roofs were replaced on Units 1 to 3 in 2022; Units 4 to 6 have original roofs with an estimated remaining life of 8 to 10 years. "
      "We noted no deleterious materials or contamination concerns. The tenants repair the units under their leases."),
    Paragraph("Market commentary and risks", H2),
    P("Demand for small industrial units remains strong and rents in Northampton have grown about 4% a year since 2022. The main risks are the weaker covenant of Halden Logistics Ltd, "
      "the tenant break at Unit 2 in 2028, and the cost of roof works to Units 4 to 6 in the medium term, which would largely be recoverable through the service charge and dilapidations."),
    Paragraph("Suitability as security", H2),
    P("In our opinion the property is good security for a loan of up to 65% of market value over a five year term. It would sell readily as an investment or, if vacant, to owner occupiers."),
    Spacer(1, 8),
    P("Signed: James Kerr MRICS, RICS Registered Valuer, for and on behalf of Ashby Kerr Chartered Surveyors."),
])

# 4 Tenancy schedule (Excel)
wb = Workbook(); ws = wb.active; ws.title = "Tenancy schedule"
rows = [
    ["Tenancy schedule: Ferris Way Trade Park, Northampton NN4 7XA"],
    ["Prepared by Nene Valley Estates Ltd as at 1 October 2026"],
    [],
    ["Unit", "Tenant", "Size (sq ft)", "Rent pa (£)", "Lease start", "Lease end", "Tenant break"],
    ["Unit 1", "Apex Print Solutions Ltd", 3400, 24000, "25/03/2021", "24/03/2031", "None"],
    ["Unit 2", "Kettering Kitchens Ltd", 3100, 21500, "29/09/2020", "28/09/2030", "28/09/2028"],
    ["Unit 3", "Midshires Auto Parts Ltd", 3300, 23000, "24/06/2022", "23/06/2032", "None"],
    ["Unit 4", "Halden Logistics Ltd", 2900, 19800, "25/12/2019", "24/12/2029", "None"],
    ["Unit 5", "Copperleaf Brewing Co Ltd", 2800, 18300, "29/09/2021", "28/09/2031", "None"],
    ["Unit 6", "Swift Scaffold Hire Ltd", 2900, 20000, "25/03/2020", "24/03/2030", "None"],
    ["", "Total", 18400, 126600, "", "", ""],
    [],
    ["All leases are full repairing and insuring. No rent arrears. " + FICTION],
]
for r in rows: ws.append(r)
for c in ws[4]: c.font = Font(bold=True)
for c in ws[11]: c.font = Font(bold=True)
for col, w in zip("ABCDEFG", [9, 30, 12, 12, 12, 12, 13]): ws.column_dimensions[col].width = w
wb.save(os.path.join(D, "04 Tenancy schedule - Ferris Way Trade Park.xlsx"))

# 5 Accounts
pdf(os.path.join(D, "05 Accounts summary - Nene Valley Estates FY2026.pdf"), [
    Paragraph("Nene Valley Estates Ltd", H1),
    P("Company number 12603318. Summary financial statements for the year ended 31 March 2026. Prepared by Holcot & Reed, Chartered Accountants."),
    Spacer(1, 6),
    table([
        ["£", "Year to 31 Mar 2026", "Year to 31 Mar 2025", "Year to 31 Mar 2024"],
        ["Rental income", "498,200", "471,600", "442,900"],
        ["Property costs", "(41,300)", "(39,800)", "(37,100)"],
        ["Administrative costs", "(28,400)", "(27,100)", "(25,600)"],
        ["Finance costs", "(182,600)", "(176,900)", "(169,400)"],
        ["Profit before tax", "245,900", "227,800", "210,800"],
        ["Investment property at valuation", "6,480,000", "6,210,000", "5,940,000"],
        ["Cash at bank", "214,000", "187,000", "152,000"],
        ["Bank loans", "(3,410,000)", "(3,480,000)", "(3,550,000)"],
        ["Net assets", "3,126,000", "2,868,000", "2,591,000"],
        [P("Gearing (bank loans / property value)"), "53%", "56%", "60%"],
        [P("Interest cover (profit before interest / finance costs)"), "2.35x", "2.29x", "2.24x"],
    ]),
    Spacer(1, 6),
    P("Notes: rental income grew 5.6% in the year, from rent reviews and one new letting. All four estates were fully let at 31 March 2026. "
      "Bank loans are with two lenders and all covenants were met during the year. The company paid no dividends; profits are retained."),
    Spacer(1, 6),
    P("The company holds four industrial estates in Northampton, Wellingborough and Corby. All loans are up to date. "
      "There are no county court judgments or insolvency events. Directors: Helen Marsh, Tobias Adeyemi."),
])

# 6 EPC
pdf(os.path.join(D, "06 EPC certificate - Ferris Way Trade Park.pdf"), [
    Paragraph("Energy Performance Certificate (non-domestic)", H1),
    kv([
        ["Property", "Ferris Way Trade Park, Units 1 to 6, Ferris Way, Northampton NN4 7XA"],
        ["Energy rating", "C"],
        ["Energy performance score", "62"],
        ["Building type", "B8 storage and distribution / light industrial"],
        ["Total useful floor area", "1,709 square metres"],
        ["Date of assessment", "14 January 2025"],
        ["Valid until", "13 January 2035"],
        ["Certificate number", "0000-1111-2222-3333-4444 (sample)"],
    ]),
    Spacer(1, 6),
    P("Properties rated E or better meet the current minimum energy efficiency standard for letting."),
])

# 7 Companies House overview
pdf(os.path.join(D, "07 Companies House overview - Nene Valley Estates.pdf"), [
    Paragraph("Companies House: company overview (printout)", H1),
    kv([
        ["Company name", "NENE VALLEY ESTATES LTD"],
        ["Company number", "12603318"],
        ["Registered office address", "7 Market Square, Northampton NN1 2DL"],
        ["Company status", "Active"],
        ["Company type", "Private limited company"],
        ["Incorporated on", "12 May 2020"],
        ["Nature of business (SIC)", "68209 Other letting and operating of own or leased real estate"],
        ["Accounts", "Next accounts made up to 31 March 2027, due by 31 December 2027. Last accounts made up to 31 March 2026."],
        ["Confirmation statement", "Next due 26 May 2027. Last made up to 12 May 2026."],
    ]),
    Paragraph("Officers", H2),
    table([["Name", "Role", "Appointed"], ["MARSH, Helen", "Director", "12 May 2020"], ["ADEYEMI, Tobias", "Director", "12 May 2020"]]),
    Paragraph("Persons with significant control", H2),
    table([["Name", "Nature of control"], ["Helen Marsh", "Ownership of shares 25 to 50%"], ["Tobias Adeyemi", "Ownership of shares 25 to 50%"]]),
    Paragraph("Charges", H2),
    P("1 outstanding charge: legal charge over Ferris Way Trade Park, Northampton, in favour of the existing lender, created 20 March 2020. "
      "This charge will be repaid from the new loan."),
])
# 8 Redemption statement
pdf(os.path.join(D, "08 Redemption statement - Northgate Commercial Bank.pdf"), [
    Paragraph("Northgate Commercial Bank plc", H1),
    P("Redemption statement. Borrower: Nene Valley Estates Ltd. Loan account 40021187 (sample). Security: Ferris Way Trade Park, Northampton NN4 7XA."),
    Spacer(1, 6),
    table([["Item", "£"], ["Capital outstanding", "896,400"], ["Interest to 30 November 2026", "5,180"], ["Early repayment charge", "0 (fixed rate period ended)"], ["Total to redeem on 30 November 2026", "901,580"]]),
    Spacer(1, 6),
    P("Account conduct: all payments made on time since drawdown in March 2020. Statement issued 2 November 2026 and valid until 30 November 2026."),
])

# 9 Sponsor statement
pdf(os.path.join(D, "09 Directors portfolio and asset statement.pdf"), [
    Paragraph("Directors' portfolio schedule and statement of assets and liabilities", H1),
    P("Provided by Helen Marsh and Tobias Adeyemi, directors and guarantors of Nene Valley Estates Ltd, 1 November 2026."),
    Paragraph("Property portfolio (held in Nene Valley Estates Ltd)", H2),
    table([
        ["Estate", "Units", "Value (£)", "Debt (£)", "Rent pa (£)", "Occupancy"],
        ["Ferris Way Trade Park, Northampton", "6", "1,560,000", "896,400", "126,600", "100%"],
        ["Finedon Road Estate, Wellingborough", "8", "1,780,000", "920,000", "141,200", "100%"],
        ["Oakley Hay Units, Corby", "5", "1,240,000", "640,000", "97,500", "100%"],
        ["Pineham Court, Northampton", "7", "1,900,000", "923,600", "149,800", "100%"],
        ["Total", "26", "6,480,000", "3,380,000", "515,100", ""],
    ]),
    Paragraph("Guarantors' personal position (self-declared, unverified)", H2),
    table([
        ["£", "Helen Marsh", "Tobias Adeyemi"],
        ["Main residence (value)", "850,000", "720,000"],
        ["Mortgage on residence", "(310,000)", "(260,000)"],
        ["Cash and investments", "240,000", "185,000"],
        [P("Shareholding in Nene Valley Estates Ltd (50% each, at net assets)"), "1,563,000", "1,563,000"],
        ["Net worth", "2,343,000", "2,208,000"],
    ]),
    Spacer(1, 6),
    P("Experience: Helen Marsh is a chartered surveyor who spent 12 years in industrial agency before co-founding the business in 2016. "
      "Tobias Adeyemi is a chartered accountant and runs the finance and asset management. Neither has had any CCJs, defaults or insolvency events."),
])
print("ok")
