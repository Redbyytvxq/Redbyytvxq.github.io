/* ============================================================
   Red Trung Thu — Order form logic
   ============================================================ */

const CONFIG = {
  // Same Apps Script endpoint as the snack shop — orders land in the
  // shared "Orders bánh" tab alongside the R-code (đồ khô) orders.
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycby2_S2yOnrGZAHG3Ce8iDzE9Mjypy_P_8wX5PKv8IL-h3-8t3xR0BhdVWCBXzN8cYa_bA/exec",
  // ⚠️ TODO: paste the published CSV link for the "Bánh Trung Thu" tab here
  // (Tệp > Chia sẻ > Xuất bản lên web > chọn tab "Bánh Trung Thu" > định dạng CSV).
  // Sheet columns: A = Món (tên bánh, phải khớp với PRODUCTS bên dưới), B = Tồn kho (số lượng)
  INVENTORY_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSvIeJVT0yUnBfO6dDAyRm8vn1kp38Rclyi42pKR21zp4ZW7KT-O7VVgkJYogFlwxquXHoyz7z3NaxY/pub?gid=1654865179&single=true&output=csv",
};

const PRODUCTS = [
  // ---- Bánh truyền thống ----
  { id: "M1",  name: "Nướng dẻo đậu xanh",           price: 55000, unit: "01 bánh", icon: "🥮", category: "Bánh truyền thống" },
  { id: "M2",  name: "Nướng dẻo khoai môn",           price: 55000, unit: "01 bánh", icon: "🥮", category: "Bánh truyền thống" },
  { id: "M3",  name: "Nướng dẻo thập cẩm",            price: 65000, unit: "01 bánh", icon: "🥮", category: "Bánh truyền thống" },
  { id: "M4",  name: "Nướng thập cẩm gà quay",        price: 70000, unit: "01 bánh", icon: "🥮", category: "Bánh truyền thống" },
  { id: "M5",  name: "Nướng dẻo cốm dừa",             price: 65000, unit: "01 bánh", icon: "🥮", category: "Bánh truyền thống" },
  { id: "M6",  name: "Nướng mochi chà bông",          price: 70000, unit: "01 bánh", icon: "🥮", category: "Bánh truyền thống" },

  // ---- Bánh hiện đại 2D ----
  { id: "M7",  name: "Thanh ngọc dưa gang",           price: 60000, unit: "01 bánh", icon: "🥮", category: "Bánh hiện đại 2D" },
  { id: "M8",  name: "Khoai môn",                     price: 55000, unit: "01 bánh", icon: "🥮", category: "Bánh hiện đại 2D" },
  { id: "M9",  name: "Kem trứng chà bông",            price: 70000, unit: "01 bánh", icon: "🥮", category: "Bánh hiện đại 2D" },
  { id: "M10", name: "Sen tuyết táo đỏ",               price: 70000, unit: "01 bánh", icon: "🥮", category: "Bánh hiện đại 2D" },

  // ---- Bánh đặc biệt ----
  { id: "M11", name: "Lava sen cốm dừa",              price: 60000, unit: "01 bánh", icon: "🥮", category: "Bánh đặc biệt" },
  { id: "M12", name: "Tiramisu cheese",                price: 60000, unit: "01 bánh", icon: "🥮", category: "Bánh đặc biệt" },
  { id: "M13", name: "Khoai môn mochi chà bông",      price: 60000, unit: "01 bánh", icon: "🥮", category: "Bánh đặc biệt" },
  { id: "M14", name: "Lava trứng chảy",               price: 60000, unit: "01 bánh", icon: "🥮", category: "Bánh đặc biệt" },
  { id: "M15", name: "Mochi đậu xanh ngũ hạt",        price: 60000, unit: "01 bánh", icon: "🥮", category: "Bánh đặc biệt" },

  // ---- Set mini 6 bánh ----
  { id: "M16", name: "Set 1 — đóng nguyên khay 6 bánh", price: 100000, unit: "01 hộp", icon: "🎁", category: "Set mini 6 bánh" },
  { id: "M17", name: "Set 2 — đóng riêng từng bánh",    price: 110000, unit: "01 hộp", icon: "🎁", category: "Set mini 6 bánh" },

  // ---- Bánh Healthy ----
  { id: "M18", name: "Trà xanh lưu sa hạt điều",       price: 70000, unit: "01 bánh", icon: "🍵", category: "Bánh Healthy" },
  { id: "M19", name: "Socola lưu sa macca",            price: 75000, unit: "01 bánh", icon: "🍫", category: "Bánh Healthy" },
  { id: "M20", name: "Sầu riêng lưu sa hạnh nhân",     price: 75000, unit: "01 bánh", icon: "🌰", category: "Bánh Healthy" },
  { id: "M21", name: "Tuyết nước đậu đỏ óc chó rum nho", price: 80000, unit: "01 bánh", icon: "🍚", category: "Bánh Healthy" },
];

const CATEGORY_ORDER = [
  "Bánh truyền thống",
  "Bánh hiện đại 2D",
  "Bánh đặc biệt",
  "Set mini 6 bánh",
  "Bánh Healthy",
];

const cart = {}; // { M1: qty }

const fmtVND = (n) => n.toLocaleString("vi-VN") + "đ";

/* ---------------- inventory sync ---------------- */

function normalizeName(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        rows.push(row); row = [];
      } else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

async function syncInventory() {
  if (!CONFIG.INVENTORY_CSV_URL || CONFIG.INVENTORY_CSV_URL.includes("PASTE_YOUR")) return;
  try {
    const res = await fetch(CONFIG.INVENTORY_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được file tồn kho");
    const text = await res.text();
    const rows = parseCsv(text);
    if (!rows.length) return;

    const dataRows = rows.slice(1); // skip header row
    const stockByName = {};
    dataRows.forEach((r) => {
      const name = normalizeName(r[0]);
      const qty = parseInt((r[1] || "0").toString().replace(/[^\d-]/g, ""), 10);
      if (name) stockByName[name] = isNaN(qty) ? 0 : qty;
    });

    PRODUCTS.forEach((p) => {
      const key = normalizeName(p.name);
      if (Object.prototype.hasOwnProperty.call(stockByName, key)) {
        p.stock = stockByName[key];
        p.soldOut = stockByName[key] <= 0;
      }
    });
  } catch (err) {
    console.error("Lỗi đồng bộ tồn kho:", err);
  }
}

/* ---------------- render menu (grouped by category) ---------------- */

const menuByCategory = document.getElementById("menuByCategory");

function dishCardHTML(p) {
  const stockBadge = p.soldOut
    ? ' <span class="dish__badge" style="color:#DB6B52;">(Hết hàng)</span>'
    : (typeof p.stock === "number" ? ` <span class="dish__badge" id="stock-${p.id}" style="color:#9FD9AE;">(Còn ${Math.max(0, p.stock - (cart[p.id] || 0))})</span>` : "");

  return `
    <div class="dish${p.soldOut ? " dish--soldout" : ""}">
      <div class="dish__roundel" aria-hidden="true">${p.icon}</div>
      <div class="dish__body">
        <p class="dish__name">${p.name}${stockBadge}</p>
        <span class="dish__price">${fmtVND(p.price)}</span><span class="dish__unit">/ ${p.unit}</span>
      </div>
      <div class="qty-stepper">
        <button type="button" class="qty-btn" data-action="dec" data-id="${p.id}" aria-label="Giảm số lượng ${p.name}" ${p.soldOut ? "disabled" : ""}>–</button>
        <span class="qty-value" id="qty-${p.id}" data-qty-nonzero="false">0</span>
        <button type="button" class="qty-btn" data-action="inc" data-id="${p.id}" aria-label="Tăng số lượng ${p.name}" ${p.soldOut ? "disabled" : ""}>+</button>
      </div>
    </div>`;
}

function renderMenu() {
  menuByCategory.innerHTML = CATEGORY_ORDER.map((cat) => {
    const items = PRODUCTS.filter((p) => p.category === cat);
    if (!items.length) return "";
    return `
      <div class="category">
        <svg class="category__icon" viewBox="0 0 100 100"><use href="#stamp"/></svg>
        <span class="category__label">${cat}</span>
        <span class="category__rule"></span>
      </div>
      <div class="menu__grid">
        ${items.map(dishCardHTML).join("")}
      </div>`;
  }).join("");
}

menuByCategory.addEventListener("click", (e) => {
  const btn = e.target.closest(".qty-btn");
  if (!btn || btn.disabled) return;
  const id = btn.dataset.id;
  const product = PRODUCTS.find((p) => p.id === id);
  if (product && product.soldOut) return;
  const current = cart[id] || 0;

  let next;
  if (btn.dataset.action === "inc") {
    if (product && typeof product.stock === "number" && current >= product.stock) return;
    next = current + 1;
  } else {
    next = Math.max(0, current - 1);
  }

  cart[id] = next;
  document.getElementById(`qty-${id}`).textContent = next;
  document.getElementById(`qty-${id}`).dataset.qtyNonzero = next > 0 ? "true" : "false";

  if (product && typeof product.stock === "number") {
    const badge = document.getElementById(`stock-${id}`);
    if (badge) badge.textContent = `(Còn ${Math.max(0, product.stock - next)})`;
  }

  renderReceipt();
});

/* ---------------- receipt ---------------- */

const receiptItems = document.getElementById("receiptItems");
const receiptTotal = document.getElementById("receiptTotal");

function renderReceipt() {
  const chosen = PRODUCTS.filter((p) => cart[p.id] > 0);
  if (chosen.length === 0) {
    receiptItems.innerHTML = `<p class="receipt__empty">Chưa có bánh nào được chọn</p>`;
    receiptTotal.textContent = fmtVND(0);
    return;
  }
  let total = 0;
  receiptItems.innerHTML = chosen
    .map((p) => {
      const qty = cart[p.id];
      const sub = qty * p.price;
      total += sub;
      return `
        <div class="receipt__item">
          <span class="receipt__item-name">${p.name}</span>
          <span class="receipt__item-qty">×${qty}</span>
          <span class="receipt__item-sub">${fmtVND(sub)}</span>
        </div>`;
    })
    .join("");
  receiptTotal.textContent = fmtVND(total);
}

/* ---------------- payment / bill upload ---------------- */

const paymentOptions = document.getElementById("paymentOptions");
const billField = document.getElementById("billField");
const billUpload = document.getElementById("billUpload");
const uploadPrompt = document.getElementById("uploadPrompt");
const uploadPreview = document.getElementById("uploadPreview");

let billBase64 = null;
let billMimeType = null;
let billFileName = null;

paymentOptions.addEventListener("change", (e) => {
  const isBank = e.target.value.startsWith("Chuyển khoản");
  billField.hidden = !isBank;
  billUpload.required = isBank;
  if (!isBank) {
    billUpload.value = "";
    billBase64 = null;
    uploadPreview.hidden = true;
    uploadPrompt.hidden = false;
  }
});

billUpload.addEventListener("change", () => {
  const file = billUpload.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    alert("Ảnh bill vượt quá 10MB, bạn chọn ảnh nhỏ hơn giúp Red nhé.");
    billUpload.value = "";
    return;
  }
  billMimeType = file.type;
  billFileName = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    billBase64 = reader.result.split(",")[1];
    uploadPreview.src = reader.result;
    uploadPreview.hidden = false;
    uploadPrompt.hidden = true;
  };
  reader.readAsDataURL(file);
});

/* ---------------- submit ---------------- */

const form = document.getElementById("orderForm");
const submitBtn = document.getElementById("submitBtn");
const submitBtnText = document.getElementById("submitBtnText");
const formStatus = document.getElementById("formStatus");

function setStatus(text, state) {
  formStatus.textContent = text;
  formStatus.dataset.state = state || "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("", "");

  const chosen = PRODUCTS.filter((p) => cart[p.id] > 0);
  if (chosen.length === 0) {
    setStatus("Bạn chưa chọn bánh nào ở phần thực đơn phía trên nhé!", "err");
    document.querySelector(".menu").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (!form.reportValidity()) return;

  const nowSoldOut = chosen.find((p) => p.soldOut);
  if (nowSoldOut) {
    setStatus(`"${nowSoldOut.name}" vừa hết hàng, bạn bỏ món này khỏi đơn giúp Red nhé!`, "err");
    return;
  }

  const paymentEl = form.querySelector('input[name="payment"]:checked');
  const isBank = paymentEl.value.startsWith("Chuyển khoản");
  if (isBank && !billBase64) {
    setStatus("Bạn chuyển khoản thì nhớ đính kèm ảnh bill giúp Red nhé!", "err");
    billField.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const total = chosen.reduce((sum, p) => sum + p.price * cart[p.id], 0);
  const itemsText = chosen.map((p) => `${p.id} - ${p.name} x${cart[p.id]}`).join("; ");

  const payload = {
    nameFb: form.nameFb.value.trim(),
    address: form.address.value.trim(),
    phone: form.phone.value.trim(),
    items: itemsText,
    total: total,
    payment: paymentEl.value,
    notes: form.notes.value.trim(),
    billBase64: billBase64 || "",
    billMimeType: billMimeType || "",
    billFileName: billFileName || "",
  };

  if (CONFIG.APPS_SCRIPT_URL.includes("PASTE_YOUR")) {
    setStatus("Chưa cấu hình APPS_SCRIPT_URL trong script.js — xem hướng dẫn trong README.", "err");
    return;
  }

  submitBtn.disabled = true;
  submitBtnText.textContent = "Đang gửi...";
  setStatus("Đang gửi đơn cho Red, đợi bạn một chút nhé...", "busy");

  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    setStatus("Đã gửi đơn thành công! Red sẽ liên hệ xác nhận sớm nhất 🏮", "ok");
    form.reset();
    Object.keys(cart).forEach((id) => {
      cart[id] = 0;
      const el = document.getElementById(`qty-${id}`);
      if (el) { el.textContent = "0"; el.dataset.qtyNonzero = "false"; }
      const product = PRODUCTS.find((p) => p.id === id);
      if (product && typeof product.stock === "number") {
        const badge = document.getElementById(`stock-${id}`);
        if (badge) badge.textContent = `(Còn ${Math.max(0, product.stock)})`;
      }
    });
    renderReceipt();
    billField.hidden = true;
    billBase64 = null;
    uploadPreview.hidden = true;
    uploadPrompt.hidden = false;
  } catch (err) {
    console.error(err);
    setStatus("Có lỗi khi gửi đơn, bạn thử lại hoặc nhắn trực tiếp cho Red nhé.", "err");
  } finally {
    submitBtn.disabled = false;
    submitBtnText.textContent = "Gửi đơn cho Red";
  }
});

/* ---------------- init ---------------- */

renderMenu();
renderReceipt();

syncInventory().then(() => {
  renderMenu();
  renderReceipt();
});
