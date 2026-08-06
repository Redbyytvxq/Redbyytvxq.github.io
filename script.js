/* Red Trung Thu — đặt bánh
   Cấu hình: sửa CONFIG bên dưới nếu đổi Apps Script hoặc Google Sheet tồn kho. */

const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxZcmoP4mpPsxPH2TTPSBbQXNdjfdTcoNDjPms9fgQtnAvmRYBVLR8fI_LqeyupMzsx/exec",
  INVENTORY_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdgUFGJB5vRXTghGyc4dyQAt-ueMnUlhKJjqR_4QqWuL1H1r5ZSzTmbhNYA-R8P-Ht9kud2xu5fD7S/pub?gid=1654865179&single=true&output=csv",
};

const PRODUCTS = [
  { id: "M1",  name: "Nướng dẻo đậu xanh",              price: 55000,  unit: "01 bánh", category: "Bánh truyền thống" },
  { id: "M2",  name: "Nướng dẻo khoai môn",             price: 55000,  unit: "01 bánh", category: "Bánh truyền thống" },
  { id: "M3",  name: "Nướng dẻo thập cẩm",              price: 65000,  unit: "01 bánh", category: "Bánh truyền thống" },
  { id: "M4",  name: "Nướng thập cẩm gà quay",          price: 70000,  unit: "01 bánh", category: "Bánh truyền thống" },
  { id: "M5",  name: "Nướng dẻo cốm dừa",               price: 65000,  unit: "01 bánh", category: "Bánh truyền thống" },
  { id: "M6",  name: "Nướng mochi chà bông",            price: 70000,  unit: "01 bánh", category: "Bánh truyền thống" },
  { id: "M7",  name: "Thanh ngọc dưa gang",             price: 60000,  unit: "01 bánh", category: "Bánh hiện đại 2D" },
  { id: "M8",  name: "Khoai môn",                       price: 55000,  unit: "01 bánh", category: "Bánh hiện đại 2D" },
  { id: "M9",  name: "Kem trứng chà bông",              price: 70000,  unit: "01 bánh", category: "Bánh hiện đại 2D" },
  { id: "M10", name: "Sen tuyết táo đỏ",                price: 70000,  unit: "01 bánh", category: "Bánh hiện đại 2D" },
  { id: "M11", name: "Lava sen cốm dừa",                price: 60000,  unit: "01 bánh", category: "Bánh đặc biệt" },
  { id: "M12", name: "Tiramisu cheese",                 price: 60000,  unit: "01 bánh", category: "Bánh đặc biệt" },
  { id: "M13", name: "Khoai môn mochi chà bông",        price: 60000,  unit: "01 bánh", category: "Bánh đặc biệt" },
  { id: "M14", name: "Lava trứng chảy",                 price: 60000,  unit: "01 bánh", category: "Bánh đặc biệt" },
  { id: "M15", name: "Mochi đậu xanh ngũ hạt",          price: 60000,  unit: "01 bánh", category: "Bánh đặc biệt" },
  { id: "M16", name: "Set 1 — đóng nguyên khay 6 bánh", price: 100000, unit: "01 hộp",  category: "Set mini 6 bánh" },
  { id: "M17", name: "Set 2 — đóng riêng từng bánh",    price: 110000, unit: "01 hộp",  category: "Set mini 6 bánh" },
  { id: "M18", name: "Trà xanh lưu sa hạt điều",        price: 70000,  unit: "01 bánh", category: "Bánh Healthy" },
  { id: "M19", name: "Socola lưu sa macca",             price: 75000,  unit: "01 bánh", category: "Bánh Healthy" },
  { id: "M20", name: "Sầu riêng lưu sa hạnh nhân",      price: 75000,  unit: "01 bánh", category: "Bánh Healthy" },
  { id: "M21", name: "Tuyết nướng đậu đỏ óc chó rum nho", price: 80000, unit: "01 bánh", category: "Bánh Healthy" },
];

const CATEGORY_ORDER = [
  "Bánh truyền thống",
  "Bánh hiện đại 2D",
  "Bánh đặc biệt",
  "Set mini 6 bánh",
  "Bánh Healthy",
];

const cart = {};
const stock = {};
let bill = { base64: null, mime: null, name: null };

const $ = (sel, root = document) => root.querySelector(sel);
const fmtVND = (n) => n.toLocaleString("vi-VN") + "đ";
const iconFor = (p) => (p.category === "Set mini 6 bánh" ? "🎁" : "🥮");

function normalizeName(s) {
  return (s || "").toString().trim().toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ");
}

function parseCsv(text) {
  const rows = []; let row = []; let field = ""; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = ""; rows.push(row); row = [];
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/* ---------- render menu ---------- */

const STAMP = '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#stamp"></use></svg>';

function buildMenu() {
  const menu = $("#menu");
  const frag = document.createDocumentFragment();

  CATEGORY_ORDER.forEach((cat) => {
    const items = PRODUCTS.filter((p) => p.category === cat);
    if (!items.length) return;

    const head = document.createElement("div");
    head.className = "cat-head";
    head.innerHTML = STAMP + '<span class="name"></span><span class="fill"></span>';
    $(".name", head).textContent = cat;
    frag.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "grid";

    items.forEach((p) => {
      const card = document.createElement("article");
      card.className = "card";
      card.dataset.id = p.id;
      card.innerHTML =
        '<div class="ribbon"></div>' +
        '<div class="medallion-wrap"><div class="medallion" aria-hidden="true"></div></div>' +
        '<div class="body">' +
          '<p class="name"></p>' +
          '<span class="stock" hidden></span>' +
          '<div class="price-row"><span class="price"></span><span class="unit"></span></div>' +
        "</div>" +
        '<div class="stepper">' +
          '<button type="button" class="minus" aria-label="Giảm số lượng">–</button>' +
          '<span class="qty">0</span>' +
          '<button type="button" class="plus" aria-label="Tăng số lượng">+</button>' +
        "</div>";

      $(".medallion", card).textContent = iconFor(p);
      $(".name", card).textContent = p.name;
      $(".price", card).textContent = fmtVND(p.price);
      $(".unit", card).textContent = "/ " + p.unit;
      $(".minus", card).addEventListener("click", () => step(p.id, -1));
      $(".plus", card).addEventListener("click", () => step(p.id, 1));

      grid.appendChild(card);
    });

    frag.appendChild(grid);
  });

  menu.appendChild(frag);
}

function step(id, delta) {
  const max = stock[id];
  let next = (cart[id] || 0) + delta;
  if (next < 0) next = 0;
  if (typeof max === "number" && next > max) next = max;
  cart[id] = next;
  renderCards();
  renderReceipt();
}

function renderCards() {
  PRODUCTS.forEach((p) => {
    const card = document.querySelector('.card[data-id="' + p.id + '"]');
    if (!card) return;
    const qty = cart[p.id] || 0;
    const st = stock[p.id];
    const soldOut = st === 0;

    card.classList.toggle("sold-out", soldOut);
    $(".minus", card).disabled = soldOut;
    $(".plus", card).disabled = soldOut;

    const qtyEl = $(".qty", card);
    qtyEl.textContent = qty;
    qtyEl.classList.toggle("active", qty > 0);

    const stockEl = $(".stock", card);
    if (soldOut) {
      stockEl.hidden = false; stockEl.textContent = "Hết hàng"; stockEl.classList.add("out");
    } else if (typeof st === "number") {
      stockEl.hidden = false; stockEl.textContent = "Còn " + Math.max(0, st - qty); stockEl.classList.remove("out");
    } else {
      stockEl.hidden = true;
    }
  });
}

function chosenItems() {
  return PRODUCTS.filter((p) => (cart[p.id] || 0) > 0);
}

function renderReceipt() {
  const chosen = chosenItems();
  const list = $("#receiptLines");
  const empty = $("#receiptEmpty");
  list.innerHTML = "";
  empty.hidden = chosen.length > 0;

  chosen.forEach((p) => {
    const row = document.createElement("div");
    row.className = "line";
    row.innerHTML = '<span class="n"></span><span class="q"></span><span class="s"></span>';
    $(".n", row).textContent = p.name;
    $(".q", row).textContent = "×" + cart[p.id];
    $(".s", row).textContent = fmtVND(p.price * cart[p.id]);
    list.appendChild(row);
  });

  const total = chosen.reduce((sum, p) => sum + p.price * cart[p.id], 0);
  $("#total").textContent = fmtVND(total);
}

/* ---------- inventory sync ---------- */

async function syncInventory() {
  try {
    const res = await fetch(CONFIG.INVENTORY_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Không tải được file tồn kho");
    const rows = parseCsv(await res.text());
    if (!rows.length) return;

    const byName = {};
    rows.slice(1).forEach((r) => {
      const name = normalizeName(r[0]);
      const qty = parseInt((r[1] || "0").toString().replace(/[^\d-]/g, ""), 10);
      if (name) byName[name] = isNaN(qty) ? 0 : qty;
    });

    PRODUCTS.forEach((p) => {
      const k = normalizeName(p.name);
      if (Object.prototype.hasOwnProperty.call(byName, k)) stock[p.id] = byName[k];
    });

    renderCards();
  } catch (err) {
    console.error("Lỗi đồng bộ tồn kho:", err);
  }
}

/* ---------- form ---------- */

function setStatus(text, state) {
  const el = $("#status");
  el.textContent = text;
  el.className = "status" + (state ? " " + state : "");
}

function onPaymentChange(e) {
  if (e.target.name !== "payment") return;
  const isBank = e.target.value.indexOf("Chuyển khoản") === 0;
  $("#billField").hidden = !isBank;
  $("#billUpload").required = isBank;
  if (!isBank) resetBill();
}

function resetBill() {
  bill = { base64: null, mime: null, name: null };
  const input = $("#billUpload");
  if (input) input.value = "";
  $("#billPreview").hidden = true;
  $("#billPreview").removeAttribute("src");
  $("#billPrompt").hidden = false;
}

function onBillChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    alert("Ảnh bill vượt quá 10MB, bạn chọn ảnh nhỏ hơn giúp Red nhé.");
    e.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    bill = { base64: reader.result.split(",")[1], mime: file.type, name: file.name };
    const img = $("#billPreview");
    img.src = reader.result;
    img.hidden = false;
    $("#billPrompt").hidden = true;
  };
  reader.readAsDataURL(file);
}

async function onSubmit(e) {
  e.preventDefault();
  const form = e.target;
  setStatus("", "");

  const chosen = chosenItems();
  if (!chosen.length) {
    setStatus("Bạn chưa chọn bánh nào ở phần thực đơn phía trên nhé!", "err");
    return;
  }
  if (!form.reportValidity()) return;

  const soldOut = chosen.find((p) => stock[p.id] === 0);
  if (soldOut) {
    setStatus('"' + soldOut.name + '" vừa hết hàng, bạn bỏ món này khỏi đơn giúp Red nhé!', "err");
    return;
  }

  const paymentEl = form.querySelector('input[name="payment"]:checked');
  const isBank = paymentEl.value.indexOf("Chuyển khoản") === 0;
  if (isBank && !bill.base64) {
    setStatus("Bạn chuyển khoản thì nhớ đính kèm ảnh bill giúp Red nhé!", "err");
    return;
  }

  const payload = {
    nameFb: form.nameFb.value.trim(),
    address: form.address.value.trim(),
    phone: form.phone.value.trim(),
    items: chosen.map((p) => p.name + " x" + cart[p.id]).join("; "),
    total: chosen.reduce((sum, p) => sum + p.price * cart[p.id], 0),
    payment: paymentEl.value,
    notes: form.notes.value.trim(),
    billBase64: bill.base64 || "",
    billMimeType: bill.mime || "",
    billFileName: bill.name || "",
  };

  const btn = $("#submitBtn");
  btn.disabled = true;
  btn.textContent = "Đang gửi...";
  setStatus("Đang gửi đơn cho Red, đợi bạn một chút nhé...", "busy");

  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    form.reset();
    Object.keys(cart).forEach((k) => delete cart[k]);
    resetBill();
    $("#billField").hidden = true;
    renderCards();
    renderReceipt();
    setStatus("Đã gửi đơn thành công! Red sẽ liên hệ xác nhận sớm nhất 🏮", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Có lỗi khi gửi đơn, bạn thử lại hoặc nhắn trực tiếp cho Red nhé.", "err");
  } finally {
    btn.disabled = false;
    btn.textContent = "Gửi đơn cho Red";
  }
}

/* ---------- init ---------- */

document.addEventListener("DOMContentLoaded", () => {
  buildMenu();
  renderCards();
  renderReceipt();
  syncInventory();

  $("#payOptions").addEventListener("change", onPaymentChange);
  $("#billUpload").addEventListener("change", onBillChange);
  $("#orderForm").addEventListener("submit", onSubmit);
});
