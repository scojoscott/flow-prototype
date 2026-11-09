/*
 * NashFlow demo inbox: Google Apps Script for a Gmail account used only for demos.
 * Use made-up or anonymised deal packs only. Whatever reaches this inbox passes through Google.
 *
 * What it does
 *   list  : returns the emails in the inbox (last 14 days), without attachments. Every browser
 *           sees the same list and remembers for itself which ones it has already picked up.
 *   get   : returns one email with its attachments
 *   done  : labels the email "NashFlow picked up" in Gmail (it still shows for other browsers)
 *   send  : replies to the broker in the same email thread (or sends a new email)
 *   trash : moves an email thread to the bin (used by Delete email in NashFlow)
 *   ping  : checks the connection
 *
 * Set up (about 10 minutes)
 *   1. Sign in to the demo Gmail account and open https://script.google.com. Click New project.
 *   2. Delete what is there, paste this whole file in and click Save.
 *   3. Change KEY below to a long random phrase. You will paste the same phrase into NashFlow.
 *   4. Click Deploy, then New deployment. Choose type "Web app".
 *      Execute as: Me. Who has access: Anyone. Click Deploy and allow the permissions it asks for.
 *   5. Copy the Web app URL (it ends in /exec) and paste it into NashFlow under Administration, Deals inbox.
 *   If you change this code later, use Deploy, Manage deployments, edit, Version: New version, so the URL stays the same.
 */
const KEY = "CHANGE-ME-to-a-long-random-phrase";
const LABEL = "NashFlow picked up";
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

function doGet(e) { return handle_(e && e.parameter ? e.parameter : {}); }
function doPost(e) {
  let p = {};
  try { p = JSON.parse(e.postData.contents); } catch (x) { p = {}; }
  return handle_(p);
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function handle_(p) {
  if (!p.key || p.key !== KEY) return out_({ error: "The key does not match the one in the script." });
  try {
    if (p.action === "ping") return out_({ ok: true, inbox: Session.getEffectiveUser().getEmail() });
    if (p.action === "list") return out_({ ok: true, version: 3, messages: listAll_() });
    if (p.action === "get") return out_({ ok: true, message: getOne_(p.id) });
    if (p.action === "done") { markDone_(p.id); return out_({ ok: true }); }
    if (p.action === "send") return out_(send_(p));
    if (p.action === "trash") { const t = p.threadId && GmailApp.getThreadById(p.threadId); if (!t) return out_({ error: "Email thread not found." }); t.moveToTrash(); return out_({ ok: true }); }
    return out_({ error: "Unknown action." });
  } catch (err) {
    return out_({ error: String(err && err.message ? err.message : err) });
  }
}

function listAll_() {
  const me = Session.getEffectiveUser().getEmail().toLowerCase();
  const threads = GmailApp.search("in:inbox newer_than:14d", 0, 20);
  const found = [];
  threads.forEach(function (t) {
    t.getMessages().forEach(function (m) {
      if (found.length >= 40) return;
      if (m.getFrom().toLowerCase().indexOf(me) >= 0) return; // our own replies
      found.push({ id: m.getId(), threadId: t.getId(), from: m.getFrom(), subject: m.getSubject(), date: m.getDate().toISOString() });
    });
  });
  found.sort(function (x, y) { return x.date < y.date ? -1 : 1; }); // oldest first, so replies follow the email they answer
  return found;
}

function getOne_(id) {
  const m = id && GmailApp.getMessageById(id);
  if (!m) throw new Error("Email not found.");
  const atts = m.getAttachments({ includeInlineImages: false, includeAttachments: true })
    .filter(function (a) { return a.getSize() <= MAX_ATTACHMENT_BYTES; })
    .map(function (a) { return { name: a.getName(), type: a.getContentType(), b64: Utilities.base64Encode(a.getBytes()) }; });
  return { id: m.getId(), threadId: m.getThread().getId(), from: m.getFrom(), to: m.getTo(), subject: m.getSubject(),
    date: m.getDate().toISOString(), body: m.getPlainBody().slice(0, 60000), attachments: atts };
}

function markDone_(id) {
  if (!id) return;
  const m = GmailApp.getMessageById(id);
  if (m) {
    const label = GmailApp.getUserLabelByName(LABEL) || GmailApp.createLabel(LABEL);
    m.getThread().addLabel(label);
    m.markRead();
  }
}

function send_(p) {
  if (!p.body) return { error: "Nothing to send." };
  if (p.threadId) {
    const t = GmailApp.getThreadById(p.threadId);
    if (!t) return { error: "Email thread not found." };
    const me = Session.getEffectiveUser().getEmail().toLowerCase();
    const msgs = t.getMessages().filter(function (m) { return m.getFrom().toLowerCase().indexOf(me) < 0; });
    if (!msgs.length) return { error: "No message from the broker in this thread." };
    msgs[msgs.length - 1].reply(p.body);
    return { ok: true };
  }
  if (!p.to) return { error: "No address to send to." };
  GmailApp.sendEmail(p.to, p.subject || "Your application", p.body);
  return { ok: true };
}
