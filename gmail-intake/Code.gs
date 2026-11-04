/*
 * NashFlow demo inbox: Google Apps Script for a Gmail account used only for demos.
 * Use made-up or anonymised deal packs only. Whatever reaches this inbox passes through Google.
 *
 * What it does
 *   list  : returns new emails in the inbox (last 14 days) with their attachments
 *   done  : marks an email as picked up so it is not returned again
 *   send  : replies to the broker in the same email thread (or sends a new email)
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
    if (p.action === "list") return out_({ ok: true, messages: listNew_() });
    if (p.action === "done") { markDone_(p.id); return out_({ ok: true }); }
    if (p.action === "send") return out_(send_(p));
    return out_({ error: "Unknown action." });
  } catch (err) {
    return out_({ error: String(err && err.message ? err.message : err) });
  }
}

function listNew_() {
  const me = Session.getEffectiveUser().getEmail().toLowerCase();
  const props = PropertiesService.getScriptProperties();
  const threads = GmailApp.search("in:inbox newer_than:14d", 0, 15);
  const found = [];
  threads.forEach(function (t) {
    t.getMessages().forEach(function (m) {
      if (found.length >= 3) return;
      if (props.getProperty("done:" + m.getId())) return;
      if (m.getFrom().toLowerCase().indexOf(me) >= 0) return; // our own replies
      const atts = m.getAttachments({ includeInlineImages: false, includeAttachments: true })
        .filter(function (a) { return a.getSize() <= MAX_ATTACHMENT_BYTES; })
        .map(function (a) { return { name: a.getName(), type: a.getContentType(), b64: Utilities.base64Encode(a.getBytes()) }; });
      found.push({ id: m.getId(), threadId: t.getId(), from: m.getFrom(), to: m.getTo(), subject: m.getSubject(),
        date: m.getDate().toISOString(), body: m.getPlainBody().slice(0, 60000), attachments: atts });
    });
  });
  return found;
}

function markDone_(id) {
  if (!id) return;
  PropertiesService.getScriptProperties().setProperty("done:" + id, new Date().toISOString());
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
