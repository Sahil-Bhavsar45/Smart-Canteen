
/* ==========================================================================
   Smart Canteen Demand Prediction System - script.js
   Pure Vanilla JavaScript. Data is stored in LocalStorage.
   Sections in this file:
     1. Sample (seed) data
     2. LocalStorage helpers
     3. Login / Logout
     4. Sidebar navigation
     5. Dashboard
     6. Food Management (CRUD)
     7. Demand Prediction (core feature)
     8. Charts (Chart.js)
     9. Inventory
    10. Smart Alerts
    11. Sales History (search / filter / sort)
    12. Settings (reset demo data)
   ========================================================================== */

/* ============================ 1. SAMPLE DATA ============================ */

const DEMO_USER = { email: "admin@smartcanteen.com", password: "admin123" };

const SEED_FOODS = [
  { id: 1, name: "Vada Pav",   category: "Snacks",        price: 20, prep: 5,  stock: 60 },
  { id: 2, name: "Samosa",     category: "Snacks",        price: 15, prep: 4,  stock: 45 },
  { id: 3, name: "Misal Pav",  category: "Main Course",   price: 45, prep: 10, stock: 18 },
  { id: 4, name: "Poha",       category: "Breakfast",     price: 25, prep: 7,  stock: 30 },
  { id: 5, name: "Idli",       category: "South Indian",  price: 30, prep: 8,  stock: 40 },
  { id: 6, name: "Dosa",       category: "South Indian",  price: 50, prep: 12, stock: 25 },
  { id: 7, name: "Tea",        category: "Beverages",     price: 10, prep: 3,  stock: 120 },
  { id: 8, name: "Gulab Jamun",category: "Sweets",        price: 20, prep: 2,  stock: 8  }
];

const SEED_INVENTORY = [
  { id: 1, name: "Potato",      qty: 42,  unit: "kg",      min: 25 },
  { id: 2, name: "Bread (Pav)", qty: 18,  unit: "packets", min: 30 },
  { id: 3, name: "Cooking Oil", qty: 12,  unit: "litre",   min: 10 },
  { id: 4, name: "Tea Powder",  qty: 3,   unit: "kg",      min: 5  },
  { id: 5, name: "Onion",       qty: 28,  unit: "kg",      min: 15 },
  { id: 6, name: "Rice",        qty: 55,  unit: "kg",      min: 30 },
  { id: 7, name: "Sugar",       qty: 9,   unit: "kg",      min: 12 },
  { id: 8, name: "Milk",        qty: 24,  unit: "litre",   min: 20 }
];

// Today's demand table shown on the dashboard
const SEED_DEMAND = [
  { item: "Vada Pav",  predicted: 130, sold: 118, stock: 60, level: "high"   },
  { item: "Samosa",    predicted: 95,  sold: 90,  stock: 45, level: "high"   },
  { item: "Misal Pav", predicted: 60,  sold: 52,  stock: 18, level: "medium" },
  { item: "Poha",      predicted: 30,  sold: 22,  stock: 30, level: "low"    }
];

// Realistic sales history for the Sales page and charts
function buildSeedSales() {
  const items = [
    ["Vada Pav", "Snacks", 20], ["Samosa", "Snacks", 15], ["Misal Pav", "Main Course", 45],
    ["Poha", "Breakfast", 25], ["Idli", "South Indian", 30], ["Dosa", "South Indian", 50],
    ["Tea", "Beverages", 10]
  ];
  const rows = [];
  let id = 1;
  for (let d = 6; d >= 0; d--) {                     // last 7 days
    const date = new Date();
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);
    items.forEach(([name, cat, price]) => {
      const qty = 25 + Math.floor(Math.random() * 105);
      rows.push({ id: id++, date: dateStr, item: name, category: cat, qty: qty, amount: qty * price });
    });
  }
  return rows;
}

/* ======================= 2. LOCALSTORAGE HELPERS ======================= */

const KEYS = { auth: "sc_auth", foods: "sc_foods", inv: "sc_inventory", sales: "sc_sales", demand: "sc_demand" };

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch (e) { return fallback; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

// Create the sample data the first time the app runs
function seedIfEmpty(force) {
  if (force || !localStorage.getItem(KEYS.foods))  save(KEYS.foods, SEED_FOODS);
  if (force || !localStorage.getItem(KEYS.inv))    save(KEYS.inv, SEED_INVENTORY);
  if (force || !localStorage.getItem(KEYS.demand)) save(KEYS.demand, SEED_DEMAND);
  if (force || !localStorage.getItem(KEYS.sales))  save(KEYS.sales, buildSeedSales());
}

// Small helper for the bottom notification
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add("hidden"), 2200);
}

/* ============================ 3. LOGIN ============================ */

const loginScreen = document.getElementById("loginScreen");
const app = document.getElementById("app");

document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const pass = document.getElementById("loginPassword").value;
  if (email === DEMO_USER.email && pass === DEMO_USER.password) {
    save(KEYS.auth, { email: email, time: Date.now() });
    showApp();
    toast("Welcome back, Admin!");
  } else {
    document.getElementById("loginError").classList.remove("hidden");
  }
});

function logout() {
  localStorage.removeItem(KEYS.auth);
  app.classList.add("hidden");
  loginScreen.classList.remove("hidden");
}
document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("logoutBtn2").addEventListener("click", logout);

function showApp() {
  loginScreen.classList.add("hidden");
  app.classList.remove("hidden");
  renderAll();
}

/* ======================= 4. SIDEBAR NAVIGATION ======================= */

const TITLES = {
  dashboard: ["Dashboard", "Overview of today's canteen activity"],
  food:      ["Food Management", "Add, edit or remove canteen menu items"],
  predict:   ["Demand Prediction", "Estimate tomorrow's requirement for any item"],
  analytics: ["Forecast & Analytics", "7-day forecast, sales trend and wastage"],
  inventory: ["Inventory", "Raw material stock with low-stock warnings"],
  alerts:    ["Smart Alerts", "Automatic suggestions for the canteen staff"],
  sales:     ["Sales History", "Search, filter and sort past sales"],
  about:     ["About Project", "Problem statement, benefits and future scope"],
  settings:  ["Settings", "Manage the demo data of this project"]
};

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const page = btn.dataset.page;
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById("page-" + page).classList.add("active");
    document.getElementById("pageTitle").textContent = TITLES[page][0];
    document.getElementById("pageSub").textContent = TITLES[page][1];
    closeSidebar();
    if (page === "analytics") drawCharts();     // charts need a visible canvas
    window.scrollTo({ top: 0 });
  });
});

function closeSidebar() { sidebar.classList.remove("open"); overlay.classList.remove("show"); }
document.getElementById("menuBtn").addEventListener("click", () => {
  sidebar.classList.toggle("open");
  overlay.classList.toggle("show");
});
overlay.addEventListener("click", closeSidebar);

/* ============================ 5. DASHBOARD ============================ */

function renderDashboard() {
  const rows = load(KEYS.demand, SEED_DEMAND);
  document.getElementById("todayDemandBody").innerHTML = rows.map(r => `
    <tr>
      <td><b>${r.item}</b></td>
      <td>${r.predicted}</td>
      <td>${r.sold}</td>
      <td>${r.stock}</td>
      <td><span class="badge ${r.level}">${r.level.toUpperCase()} DEMAND</span></td>
    </tr>`).join("");

  const today = new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  document.getElementById("todayChip").textContent = today;
}

/* ====================== 6. FOOD MANAGEMENT (CRUD) ====================== */

const modal = document.getElementById("modal");
const foodForm = document.getElementById("foodForm");
const stockForm = document.getElementById("stockForm");

function openModal(title, form) {
  document.getElementById("modalTitle").textContent = title;
  foodForm.classList.add("hidden");
  stockForm.classList.add("hidden");
  form.classList.remove("hidden");
  modal.classList.remove("hidden");
}
function closeModal() { modal.classList.add("hidden"); }
document.getElementById("modalClose").addEventListener("click", closeModal);
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

function renderFoods() {
  const foods = load(KEYS.foods, SEED_FOODS);
  document.getElementById("foodBody").innerHTML = foods.map(f => `
    <tr>
      <td><b>${f.name}</b></td>
      <td>${f.category}</td>
      <td>₹${f.price}</td>
      <td>${f.prep} min</td>
      <td>${f.stock} ${f.stock < 15 ? '<span class="badge warn">LOW</span>' : ""}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="editFood(${f.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteFood(${f.id})">Delete</button>
      </td>
    </tr>`).join("");
  fillItemDropdown();
}

document.getElementById("addFoodBtn").addEventListener("click", () => {
  foodForm.reset();
  document.getElementById("fId").value = "";
  openModal("Add Food Item", foodForm);
});

// Edit / Delete are called from the table buttons, so they must be global
window.editFood = function (id) {
  const f = load(KEYS.foods, []).find(x => x.id === id);
  if (!f) return;
  document.getElementById("fId").value = f.id;
  document.getElementById("fName").value = f.name;
  document.getElementById("fCategory").value = f.category;
  document.getElementById("fPrice").value = f.price;
  document.getElementById("fPrep").value = f.prep;
  document.getElementById("fStock").value = f.stock;
  openModal("Edit Food Item", foodForm);
};

window.deleteFood = function (id) {
  if (!confirm("Delete this food item?")) return;
  save(KEYS.foods, load(KEYS.foods, []).filter(x => x.id !== id));
  renderFoods();
  toast("Item deleted");
};

foodForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const foods = load(KEYS.foods, []);
  const id = document.getElementById("fId").value;
  const data = {
    name: document.getElementById("fName").value.trim(),
    category: document.getElementById("fCategory").value,
    price: +document.getElementById("fPrice").value,
    prep: +document.getElementById("fPrep").value,
    stock: +document.getElementById("fStock").value
  };
  if (id) {                                        // UPDATE
    const i = foods.findIndex(x => x.id === +id);
    foods[i] = Object.assign(foods[i], data);
    toast("Item updated");
  } else {                                         // CREATE
    data.id = Date.now();
    foods.push(data);
    toast("Item added");
  }
  save(KEYS.foods, foods);
  renderFoods();
  closeModal();
});

/* ==================== 7. DEMAND PREDICTION (CORE) ==================== */

const DAY_FACTOR = { Monday: 1.05, Tuesday: 1.00, Wednesday: 1.02, Thursday: 1.03, Friday: 1.10, Saturday: 0.85, Sunday: 0.55 };
const WEATHER_FACTOR = { normal: 1.00, rainy: 1.12, hot: 0.92, cold: 1.06 };
const WEATHER_TEXT = { normal: "Normal weather", rainy: "Rainy day (+12% hot snacks)", hot: "Very hot day (-8%)", cold: "Cold day (+6%)" };

function fillItemDropdown() {
  const foods = load(KEYS.foods, SEED_FOODS);
  const sel = document.getElementById("pItem");
  const current = sel.value;
  sel.innerHTML = foods.map(f => `<option>${f.name}</option>`).join("");
  if (current) sel.value = current;
}

document.getElementById("predictForm").addEventListener("submit", function (e) {
  e.preventDefault();

  // ---- read the inputs ----
  const item     = document.getElementById("pItem").value;
  const prev     = +document.getElementById("pPrev").value;
  const weekly   = +document.getElementById("pWeekly").value;
  const students = +document.getElementById("pStudents").value;
  const day      = document.getElementById("pDay").value;
  const weather  = document.getElementById("pWeather").value;
  const holiday  = document.getElementById("pHoliday").checked;
  const event    = document.getElementById("pEvent").checked;

  // ---- weighted calculation ----
  const base      = (prev * 0.40) + (weekly * 0.60);   // recent + stable trend
  const studentF  = students / 1000;                   // crowd factor
  const dayF      = DAY_FACTOR[day] || 1;
  const weatherF  = WEATHER_FACTOR[weather] || 1;
  const holidayF  = holiday ? 0.45 : 1;
  const eventF    = event ? 1.30 : 1;

  let predicted = Math.round(base * studentF * dayF * weatherF * holidayF * eventF);
  if (predicted < 0) predicted = 0;
  const prep = Math.round(predicted * 1.08);           // 8% safety buffer

  // ---- confidence ----
  let conf = 95;
  if (holiday) conf -= 12;
  if (event) conf -= 10;
  if (weather !== "normal") conf -= 5;
  const gap = weekly ? Math.abs(prev - weekly) / weekly : 0;
  if (gap > 0.30) conf -= 8; else if (gap > 0.15) conf -= 4;
  conf = Math.max(60, Math.min(97, conf));

  // ---- demand level compared with the weekly average ----
  const ratio = weekly ? predicted / weekly : 1;
  let level = "medium", text = "MEDIUM";
  if (ratio > 1.15) { level = "high"; text = "HIGH"; }
  else if (ratio < 0.85) { level = "low"; text = "LOW"; }

  // ---- show the result ----
  document.getElementById("predictEmpty").classList.add("hidden");
  document.getElementById("predictResult").classList.remove("hidden");
  document.getElementById("rDemand").textContent = predicted;
  document.getElementById("rPrep").textContent = prep;
  document.getElementById("rConf").textContent = conf + "%";
  const lv = document.getElementById("rLevel");
  lv.textContent = text;
  lv.className = "badge " + level;
  document.getElementById("rBar").style.width = conf + "%";

  document.getElementById("rFactors").innerHTML = [
    `Item selected: <b>${item}</b>`,
    `Base demand from sales history: <b>${base.toFixed(1)} units</b> (40% previous day + 60% weekly average)`,
    `Expected students: <b>${students}</b> &rarr; crowd factor <b>${studentF.toFixed(2)}</b>`,
    `${day} factor: <b>${dayF}</b>`,
    `${WEATHER_TEXT[weather]}: factor <b>${weatherF}</b>`,
    holiday ? "College holiday applied: factor <b>0.45</b>" : "Regular working day (no holiday reduction)",
    event ? "Special event / fest applied: factor <b>1.30</b>" : "No special event today",
    `Recommended preparation includes an <b>8% safety buffer</b>.`
  ].map(t => `<li>${t}</li>`).join("");
});

document.getElementById("predictForm").addEventListener("reset", function () {
  document.getElementById("predictResult").classList.add("hidden");
  document.getElementById("predictEmpty").classList.remove("hidden");
});

/* ============================ 8. CHARTS ============================ */

let charts = {};   // keep references so charts can be destroyed and redrawn

function drawCharts() {
  if (typeof Chart === "undefined") return;         // CDN not loaded (offline)
  Object.values(charts).forEach(c => c && c.destroy());

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const grid = { grid: { color: "#eef1f8" } };

  // 7-day forecast (predicted vs actual)
  charts.forecast = new Chart(document.getElementById("chartForecast"), {
    type: "line",
    data: {
      labels: days,
      datasets: [
        { label: "Predicted", data: [305, 290, 315, 320, 355, 210, 140], borderColor: "#3b5bfd", backgroundColor: "rgba(59,91,253,.12)", fill: true, tension: .35 },
        { label: "Actual", data: [298, 285, 309, 312, 349, 205, 132], borderColor: "#12b76a", tension: .35 }
      ]
    },
    options: { responsive: true, scales: { y: grid, x: grid } }
  });

  // Sales trend in rupees
  charts.sales = new Chart(document.getElementById("chartSales"), {
    type: "bar",
    data: {
      labels: days,
      datasets: [{ label: "Sales (₹)", data: [17200, 16400, 18450, 18900, 21500, 11800, 7400], backgroundColor: "#8b5cf6", borderRadius: 6 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: grid, x: grid } }
  });

  // Demand distribution between items
  charts.dist = new Chart(document.getElementById("chartDist"), {
    type: "doughnut",
    data: {
      labels: ["Vada Pav", "Samosa", "Misal Pav", "Poha", "Idli", "Dosa"],
      datasets: [{ data: [130, 95, 60, 30, 45, 38], backgroundColor: ["#3b5bfd", "#8b5cf6", "#f59e0b", "#12b76a", "#0ea5a5", "#ef4444"] }]
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } }
  });

  // Wastage percentage
  charts.waste = new Chart(document.getElementById("chartWaste"), {
    type: "line",
    data: {
      labels: days,
      datasets: [{ label: "Wastage %", data: [14, 12, 11, 9, 8, 10, 13], borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,.15)", fill: true, tension: .35 }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true, grid: grid.grid }, x: grid } }
  });
}

/* ============================ 9. INVENTORY ============================ */

function stockStatus(i) {
  if (i.qty <= 0) return ["out", "OUT OF STOCK"];
  if (i.qty < i.min) return ["warn", "LOW STOCK"];
  return ["ok", "SUFFICIENT"];
}

function renderInventory() {
  const inv = load(KEYS.inv, SEED_INVENTORY);
  document.getElementById("invBody").innerHTML = inv.map(i => {
    const [cls, text] = stockStatus(i);
    return `<tr>
      <td><b>${i.name}</b></td>
      <td>${i.qty}</td>
      <td>${i.unit}</td>
      <td>${i.min}</td>
      <td><span class="badge ${cls}">${text}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="editStock(${i.id})">Update</button>
        <button class="btn btn-danger btn-sm" onclick="deleteStock(${i.id})">Delete</button>
      </td>
    </tr>`;
  }).join("");
}

document.getElementById("addStockBtn").addEventListener("click", () => {
  stockForm.reset();
  document.getElementById("sId").value = "";
  openModal("Add Raw Material", stockForm);
});

window.editStock = function (id) {
  const i = load(KEYS.inv, []).find(x => x.id === id);
  if (!i) return;
  document.getElementById("sId").value = i.id;
  document.getElementById("sName").value = i.name;
  document.getElementById("sQty").value = i.qty;
  document.getElementById("sUnit").value = i.unit;
  document.getElementById("sMin").value = i.min;
  openModal("Update Stock", stockForm);
};

window.deleteStock = function (id) {
  if (!confirm("Delete this material?")) return;
  save(KEYS.inv, load(KEYS.inv, []).filter(x => x.id !== id));
  renderInventory(); renderAlerts();
  toast("Material deleted");
};

stockForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const inv = load(KEYS.inv, []);
  const id = document.getElementById("sId").value;
  const data = {
    name: document.getElementById("sName").value.trim(),
    qty: +document.getElementById("sQty").value,
    unit: document.getElementById("sUnit").value,
    min: +document.getElementById("sMin").value
  };
  if (id) {
    const i = inv.findIndex(x => x.id === +id);
    inv[i] = Object.assign(inv[i], data);
    toast("Stock updated");
  } else {
    data.id = Date.now();
    inv.push(data);
    toast("Material added");
  }
  save(KEYS.inv, inv);
  renderInventory(); renderAlerts();
  closeModal();
});

/* =========================== 10. SMART ALERTS =========================== */

function renderAlerts() {
  const inv = load(KEYS.inv, SEED_INVENTORY);
  const foods = load(KEYS.foods, SEED_FOODS);
  const lowMaterials = inv.filter(i => i.qty < i.min);
  const lowFoods = foods.filter(f => f.stock < 15);

  const alerts = [];

  // High demand alerts (from today's demand table)
  load(KEYS.demand, SEED_DEMAND).filter(d => d.level === "high").forEach(d => {
    alerts.push({ type: "danger", icon: "🔥", title: "High Demand: " + d.item,
      text: `Predicted ${d.predicted} units today. Prepare extra and keep raw material ready before the 12:30 PM lunch rush.` });
  });

  // Low stock alerts
  lowMaterials.forEach(m => {
    alerts.push({ type: "warning", icon: "📦", title: "Low Stock: " + m.name,
      text: `Only ${m.qty} ${m.unit} left (minimum required ${m.min} ${m.unit}). Please place a purchase order today.` });
  });

  lowFoods.forEach(f => {
    alerts.push({ type: "warning", icon: "🍽", title: "Running Out: " + f.name,
      text: `Only ${f.stock} units remaining in the counter. Prepare a fresh batch (prep time ${f.prep} min).` });
  });

  // College event alerts
  alerts.push({ type: "info", icon: "🎓", title: "College Event: Tech Fest (Friday)",
    text: "About 1,200 students expected. Snack demand may rise by 30%. Increase Vada Pav and Samosa preparation." });
  alerts.push({ type: "info", icon: "📅", title: "Holiday Notice: Sunday",
    text: "College closed. Reduce preparation to nearly 45% of a normal day to avoid wastage." });

  document.getElementById("alertsWrap").innerHTML = alerts.map(a => `
    <div class="card alert-card ${a.type}">
      <h4>${a.icon} ${a.title}</h4>
      <p class="muted">${a.text}</p>
    </div>`).join("");
}

/* ========================= 11. SALES HISTORY ========================= */

function renderSales() {
  const all = load(KEYS.sales, []);
  const q = document.getElementById("salesSearch").value.trim().toLowerCase();
  const cat = document.getElementById("salesCategory").value;
  const sort = document.getElementById("salesSort").value;

  let rows = all.filter(r =>
    (!cat || r.category === cat) &&
    (!q || r.item.toLowerCase().includes(q) || r.date.includes(q))
  );

  const sorters = {
    "date-desc": (a, b) => b.date.localeCompare(a.date),
    "date-asc": (a, b) => a.date.localeCompare(b.date),
    "amount-desc": (a, b) => b.amount - a.amount,
    "amount-asc": (a, b) => a.amount - b.amount,
    "qty-desc": (a, b) => b.qty - a.qty
  };
  rows.sort(sorters[sort]);

  document.getElementById("salesBody").innerHTML = rows.length
    ? rows.map(r => `<tr>
        <td>${r.date}</td><td><b>${r.item}</b></td><td>${r.category}</td>
        <td>${r.qty}</td><td>₹${r.amount.toLocaleString("en-IN")}</td></tr>`).join("")
    : `<tr><td colspan="5" style="text-align:center;color:#6b7592">No records found.</td></tr>`;

  const total = rows.reduce((s, r) => s + r.amount, 0);
  document.getElementById("salesCount").textContent =
    `Showing ${rows.length} of ${all.length} records • Total ₹${total.toLocaleString("en-IN")}`;
}

function fillSalesCategories() {
  const cats = [...new Set(load(KEYS.sales, []).map(r => r.category))];
  document.getElementById("salesCategory").innerHTML =
    `<option value="">All categories</option>` + cats.map(c => `<option>${c}</option>`).join("");
}

["salesSearch", "salesCategory", "salesSort"].forEach(id =>
  document.getElementById(id).addEventListener("input", renderSales));

/* ====================== 12. SETTINGS / RESET DATA ====================== */

document.getElementById("resetBtn").addEventListener("click", function () {
  if (!confirm("Reset all data back to the original sample data?")) return;
  seedIfEmpty(true);
  renderAll();
  toast("Demo data restored");
});

/* ============================== STARTUP ============================== */

function renderAll() {
  renderDashboard();
  renderFoods();
  renderInventory();
  renderAlerts();
  fillSalesCategories();
  renderSales();
  if (document.getElementById("page-analytics").classList.contains("active")) drawCharts();
}

seedIfEmpty(false);
if (load(KEYS.auth, null)) showApp();      // stay logged in after refresh
