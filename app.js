const DEFAULT_CATEGORY_ORDER = ["上衣", "褲裝", "裙裝", "洋裝", "套裝", "家常", "鞋類", "包包", "猶豫", "留校", "冷凍"];
const TAG_OPTIONS = ["春季", "夏季", "秋季", "冬季", "日貨", "韓貨", "品牌", "蝦皮", "淘寶", "其他"];

const state = {
  items: load("closet_items", []),
  dailyLogs: load("closet_daily_logs", []),
  manualVoteCounts: load("closet_manual_vote_counts", {}),
  categoryOrder: load("closet_category_order", []),
  purchaseSort: load("closet_purchase_sort", "desc"),
  tagUsageSort: load("closet_tag_usage_sort", "none"),
  selectedCategory: "",
  selectedTags: [],
};

const homePage = document.getElementById("homePage");
const closetPage = document.getElementById("closetPage");
const outfitPage = document.getElementById("outfitPage");

const openPageBtns = document.querySelectorAll("[data-open-page]");
const backBtns = document.querySelectorAll("[data-back-home]");

const subTabs = document.querySelectorAll("[data-sub-tab]");
const closetLatest = document.getElementById("closetLatest");
const closetPhotos = document.getElementById("closetPhotos");
const closetCategory = document.getElementById("closetCategory");
const closetTags = document.getElementById("closetTags");
const purchaseSortSelect = document.getElementById("purchaseSortSelect");
const tagUsageSortSelect = document.getElementById("tagUsageSortSelect");

const categoryOrderList = document.getElementById("categoryOrderList");
const categoryChips = document.getElementById("categoryChips");
const categoryResult = document.getElementById("categoryResult");
const tagChips = document.getElementById("tagChips");
const tagResult = document.getElementById("tagResult");

const outfitGrid = document.getElementById("outfitGrid");

const itemDialog = document.getElementById("itemDialog");
const itemForm = document.getElementById("itemForm");
const openItemForm = document.getElementById("openItemForm");
const closeItemBtn = document.querySelector("[data-close-item]");
const itemCategorySelect = document.getElementById("itemCategorySelect");

const outfitMenuDialog = document.getElementById("outfitMenuDialog");
const openOutfitMenu = document.getElementById("openOutfitMenu");
const closeOutfitMenu = document.getElementById("closeOutfitMenu");
const openOutfitFormAction = document.getElementById("openOutfitFormAction");
const openVoteFormAction = document.getElementById("openVoteFormAction");

const outfitFormDialog = document.getElementById("outfitFormDialog");
const outfitForm = document.getElementById("outfitForm");
const closeOutfitBtn = document.querySelector("[data-close-outfit]");

const voteDialog = document.getElementById("voteDialog");
const voteForm = document.getElementById("voteForm");
const closeVoteDialogBtn = document.getElementById("closeVoteDialog");
const voteManualChecklist = document.getElementById("voteManualChecklist");
const voteSearchBrand = document.getElementById("voteSearchBrand");
const voteSearchName = document.getElementById("voteSearchName");
const voteSearchTag = document.getElementById("voteSearchTag");
const voteSearchCategory = document.getElementById("voteSearchCategory");

const outfitDetailDialog = document.getElementById("outfitDetailDialog");
const closeDetail = document.getElementById("closeDetail");
const detailDate = document.getElementById("detailDate");
const detailMeta = document.getElementById("detailMeta");
const detailNote = document.getElementById("detailNote");
const detailVote = document.getElementById("detailVote");
const detailPhotos = document.getElementById("detailPhotos");

const itemDetailDialog = document.getElementById("itemDetailDialog");
const closeItemDetail = document.getElementById("closeItemDetail");
const itemDetailTitle = document.getElementById("itemDetailTitle");
const itemDetailMainPhoto = document.getElementById("itemDetailMainPhoto");
const itemDetailPrev = document.getElementById("itemDetailPrev");
const itemDetailNext = document.getElementById("itemDetailNext");
const itemDetailCounter = document.getElementById("itemDetailCounter");
const itemDetailRecords = document.getElementById("itemDetailRecords");

let detailItemPhotos = [];
let detailPhotoIndex = 0;

itemForm.purchaseDate.valueAsDate = new Date();
outfitForm.date.valueAsDate = new Date();
if (!["asc", "desc"].includes(state.purchaseSort)) state.purchaseSort = "desc";
purchaseSortSelect.value = state.purchaseSort;
if (!["none", "desc", "asc"].includes(state.tagUsageSort)) state.tagUsageSort = "none";
tagUsageSortSelect.value = state.tagUsageSort;

normalizeCategoryOrder();
recomputeWearCounts();

for (const btn of openPageBtns) btn.addEventListener("click", () => openPage(btn.dataset.openPage));
for (const btn of backBtns) btn.addEventListener("click", showHome);
for (const btn of subTabs) btn.addEventListener("click", () => switchSub(btn.dataset.subTab));

openItemForm.addEventListener("click", () => itemDialog.showModal());
closeItemBtn.addEventListener("click", () => itemDialog.close());

openOutfitMenu.addEventListener("click", () => outfitMenuDialog.showModal());
closeOutfitMenu.addEventListener("click", () => outfitMenuDialog.close());
openOutfitFormAction.addEventListener("click", () => {
  outfitMenuDialog.close();
  outfitFormDialog.showModal();
});
openVoteFormAction.addEventListener("click", () => {
  outfitMenuDialog.close();
  voteDialog.showModal();
  renderVoteSearchCategoryOptions();
  renderManualVoteList();
});

closeOutfitBtn.addEventListener("click", () => outfitFormDialog.close());
closeVoteDialogBtn.addEventListener("click", () => voteDialog.close());
closeDetail.addEventListener("click", () => outfitDetailDialog.close());
closeItemDetail.addEventListener("click", () => itemDetailDialog.close());
itemDetailPrev.addEventListener("click", () => stepDetailPhoto(-1));
itemDetailNext.addEventListener("click", () => stepDetailPhoto(1));
purchaseSortSelect.addEventListener("change", () => {
  state.purchaseSort = purchaseSortSelect.value === "asc" ? "asc" : "desc";
  save("closet_purchase_sort", state.purchaseSort);
  renderLatest();
  renderPhotosWall();
});
tagUsageSortSelect.addEventListener("change", () => {
  state.tagUsageSort = tagUsageSortSelect.value;
  save("closet_tag_usage_sort", state.tagUsageSort);
  renderTagTab();
});

let touchStartX = 0;
itemDetailMainPhoto.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0]?.clientX || 0;
});
itemDetailMainPhoto.addEventListener("touchend", (e) => {
  const endX = e.changedTouches[0]?.clientX || 0;
  const dx = endX - touchStartX;
  if (Math.abs(dx) < 30) return;
  stepDetailPhoto(dx < 0 ? 1 : -1);
});

itemForm.addEventListener("submit", onSaveItem);
outfitForm.addEventListener("submit", onSaveOutfit);
voteForm.addEventListener("submit", onSaveManualVote);
voteSearchBrand.addEventListener("input", renderManualVoteList);
voteSearchName.addEventListener("input", renderManualVoteList);
voteSearchTag.addEventListener("input", renderManualVoteList);
voteSearchCategory.addEventListener("change", renderManualVoteList);

renderAll();

function showHome() {
  homePage.classList.add("active");
  closetPage.classList.remove("active");
  outfitPage.classList.remove("active");
}

function openPage(type) {
  homePage.classList.remove("active");
  closetPage.classList.toggle("active", type === "closet");
  outfitPage.classList.toggle("active", type === "outfit");
}

function switchSub(tab) {
  for (const btn of subTabs) btn.classList.toggle("active", btn.dataset.subTab === tab);
  closetLatest.classList.toggle("active", tab === "latest");
  closetPhotos.classList.toggle("active", tab === "photos");
  closetCategory.classList.toggle("active", tab === "category");
  closetTags.classList.toggle("active", tab === "tags");
  const sortBar = document.querySelector(".sort-bar");
  const showPurchaseSort = tab === "latest" || tab === "photos";
  if (sortBar) sortBar.classList.toggle("hidden", !showPurchaseSort);
}

async function onSaveItem(e) {
  e.preventDefault();
  const fd = new FormData(itemForm);
  const photos = await filesToThreeFourDataUrls(itemForm.itemPhotos.files);
  if (!photos.length) {
    alert("請至少上傳 1 張商品照片");
    return;
  }

  const item = {
    id: crypto.randomUUID(),
    brand: String(fd.get("brand") || "").trim(),
    name: String(fd.get("name") || "").trim(),
    purchaseDate: String(fd.get("purchaseDate") || ""),
    category: String(fd.get("category") || "").trim(),
    originalPrice: numberOrNull(fd.get("originalPrice")),
    specialPrice: numberOrNull(fd.get("specialPrice")),
    discountPrice: numberOrNull(fd.get("discountPrice")),
    suggestedWeight: String(fd.get("suggestedWeight") || "").trim(),
    grade: String(fd.get("grade") || "").trim(),
    origin: String(fd.get("origin") || "").trim(),
    seasons: fd.getAll("seasons"),
    miniNote: String(fd.get("miniNote") || "").trim(),
    pros: String(fd.get("pros") || "").trim(),
    cons: String(fd.get("cons") || "").trim(),
    remark: String(fd.get("remark") || "").trim(),
    itemPhotos: photos,
    wearCountTotal: 0,
    createdAt: new Date().toISOString(),
  };

  if (!item.name || !item.category || !item.purchaseDate) {
    alert("商品名稱、分類、購買日期是必填");
    return;
  }

  state.items.push(item);
  normalizeCategoryOrder();
  recomputeWearCounts();
  persistAll();

  itemForm.reset();
  itemForm.purchaseDate.valueAsDate = new Date();
  itemDialog.close();
  renderAll();
}

async function onSaveOutfit(e) {
  e.preventDefault();
  const fd = new FormData(outfitForm);
  const photos = await filesToThreeFourDataUrls(outfitForm.outfitPhotos.files);
  if (!photos.length) {
    alert("請至少上傳 1 張穿搭照片");
    return;
  }

  const log = {
    id: crypto.randomUUID(),
    date: String(fd.get("date") || ""),
    weather: String(fd.get("weather") || "").trim(),
    note: String(fd.get("note") || "").trim(),
    wornItemIds: [],
    outfitPhotos: photos.slice(0, 20),
    createdAt: new Date().toISOString(),
  };

  if (!log.date) {
    alert("日期必填");
    return;
  }

  state.dailyLogs.push(log);
  recomputeWearCounts();
  persistAll();

  outfitForm.reset();
  outfitForm.date.valueAsDate = new Date();
  outfitFormDialog.close();
  renderAll();
}

function onSaveManualVote(e) {
  e.preventDefault();
  const fd = new FormData(voteForm);
  const votedItemIds = fd.getAll("voteItemIds");
  if (!votedItemIds.length) {
    alert("請至少勾選一件商品");
    return;
  }

  for (const itemId of votedItemIds) {
    state.manualVoteCounts[itemId] = (state.manualVoteCounts[itemId] || 0) + 1;
  }

  recomputeWearCounts();
  persistAll();

  voteForm.reset();
  renderVoteSearchCategoryOptions();
  renderManualVoteList();
  voteDialog.close();
  renderAll();
}

function renderAll() {
  normalizeCategoryOrder();
  purchaseSortSelect.value = state.purchaseSort;
  tagUsageSortSelect.value = state.tagUsageSort;
  renderItemCategoryOptions();
  renderLatest();
  renderPhotosWall();
  renderCategoryOrderEditor();
  renderCategoryTab();
  renderTagTab();
  renderVoteSearchCategoryOptions();
  renderManualVoteList();
  renderOutfitGrid();
  const activeSub = document.querySelector(".sub-btn.active")?.dataset.subTab || "latest";
  switchSub(activeSub);
}

function normalizeCategoryOrder() {
  const existingCategories = state.items.map((item) => item.category).filter(Boolean);
  const merged = [...new Set([...DEFAULT_CATEGORY_ORDER, ...state.categoryOrder, ...existingCategories])];
  state.categoryOrder = merged;

  if (!state.selectedCategory || !state.categoryOrder.includes(state.selectedCategory)) {
    state.selectedCategory = state.categoryOrder[0] || "";
  }

  save("closet_category_order", state.categoryOrder);
}

function recomputeWearCounts() {
  const counter = new Map();
  for (const item of state.items) counter.set(item.id, 0);
  for (const log of state.dailyLogs) {
    for (const itemId of log.wornItemIds || []) {
      counter.set(itemId, (counter.get(itemId) || 0) + 1);
    }
  }
  for (const [itemId, count] of Object.entries(state.manualVoteCounts || {})) {
    counter.set(itemId, (counter.get(itemId) || 0) + Number(count || 0));
  }
  for (const item of state.items) {
    item.wearCountTotal = counter.get(item.id) || 0;
  }
}

function persistAll() {
  save("closet_items", state.items);
  save("closet_daily_logs", state.dailyLogs);
  save("closet_category_order", state.categoryOrder);
  save("closet_manual_vote_counts", state.manualVoteCounts);
}

function sortedByPurchase(items) {
  return [...items].sort((a, b) => {
    const ta = new Date(a.purchaseDate || a.createdAt).getTime();
    const tb = new Date(b.purchaseDate || b.createdAt).getTime();
    return state.purchaseSort === "asc" ? ta - tb : tb - ta;
  });
}

function renderItemCategoryOptions() {
  itemCategorySelect.innerHTML = state.categoryOrder
    .map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`)
    .join("");
}

function renderLatest() {
  const items = sortedByPurchase(state.items);
  if (!items.length) {
    closetLatest.innerHTML = '<p class="meta">目前沒有資料。</p>';
    return;
  }

  closetLatest.innerHTML = `
    <div class="latest-list">
      ${items
      .map(
        (item) => `
            <article class="latest-row">
              <button type="button" class="latest-open-btn" data-open-item-detail="${item.id}">
                <div class="latest-brand"><strong>${escapeHtml(item.brand || "未填品牌")}</strong></div>
                <div class="latest-name">${escapeHtml(item.name)}</div>
                <p class="latest-date meta">${escapeHtml(item.purchaseDate || "未填日期")}</p>
                <img class="latest-thumb" src="${item.itemPhotos[0] || ""}" alt="${escapeHtml(item.name)}" />
              </button>
            </article>`
      )
      .join("")}
    </div>
  `;

  for (const btn of closetLatest.querySelectorAll("[data-open-item-detail]")) {
    btn.addEventListener("click", () => openItemDetail(btn.dataset.openItemDetail));
  }
}

function renderPhotosWall() {
  const items = sortedByPurchase(state.items);
  if (!items.length) {
    closetPhotos.innerHTML = '<p class="meta">目前沒有照片。</p>';
    return;
  }

  closetPhotos.innerHTML = `
    <div class="photo-grid">
      ${items
      .map(
        (item) =>
          `<button type="button" class="photo-open-btn" data-open-item-detail="${item.id}"><img class="cover-grid" src="${item.itemPhotos[0] || ""}" alt="${escapeHtml(item.name)}" /></button>`
      )
      .join("")}
    </div>
  `;

  for (const btn of closetPhotos.querySelectorAll("[data-open-item-detail]")) {
    btn.addEventListener("click", () => openItemDetail(btn.dataset.openItemDetail));
  }
}

function openItemDetail(itemId) {
  const item = state.items.find((x) => x.id === itemId);
  if (!item) return;

  itemDetailTitle.textContent = `${item.brand ? `${item.brand} / ` : ""}${item.name}`;

  detailItemPhotos = item.itemPhotos || [];
  detailPhotoIndex = 0;
  renderDetailPhoto();

  itemDetailRecords.innerHTML = `
    <div><strong>購買日期：</strong>${escapeHtml(item.purchaseDate || "未填")}</div>
    <div><strong>分類：</strong>${escapeHtml(item.category || "未填")}</div>
    <div><strong>原價：</strong>${item.originalPrice ?? "未填"}</div>
    <div><strong>特價：</strong>${item.specialPrice ?? "未填"}</div>
    <div><strong>優惠價：</strong>${item.discountPrice ?? "未填"}</div>
    <div><strong>來源：</strong>${escapeHtml(item.origin || "未填")}</div>
    <div><strong>分級：</strong>${escapeHtml(item.grade || "未填")}</div>
    <div><strong>季節：</strong>${escapeHtml((item.seasons || []).join(" / ") || "未填")}</div>
    <div><strong>建議體重：</strong>${escapeHtml(item.suggestedWeight || "未填")}</div>
    <div><strong>小紀錄：</strong>${escapeHtml(item.miniNote || "-")}</div>
    <div><strong>優點：</strong>${escapeHtml(item.pros || "-")}</div>
    <div><strong>缺點：</strong>${escapeHtml(item.cons || "-")}</div>
    <div><strong>備註：</strong>${escapeHtml(item.remark || "-")}</div>
    <div><strong>使用次數：</strong>${item.wearCountTotal || 0}</div>
  `;

  itemDetailDialog.showModal();
}

function stepDetailPhoto(step) {
  if (!detailItemPhotos.length) return;
  const total = detailItemPhotos.length;
  detailPhotoIndex = (detailPhotoIndex + step + total) % total;
  renderDetailPhoto();
}

function renderDetailPhoto() {
  if (!detailItemPhotos.length) {
    itemDetailMainPhoto.removeAttribute("src");
    itemDetailCounter.textContent = "沒有照片";
    return;
  }
  itemDetailMainPhoto.src = detailItemPhotos[detailPhotoIndex];
  itemDetailCounter.textContent = `${detailPhotoIndex + 1} / ${detailItemPhotos.length}`;
}

function renderCategoryOrderEditor() {
  categoryOrderList.innerHTML = state.categoryOrder
    .map(
      (c, i) => `
      <div class="order-row">
        <strong>${escapeHtml(c)}</strong>
        <button class="order-btn" type="button" data-order-up="${i}">上移</button>
        <button class="order-btn" type="button" data-order-down="${i}">下移</button>
      </div>`
    )
    .join("");

  for (const btn of categoryOrderList.querySelectorAll("[data-order-up]")) {
    btn.addEventListener("click", () => moveCategory(Number(btn.dataset.orderUp), -1));
  }
  for (const btn of categoryOrderList.querySelectorAll("[data-order-down]")) {
    btn.addEventListener("click", () => moveCategory(Number(btn.dataset.orderDown), 1));
  }
}

function moveCategory(index, direction) {
  const next = index + direction;
  if (next < 0 || next >= state.categoryOrder.length) return;
  const arr = state.categoryOrder;
  [arr[index], arr[next]] = [arr[next], arr[index]];
  persistAll();
  renderAll();
}

function renderCategoryTab() {
  const pool = state.categoryOrder;
  if (!pool.length) {
    categoryChips.innerHTML = '<p class="meta">目前沒有分類。</p>';
    categoryResult.innerHTML = "";
    return;
  }

  categoryChips.innerHTML = pool
    .map(
      (c) => `<button class="chip ${c === state.selectedCategory ? "active" : ""}" data-category-chip="${escapeAttr(c)}">${escapeHtml(c)}</button>`
    )
    .join("");

  const target = sortedByPurchase(state.items).filter((item) => item.category === state.selectedCategory);
  categoryResult.innerHTML = target.length
    ? target
      .map(
        (item) => `
          <article class="item-row">
            <img class="cover-sm" src="${item.itemPhotos[0] || ""}" alt="${escapeHtml(item.name)}" />
            <div>
              <div><strong>${escapeHtml(item.brand || "未填品牌")}</strong></div>
              <div>${escapeHtml(item.name)}</div>
            </div>
          </article>`
      )
      .join("")
    : '<p class="meta">此分類目前沒有商品。</p>';

  for (const btn of categoryChips.querySelectorAll("[data-category-chip]")) {
    btn.addEventListener("click", () => {
      state.selectedCategory = btn.dataset.categoryChip;
      renderCategoryTab();
    });
  }
}

function renderTagTab() {
  tagChips.innerHTML = TAG_OPTIONS.map((tag) => {
    const active = state.selectedTags.includes(tag);
    return `<button class="chip ${active ? "active" : ""}" data-tag-chip="${escapeAttr(tag)}">${escapeHtml(tag)}</button>`;
  }).join("");

  for (const btn of tagChips.querySelectorAll("[data-tag-chip]")) {
    btn.addEventListener("click", () => {
      const tag = btn.dataset.tagChip;
      if (state.selectedTags.includes(tag)) {
        state.selectedTags = state.selectedTags.filter((x) => x !== tag);
      } else {
        state.selectedTags = [...state.selectedTags, tag];
      }
      renderTagTab();
    });
  }

  const filterTags = state.selectedTags;

  let result = [...state.items];
  for (const tag of filterTags) {
    if (["春季", "夏季", "秋季", "冬季"].includes(tag)) {
      result = result.filter((item) => (item.seasons || []).includes(tag));
    } else {
      result = result.filter((item) => item.origin === tag);
    }
  }

  if (state.tagUsageSort === "desc") {
    result = result.sort((a, b) => (b.wearCountTotal || 0) - (a.wearCountTotal || 0));
  } else if (state.tagUsageSort === "asc") {
    result = result.sort((a, b) => (a.wearCountTotal || 0) - (b.wearCountTotal || 0));
  } else {
    result = sortedByPurchase(result);
  }

  tagResult.innerHTML = result.length
    ? result
      .map(
        (item) => `
          <article class="item-row">
            <img class="cover-sm" src="${item.itemPhotos[0] || ""}" alt="${escapeHtml(item.name)}" />
            <div>
              <div><strong>${escapeHtml(item.brand || "未填品牌")}</strong> / ${escapeHtml(item.name)}</div>
              <p class="meta">使用次數：${item.wearCountTotal || 0}</p>
            </div>
          </article>`
      )
      .join("")
    : '<p class="meta">此標籤條件沒有商品。</p>';
}

function renderVoteChecklist(container, selectedIds) {
  const selected = new Set(selectedIds || []);
  const items = sortedByPurchase(state.items);
  container.innerHTML = items.length
    ? items
      .map(
        (item) => `
          <label class="item-row">
            <img class="cover-sm" src="${item.itemPhotos[0] || ""}" alt="${escapeHtml(item.name)}" />
            <div>
              <input type="checkbox" name="wornItemIds" value="${item.id}" ${selected.has(item.id) ? "checked" : ""} />
              <span>${escapeHtml(item.brand || "未填品牌")} / ${escapeHtml(item.name)}</span>
            </div>
          </label>`
      )
      .join("")
    : '<p class="meta">請先到我的衣櫃新增商品。</p>';
}

function renderVoteSearchCategoryOptions() {
  const previous = voteSearchCategory.value;
  voteSearchCategory.innerHTML =
    '<option value="">全部分類</option>' +
    state.categoryOrder.map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
  if (previous && state.categoryOrder.includes(previous)) {
    voteSearchCategory.value = previous;
  }
}

function renderManualVoteList() {
  const brandQ = voteSearchBrand.value.trim().toLowerCase();
  const nameQ = voteSearchName.value.trim().toLowerCase();
  const tagQ = voteSearchTag.value.trim().toLowerCase();
  const categoryQ = voteSearchCategory.value;

  const rows = sortedByPurchase(state.items).filter((item) => {
    if (brandQ && !String(item.brand || "").toLowerCase().includes(brandQ)) return false;
    if (nameQ && !String(item.name || "").toLowerCase().includes(nameQ)) return false;
    if (categoryQ && item.category !== categoryQ) return false;
    if (tagQ) {
      const searchableTags = [...(item.seasons || []), item.origin || "", item.grade || "", item.category || ""]
        .join(" ")
        .toLowerCase();
      if (!searchableTags.includes(tagQ)) return false;
    }
    return true;
  });

  voteManualChecklist.innerHTML = rows.length
    ? rows
      .map(
        (item) => `
          <label class="item-row">
            <img class="cover-sm" src="${item.itemPhotos[0] || ""}" alt="${escapeHtml(item.name)}" />
            <div>
              <div><strong>${escapeHtml(item.brand || "未填品牌")}</strong> / ${escapeHtml(item.name)}</div>
              <p class="meta">目前使用次數：${item.wearCountTotal || 0}</p>
              <label><input type="checkbox" name="voteItemIds" value="${item.id}" /> 投票</label>
            </div>
          </label>`
      )
      .join("")
    : '<p class="meta">沒有符合條件的商品。</p>';
}

function renderOutfitGrid() {
  const logs = [...state.dailyLogs]
    .filter((log) => (log.outfitPhotos || []).length > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!logs.length) {
    outfitGrid.innerHTML = '<p class="meta">目前沒有穿搭紀錄。</p>';
    return;
  }

  outfitGrid.innerHTML = "";
  for (const log of logs) {
    const img = document.createElement("img");
    img.className = "cover-grid";
    img.src = log.outfitPhotos[0] || "";
    img.alt = log.date;
    img.addEventListener("click", () => openOutfitDetail(log.id));
    outfitGrid.appendChild(img);
  }
}

function openOutfitDetail(logId) {
  const log = state.dailyLogs.find((x) => x.id === logId);
  if (!log) return;

  const names = (log.wornItemIds || [])
    .map((id) => state.items.find((x) => x.id === id))
    .filter(Boolean)
    .map((item) => `${item.brand ? `${item.brand} / ` : ""}${item.name}`)
    .join("、");

  detailDate.textContent = log.date;
  detailMeta.textContent = `天氣：${log.weather || "未填"}`;
  detailNote.textContent = `穿搭想法：${log.note || "-"}`;
  detailVote.textContent = `票選衣服：${names || "未勾選"}`;

  detailPhotos.innerHTML = "";
  for (const src of (log.outfitPhotos || []).slice(0, 20)) {
    const img = document.createElement("img");
    img.className = "cover-grid";
    img.src = src;
    img.alt = log.date;
    detailPhotos.appendChild(img);
  }

  outfitDetailDialog.showModal();
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function numberOrNull(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function filesToThreeFourDataUrls(files) {
  return Promise.all(Array.from(files).map(fileToThreeFourDataUrl));
}

function fileToThreeFourDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Center-crop to a 3:4 canvas to standardize uploaded photo ratio.
        const srcW = img.naturalWidth;
        const srcH = img.naturalHeight;
        const targetRatio = 3 / 4;
        const srcRatio = srcW / srcH;
        let cropW = srcW;
        let cropH = srcH;
        if (srcRatio > targetRatio) {
          cropW = srcH * targetRatio;
        } else {
          cropH = srcW / targetRatio;
        }
        const sx = Math.max(0, (srcW - cropW) / 2);
        const sy = Math.max(0, (srcH - cropH) / 2);
        const outW = 900;
        const outH = 1200;
        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result || ""));
          return;
        }
        ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outW, outH);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => resolve(String(reader.result || ""));
      img.src = String(reader.result || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(text) {
  return escapeHtml(text).replaceAll("`", "");
}
