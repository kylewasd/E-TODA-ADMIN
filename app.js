import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
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
// ✅ session-only: when tab/window closes, user is logged out
await setPersistence(auth, browserSessionPersistence);
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
   TOAST NOTIFICATIONS
========================= */
const toastHost = document.querySelector("#toastHost");

function toast(type = "info", title = "Info", message = "", opts = {}) {
  // Safe fallback (never block the app)
  if (!toastHost) {
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    return;
  }

  const {
    duration = 3200, // ms
    closable = true
  } = opts;

  const icons = {
    info: "i",
    warning: "!",
    error: "×",
    success: "✓"
  };

  const el = document.createElement("div");
  el.className = `toast ${type}`;

  el.innerHTML = `
    <div class="toastIcon">${icons[type] ?? "i"}</div>
    <div class="toastBody">
      <div class="toastTitle">${esc(title)}</div>
      <div class="toastMsg">${esc(message)}</div>
    </div>
    ${closable ? `<button class="toastClose" aria-label="Close">✕</button>` : ""}
  `;

  // Close
  const removeToast = () => {
    el.style.opacity = "0";
    el.style.transform = "translateY(-4px)";
    setTimeout(() => el.remove(), 180);
  };

  el.querySelector(".toastClose")?.addEventListener("click", removeToast);

  toastHost.appendChild(el);

  if (duration > 0) {
    setTimeout(removeToast, duration);
  }
}

// Convenience
const notify = {
  info:    (t, m, o) => toast("info", t, m, o),
  warning: (t, m, o) => toast("warning", t, m, o),
  error:   (t, m, o) => toast("error", t, m, o),
  success: (t, m, o) => toast("success", t, m, o),
};

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

// ===============================
// Confirm Modal (new UI)
// ===============================
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
  title = "Are you sure?",
  subtitle = "Please review before confirming.",
  bodyHtml = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary" // "primary" | "danger"
}) {
  const missing = !cModalBackdrop || !cModal || !cTitle || !cSubtitle || !cBody || !cOk || !cCancel;
  if (missing) return Promise.resolve(window.confirm(`${title}\n\n${subtitle}`));

  return new Promise((resolve) => {
    _confirmResolve = resolve;

    cTitle.textContent = title;
    cSubtitle.textContent = subtitle;
    cBody.innerHTML = bodyHtml || "";

    cOk.textContent = confirmText;
    cCancel.textContent = cancelText;

    // styles
    cModal.classList.remove("primary", "danger");
    cModal.classList.add(variant);

    cOk.classList.remove("mBtnPrimary", "mBtnDanger");
    cOk.classList.add(variant === "danger" ? "mBtnDanger" : "mBtnPrimary");

    cIcon.textContent = variant === "danger" ? "!" : "✓";

    cModalBackdrop.classList.remove("hidden");
    cModal.classList.remove("hidden");

    setTimeout(() => cOk.focus(), 0);
  });
}

function closeConfirm(result) {
  cModalBackdrop?.classList.add("hidden");
  cModal?.classList.add("hidden");
  if (cBody) cBody.innerHTML = "";
  if (_confirmResolve) _confirmResolve(result);
  _confirmResolve = null;
}

cModalBackdrop?.addEventListener("click", () => closeConfirm(false));
cClose?.addEventListener("click", () => closeConfirm(false));
cCancel?.addEventListener("click", () => closeConfirm(false));
cOk?.addEventListener("click", () => closeConfirm(true));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && _confirmResolve) closeConfirm(false);
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

let originalFormData = {};   // 👈 ADD THIS LINE


/* =========================
   Form Change Detection
========================= */

function captureOriginalForm() {
  originalFormData = {};

  const inputs = uModalBody.querySelectorAll("[data-field]");
  inputs.forEach(input => {
    originalFormData[input.dataset.field] = input.value.trim();
  });

  toggleSaveButton(false);
}

function monitorFormChanges() {
  const inputs = uModalBody.querySelectorAll("[data-field]");

  inputs.forEach(input => {
    input.addEventListener("input", checkIfFormChanged);
    input.addEventListener("change", checkIfFormChanged);
  });
}

function checkIfFormChanged() {
  const inputs = uModalBody.querySelectorAll("[data-field]");
  let changed = false;

  inputs.forEach(input => {
    const field = input.dataset.field;
    const currentValue = input.value.trim();
    const originalValue = originalFormData[field] ?? "";

    if (currentValue !== originalValue) {
      changed = true;
    }
  });

  toggleSaveButton(changed);
}

function toggleSaveButton(enable) {
  if (!uModalSave) return;

  uModalSave.disabled = !enable;

  if (enable) {
    uModalSave.classList.remove("disabled");
  } else {
    uModalSave.classList.add("disabled");
  }
}

/* =========================
 END Change Detection
========================= */

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
   /* ========================= await noticeModal({ title: "Login failed", subtitle: e?.message || "Please try again.", variant: "danger" });
   ========================= */ 
   notify?.error?.("Login failed", "Please try again.");
  }
});

window.addEventListener("beforeunload", () => {
  try { signOut(auth); } catch {}
});

logoutBtn?.addEventListener("click", async () => {
  const ok = await confirmModal({
    title: "Log out?",
    subtitle: "You will need to sign in again to access the admin panel.",
    confirmText: "Log out",
    cancelText: "Cancel",
    variant: "danger",
    bodyHtml: ""
  });

  if (!ok) return;

  try {
    await signOut(auth);
    // Optional: toast/notify
    notify?.success?.("Logged out", "You have been signed out.");
  } catch (e) {
    notify?.error?.("Failed", e?.message || "Unable to log out.");
  }
});

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
  
  notify?.success?.("Logged in", "Welcome back!");
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

  const keyword = (kw || "").toLowerCase();

  return list.filter(u=>{
    const st = u.approvalStatus || "approved";
    if(status !== "all" && st !== status) return false;

    if(keyword){
      const hay = [
        u.key,               // ✅ USER ID (RTDB key)
        u.userId,            // ✅ if stored separately
        u.firstName,
        u.lastName,
        u.mobileNumber,
        u.plateNumber
      ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

      if(!hay.includes(keyword)) return false;
    }

    return true;
  });
}

/* =========================
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

========================= */

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
  uModalSub.textContent = `User ID: ${u.userId || selectedUserKey}`;
  uModalBody.innerHTML = buildEditForm(u, role);
  captureOriginalForm();
  monitorFormChanges();
  openUserModal();
});

function buildEditForm(u, role){
  const address = u.address || [u.barangay, u.city, u.province].filter(Boolean).join(", ");

  const statusOptions = role === "commuter"
    ? ["approved","terminated"]
    : ["pending","approved","rejected","terminated"];

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
    notify.warning("Invalid input", "First Name and Last Name are required.");
    return;
  }
  if(!isValidMobile(newMobile)){
    notify.warning("Invalid mobile", "Must be 11 digits starting with 09.");
    return;
  }
  if(!isValidPin(newPin)){
    notify.warning("Invalid PIN", "PIN must be exactly 4 digits.");
    return;
  }

  if(selectedRole === "commuter" && !["approved","terminated"].includes(newStatus)){
    notify.warning("Invalid status", "Commuter: approved or terminated only.");
    return;
  }
  if(selectedRole === "driver" && !["pending","approved","rejected","terminated"].includes(newStatus)){
    notify.warning("Invalid status", "Driver: pending/approved/rejected/terminated only.");
    return;
  }

const ok = await confirmModal({
  title: "Save changes?",
  subtitle: "This will update the user information in the database.",
  confirmText: "Save",
  cancelText: "Cancel",
  variant: "primary"
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
        notify.warning("Cannot save", "That mobile number already exists.");
        return;
      }

      const merged = { ...selectedUser, ...patch, userType: selectedUser.userType };
      await set(ref(db, `users/${newMobile}`), merged);
      await remove(ref(db, `users/${oldKey}`));

      selectedUserKey = newMobile;
      selectedUser = merged;

      uModalTitle.textContent = `${selectedRole.toUpperCase()} • ${fmtName(merged)}`;
      uModalSub.textContent = `User ID: ${u.userId || selectedUserKey}`;
      uModalBody.innerHTML = buildEditForm(merged, selectedRole);
      notify.success("Saved", "Changes were applied successfully.");
      captureOriginalForm();
      monitorFormChanges();
      toggleSaveButton(false);
      closeUserModal();
      return;
    }

    // ✅ Normal update (THIS WAS MISSING IN YOUR CODE)
    await update(ref(db, `users/${oldKey}`), patch);

    const updated = (await get(ref(db, `users/${oldKey}`))).val();
    selectedUser = updated;

    uModalTitle.textContent = `${selectedRole.toUpperCase()} • ${fmtName(updated)}`;
    uModalSub.textContent = `Key: ${oldKey}`;
    uModalBody.innerHTML = buildEditForm(updated, selectedRole);

    notify.success("Saved", "Changes were applied successfully.");
    captureOriginalForm();   // store new values as original
    toggleSaveButton(false);
    closeUserModal();
    return;
  }catch(e){
    notify.error("Save failed", e?.message || "Unable to update user.");
    return;
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

// SUPPORT MODAL DOM
const sModalBackdrop = $("#sModalBackdrop");
const sModal = $("#sModal");
const sClose = $("#sClose");

const sTitle = $("#sTitle");
const sMeta = $("#sMeta");
const sChatBox = $("#sChatBox");
const sChatInput = $("#sChatInput");
const sSendBtn = $("#sSendBtn");

const sCloseTicketBtn = $("#sCloseTicketBtn");
const sReopenTicketBtn = $("#sReopenTicketBtn");
const sDeleteTicketBtn = $("#sDeleteTicketBtn");

let ticketsCache = {};
let selectedTicketId = null;

function startSupportTicketSystem() {
  // ✅ use modal ids
  if (!ticketList || !sChatBox || !sChatInput || !sSendBtn) return;

  // tickets listener
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
    openSupportModal();
    openTicketThread(item.dataset.ticketid);
  });

  sCloseTicketBtn?.addEventListener("click", () => setTicketStatus("closed"));
  sReopenTicketBtn?.addEventListener("click", () => setTicketStatus("open"));
  sDeleteTicketBtn?.addEventListener("click", deleteTicketThread);

  sSendBtn.addEventListener("click", sendAdminMessage);
  sChatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendAdminMessage();
  });

  resetChatUI();
}

function resetChatUI() {
  selectedTicketId = null;
  if (sTitle) sTitle.textContent = "Select a ticket";
  if (sMeta) sMeta.textContent = "—";
  if (sChatBox) {
    sChatBox.classList.add("empty");
    sChatBox.innerHTML = `<div class="muted">No ticket selected.</div>`;
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
  if (sTitle) sTitle.textContent = `${t.userName || "Unknown"} (${t.userMobile || ""})`;
  if (sMeta) sMeta.textContent = `Ticket ID: ${ticketId} • ${t.type || "Others"} • ${t.status || "open"}`;
  applyTicketUIState(t.status || "open");

  const msgRef = ref(db, `support_messages/${ticketId}`);
  onValue(msgRef, (snap) => {
    const obj = snap.val() || {};
    const msgs = Object.entries(obj).map(([id, m]) => ({ id, ...(m || {}) }));
    msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    renderMessages(msgs);
  });

  onValue(ref(db, "support_tickets"), (snap) => {
  ticketsCache = snap.val() || {};
  renderTicketList();

  // ✅ If a ticket is currently open in modal, update controls when its status changes
  if (selectedTicketId && ticketsCache[selectedTicketId]) {
    const st = ticketsCache[selectedTicketId].status || "open";
    applyTicketUIState(st);
    if (sMeta) {
      const t = ticketsCache[selectedTicketId] || {};
      sMeta.textContent = `Ticket ID: ${selectedTicketId} • ${t.type || "Others"} • ${st}`;
    }
  }
});
}

function renderMessages(msgs) {
  if (!sChatBox) return;

  sChatBox.classList.remove("empty");

  if (!msgs.length) {
    sChatBox.innerHTML = `<div class="muted">No messages yet.</div>`;
    return;
  }

  sChatBox.innerHTML = msgs.map((m) => {
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

  sChatBox.scrollTop = sChatBox.scrollHeight;
}

function applyTicketUIState(status) {
  const isClosed = (status || "open") === "closed";

  // Buttons
  if (sCloseTicketBtn)  sCloseTicketBtn.disabled  = isClosed;     // closed -> disable close
  if (sReopenTicketBtn) sReopenTicketBtn.disabled = !isClosed;    // open -> disable reopen

  // Chat composer lock when closed
  if (sChatInput) sChatInput.disabled = isClosed;
  if (sSendBtn)   sSendBtn.disabled   = isClosed;

  // Optional UX: placeholder text
  if (sChatInput) {
    sChatInput.placeholder = isClosed
      ? "Ticket is closed. Reopen to continue chatting."
      : "Type a message...";
  }

  // Optional UX: visually dim composer when closed
  const composer = document.querySelector(".sComposer");
  if (composer) composer.style.opacity = isClosed ? "0.6" : "1";
}

async function setTicketStatus(status) {
  if (!selectedTicketId) {
    notify?.info?.("No ticket selected", "Select a support ticket first.");
    return;
  }

  const t = ticketsCache[selectedTicketId] || {};
  const ok = await confirmModal({
    title: status === "closed" ? "Close ticket?" : "Reopen ticket?",
    subtitle: status === "closed"
      ? "This ticket will be marked as closed."
      : "This ticket will be reopened for support.",
    confirmText: status === "closed" ? "Close" : "Reopen",
    cancelText: "Cancel",
    variant: status === "closed" ? "danger" : "primary",
  });
  if (!ok) return;

  try {
    await update(ref(db, `support_tickets/${selectedTicketId}`), {
      status,
      timestamp: Date.now()
    });

    notify?.success?.("Updated", `Ticket is now ${status}.`);
    // refresh header text
    if (sMeta) sMeta.textContent = `Ticket: ${selectedTicketId} • ${t.type || "Others"} • ${status}`;
  } catch (e) {
    notify?.error?.("Failed", e?.message || "Unable to update ticket.");
  }
  applyTicketUIState(status);
}

async function deleteTicketThread() {
  if (!selectedTicketId) {
    notify?.info?.("No ticket selected", "Select a support ticket first.");
    return;
  }

  const t = ticketsCache[selectedTicketId] || {};
  const ok = await confirmModal({
    title: "Delete ticket thread?",
    subtitle: "This will permanently delete the ticket and all messages.",
    confirmText: "Delete",
    cancelText: "Cancel",
    variant: "danger",
  });
  if (!ok) return;

  try {
    await remove(ref(db, `support_messages/${selectedTicketId}`));
    await remove(ref(db, `support_tickets/${selectedTicketId}`));

    notify?.success?.("Deleted", "Ticket thread was removed.");
    resetChatUI();
    closeSupportModal();
  } catch (e) {
    notify?.error?.("Failed", e?.message || "Unable to delete thread.");
  }
}

async function sendAdminMessage() {
  if (!selectedTicketId) {
    notify?.info?.("No ticket selected", "Select a ticket first.");
    return;
  }

  const t = ticketsCache[selectedTicketId];
  const status = t?.status || "open";
  if (status === "closed") {
    notify?.warning?.("Ticket closed", "Reopen the ticket to send messages.");
    return;
  }

  const text = (sChatInput?.value || "").trim();
  if (!text) return;
  sChatInput.value = "";

  try {
    const msgRef = push(ref(db, `support_messages/${selectedTicketId}`));
    const messageId = msgRef.key;

    await set(msgRef, {
      id: messageId || "",
      senderId: "admin",
      text,
      timestamp: Date.now(),
      admin: true
    });

    await update(ref(db, `support_tickets/${selectedTicketId}`), {
      lastMessage: text,
      timestamp: Date.now()
    });
  } catch (e) {
    notify?.error?.("Failed", e?.message || "Unable to send message.");
  }
}

// SUPPORT MODAL
function openSupportModal(){
  show(sModalBackdrop);
  show(sModal);
}
function closeSupportModal(){
  hide(sModalBackdrop);
  hide(sModal);

  // optional: clear the UI text
  // selectedTicketId = null;  // keep or remove based on preference
}
sModalBackdrop?.addEventListener("click", closeSupportModal);
sClose?.addEventListener("click", closeSupportModal);