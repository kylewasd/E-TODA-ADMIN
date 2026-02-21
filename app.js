import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, onValue, get, update, set, push, remove }
  from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

/* =========================
   Firebase
========================= */
const firebaseConfig = {
  apiKey: "AIzaSyDs06Z9MtPXhen26ERnZtev5r8h-P8zsyk",
  authDomain: "e-toda.firebaseapp.com",
  databaseURL: "https://e-toda-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "e-toda",
  storageBucket: "e-toda.firebasestorage.app",
  messagingSenderId: "86183237032",
  appId: "1:86183237032:web:b21f4ca353659bd0c3799d",
  measurementId: "G-D4CTXM55JZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const $ = (s) => document.querySelector(s);

/* =========================
   Helpers
========================= */
function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function show(el){ el?.classList.remove("hidden"); }
function hide(el){ el?.classList.add("hidden"); }

function badgeClass(status){
  if(status === "terminated" || status === "rejected") return "danger";
  if(status === "pending" || status === "closed") return "gray";
  return "";
}
function fmtName(u){
  return (`${u.firstName||""} ${u.lastName||""}`).trim() || u.mobileNumber || u.userId || "Unknown";
}
function normalizeMobile(m){ return (m||"").trim(); }
function isValidMobile(m){ return /^09\d{9}$/.test(m); }
function isValidPin(pin){ return /^\d{4}$/.test(pin); }
function numOr0(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }

/* =========================
   Alive label
========================= */
(() => {
  const el = $("#jsAlive");
  if (el){ el.textContent = "JS Running ✅"; el.classList.remove("hidden"); }
})();

/* =========================
   DOM: Login/App
========================= */
const loginView = $("#loginView");
const appView = $("#appView");
const loginBtn = $("#loginBtn");
const logoutBtn = $("#logoutBtn");
const emailEl = $("#email");
const passEl = $("#password");
const signedInAs = $("#signedInAs");

/* =========================
   DOM: Views/Nav
========================= */
const navBtns = document.querySelectorAll(".navBtn");
const viewCommuters = $("#viewCommuters");
const viewDrivers = $("#viewDrivers");
const viewSupport = $("#viewSupport");

function setActiveNav(view){
  navBtns.forEach(b => b.classList.toggle("active", b.dataset.view === view));
  hide(viewCommuters); hide(viewDrivers); hide(viewSupport);
  if(view === "commuters") show(viewCommuters);
  if(view === "drivers") show(viewDrivers);
  if(view === "support") show(viewSupport);
}
document.addEventListener("click", (e)=>{
  const b = e.target.closest(".navBtn");
  if(!b) return;
  setActiveNav(b.dataset.view);
});

/* =========================
   DOM: Commuters/Drivers
========================= */
const commuterList = $("#commuterList");
const commuterStatusFilter = $("#commuterStatusFilter");
const commuterSearch = $("#commuterSearch");

const driverList = $("#driverList");
const driverStatusFilter = $("#driverStatusFilter");
const driverSearch = $("#driverSearch");

/* =========================
   DOM: User Modal
========================= */
const uModalBackdrop = $("#uModalBackdrop");
const uModal = $("#uModal");
const uModalTitle = $("#uModalTitle");
const uModalSub = $("#uModalSub");
const uModalBody = $("#uModalBody");
const uModalClose = $("#uModalClose");
const uModalCancel = $("#uModalCancel");
const uModalSave = $("#uModalSave");

/* =========================
   Confirm Modal
========================= */
const cModalBackdrop = $("#cModalBackdrop");
const cModal = $("#cModal");
const cIcon = $("#cIcon");
const cTitle = $("#cTitle");
const cSubtitle = $("#cSubtitle");
const cBody = $("#cBody");
const cClose = $("#cClose");
const cCancel = $("#cCancel");
const cOk = $("#cOk");

let _confirmResolve = null;

function confirmModal({
  title = "Confirm",
  subtitle = "",
  bodyHtml = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary"
}) {
  const missing = !cModalBackdrop || !cModal || !cTitle || !cSubtitle || !cBody || !cOk || !cCancel;
  if(missing){
    return Promise.resolve(window.confirm(`${title}\n\n${subtitle}\n\nProceed?`));
  }

  return new Promise((resolve)=>{
    _confirmResolve = resolve;

    cTitle.textContent = title;
    cSubtitle.textContent = subtitle;
    cBody.innerHTML = bodyHtml;

    cOk.textContent = confirmText;
    cCancel.textContent = cancelText;

    cOk.classList.remove("primary","danger");
    cOk.classList.add(variant === "danger" ? "danger" : "primary");

    cIcon.classList.toggle("danger", variant === "danger");
    cIcon.textContent = variant === "danger" ? "!" : "✓";

    cModalBackdrop.classList.remove("hidden");
    cModal.classList.remove("hidden");
    setTimeout(()=>cOk.focus(), 0);
  });
}

function closeConfirm(result){
  cModalBackdrop?.classList.add("hidden");
  cModal?.classList.add("hidden");
  if(cBody) cBody.innerHTML = "";
  if(_confirmResolve) _confirmResolve(result);
  _confirmResolve = null;
}
cModalBackdrop?.addEventListener("click", ()=>closeConfirm(false));
cClose?.addEventListener("click", ()=>closeConfirm(false));
cCancel?.addEventListener("click", ()=>closeConfirm(false));
cOk?.addEventListener("click", ()=>closeConfirm(true));
document.addEventListener("keydown",(e)=>{
  if(e.key==="Escape" && _confirmResolve) closeConfirm(false);
});

/* =========================
   Notice Modal (your no-X version)
========================= */
const nModalBackdrop = $("#nModalBackdrop");
const nModal = $("#nModal");
const nIcon = $("#nIcon");
const nTitle = $("#nTitle");
const nSubtitle = $("#nSubtitle");
const nBody = $("#nBody");
const nOk = $("#nOk");

let _noticeResolve = null;

function noticeModal({
  title = "Notice",
  subtitle = "",
  bodyHtml = "",
  variant = "primary"
}) {
  const missing = !nModalBackdrop || !nModal || !nTitle || !nSubtitle || !nBody || !nOk;
  if (missing) {
    window.alert(`${title}\n\n${subtitle}`);
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    _noticeResolve = resolve;
    nTitle.textContent = title;
    nSubtitle.textContent = subtitle;
    nBody.innerHTML = bodyHtml;

    nIcon?.classList.toggle("danger", variant === "danger");
    if (nIcon) nIcon.textContent = variant === "danger" ? "!" : "✓";

    nModalBackdrop.classList.remove("hidden");
    nModal.classList.remove("hidden");
    setTimeout(() => nOk.focus(), 0);
  });
}

function closeNotice() {
  nModalBackdrop?.classList.add("hidden");
  nModal?.classList.add("hidden");
  if (nBody) nBody.innerHTML = "";
  if (_noticeResolve) _noticeResolve(true);
  _noticeResolve = null;
}
nModalBackdrop?.addEventListener("click", closeNotice);
nOk?.addEventListener("click", closeNotice);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && _noticeResolve) closeNotice();
});

/* =========================
   User Modal control
========================= */
let selectedUserKey = null;
let selectedUser = null;
let selectedRole = null;

function openUserModal(){ show(uModalBackdrop); show(uModal); }
function closeUserModal(){
  hide(uModalBackdrop); hide(uModal);
  if(uModalBody) uModalBody.innerHTML = "";
  selectedUserKey = null;
  selectedUser = null;
  selectedRole = null;
}
uModalBackdrop?.addEventListener("click", closeUserModal);
uModalClose?.addEventListener("click", closeUserModal);
uModalCancel?.addEventListener("click", closeUserModal);

// PIN digits only
uModalBody?.addEventListener("input",(e)=>{
  const el = e.target;
  if(!(el instanceof HTMLInputElement)) return;
  if(el.dataset.field !== "pin") return;
  el.value = el.value.replace(/\D/g,"").slice(0,4);
});

/* =========================
   Auth
========================= */
loginBtn?.addEventListener("click", async ()=>{
  try{
    await signInWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value);
  }catch(e){
    await noticeModal({ title: "Login failed", subtitle: e?.message || "Please try again.", variant: "danger" });
  }
});
logoutBtn?.addEventListener("click", ()=>signOut(auth));

onAuthStateChanged(auth, async(user)=>{
  if(!user){
    show(loginView); hide(appView);
    return;
  }

  // Admin check
  const adminSnap = await get(ref(db, `users/${user.uid}`));
  if(!adminSnap.exists() || adminSnap.val().userType !== "admin"){
    await noticeModal({
      title: "Access denied",
      subtitle: "Admin account not found at users/{AUTH_UID}.",
      variant: "danger"
    });
    await signOut(auth);
    show(loginView); hide(appView);
    return;
  }

  signedInAs.textContent = user.email || user.uid;

  hide(loginView); show(appView);
  setActiveNav("commuters");

  startUsersListener();
  startSupportTicketSystem(); // ✅ correct call
});

/* =========================
   Users listener + rendering
========================= */
let usersCache = {};
function startUsersListener(){
  onValue(ref(db,"users"), (snap)=>{
    usersCache = snap.val() || {};
    renderCommuters();
    renderDrivers();
  });
}

function filterUsers({role, status, kw}){
  const list = Object.entries(usersCache)
    .map(([key,u])=>({key, ...u}))
    .filter(u => u.userType === role)
    .filter(u => u.userType !== "admin");

  return list.filter(u=>{
    const st = u.approvalStatus || "approved";
    if(status !== "all" && st !== status) return false;

    if(kw){
      const hay = [u.firstName, u.lastName, u.mobileNumber, u.plateNumber]
        .filter(Boolean).join(" ").toLowerCase();
      if(!hay.includes(kw.toLowerCase())) return false;
    }
    return true;
  });
}

function renderCommuters(){
  if(!commuterList) return;
  const status = commuterStatusFilter?.value || "all";
  const kw = (commuterSearch?.value || "").trim();
  const rows = filterUsers({role:"commuter", status, kw});

  commuterList.innerHTML = rows.map(u=>{
    const st = u.approvalStatus || "approved";
    return `
      <div class="item" data-userkey="${esc(u.key)}" data-role="commuter">
        <div class="rowTop">
          <div class="strong">${esc(fmtName(u))}</div>
          <div class="badge ${badgeClass(st)}">${esc(st)}</div>
        </div>
        <div class="muted tiny">${esc(u.mobileNumber||"")} • commuter</div>
      </div>
    `;
  }).join("");
}

function renderDrivers(){
  if(!driverList) return;
  const status = driverStatusFilter?.value || "all";
  const kw = (driverSearch?.value || "").trim();
  const rows = filterUsers({role:"driver", status, kw});

  driverList.innerHTML = rows.map(u=>{
    const st = u.approvalStatus || "approved";
    return `
      <div class="item" data-userkey="${esc(u.key)}" data-role="driver">
        <div class="rowTop">
          <div class="strong">${esc(fmtName(u))}</div>
          <div class="badge ${badgeClass(st)}">${esc(st)}</div>
        </div>
        <div class="muted tiny">${esc(u.mobileNumber||"")} • driver ${u.plateNumber ? "• "+esc(u.plateNumber) : ""}</div>
      </div>
    `;
  }).join("");
}

commuterStatusFilter?.addEventListener("change", renderCommuters);
commuterSearch?.addEventListener("input", renderCommuters);
driverStatusFilter?.addEventListener("change", renderDrivers);
driverSearch?.addEventListener("input", renderDrivers);

/* =========================
   Open edit modal
========================= */
document.addEventListener("click", async(e)=>{
  const item = e.target.closest(".item[data-userkey][data-role]");
  if(!item) return;

  const key = item.dataset.userkey;
  const role = item.dataset.role;

  const snap = await get(ref(db, `users/${key}`));
  if(!snap.exists()) return;

  const u = snap.val();
  if(u.userType === "admin"){
    await noticeModal({ title: "Not allowed", subtitle: "Admin account cannot be edited.", variant: "danger" });
    return;
  }

  selectedUserKey = key;
  selectedUser = u;
  selectedRole = role;

  uModalTitle.textContent = `${role.toUpperCase()} • ${fmtName(u)}`;
  uModalSub.textContent = `Key: ${key}`;
  uModalBody.innerHTML = buildEditForm(u, role);

  openUserModal();
});

function buildEditForm(u, role){
  const address = u.address || [u.barangay, u.city, u.province].filter(Boolean).join(", ");

  const statusOptions = role === "commuter"
    ? ["approved","terminated"]
    : ["pending","approved","terminated"];

  const currentStatus = u.approvalStatus || (role==="driver" ? "pending" : "approved");

  return `
    <div class="formGrid">
      ${inputField("firstName","First Name", u.firstName)}
      ${inputField("lastName","Last Name", u.lastName)}
      ${inputField("balance","Balance", String(u.balance ?? 0), "number")}
      ${inputField("address","Address", address)}
      ${inputField("mobileNumber","Mobile Number", u.mobileNumber)}
      ${pinField(u.pin || "")}

      <div class="field">
        <label>Approval Status</label>
        <select data-field="approvalStatus" class="select">
          ${statusOptions.map(s=>`<option value="${s}" ${s===currentStatus?"selected":""}>${s}</option>`).join("")}
        </select>
      </div>
    </div>
  `;
}

function inputField(field,label,value="", type="text"){
  return `
    <div class="field">
      <label>${esc(label)}</label>
      <input data-field="${esc(field)}" type="${type}" value="${esc(value ?? "")}" />
    </div>
  `;
}

function pinField(value=""){
  return `
    <div class="field">
      <label>4 digit pin (numbers only)</label>
      <input data-field="pin" type="password" inputmode="numeric" maxlength="4"
        placeholder="0000" value="${esc(value ?? "")}" />
      <div class="muted tiny">PIN must be exactly 4 digits.</div>
    </div>
  `;
}

/* =========================
   Save changes (FIXED: actually writes to Firebase)
========================= */
uModalSave?.addEventListener("click", async()=>{
  if(!selectedUserKey || !selectedUser || !selectedRole) return;

  const v = (field) =>
    (uModalBody.querySelector(`[data-field="${CSS.escape(field)}"]`)?.value ?? "").trim();

  const newFirst = v("firstName");
  const newLast = v("lastName");
  const newBalance = numOr0(v("balance"));
  const newAddress = v("address");
  const newMobile = normalizeMobile(v("mobileNumber"));
  const newPin = v("pin").replace(/\D/g,"");
  const newStatus = v("approvalStatus");

  if(!newFirst || !newLast){
    return noticeModal({ title: "Invalid input", subtitle: "First Name and Last Name are required.", variant:"danger" });
  }
  if(!isValidMobile(newMobile)){
    return noticeModal({ title: "Invalid mobile", subtitle: "Must be 11 digits starting with 09.", variant:"danger" });
  }
  if(!isValidPin(newPin)){
    return noticeModal({ title: "Invalid PIN", subtitle: "PIN must be exactly 4 digits.", variant:"danger" });
  }

  if(selectedRole === "commuter" && !["approved","terminated"].includes(newStatus)){
    return noticeModal({ title: "Invalid status", subtitle: "Commuter: approved or terminated only.", variant:"danger" });
  }
  if(selectedRole === "driver" && !["pending","approved","terminated"].includes(newStatus)){
    return noticeModal({ title: "Invalid status", subtitle: "Driver: pending/approved/terminated only.", variant:"danger" });
  }

  const ok = await confirmModal({
    title: "Save Changes",
    subtitle: "Please review and confirm this update.",
    confirmText: "Yes, Save",
    cancelText: "Cancel",
    variant: "primary",
    bodyHtml: `
      <div class="muted tiny">You are updating the following record:</div>
      <div class="metaGrid">
        <div class="meta"><div class="k">User</div><div class="v">${esc(newFirst+" "+newLast)}</div></div>
        <div class="meta"><div class="k">Role</div><div class="v">${esc(selectedRole)}</div></div>
        <div class="meta"><div class="k">Status</div><div class="v">${esc(newStatus)}</div></div>
        <div class="meta"><div class="k">Mobile Key</div><div class="v">${esc(selectedUserKey)} → ${esc(newMobile)}</div></div>
      </div>
    `
  });
  if(!ok) return;

  const patch = {
    firstName: newFirst,
    lastName: newLast,
    balance: newBalance,
    address: newAddress,
    mobileNumber: newMobile,
    pin: newPin,
    approvalStatus: newStatus
  };

  const oldKey = selectedUserKey;

  try{
    // If key changed, move node
    if(newMobile !== oldKey){
      const existsSnap = await get(ref(db, `users/${newMobile}`));
      if(existsSnap.exists()){
        return noticeModal({ title:"Cannot save", subtitle:"That mobile number already exists.", variant:"danger" });
      }

      const merged = { ...selectedUser, ...patch, userType: selectedUser.userType };
      await set(ref(db, `users/${newMobile}`), merged);
      await remove(ref(db, `users/${oldKey}`));

      selectedUserKey = newMobile;
      selectedUser = merged;

      uModalTitle.textContent = `${selectedRole.toUpperCase()} • ${fmtName(merged)}`;
      uModalSub.textContent = `Key: ${newMobile}`;
      uModalBody.innerHTML = buildEditForm(merged, selectedRole);

      await noticeModal({ title:"Saved", subtitle:"Changes were applied successfully." });
      return;
    }

    // ✅ Normal update (THIS WAS MISSING IN YOUR CODE)
    await update(ref(db, `users/${oldKey}`), patch);

    const updated = (await get(ref(db, `users/${oldKey}`))).val();
    selectedUser = updated;

    uModalTitle.textContent = `${selectedRole.toUpperCase()} • ${fmtName(updated)}`;
    uModalSub.textContent = `Key: ${oldKey}`;
    uModalBody.innerHTML = buildEditForm(updated, selectedRole);

    await noticeModal({ title:"Saved", subtitle:"Changes were applied successfully." });
  }catch(e){
    await noticeModal({ title:"Save failed", subtitle: e?.message || "Unable to update user.", variant:"danger" });
  }
});

/* =========================
   SUPPORT TICKETS (YOUR PATHS)
   Tickets:   support_tickets/{ticketId}
   Messages:  support_messages/{ticketId}/{messageId}
   Message flag in DB: admin (boolean)
========================= */
const ticketList = $("#ticketList");
const ticketStatusFilter = $("#ticketStatusFilter");
const ticketSearch = $("#ticketSearch");
const ticketTitle = $("#ticketTitle");
const ticketMeta = $("#ticketMeta");
const closeTicketBtn = $("#closeTicketBtn");
const reopenTicketBtn = $("#reopenTicketBtn");
const deleteTicketBtn = $("#deleteTicketBtn");
const chatBox = $("#chatBox");
const chatInput = $("#chatInput");
const sendChatBtn = $("#sendChatBtn");

let ticketsCache = {};
let selectedTicketId = null;

function startSupportTicketSystem() {
  if (!ticketList || !chatBox || !chatInput || !sendChatBtn) return;

  onValue(ref(db, "support_tickets"), (snap) => {
    ticketsCache = snap.val() || {};
    renderTicketList();
    if (selectedTicketId && !ticketsCache[selectedTicketId]) resetChatUI();
  });

  ticketStatusFilter?.addEventListener("change", renderTicketList);
  ticketSearch?.addEventListener("input", renderTicketList);

  ticketList.addEventListener("click", (e) => {
    const item = e.target.closest(".item[data-ticketid]");
    if (!item) return;
    openTicketThread(item.dataset.ticketid);
  });

  closeTicketBtn?.addEventListener("click", () => setTicketStatus("closed"));
  reopenTicketBtn?.addEventListener("click", () => setTicketStatus("open"));
  deleteTicketBtn?.addEventListener("click", deleteTicketThread);

  sendChatBtn.addEventListener("click", sendAdminMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendAdminMessage();
  });

  resetChatUI();
}

function resetChatUI() {
  selectedTicketId = null;
  ticketTitle && (ticketTitle.textContent = "Select a ticket");
  ticketMeta && (ticketMeta.textContent = "—");
  if (chatBox) {
    chatBox.classList.add("empty");
    chatBox.innerHTML = `<div class="muted">No ticket selected.</div>`;
  }
}

function renderTicketList() {
  if (!ticketList) return;

  const statusF = ticketStatusFilter?.value || "all";
  const kw = (ticketSearch?.value || "").trim().toLowerCase();

  const list = Object.entries(ticketsCache)
    .map(([id, t]) => ({ id, ...(t || {}) }))
    .filter((t) => {
      const st = t.status || "open";
      if (statusF !== "all" && st !== statusF) return false;

      if (kw) {
        const hay = [t.userName, t.userMobile, t.type, t.lastMessage]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const sa = a.status === "open" ? 0 : 1;
      const sb = b.status === "open" ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });

  ticketList.innerHTML = list.map((t) => {
    const st = t.status || "open";
    return `
      <div class="item" data-ticketid="${esc(t.id)}">
        <div class="rowTop">
          <div class="strong">${esc(t.userName || "Unknown")}</div>
          <div class="badge ${badgeClass(st)}">${esc(st)}</div>
        </div>
        <div class="muted tiny">${esc(t.userMobile || "")} • ${esc(t.type || "Others")}</div>
        <div class="muted tiny">${esc(t.lastMessage || "")}</div>
      </div>
    `;
  }).join("");
}

function openTicketThread(ticketId) {
  selectedTicketId = ticketId;

  const t = ticketsCache[ticketId] || {};
  if (ticketTitle) ticketTitle.textContent = `${t.userName || "Unknown"} (${t.userMobile || ""})`;
  if (ticketMeta) ticketMeta.textContent = `Ticket: ${ticketId} • ${t.type || "Others"} • ${t.status || "open"}`;

  const msgRef = ref(db, `support_messages/${ticketId}`);
  onValue(msgRef, (snap) => {
    const obj = snap.val() || {};
    const msgs = Object.entries(obj).map(([id, m]) => ({ id, ...(m || {}) }));
    msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    renderMessages(msgs);
  });
}

function renderMessages(msgs) {
  if (!chatBox) return;
  chatBox.classList.remove("empty");

  if (!msgs.length) {
    chatBox.innerHTML = `<div class="muted">No messages yet.</div>`;
    return;
  }

  chatBox.innerHTML = msgs.map((m) => {
    const isAdmin = !!m.admin; // ✅ your DB field
    const who = isAdmin ? "admin" : (m.senderId || "user");
    const time = m.timestamp ? new Date(m.timestamp).toLocaleString() : "";
    return `
      <div class="msg ${isAdmin ? "admin" : ""}">
        <div>${esc(m.text || "")}</div>
        <div class="msgMeta">${esc(who)} • ${esc(time)}</div>
      </div>
    `;
  }).join("");

  chatBox.scrollTop = chatBox.scrollHeight;
}

async function setTicketStatus(status) {
  if (!selectedTicketId) {
    return noticeModal({ title: "No ticket selected", subtitle: "Select a support ticket first." });
  }

  const t = ticketsCache[selectedTicketId] || {};
  const ok = await confirmModal({
    title: status === "closed" ? "Close Ticket" : "Reopen Ticket",
    subtitle: "This will update the ticket status.",
    variant: status === "closed" ? "danger" : "primary",
    confirmText: status === "closed" ? "Yes, Close" : "Yes, Reopen",
    cancelText: "Cancel",
    bodyHtml: `
      <div class="metaGrid">
        <div class="meta"><div class="k">Ticket</div><div class="v">${esc(selectedTicketId)}</div></div>
        <div class="meta"><div class="k">User</div><div class="v">${esc(t.userName || "Unknown")}</div></div>
        <div class="meta"><div class="k">New Status</div><div class="v">${esc(status)}</div></div>
      </div>
    `
  });
  if (!ok) return;

  try {
    await update(ref(db, `support_tickets/${selectedTicketId}`), {
      status,
      timestamp: Date.now()
    });
    await noticeModal({ title: "Updated", subtitle: `Ticket is now ${status}.` });
  } catch (e) {
    await noticeModal({ title: "Failed", subtitle: e?.message || "Unable to update ticket.", variant: "danger" });
  }
}

async function deleteTicketThread() {
  if (!selectedTicketId) {
    return noticeModal({ title: "No ticket selected", subtitle: "Select a support ticket first." });
  }

  const t = ticketsCache[selectedTicketId] || {};
  const ok = await confirmModal({
    title: "Delete Ticket Thread",
    subtitle: "This will permanently delete the ticket and all messages.",
    variant: "danger",
    confirmText: "Yes, Delete",
    cancelText: "Cancel",
    bodyHtml: `
      <div class="muted tiny">This action cannot be undone.</div>
      <div class="metaGrid">
        <div class="meta"><div class="k">Ticket</div><div class="v">${esc(selectedTicketId)}</div></div>
        <div class="meta"><div class="k">User</div><div class="v">${esc(t.userName || "Unknown")}</div></div>
        <div class="meta"><div class="k">Mobile</div><div class="v">${esc(t.userMobile || "")}</div></div>
      </div>
    `
  });
  if (!ok) return;

  try {
    await remove(ref(db, `support_messages/${selectedTicketId}`));
    await remove(ref(db, `support_tickets/${selectedTicketId}`));
    resetChatUI();
    await noticeModal({ title: "Deleted", subtitle: "Ticket thread was removed.", variant: "danger" });
  } catch (e) {
    await noticeModal({ title: "Failed", subtitle: e?.message || "Unable to delete thread.", variant: "danger" });
  }
}

async function sendAdminMessage() {
  if (!selectedTicketId) {
    return noticeModal({ title: "No ticket selected", subtitle: "Select a ticket first." });
  }

  const text = (chatInput?.value || "").trim();
  if (!text) return;
  chatInput.value = "";

  try {
    const msgRef = push(ref(db, `support_messages/${selectedTicketId}`));
    const messageId = msgRef.key;

    // ✅ match your DB: admin boolean
    const msg = {
      id: messageId || "",
      senderId: "admin",
      text,
      timestamp: Date.now(),
      admin: true
    };

    await set(msgRef, msg);

    await update(ref(db, `support_tickets/${selectedTicketId}`), {
      lastMessage: text,
      timestamp: Date.now()
    });
  } catch (e) {
    await noticeModal({ title: "Failed", subtitle: e?.message || "Unable to send message.", variant: "danger" });
  }
}