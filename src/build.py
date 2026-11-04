import base64, json, os, re
H = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(H, "app.html")).read()
top = open(os.path.join(H, "top.html")).read()
bottom = open(os.path.join(H, "bottom.js")).read()
a = src.index('"use strict";')
b = src.index("/* ------------------------------------------------------------------ rendering */")
mid = src[a:b]

def rep(old, new):
    global mid
    assert old in mid, old
    mid = mid.replace(old, new)

rep('let currentTab = "summary";', 'let currentTab = "memo";\nfunction nextRef() { const n = cases.reduce((m, c) => Math.max(m, parseInt(String(c.ref || "CF-2000").slice(3)) || 2000), 2000) + 1; return "CF-" + n; }')
rep('const c = { id: uid(), createdAt', 'const c = { id: uid(), ref: nextRef(), createdAt')
rep('cases.unshift(c); currentId = c.id; currentTab = "summary";', 'cases.unshift(c); currentId = c.id; currentTab = "memo"; view = "case"; srcDocSel = null; selectedField = "__auto";')
rep('const set = (id, state, extra) => { const s = steps.find((x) => x.id === id); s.state = state;', 'const set = (id, state, extra) => { const s = steps.find((x) => x.id === id); s.state = state; if (state === "done" || state === "error") s.at = nowISO();')
rep('{ id: "intake", agent: "Intake agent", text: `Read ${c.docs.length} document${c.docs.length === 1 ? "" : "s"}`, state: "done" }', '{ id: "intake", agent: "Intake agent", text: `Read ${c.docs.length} document${c.docs.length === 1 ? "" : "s"}: ${c.docs.map((d) => d.name).join(", ")}`, state: "done", at: c.createdAt }')
rep('$("#providerPill").textContent = "AI: " + label;', '$("#providerPill").textContent = label;')
rep('const s = steps.find((x) => x.state === "active"); if (s) s.state = "error";', 'const s = steps.find((x) => x.state === "active"); if (s) { s.state = "error"; s.at = nowISO(); }')

samples = {}
meta = {
    "clean": ("Clean: £850k office refinance, Reading", "Complete and consistent. 60% LTV, ICR 1.9x. Expect Approve, Underwriter decides."),
    "incomplete": ("Incomplete: £2.4m industrial purchase, Leeds", "Broker estimate only, no rent roll, old accounts. Expect Request more information."),
    "inconsistent": ("Inconsistent: £1.6m retail parade refinance, Manchester", "Email says rent £186k, tenancy schedule says £158k. Expect a mismatch flag and Escalate."),
}
for k, (label, blurb) in meta.items():
    d = os.path.join(H, "samples", k)
    files = []
    order = sorted(os.listdir(d), key=lambda n: (0 if n.startswith("Broker") else 1, n))
    for n in order:
        p = os.path.join(d, n)
        if n.endswith(".txt"):
            files.append({"name": n, "type": "text/plain", "text": open(p).read()})
        else:
            files.append({"name": n, "type": "application/pdf", "b64": base64.b64encode(open(p, "rb").read()).decode()})
    samples[k] = {"label": label, "blurb": blurb, "files": files}

out = top + "\n" + mid + bottom
out = out.replace("/*__SAMPLES__*/null", json.dumps(samples))
assert "—" not in out, "em dash found"
open(os.path.join(H, "nashflow-deal-processor.html"), "w").write(out)
# Hosted copy for GitHub Pages: a full HTML document at the repo root
page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="robots" content="noindex, nofollow">\n</head>\n<body>\n' + out + '\n</body>\n</html>\n')
open(os.path.join(H, "..", "index.html"), "w").write(page)
print(len(out))
