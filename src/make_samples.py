"""Generate three fictional sample deal packs (clean, incomplete, inconsistent)."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

OUT = os.path.join(os.path.dirname(__file__), "samples")
ss = getSampleStyleSheet()
H1 = ParagraphStyle("h1", parent=ss["Heading1"], fontSize=16, spaceAfter=6)
H2 = ParagraphStyle("h2", parent=ss["Heading2"], fontSize=12, spaceBefore=8, spaceAfter=4)
B = ParagraphStyle("b", parent=ss["BodyText"], fontSize=10, leading=14)
SMALL = ParagraphStyle("s", parent=B, fontSize=8, textColor=colors.grey)
FICTION = "Fictional sample prepared for the NashFlow prototype. Any resemblance to real companies or people is coincidental."


def pdf(path, story):
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=18 * mm)
    doc.build(story + [Spacer(1, 10), Paragraph(FICTION, SMALL)])


def table(rows, widths=None):
    t = Table(rows, colWidths=widths, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), "Helvetica", 9),
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEEEEE")),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#BBBBBB")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def kv(rows):
    t = Table(rows, colWidths=[55 * mm, 110 * mm], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), "Helvetica", 9.5),
        ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 9.5),
        ("LINEBELOW", (0, 0), (-1, -1), 0.3, colors.HexColor("#CCCCCC")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def P(t):
    return Paragraph(t, B)


def write(path, text):
    with open(path, "w") as f:
        f.write(text.strip() + "\n\n" + FICTION + "\n")


# ---------------------------------------------------------------- CLEAN
d = os.path.join(OUT, "clean")
os.makedirs(d, exist_ok=True)
write(os.path.join(d, "Broker email.txt"), """
From: Amy Fenwick <amy@fenwickcf.example>
To: deals@lender.example
Date: Mon, 2 Nov 2026 09:14
Subject: New enquiry - Thamesgate Property Holdings Ltd - Kennet House, Reading - £850k refinance

Hi team,

Please find attached a refinance enquiry for an existing client of ours.

Borrower: Thamesgate Property Holdings Ltd (company number 13874521)
Registered office: 14 Kings Road, Reading RG1 3AR
Directors: Daniel Okafor and Priya Raman, both happy to give personal guarantees.

Property: Kennet House, 41 Abbey Walk, Reading RG1 3BH. Freehold multi-let office building, four floors, fully let to four tenants.
The borrower bought the building in 2019 and already owns it.

Loan requested: £850,000 to refinance the existing facility with another lender.
Term: 5 years, interest only.
Proposed pay rate: 7.25% fixed.

Valuation: Harcourt Lane Chartered Surveyors valued the property at £1,420,000 on 15 September 2026 (report attached).
Rent: passing rent is £118,500 per annum per the attached tenancy schedule.
EPC: C.

The directors have run a portfolio of six commercial investment properties in the Thames Valley since 2014, with no arrears and no adverse credit.
Latest accounts to 31 March 2026 are attached.

Kind regards,
Amy Fenwick
Director, Fenwick Commercial Finance
""")

pdf(os.path.join(d, "Valuation report - Kennet House.pdf"), [
    Paragraph("Harcourt Lane Chartered Surveyors", H1),
    P("Valuation report for secured lending purposes (summary)"),
    Spacer(1, 6),
    kv([
        ["Property", "Kennet House, 41 Abbey Walk, Reading RG1 3BH"],
        ["Client", "Thamesgate Property Holdings Ltd"],
        ["Date of valuation", "15 September 2026"],
        ["Date of inspection", "11 September 2026"],
        ["Tenure", "Freehold"],
        ["Property type", "Multi-let office building, ground and three upper floors, 9,850 sq ft NIA"],
        ["EPC rating", "C (valid to 2031)"],
        ["Market value", "£1,420,000 (one million four hundred and twenty thousand pounds)"],
        ["Market rent", "£121,000 per annum"],
        ["Passing rent", "£118,500 per annum"],
    ]),
    Paragraph("Location and condition", H2),
    P("The property is in Reading town centre, close to the station and the Forbury Gardens office cluster. "
      "It is in good repair, having been refurbished in 2020. We are not aware of any deleterious materials."),
    PageBreak(),
    Paragraph("Tenancies and suitability", H2),
    P("The building is let to four tenants on full repairing and insuring terms. The income is well spread, with no tenant "
      "paying more than a third of the rent. In our opinion the property is suitable security for a loan of up to 65% of market value "
      "over a term of five years."),
    Paragraph("Valuer", H2),
    P("Signed: Sarah Lane MRICS, RICS Registered Valuer, for and on behalf of Harcourt Lane Chartered Surveyors. Report reference HL/26/0915."),
])

pdf(os.path.join(d, "Tenancy schedule - Kennet House.pdf"), [
    Paragraph("Tenancy schedule: Kennet House, 41 Abbey Walk, Reading RG1 3BH", H1),
    P("Prepared by the borrower, Thamesgate Property Holdings Ltd, as at 1 October 2026."),
    Spacer(1, 6),
    table([
        ["Floor", "Tenant", "Rent pa (£)", "Lease start", "Lease end", "Break"],
        ["Ground", "Brightline Analytics Ltd", "36,000", "24/06/2021", "23/06/2031", "23/06/2029 (tenant)"],
        ["First", "Hollis & Grant LLP", "34,500", "25/03/2020", "24/03/2030", "None"],
        ["Second", "Corvid Engineering Ltd", "28,000", "29/09/2019", "28/09/2029", "None"],
        ["Third", "Pellow Recruitment Ltd", "20,000", "25/12/2023", "24/12/2028", "None"],
        ["", "Total", "118,500", "", "", ""],
    ]),
    Spacer(1, 6),
    P("All leases are full repairing and insuring. No rent arrears at the date of this schedule."),
])

pdf(os.path.join(d, "Accounts summary - Thamesgate FY2026.pdf"), [
    Paragraph("Thamesgate Property Holdings Ltd", H1),
    P("Company number 13874521. Abbreviated financial statements for the year ended 31 March 2026 (summary prepared by Marlow & Pike, Chartered Accountants)."),
    Spacer(1, 6),
    table([
        ["£", "Year to 31 Mar 2026", "Year to 31 Mar 2025"],
        ["Rental income", "412,300", "398,900"],
        ["Property costs", "(48,100)", "(45,700)"],
        ["Finance costs", "(161,800)", "(158,200)"],
        ["Profit before tax", "171,400", "162,300"],
        ["Investment property at valuation", "5,940,000", "5,710,000"],
        ["Bank loans", "(3,180,000)", "(3,240,000)"],
        ["Net assets", "2,515,000", "2,301,000"],
    ]),
    Spacer(1, 6),
    P("The company holds six commercial investment properties. There are no county court judgments or insolvency events. "
      "Directors: Daniel Okafor, Priya Raman."),
])

# ---------------------------------------------------------------- INCOMPLETE
d = os.path.join(OUT, "incomplete")
os.makedirs(d, exist_ok=True)
write(os.path.join(d, "Broker email.txt"), """
From: Tom Ridley <tom.ridley@pennineloans.example>
To: deals@lender.example
Date: Tue, 3 Nov 2026 16:42
Subject: Purchase - Stourton Trade Park, Leeds - 2.4m

Afternoon,

Quick one for you to look at. My client Calder Works Investments Ltd is buying Units 3 to 5, Stourton Trade Park, Leeds LS10 1XY.
It's an SPV, set up last year. Director is Mark Calder.

Purchase price agreed at £3,350,000. We think it's worth around £3.5m, no valuation yet.
Looking for £2.4m over 10 years.

Both units are let. I'll send the rent roll and leases next week.

Accounts for Mark's other company attached so you can see the background.

Cheers,
Tom
Pennine Loans
""")

pdf(os.path.join(d, "Sales particulars - Stourton Trade Park.pdf"), [
    Paragraph("FOR SALE: Units 3 to 5, Stourton Trade Park, Leeds LS10 1XY", H1),
    P("Marketed by Brook & Wainwright Property Agents."),
    Spacer(1, 6),
    kv([
        ["Description", "Two modern industrial and warehouse units (Unit 3, and Units 4 to 5 combined) with yard and parking"],
        ["Size", "Approximately 24,600 sq ft in total"],
        ["Tenure", "Freehold"],
        ["Tenancies", "Both units are let. Full tenancy information available to seriously interested parties."],
        ["Guide price", "Offers in excess of £3,300,000"],
        ["EPC", "Available on request"],
    ]),
    Paragraph("Location", H2),
    P("Stourton is an established industrial location two miles south east of Leeds city centre, with direct access to junction 44 of the M1 and junction 7 of the M621."),
])

pdf(os.path.join(d, "Accounts summary - Calder Fabrication 2024.pdf"), [
    Paragraph("Calder Fabrication Ltd", H1),
    P("Company number 08812345. Summary financial statements for the year ended 31 December 2024."),
    Spacer(1, 6),
    table([
        ["£", "Year to 31 Dec 2024", "Year to 31 Dec 2023"],
        ["Turnover", "4,820,000", "4,410,000"],
        ["Operating profit", "612,000", "548,000"],
        ["Profit after tax", "455,000", "401,000"],
        ["Net assets", "1,960,000", "1,620,000"],
    ]),
    Spacer(1, 6),
    P("Director: Mark Calder. Calder Fabrication Ltd is a sister company of the borrower and is not the borrowing entity. "
      "It has no property investment activity."),
])

# ---------------------------------------------------------------- INCONSISTENT
d = os.path.join(OUT, "inconsistent")
os.makedirs(d, exist_ok=True)
write(os.path.join(d, "Broker email.txt"), """
From: Ravi Sandhu <ravi@sandhufinance.example>
To: deals@lender.example
Date: Wed, 4 Nov 2026 08:05
Subject: Refinance request - Redmere Estates Ltd - Hulme Parade, Manchester - £1.6m

Morning all,

Please see below and attached for a refinance of a retail parade.

Borrower: Redmere Estates Ltd, company number 11456209, registered office 88 Wilmslow Road, Manchester M14 5TQ.
Directors and guarantors: Joanne Redmond and Patrick Redmond. They have owned and managed retail and mixed-use property in Greater Manchester for over 15 years.

Property: 1 to 7 Hulme Parade, Stockport Road, Manchester M13 0QX. Freehold parade of seven shops. Owned by the borrower since 2017.

Loan: £1,600,000, term 7 years, interest only, to refinance the existing loan with a high street bank and release a little equity.
Pay rate we are looking for: 7.5%.

Income: £186,000 per annum.
Valuation by Pennington Rhodes at £2,450,000 (August 2026), attached with the tenancy schedule.
EPC: D across the parade.

Accounts to 30 June 2026 attached. Clean credit, no CCJs.

Thanks,
Ravi Sandhu
Sandhu Commercial Finance
""")

pdf(os.path.join(d, "Valuation report - Hulme Parade.pdf"), [
    Paragraph("Pennington Rhodes LLP, Chartered Surveyors", H1),
    P("Valuation report for loan security (summary)"),
    Spacer(1, 6),
    kv([
        ["Property", "1 to 7 Hulme Parade, Stockport Road, Manchester M13 0QX"],
        ["Client", "Redmere Estates Ltd"],
        ["Date of valuation", "20 August 2026"],
        ["Tenure", "Freehold"],
        ["Property type", "Parade of seven ground floor shops with storage above"],
        ["EPC rating", "D (all units)"],
        ["Market value", "£2,450,000"],
        ["Current passing rent", "£158,000 per annum (six units let)"],
        ["Vacancy", "Unit 7 vacant since May 2026. Estimated rental value £28,000 per annum."],
    ]),
    Paragraph("Comment", H2),
    P("Our valuation reflects the current passing rent of £158,000 per annum and the vacancy at Unit 7. "
      "Unit 6 is occupied by a tenant holding over after lease expiry; we have assumed the occupation continues on the same terms. "
      "We consider the property suitable security. Signed: Michael Rhodes MRICS, RICS Registered Valuer."),
])

pdf(os.path.join(d, "Tenancy schedule - Hulme Parade.pdf"), [
    Paragraph("Tenancy schedule: 1 to 7 Hulme Parade, Manchester M13 0QX", H1),
    P("Prepared by Redmere Estates Ltd, September 2026."),
    Spacer(1, 6),
    table([
        ["Unit", "Tenant", "Use", "Rent pa (£)", "Lease end"],
        ["1", "Kaya Pharmacy Ltd", "Pharmacy", "32,000", "24/03/2033"],
        ["2", "Mama Rosa's (Manchester) Ltd", "Restaurant", "38,000", "28/09/2032"],
        ["3", "Hulme Convenience Ltd", "Convenience store", "27,000", "23/06/2029"],
        ["4", "Bright Smile Dental Ltd", "Dental surgery", "29,000", "24/12/2031"],
        ["5", "Northern Vape Co Ltd", "Retail", "14,000", "24/03/2027"],
        ["6", "Ironside Barbers (sole trader)", "Barber", "18,000", "TBC - holding over"],
        ["7", "Vacant", "", "-", ""],
        ["", "Total", "", "158,000", ""],
    ]),
])

pdf(os.path.join(d, "Accounts summary - Redmere FY2026.pdf"), [
    Paragraph("Redmere Estates Ltd", H1),
    P("Company number 11456209. Summary financial statements for the year ended 30 June 2026."),
    Spacer(1, 6),
    table([
        ["£", "Year to 30 Jun 2026", "Year to 30 Jun 2025"],
        ["Rental income", "171,200", "183,900"],
        ["Property costs", "(22,400)", "(19,800)"],
        ["Finance costs", "(96,300)", "(94,100)"],
        ["Profit before tax", "52,500", "70,000"],
        ["Net assets", "1,104,000", "1,061,000"],
    ]),
    Spacer(1, 6),
    P("Directors: Joanne Redmond, Patrick Redmond. No county court judgments recorded."),
])
print("done")
