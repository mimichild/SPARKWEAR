const DEFAULT_CATEGORY_ORDER = ["上衣", "裙裝", "褲裝", "洋裝", "外套", "套裝", "日常", "鞋類", "包包", "猶豫", "留校", "冷凍", "未分類"];
const TAG_OPTIONS = ["春季", "夏季", "秋季", "冬季", "日貨", "韓貨", "品牌", "蝦皮", "淘寶", "其他"];

const state = {
  items: load("closet_items", []),
  dailyLogs: load("closet_daily_logs", []),
  manualVoteCounts: load("closet_manual_vote_counts", {}),
  categoryOrder: load("closet_category_order", []),
  categoryColors: load("closet_category_colors", {}),
  purchaseSort: load("closet_purchase_sort", "desc"),
  outfitSort: load("closet_outfit_sort", "desc"),
  tagUsageSort: load("closet_tag_usage_sort", "none"),
  selectedCategory: "",
  selectedTags: [],
  closetQuery: "",
  outfitQuery: "",
};

const homePage = document.getElementById("homePage");
const closetPage = document.getElementById("closetPage");
const outfitPage = document.getElementById("outfitPage");
const exportDataBtn = document.getElementById("exportDataBtn");
const importDataBtn = document.getElementById("importDataBtn");
const importFileInput = document.getElementById("importFileInput");
const importModeDialog = document.getElementById("importModeDialog");
const importMergeBtn = document.getElementById("importMergeBtn");
const importReplaceBtn = document.getElementById("importReplaceBtn");
const cancelImportBtn = document.getElementById("cancelImportBtn");

const openPageBtns = document.querySelectorAll("[data-open-page]");
const backBtns = document.querySelectorAll("[data-back-home]");

const subTabs = document.querySelectorAll("[data-sub-tab]");
const closetLatest = document.getElementById("closetLatest");
const closetPhotos = document.getElementById("closetPhotos");
const closetCategory = document.getElementById("closetCategory");
const closetTags = document.getElementById("closetTags");
const purchaseSortSelect = document.getElementById("purchaseSortSelect");
const outfitSortSelect = document.getElementById("outfitSortSelect");
const tagUsageSortSelect = document.getElementById("tagUsageSortSelect");
const toggleClosetSearch = document.getElementById("toggleClosetSearch");
const closetSearchBar = document.getElementById("closetSearchBar");
const closetSearchInput = document.getElementById("closetSearchInput");
const clearClosetSearch = document.getElementById("clearClosetSearch");
const toggleOutfitSearch = document.getElementById("toggleOutfitSearch");
const outfitSearchBar = document.getElementById("outfitSearchBar");
const outfitSearchInput = document.getElementById("outfitSearchInput");
const clearOutfitSearch = document.getElementById("clearOutfitSearch");

const categoryChips = document.getElementById("categoryChips");
const categoryResult = document.getElementById("categoryResult");
const tagChips = document.getElementById("tagChips");
const tagResult = document.getElementById("tagResult");
const openCategoryEdit = document.getElementById("openCategoryEdit");
const categoryEditDialog = document.getElementById("categoryEditDialog");
const categoryEditForm = document.getElementById("categoryEditForm");
const categoryEditRows = document.getElementById("categoryEditRows");
const closeCategoryEdit = document.getElementById("closeCategoryEdit");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const newCategoryName = document.getElementById("newCategoryName");
const newCategoryColor = document.getElementById("newCategoryColor");

const outfitGrid = document.getElementById("outfitGrid");

const itemDialog = document.getElementById("itemDialog");
const itemForm = document.getElementById("itemForm");
const itemFormTitle = document.getElementById("itemFormTitle");
const itemPurchaseDateInput = itemForm.querySelector('input[name="purchaseDate"]');
const itemPhotosInput = itemForm.querySelector('input[name="itemPhotos"]');
const openItemForm = document.getElementById("openItemForm");
const closeItemBtn = document.querySelector("[data-close-item]");
const itemCategorySelect = document.getElementById("itemCategorySelect");
const existingItemPhotosSection = document.getElementById("existingItemPhotosSection");
const existingItemPhotosList = document.getElementById("existingItemPhotosList");

const outfitMenuDialog = document.getElementById("outfitMenuDialog");
const openOutfitMenu = document.getElementById("openOutfitMenu");
const closeOutfitMenu = document.getElementById("closeOutfitMenu");
const openOutfitFormAction = document.getElementById("openOutfitFormAction");
const openVoteFormAction = document.getElementById("openVoteFormAction");

const outfitFormDialog = document.getElementById("outfitFormDialog");
const outfitForm = document.getElementById("outfitForm");
const outfitFormTitle = document.getElementById("outfitFormTitle");
const closeOutfitBtn = document.querySelector("[data-close-outfit]");
const outfitSearchBrand = document.getElementById("outfitSearchBrand");
const outfitSearchName = document.getElementById("outfitSearchName");
const outfitSearchTag = document.getElementById("outfitSearchTag");
const outfitSearchCategory = document.getElementById("outfitSearchCategory");
const outfitItemChecklist = document.getElementById("outfitItemChecklist");

const voteDialog = document.getElementById("voteDialog");
const voteForm = document.getElementById("voteForm");
const closeVoteDialogBtn = document.getElementById("closeVoteDialog");
const voteManualChecklist = document.getElementById("voteManualChecklist");
const voteSearchBrand = document.getElementById("voteSearchBrand");
const voteSearchName = document.getElementById("voteSearchName");
const voteSearchTag = document.getElementById("voteSearchTag");
const voteSearchCategory = document.getElementById("voteSearchCategory");

const outfitDetailDialog = document.getElementById("outfitDetailDialog");
const editOutfitDetail = document.getElementById("editOutfitDetail");
const deleteOutfitDetail = document.getElementById("deleteOutfitDetail");
const closeDetail = document.getElementById("closeDetail");
const detailDate = document.getElementById("detailDate");
const detailMeta = document.getElementById("detailMeta");
const detailTemp = document.getElementById("detailTemp");
const detailNote = document.getElementById("detailNote");
const detailItems = document.getElementById("detailItems");
const outfitDetailPrev = document.getElementById("outfitDetailPrev");
const outfitDetailNext = document.getElementById("outfitDetailNext");
const outfitDetailMainPhoto = document.getElementById("outfitDetailMainPhoto");
const outfitDetailCounter = document.getElementById("outfitDetailCounter");
const categoryItemsPage = document.getElementById("categoryItemsPage");
const categoryItemsTitle = document.getElementById("categoryItemsTitle");
const categoryItemsLatestTab = document.getElementById("categoryItemsLatestTab");
const categoryItemsPhotosTab = document.getElementById("categoryItemsPhotosTab");
const categoryItemsList = document.getElementById("categoryItemsList");
const closeCategoryItemsPage = document.getElementById("closeCategoryItemsPage");

const itemDetailDialog = document.getElementById("itemDetailDialog");
const editItemDetail = document.getElementById("editItemDetail");
const deleteItemDetail = document.getElementById("deleteItemDetail");
const closeItemDetail = document.getElementById("closeItemDetail");
const itemDetailTitle = document.getElementById("itemDetailTitle");
const itemDetailMainPhoto = document.getElementById("itemDetailMainPhoto");
const itemDetailPrev = document.getElementById("itemDetailPrev");
const itemDetailNext = document.getElementById("itemDetailNext");
const itemDetailCounter = document.getElementById("itemDetailCounter");
const itemDetailRecords = document.getElementById("itemDetailRecords");
const itemUsedOutfits = document.getElementById("itemUsedOutfits");
const confirmDeleteItemDialog = document.getElementById("confirmDeleteItemDialog");
const confirmDeleteItemText = document.getElementById("confirmDeleteItemText");
const cancelDeleteItem = document.getElementById("cancelDeleteItem");
const confirmDeleteItem = document.getElementById("confirmDeleteItem");
const confirmDeleteOutfitDialog = document.getElementById("confirmDeleteOutfitDialog");
const confirmDeleteOutfitText = document.getElementById("confirmDeleteOutfitText");
const cancelDeleteOutfit = document.getElementById("cancelDeleteOutfit");
const confirmDeleteOutfit = document.getElementById("confirmDeleteOutfit");

let detailItemPhotos = [];
let detailPhotoIndex = 0;
let detailOutfitPhotos = [];
let detailOutfitIndex = 0;
let editingItemId = null;
let editingOutfitId = null;
let outfitSelection = new Set();
let currentOutfitDetailId = null;
let currentItemDetailId = null;
let currentCategoryItemsName = "";
let categoryItemsView = "latest";
let pendingImportData = null;

if (itemPurchaseDateInput) itemPurchaseDateInput.valueAsDate = new Date();
outfitForm.date.valueAsDate = new Date();
if (!["asc", "desc"].includes(state.purchaseSort)) state.purchaseSort = "desc";
purchaseSortSelect.value = state.purchaseSort;
if (!["asc", "desc"].includes(state.outfitSort)) state.outfitSort = "desc";
outfitSortSelect.value = state.outfitSort;
if (!["none", "desc", "asc"].includes(state.tagUsageSort)) state.tagUsageSort = "none";
tagUsageSortSelect.value = state.tagUsageSort;

normalizeCategoryOrder();
recomputeWearCounts();

for (const btn of openPageBtns) btn.addEventListener("click", () => openPage(btn.dataset.openPage));
for (const btn of backBtns) btn.addEventListener("click", showHome);
for (const btn of subTabs) btn.addEventListener("click", () => switchSub(btn.dataset.subTab));

openItemForm.addEventListener("click", () => openNewItemForm());
closeItemBtn.addEventListener("click", () => {
  editingItemId = null;
  itemDialog.close();
});
openCategoryEdit.addEventListener("click", () => {
  renderCategoryEditRows();
  categoryEditDialog.showModal();
});
closeCategoryEdit.addEventListener("click", () => categoryEditDialog.close());
categoryEditForm.addEventListener("submit", onSaveCategoryEdit);
addCategoryBtn.addEventListener("click", onAddCategory);

openOutfitMenu.addEventListener("click", () => outfitMenuDialog.showModal());
closeOutfitMenu.addEventListener("click", () => outfitMenuDialog.close());
openOutfitFormAction.addEventListener("click", () => {
  outfitMenuDialog.close();
  editingOutfitId = null;
  outfitFormTitle.textContent = "新增穿搭";
  outfitForm.reset();
  outfitForm.date.valueAsDate = new Date();
  outfitSelection = new Set();
  outfitFormDialog.showModal();
  renderOutfitSearchCategoryOptions();
  renderOutfitItemChecklist();
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
editOutfitDetail.addEventListener("click", () => openOutfitEditForm());
deleteOutfitDetail.addEventListener("click", () => openDeleteOutfitConfirm());
editItemDetail.addEventListener("click", () => openItemEditForm());
deleteItemDetail.addEventListener("click", () => openDeleteItemConfirm());
closeItemDetail.addEventListener("click", () => itemDetailDialog.close());
closeCategoryItemsPage.addEventListener("click", () => categoryItemsPage.classList.remove("active"));
itemDetailPrev.addEventListener("click", () => stepDetailPhoto(-1));
itemDetailNext.addEventListener("click", () => stepDetailPhoto(1));
outfitDetailPrev.addEventListener("click", () => stepOutfitDetailPhoto(-1));
outfitDetailNext.addEventListener("click", () => stepOutfitDetailPhoto(1));
categoryItemsLatestTab.addEventListener("click", () => {
  categoryItemsView = "latest";
  renderCategoryItemsPage();
});
categoryItemsPhotosTab.addEventListener("click", () => {
  categoryItemsView = "photos";
  renderCategoryItemsPage();
});
purchaseSortSelect.addEventListener("change", () => {
  state.purchaseSort = purchaseSortSelect.value === "asc" ? "asc" : "desc";
  save("closet_purchase_sort", state.purchaseSort);
  renderLatest();
  renderPhotosWall();
});
outfitSortSelect.addEventListener("change", () => {
  state.outfitSort = outfitSortSelect.value === "asc" ? "asc" : "desc";
  save("closet_outfit_sort", state.outfitSort);
  renderOutfitGrid();
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

let outfitTouchStartX = 0;
outfitDetailMainPhoto.addEventListener("touchstart", (e) => {
  outfitTouchStartX = e.touches[0]?.clientX || 0;
});
outfitDetailMainPhoto.addEventListener("touchend", (e) => {
  const endX = e.changedTouches[0]?.clientX || 0;
  const dx = endX - outfitTouchStartX;
  if (Math.abs(dx) < 30) return;
  stepOutfitDetailPhoto(dx < 0 ? 1 : -1);
});

const SWIPE_THRESHOLD = 60;
const SWIPE_MAX_VERTICAL_DRIFT = 90;
let navTouchStartX = 0;
let navTouchStartY = 0;
let navTouchTarget = null;

document.addEventListener("touchstart", (e) => {
  navTouchStartX = e.touches[0]?.clientX || 0;
  navTouchStartY = e.touches[0]?.clientY || 0;
  navTouchTarget = e.target;
});

document.addEventListener("touchend", (e) => {
  if (!navTouchTarget || isSwipeNavBlockedTarget(navTouchTarget)) return;
  const endX = e.changedTouches[0]?.clientX || 0;
  const endY = e.changedTouches[0]?.clientY || 0;
  const dx = endX - navTouchStartX;
  const dy = endY - navTouchStartY;
  if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_MAX_VERTICAL_DRIFT) return;
  if (dx < 0) {
    navigateSwipeBack();
  } else {
    navigateSwipeForward();
  }
});

itemForm.addEventListener("submit", onSaveItem);
outfitForm.addEventListener("submit", onSaveOutfit);
voteForm.addEventListener("submit", onSaveManualVote);
voteSearchBrand.addEventListener("input", renderManualVoteList);
voteSearchName.addEventListener("input", renderManualVoteList);
voteSearchTag.addEventListener("input", renderManualVoteList);
voteSearchCategory.addEventListener("change", renderManualVoteList);
outfitSearchBrand.addEventListener("input", renderOutfitItemChecklist);
outfitSearchName.addEventListener("input", renderOutfitItemChecklist);
outfitSearchTag.addEventListener("input", renderOutfitItemChecklist);
outfitSearchCategory.addEventListener("change", renderOutfitItemChecklist);
toggleClosetSearch.addEventListener("click", () => {
  closetSearchBar.classList.toggle("hidden");
  if (!closetSearchBar.classList.contains("hidden")) closetSearchInput.focus();
});
closetSearchInput.addEventListener("input", () => {
  state.closetQuery = closetSearchInput.value.trim().toLowerCase();
  renderLatest();
  renderPhotosWall();
  renderCategoryTab();
  renderTagTab();
});
toggleOutfitSearch.addEventListener("click", () => {
  outfitSearchBar.classList.toggle("hidden");
  if (!outfitSearchBar.classList.contains("hidden")) outfitSearchInput.focus();
});
outfitSearchInput.addEventListener("input", () => {
  state.outfitQuery = outfitSearchInput.value.trim().toLowerCase();
  renderOutfitGrid();
});
clearClosetSearch.addEventListener("click", () => clearSearch("closet"));
clearOutfitSearch.addEventListener("click", () => clearSearch("outfit"));
exportDataBtn.addEventListener("click", exportDataAsJson);
importDataBtn.addEventListener("click", () => importFileInput.click());
importFileInput.addEventListener("change", onImportFilePicked);
importMergeBtn.addEventListener("click", () => applyImportedData("merge"));
importReplaceBtn.addEventListener("click", () => applyImportedData("replace"));
cancelImportBtn.addEventListener("click", () => {
  pendingImportData = null;
  importModeDialog.close();
});
itemDialog.addEventListener("close", () => {
  editingItemId = null;
  existingItemPhotosSection.classList.add("hidden");
  existingItemPhotosList.innerHTML = "";
});
cancelDeleteItem.addEventListener("click", () => confirmDeleteItemDialog.close());
cancelDeleteOutfit.addEventListener("click", () => confirmDeleteOutfitDialog.close());
confirmDeleteItem.addEventListener("click", () => deleteCurrentItem());
confirmDeleteOutfit.addEventListener("click", () => deleteCurrentOutfit());

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

function openNewItemForm() {
  editingItemId = null;
  itemFormTitle.textContent = "記錄新品";
  itemForm.reset();
  if (itemPurchaseDateInput) itemPurchaseDateInput.valueAsDate = new Date();
  existingItemPhotosSection.classList.add("hidden");
  existingItemPhotosList.innerHTML = "";
  itemDialog.showModal();
}

function renderExistingItemPhotos(photos) {
  if (!editingItemId) {
    existingItemPhotosSection.classList.add("hidden");
    existingItemPhotosList.innerHTML = "";
    return;
  }
  existingItemPhotosSection.classList.remove("hidden");
  existingItemPhotosList.innerHTML = (photos || []).length
    ? photos
      .map(
        (photo, idx) => `
        <label class="existing-photo-card">
          <img class="existing-photo-thumb" src="${photo}" alt="商品照片${idx + 1}" />
          <span><input type="checkbox" name="deleteExistingPhotos" value="${idx}" /> 刪除</span>
        </label>`
      )
      .join("")
    : '<p class="meta">目前沒有已存照片，請新增照片。</p>';
}

function isSwipeNavBlockedTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("input,textarea,select,button,label,[contenteditable='true'],.carousel,.detail-photo"));
}

function closeTopOverlay() {
  const dialogs = [
    confirmDeleteItemDialog,
    confirmDeleteOutfitDialog,
    outfitDetailDialog,
    itemDetailDialog,
    voteDialog,
    outfitFormDialog,
    outfitMenuDialog,
    itemDialog,
    categoryEditDialog,
  ];
  for (const dialog of dialogs) {
    if (dialog?.open) {
      dialog.close();
      return true;
    }
  }
  if (categoryItemsPage.classList.contains("active")) {
    categoryItemsPage.classList.remove("active");
    return true;
  }
  return false;
}

function hasOpenOverlay() {
  if (categoryItemsPage.classList.contains("active")) return true;
  return [
    confirmDeleteItemDialog,
    confirmDeleteOutfitDialog,
    outfitDetailDialog,
    itemDetailDialog,
    voteDialog,
    outfitFormDialog,
    outfitMenuDialog,
    itemDialog,
    categoryEditDialog,
  ]
    .some((dialog) => Boolean(dialog?.open));
}

function currentMainPage() {
  if (closetPage.classList.contains("active")) return "closet";
  if (outfitPage.classList.contains("active")) return "outfit";
  return "home";
}

function activeClosetSubTab() {
  const active = Array.from(subTabs).find((btn) => btn.classList.contains("active"));
  return active?.dataset.subTab || "latest";
}

function navigateSwipeBack() {
  if (closeTopOverlay()) return;
  const main = currentMainPage();
  if (main === "closet") {
    const order = ["latest", "photos", "category", "tags"];
    const idx = order.indexOf(activeClosetSubTab());
    if (idx > 0) {
      switchSub(order[idx - 1]);
    } else {
      showHome();
    }
    return;
  }
  if (main === "outfit") {
    openPage("closet");
    return;
  }
  openPage("outfit");
}

function navigateSwipeForward() {
  if (hasOpenOverlay()) return;
  const main = currentMainPage();
  if (main === "home") {
    openPage("closet");
    return;
  }
  if (main === "closet") {
    const order = ["latest", "photos", "category", "tags"];
    const idx = order.indexOf(activeClosetSubTab());
    if (idx >= 0 && idx < order.length - 1) {
      switchSub(order[idx + 1]);
    } else {
      openPage("outfit");
    }
    return;
  }
  showHome();
}

async function onSaveItem(e) {
  e.preventDefault();
  const fd = new FormData(itemForm);
  let newPhotos = [];
  try {
    newPhotos = await filesToThreeFourDataUrls(itemPhotosInput?.files || []);
  } catch {
    alert("照片處理失敗，請改用 JPG/PNG 或先壓縮後再上傳。");
    return;
  }
  const editing = editingItemId ? state.items.find((x) => x.id === editingItemId) : null;
  const deletedIndexes = new Set(
    fd.getAll("deleteExistingPhotos")
      .map((x) => Number(x))
      .filter((x) => Number.isInteger(x) && x >= 0)
  );
  const keptOldPhotos = editing
    ? (editing.itemPhotos || []).filter((_, idx) => !deletedIndexes.has(idx))
    : [];
  const finalPhotos = editing ? [...keptOldPhotos, ...newPhotos] : newPhotos;
  if (!finalPhotos.length) {
    alert("請至少保留或上傳 1 張商品照片");
    return;
  }

  const item = {
    id: editing?.id || crypto.randomUUID(),
    brand: String(fd.get("brand") || "").trim(),
    name: String(fd.get("name") || "").trim(),
    purchaseDate: String(fd.get("purchaseDate") || ""),
    category: String(fd.get("category") || "").trim(),
    originalPrice: numberOrNull(fd.get("originalPrice")),
    specialPrice: numberOrNull(fd.get("specialPrice")),
    discountPrice: numberOrNull(fd.get("discountPrice")),
    size: String(fd.get("size") || "").trim(),
    weight: String(fd.get("weight") || "").trim(),
    bodyType: String(fd.get("bodyType") || "").trim(),
    suggestedWeight: String(fd.get("suggestedWeight") || "").trim(),
    grade: String(fd.get("grade") || "").trim(),
    origin: String(fd.get("origin") || "").trim(),
    seasons: fd.getAll("seasons"),
    miniNote: String(fd.get("miniNote") || "").trim(),
    pros: String(fd.get("pros") || "").trim(),
    cons: String(fd.get("cons") || "").trim(),
    remark: String(fd.get("remark") || "").trim(),
    itemPhotos: finalPhotos,
    wearCountTotal: editing?.wearCountTotal || 0,
    createdAt: editing?.createdAt || new Date().toISOString(),
  };

  if (!item.name || !item.category || !item.purchaseDate) {
    alert("商品名稱、分類、購買日期是必填");
    return;
  }

  if (editing) {
    Object.assign(editing, item);
  } else {
    state.items.push(item);
  }
  normalizeCategoryOrder();
  recomputeWearCounts();
  if (!persistAll()) return;

  itemForm.reset();
  if (itemPurchaseDateInput) itemPurchaseDateInput.valueAsDate = new Date();
  editingItemId = null;
  existingItemPhotosSection.classList.add("hidden");
  existingItemPhotosList.innerHTML = "";
  itemDialog.close();
  renderAll();
}

async function onSaveOutfit(e) {
  e.preventDefault();
  const fd = new FormData(outfitForm);
  let photos = [];
  try {
    photos = await filesToThreeFourDataUrls(outfitForm.outfitPhotos.files);
  } catch {
    alert("照片處理失敗，請改用 JPG/PNG 或先壓縮後再上傳。");
    return;
  }
  if (!photos.length && !editingOutfitId) {
    alert("請至少上傳 1 張穿搭照片");
    return;
  }

  const editing = editingOutfitId ? state.dailyLogs.find((x) => x.id === editingOutfitId) : null;
  const log = {
    id: editing?.id || crypto.randomUUID(),
    date: String(fd.get("date") || ""),
    weather: String(fd.get("weather") || "").trim(),
    county: String(fd.get("county") || "").trim(),
    place: String(fd.get("place") || "").trim(),
    temperature: String(fd.get("temperature") || "").trim(),
    note: String(fd.get("note") || "").trim(),
    wornItemIds: Array.from(outfitSelection),
    outfitPhotos: photos.length ? photos.slice(0, 20) : editing?.outfitPhotos || [],
    createdAt: editing?.createdAt || new Date().toISOString(),
  };

  if (!log.date) {
    alert("日期必填");
    return;
  }

  if (editing) {
    Object.assign(editing, log);
  } else {
    state.dailyLogs.push(log);
  }
  recomputeWearCounts();
  if (!persistAll()) return;

  outfitForm.reset();
  outfitForm.date.valueAsDate = new Date();
  editingOutfitId = null;
  outfitSelection = new Set();
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
  if (!persistAll()) return;

  voteForm.reset();
  renderVoteSearchCategoryOptions();
  renderManualVoteList();
  voteDialog.close();
  renderAll();
}

function renderAll() {
  normalizeCategoryOrder();
  purchaseSortSelect.value = state.purchaseSort;
  outfitSortSelect.value = state.outfitSort;
  tagUsageSortSelect.value = state.tagUsageSort;
  renderItemCategoryOptions();
  renderLatest();
  renderPhotosWall();
  renderCategoryTab();
  renderTagTab();
  renderVoteSearchCategoryOptions();
  renderManualVoteList();
  renderOutfitSearchCategoryOptions();
  renderOutfitItemChecklist();
  renderOutfitGrid();
  if (categoryItemsPage.classList.contains("active")) {
    renderCategoryItemsPage();
  }
  const activeSub = document.querySelector(".sub-btn.active")?.dataset.subTab || "latest";
  switchSub(activeSub);
}

function normalizeCategoryOrder() {
  for (const item of state.items) {
    if (!item.category) item.category = "未分類";
  }
  const existingCategories = state.items.map((item) => item.category).filter(Boolean);
  const merged = [...new Set([...DEFAULT_CATEGORY_ORDER, ...state.categoryOrder, ...existingCategories])];
  state.categoryOrder = merged;
  for (let i = 0; i < state.categoryOrder.length; i += 1) {
    const name = state.categoryOrder[i];
    if (!state.categoryColors[name]) state.categoryColors[name] = defaultCategoryColor(i);
  }

  if (!state.selectedCategory || !state.categoryOrder.includes(state.selectedCategory)) {
    state.selectedCategory = state.categoryOrder[0] || "";
  }

  save("closet_category_order", state.categoryOrder);
  save("closet_category_colors", state.categoryColors);
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
  try {
    save("closet_items", state.items);
    save("closet_daily_logs", state.dailyLogs);
    save("closet_category_order", state.categoryOrder);
    save("closet_category_colors", state.categoryColors);
    save("closet_manual_vote_counts", state.manualVoteCounts);
    return true;
  } catch (err) {
    console.error("persistAll failed:", err);
    alert("儲存失敗，可能是手機儲存空間不足或照片太大。請減少照片數量後再試。");
    return false;
  }
}

function sortedByPurchase(items) {
  return [...items].sort((a, b) => {
    const ta = new Date(a.purchaseDate || a.createdAt).getTime();
    const tb = new Date(b.purchaseDate || b.createdAt).getTime();
    return state.purchaseSort === "asc" ? ta - tb : tb - ta;
  });
}

function matchesClosetQuery(item) {
  const q = state.closetQuery;
  if (!q) return true;
  const text = [
    item.brand || "",
    item.name || "",
    item.purchaseDate || "",
    item.category || "",
    item.origin || "",
    (item.seasons || []).join(" "),
    item.grade || "",
    item.size || "",
    item.weight || "",
    item.bodyType || "",
    item.suggestedWeight || "",
    item.originalPrice ?? "",
    item.specialPrice ?? "",
    item.discountPrice ?? "",
    item.miniNote || "",
    item.pros || "",
    item.cons || "",
    item.remark || "",
    item.wearCountTotal ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return text.includes(q);
}

function matchesOutfitQuery(log) {
  const q = state.outfitQuery;
  if (!q) return true;
  const itemNames = (log.wornItemIds || [])
    .map((id) => state.items.find((x) => x.id === id))
    .filter(Boolean)
    .map((x) => `${x.brand || ""} ${x.name || ""}`)
    .join(" ");
  const text = [log.date || "", log.weather || "", log.temperature || "", log.note || "", log.county || "", log.place || "", itemNames]
    .join(" ")
    .toLowerCase();
  return text.includes(q);
}

function clearSearch(type) {
  if (type === "closet") {
    state.closetQuery = "";
    closetSearchInput.value = "";
    renderLatest();
    renderPhotosWall();
    renderCategoryTab();
    renderTagTab();
    return;
  }
  state.outfitQuery = "";
  outfitSearchInput.value = "";
  renderOutfitGrid();
}

function emptyResultBlock(type) {
  const label = type === "closet" ? "衣櫃" : "穿搭";
  return `<div class="empty-block">找不到符合條件的${label}資料。<br /><button type="button" data-clear-search="${type}">一鍵清除搜尋</button></div>`;
}

function bindClearSearchButtons(root) {
  for (const btn of root.querySelectorAll("[data-clear-search]")) {
    btn.addEventListener("click", () => clearSearch(btn.dataset.clearSearch));
  }
}

function renderItemCategoryOptions() {
  itemCategorySelect.innerHTML = state.categoryOrder
    .map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`)
    .join("");
}

function renderLatest() {
  const items = sortedByPurchase(state.items).filter(matchesClosetQuery);
  if (!items.length) {
    closetLatest.innerHTML = state.closetQuery ? emptyResultBlock("closet") : '<p class="meta">目前沒有資料。</p>';
    bindClearSearchButtons(closetLatest);
    return;
  }

  closetLatest.innerHTML = `
    <div class="latest-list">
      ${items
        .map(
          (item) => `
            <article class="latest-row">
              <button type="button" class="latest-open-btn" data-open-item-detail="${item.id}">
                <div class="latest-title"><strong>${escapeHtml(item.brand || "未填品牌")}</strong>&nbsp;${escapeHtml(item.name)}</div>
                <p class="latest-category meta">${escapeHtml(item.category || "未分類")}</p>
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
  const items = sortedByPurchase(state.items).filter(matchesClosetQuery);
  if (!items.length) {
    closetPhotos.innerHTML = state.closetQuery ? emptyResultBlock("closet") : '<p class="meta">目前沒有照片。</p>';
    bindClearSearchButtons(closetPhotos);
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
  currentItemDetailId = item.id;

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
    <div><strong>尺寸：</strong>${escapeHtml(item.size || "未填")}</div>
    <div><strong>體重：</strong>${escapeHtml(item.weight || "未填")}</div>
    <div><strong>身材：</strong>${escapeHtml(item.bodyType || "未填")}</div>
    <div><strong>建議體重：</strong>${escapeHtml(item.suggestedWeight || "未填")}</div>
    <div><strong>小紀錄：</strong>${escapeHtml(item.miniNote || "-")}</div>
    <div><strong>優點：</strong>${escapeHtml(item.pros || "-")}</div>
    <div><strong>缺點：</strong>${escapeHtml(item.cons || "-")}</div>
    <div><strong>備註：</strong>${escapeHtml(item.remark || "-")}</div>
    <div><strong>使用次數：</strong>${item.wearCountTotal || 0}</div>
    <div><strong>平均使用價格：</strong>${averageUsePriceText(item)}</div>
  `;
  renderItemUsedOutfits(item.id);

  itemDetailDialog.showModal();
}

function openItemEditForm() {
  if (!currentItemDetailId) return;
  const item = state.items.find((x) => x.id === currentItemDetailId);
  if (!item) return;

  editingItemId = item.id;
  itemFormTitle.textContent = "編輯商品";
  itemForm.reset();
  itemForm.brand.value = item.brand || "";
  itemForm.name.value = item.name || "";
  if (itemPurchaseDateInput) itemPurchaseDateInput.value = item.purchaseDate || "";
  itemForm.category.value = item.category || "";
  itemForm.originalPrice.value = item.originalPrice ?? "";
  itemForm.specialPrice.value = item.specialPrice ?? "";
  itemForm.discountPrice.value = item.discountPrice ?? "";
  const sizeInput = itemForm.querySelector('input[name="size"]');
  const weightInput = itemForm.querySelector('input[name="weight"]');
  const bodyTypeInput = itemForm.querySelector('input[name="bodyType"]');
  const suggestedWeightInput = itemForm.querySelector('input[name="suggestedWeight"]');
  if (sizeInput) sizeInput.value = item.size || "";
  if (weightInput) weightInput.value = item.weight || "";
  if (bodyTypeInput) bodyTypeInput.value = item.bodyType || "";
  if (suggestedWeightInput) suggestedWeightInput.value = item.suggestedWeight || "";
  itemForm.grade.value = item.grade || "";
  itemForm.origin.value = item.origin || "";
  itemForm.miniNote.value = item.miniNote || "";
  itemForm.pros.value = item.pros || "";
  itemForm.cons.value = item.cons || "";
  itemForm.remark.value = item.remark || "";
  for (const cb of itemForm.querySelectorAll('input[name="seasons"]')) {
    cb.checked = (item.seasons || []).includes(cb.value);
  }
  renderExistingItemPhotos(item.itemPhotos || []);
  itemDetailDialog.close();
  itemDialog.showModal();
}

function openDeleteItemConfirm() {
  if (!currentItemDetailId) return;
  const item = state.items.find((x) => x.id === currentItemDetailId);
  if (!item) return;
  const label = `${item.brand || "未填品牌"} ${item.name || ""}`.trim();
  confirmDeleteItemText.textContent = `確定要刪除「${label}」嗎？`;
  confirmDeleteItemDialog.showModal();
}

function deleteCurrentItem() {
  if (!currentItemDetailId) return;
  const itemId = currentItemDetailId;
  const idx = state.items.findIndex((x) => x.id === itemId);
  if (idx < 0) return;
  state.items.splice(idx, 1);
  delete state.manualVoteCounts[itemId];
  for (const log of state.dailyLogs) {
    log.wornItemIds = (log.wornItemIds || []).filter((id) => id !== itemId);
  }
  currentItemDetailId = null;
  recomputeWearCounts();
  normalizeCategoryOrder();
  persistAll();
  confirmDeleteItemDialog.close();
  itemDetailDialog.close();
  renderAll();
}

function renderItemUsedOutfits(itemId) {
  const usedLogs = [...state.dailyLogs]
    .filter((log) => (log.wornItemIds || []).includes(itemId))
    .filter((log) => (log.outfitPhotos || []).length > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!usedLogs.length) {
    itemUsedOutfits.innerHTML = "<div><strong>使用此單品的穿搭</strong></div><p class=\"meta\">目前沒有相關穿搭。</p>";
    return;
  }

  itemUsedOutfits.innerHTML = `
    <div><strong>使用此單品的穿搭</strong></div>
    <div class="related-outfit-grid">
      ${usedLogs
        .map(
          (log) => `
          <button type="button" class="related-outfit-card" data-open-outfit-detail="${log.id}">
            <img class="cover-grid" src="${log.outfitPhotos?.[0] || ""}" alt="${escapeHtml(log.date || "穿搭")}" />
            <div class="meta">${escapeHtml(log.date || "-")}</div>
          </button>`
        )
        .join("")}
    </div>
  `;

  for (const btn of itemUsedOutfits.querySelectorAll("[data-open-outfit-detail]")) {
    btn.addEventListener("click", () => {
      itemDetailDialog.close();
      openOutfitDetail(btn.dataset.openOutfitDetail);
    });
  }
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

function renderCategoryEditRows() {
  categoryEditRows.innerHTML = state.categoryOrder
    .map((name, index) => {
      const color = state.categoryColors[name] || defaultCategoryColor(index);
      return `
      <div class="category-edit-row" draggable="true" data-category-name="${escapeAttr(name)}">
        <div class="category-edit-name">
          <strong>${escapeHtml(name)}</strong>
        </div>
        <div class="category-edit-controls">
          <input class="dot-picker" type="color" name="color_${escapeAttr(name)}" value="${escapeAttr(color)}" />
          <span class="drag-bars" aria-hidden="true"><span></span><span></span><span></span></span>
          <button class="delete-btn" type="button" data-delete-category="${escapeAttr(name)}">刪除</button>
        </div>
      </div>`;
    })
    .join("");

  for (const row of categoryEditRows.querySelectorAll(".category-edit-row")) {
    row.addEventListener("dragstart", () => row.classList.add("dragging"));
    row.addEventListener("dragend", () => row.classList.remove("dragging"));
    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      const dragging = categoryEditRows.querySelector(".category-edit-row.dragging");
      if (!dragging || dragging === row) return;
      const rect = row.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      if (before) {
        categoryEditRows.insertBefore(dragging, row);
      } else {
        categoryEditRows.insertBefore(dragging, row.nextSibling);
      }
    });
  }
  for (const btn of categoryEditRows.querySelectorAll("[data-delete-category]")) {
    btn.addEventListener("click", () => {
      const name = btn.dataset.deleteCategory;
      state.categoryOrder = state.categoryOrder.filter((x) => x !== name);
      if (state.selectedCategory === name) state.selectedCategory = state.categoryOrder[0] || "未分類";
      renderCategoryEditRows();
    });
  }
}

function onSaveCategoryEdit(e) {
  e.preventDefault();
  const fd = new FormData(categoryEditForm);
  const rows = Array.from(categoryEditRows.querySelectorAll(".category-edit-row"));
  state.categoryOrder = rows.map((row) => row.dataset.categoryName || "").filter(Boolean);

  for (let i = 0; i < state.categoryOrder.length; i += 1) {
    const name = state.categoryOrder[i];
    const color = String(fd.get(`color_${name}`) || defaultCategoryColor(i));
    state.categoryColors[name] = color;
  }
  for (const key of Object.keys(state.categoryColors)) {
    if (!state.categoryOrder.includes(key)) delete state.categoryColors[key];
  }

  persistAll();
  categoryEditDialog.close();
  renderAll();
}

function onAddCategory() {
  const name = newCategoryName.value.trim();
  if (!name) return;
  if (!state.categoryOrder.includes(name)) {
    state.categoryOrder.push(name);
  }
  state.categoryColors[name] = newCategoryColor.value || defaultCategoryColor(state.categoryOrder.length - 1);
  newCategoryName.value = "";
  renderCategoryEditRows();
}

function defaultCategoryColor(index) {
  const palette = ["#d64949", "#f08c00", "#2b8a3e", "#1971c2", "#5f3dc4", "#0b7285", "#c2255c", "#495057"];
  return palette[index % palette.length];
}

function categoryChipStyle(name) {
  return 'style="border-color:#e3e3e3;color:#27231d;background:#f6f6f6;"';
}

function renderCategoryTab() {
  const pool = state.categoryOrder;
  if (!pool.length) {
    categoryChips.innerHTML = '<p class="meta">目前沒有分類。</p>';
    categoryResult.innerHTML = "";
    return;
  }

  const countMap = new Map();
  for (const item of state.items.filter(matchesClosetQuery)) {
    const key = item.category || "未分類";
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  categoryChips.innerHTML = pool
    .map((c) => {
      const active = c === state.selectedCategory;
      const color = state.categoryColors[c] || defaultCategoryColor(0);
      const style = active ? `style="border-color:#bfbfbf;color:#27231d;background:#f6f6f6;"` : categoryChipStyle(c);
      const count = countMap.get(c) || 0;
      return `<button class="chip category-chip ${active ? "active" : ""}" data-category-chip="${escapeAttr(c)}" ${style}><span class="category-chip-inner"><span class="category-dot" style="background:${color};"></span><span>${escapeHtml(c)}</span><span class="category-count">${count}</span></span></button>`;
    })
    .join("");

  categoryResult.innerHTML = "";

  for (const btn of categoryChips.querySelectorAll("[data-category-chip]")) {
    btn.addEventListener("click", () => {
      state.selectedCategory = btn.dataset.categoryChip;
      renderCategoryTab();
      openCategoryItemsPage(state.selectedCategory);
    });
  }
}

function openCategoryItemsPage(category) {
  currentCategoryItemsName = category;
  categoryItemsView = "latest";
  renderCategoryItemsPage();
  categoryItemsPage.classList.add("active");
}

function renderCategoryItemsPage() {
  if (!currentCategoryItemsName) return;
  const category = currentCategoryItemsName;
  const items = sortedByPurchase(state.items).filter((x) => x.category === category && matchesClosetQuery(x));
  const color = state.categoryColors[category] || defaultCategoryColor(0);
  categoryItemsTitle.textContent = category;
  categoryItemsTitle.style.background = color;
  categoryItemsTitle.style.color = "#fff";
  categoryItemsTitle.style.fontWeight = "300";
  categoryItemsLatestTab.classList.toggle("active", categoryItemsView === "latest");
  categoryItemsPhotosTab.classList.toggle("active", categoryItemsView === "photos");

  if (!items.length) {
    categoryItemsList.innerHTML = state.closetQuery ? emptyResultBlock("closet") : '<p class="meta">此分類目前沒有商品。</p>';
    bindClearSearchButtons(categoryItemsList);
    return;
  }

  if (categoryItemsView === "photos") {
    categoryItemsList.innerHTML = `
      <div class="photo-grid">
        ${items
          .map(
            (item) =>
              `<button type="button" class="photo-open-btn" data-open-item-detail="${item.id}"><img class="cover-grid" src="${item.itemPhotos[0] || ""}" alt="${escapeHtml(item.name)}" /></button>`
          )
          .join("")}
      </div>
    `;
  } else {
    categoryItemsList.innerHTML = `
      <div class="latest-list">
        ${items
          .map(
            (item) => `
              <article class="latest-row">
                <button type="button" class="latest-open-btn" data-open-item-detail="${item.id}">
                  <div class="latest-title"><strong>${escapeHtml(item.brand || "未填品牌")}</strong>&nbsp;${escapeHtml(item.name)}</div>
                  <p class="latest-category meta">${escapeHtml(item.category || "未分類")}</p>
                  <img class="latest-thumb" src="${item.itemPhotos[0] || ""}" alt="${escapeHtml(item.name)}" />
                </button>
              </article>`
          )
          .join("")}
      </div>
    `;
  }

  for (const btn of categoryItemsList.querySelectorAll("[data-open-item-detail]")) {
    btn.addEventListener("click", () => openItemDetail(btn.dataset.openItemDetail));
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

  let result = state.items.filter(matchesClosetQuery);
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
          <button type="button" class="item-open-btn" data-open-item-detail="${item.id}">
            <article class="item-row">
              <img class="cover-sm" src="${item.itemPhotos[0] || ""}" alt="${escapeHtml(item.name)}" />
              <div>
                <div><strong>${escapeHtml(item.brand || "未填品牌")}</strong>&nbsp;${escapeHtml(item.name)}</div>
                <p class="meta">使用次數：${item.wearCountTotal || 0}</p>
              </div>
            </article>
          </button>`
      )
      .join("")
    : state.closetQuery ? emptyResultBlock("closet") : '<p class="meta">此標籤條件沒有商品。</p>';

  for (const btn of tagResult.querySelectorAll("[data-open-item-detail]")) {
    btn.addEventListener("click", () => openItemDetail(btn.dataset.openItemDetail));
  }
  bindClearSearchButtons(tagResult);
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

function renderOutfitSearchCategoryOptions() {
  const previous = outfitSearchCategory.value;
  outfitSearchCategory.innerHTML =
    '<option value="">全部分類</option>' +
    state.categoryOrder.map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
  if (previous && state.categoryOrder.includes(previous)) {
    outfitSearchCategory.value = previous;
  }
}

function renderOutfitItemChecklist() {
  const brandQ = outfitSearchBrand.value.trim().toLowerCase();
  const nameQ = outfitSearchName.value.trim().toLowerCase();
  const tagQ = outfitSearchTag.value.trim().toLowerCase();
  const categoryQ = outfitSearchCategory.value;

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

  outfitItemChecklist.innerHTML = rows.length
    ? rows
      .map(
        (item) => `
          <label class="item-row">
            <img class="cover-sm" src="${item.itemPhotos[0] || ""}" alt="${escapeHtml(item.name)}" />
            <div>
              <input type="checkbox" name="outfitItemIds" value="${item.id}" ${outfitSelection.has(item.id) ? "checked" : ""} />
              <span><strong>${escapeHtml(item.brand || "未填品牌")}</strong>&nbsp;${escapeHtml(item.name)}</span>
              <p class="meta">${escapeHtml(item.category || "未分類")}</p>
            </div>
          </label>`
      )
      .join("")
    : '<p class="meta">沒有符合條件的商品。</p>';

  for (const cb of outfitItemChecklist.querySelectorAll('input[name="outfitItemIds"]')) {
    cb.addEventListener("change", () => {
      const id = cb.value;
      if (cb.checked) {
        outfitSelection.add(id);
      } else {
        outfitSelection.delete(id);
      }
    });
  }
}

function renderOutfitGrid() {
  const logs = [...state.dailyLogs]
    .filter((log) => (log.outfitPhotos || []).length > 0)
    .filter(matchesOutfitQuery)
    .sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      return state.outfitSort === "asc" ? ta - tb : tb - ta;
    });

  if (!logs.length) {
    outfitGrid.innerHTML = state.outfitQuery ? emptyResultBlock("outfit") : '<p class="meta">目前沒有穿搭紀錄。</p>';
    bindClearSearchButtons(outfitGrid);
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
  currentOutfitDetailId = logId;

  const names = (log.wornItemIds || [])
    .map((id) => state.items.find((x) => x.id === id))
    .filter(Boolean);

  detailDate.textContent = log.date;
  detailMeta.textContent = `天氣：${log.weather || "未填"}`;
  detailTemp.textContent = `氣溫：${log.temperature || "未填"} | 縣市：${log.county || "未填"} | 地點：${log.place || "未填"}`;
  detailNote.textContent = `穿搭想法：${log.note || "-"}`;
  detailItems.innerHTML = names.length
    ? `<div><strong>搭配單品</strong></div>
      <div class="outfit-items-strip">
        ${names
          .map(
            (item) => `
            <button type="button" class="item-open-btn outfit-item-card" data-open-item-detail="${item.id}">
              <img class="cover-grid" src="${item.itemPhotos?.[0] || ""}" alt="${escapeHtml(item.name)}" />
              <div class="meta">${escapeHtml(item.brand || "未填品牌")}&nbsp;${escapeHtml(item.name)}</div>
              <div class="meta">使用次數：${item.wearCountTotal || 0}</div>
            </button>`
          )
          .join("")}
      </div>`
    : "搭配單品：未勾選";

  for (const btn of detailItems.querySelectorAll("[data-open-item-detail]")) {
    btn.addEventListener("click", () => openItemDetail(btn.dataset.openItemDetail));
  }

  detailOutfitPhotos = (log.outfitPhotos || []).slice(0, 20);
  detailOutfitIndex = 0;
  renderOutfitDetailPhoto();

  outfitDetailDialog.showModal();
}

function openOutfitEditForm() {
  if (!currentOutfitDetailId) return;
  const log = state.dailyLogs.find((x) => x.id === currentOutfitDetailId);
  if (!log) return;

  editingOutfitId = log.id;
  outfitSelection = new Set(log.wornItemIds || []);
  outfitFormTitle.textContent = "編輯穿搭";
  outfitForm.date.value = log.date || "";
  outfitForm.weather.value = log.weather || "";
  outfitForm.county.value = log.county || "";
  outfitForm.place.value = log.place || "";
  outfitForm.temperature.value = log.temperature || "";
  outfitForm.note.value = log.note || "";
  outfitSearchBrand.value = "";
  outfitSearchName.value = "";
  outfitSearchTag.value = "";
  outfitSearchCategory.value = "";
  renderOutfitSearchCategoryOptions();
  renderOutfitItemChecklist();
  outfitDetailDialog.close();
  outfitFormDialog.showModal();
}

function openDeleteOutfitConfirm() {
  if (!currentOutfitDetailId) return;
  const log = state.dailyLogs.find((x) => x.id === currentOutfitDetailId);
  if (!log) return;
  confirmDeleteOutfitText.textContent = `確定要刪除 ${log.date || "這筆"} 穿搭嗎？`;
  confirmDeleteOutfitDialog.showModal();
}

function deleteCurrentOutfit() {
  if (!currentOutfitDetailId) return;
  const idx = state.dailyLogs.findIndex((x) => x.id === currentOutfitDetailId);
  if (idx < 0) return;
  state.dailyLogs.splice(idx, 1);
  currentOutfitDetailId = null;
  recomputeWearCounts();
  persistAll();
  confirmDeleteOutfitDialog.close();
  outfitDetailDialog.close();
  renderAll();
}

function stepOutfitDetailPhoto(step) {
  if (!detailOutfitPhotos.length) return;
  const total = detailOutfitPhotos.length;
  detailOutfitIndex = (detailOutfitIndex + step + total) % total;
  renderOutfitDetailPhoto();
}

function renderOutfitDetailPhoto() {
  if (!detailOutfitPhotos.length) {
    outfitDetailMainPhoto.removeAttribute("src");
    outfitDetailCounter.textContent = "沒有照片";
    return;
  }
  outfitDetailMainPhoto.src = detailOutfitPhotos[detailOutfitIndex];
  outfitDetailCounter.textContent = `${detailOutfitIndex + 1} / ${detailOutfitPhotos.length}`;
}

function exportDataAsJson() {
  const payload = {
    app: "SPARK WEAR",
    version: 1,
    exportedAt: new Date().toISOString(),
    format: {
      itemFields: [
        "id",
        "brand",
        "name",
        "purchaseDate",
        "category",
        "originalPrice",
        "specialPrice",
        "discountPrice",
        "size",
        "weight",
        "bodyType",
        "suggestedWeight",
        "grade",
        "origin",
        "seasons",
        "miniNote",
        "pros",
        "cons",
        "remark",
        "itemPhotos",
        "wearCountTotal",
        "createdAt",
      ],
    },
    data: {
      items: state.items,
      dailyLogs: state.dailyLogs,
      manualVoteCounts: state.manualVoteCounts,
      categoryOrder: state.categoryOrder,
      categoryColors: state.categoryColors,
      purchaseSort: state.purchaseSort,
      outfitSort: state.outfitSort,
      tagUsageSort: state.tagUsageSort,
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  a.href = url;
  a.download = `spark-wear-backup-${y}-${m}-${day}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function onImportFilePicked() {
  const file = importFileInput.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const raw = JSON.parse(text);
    pendingImportData = normalizeImportedData(raw?.data && typeof raw.data === "object" ? raw.data : raw);
    importModeDialog.showModal();
  } catch {
    alert("匯入失敗：檔案格式不是有效的 JSON");
  } finally {
    importFileInput.value = "";
  }
}

function normalizeImportedData(source) {
  const data = source && typeof source === "object" ? source : {};
  return {
    items: Array.isArray(data.items) ? data.items : [],
    dailyLogs: Array.isArray(data.dailyLogs) ? data.dailyLogs : [],
    manualVoteCounts: data.manualVoteCounts && typeof data.manualVoteCounts === "object" ? data.manualVoteCounts : {},
    categoryOrder: Array.isArray(data.categoryOrder) ? data.categoryOrder : [],
    categoryColors: data.categoryColors && typeof data.categoryColors === "object" ? data.categoryColors : {},
    purchaseSort: data.purchaseSort === "asc" ? "asc" : "desc",
    outfitSort: data.outfitSort === "asc" ? "asc" : "desc",
    tagUsageSort: ["none", "asc", "desc"].includes(data.tagUsageSort) ? data.tagUsageSort : "none",
  };
}

function mergeById(existing, incoming) {
  const map = new Map();
  for (const row of existing || []) {
    const key = row?.id || crypto.randomUUID();
    map.set(key, { ...row, id: key });
  }
  for (const row of incoming || []) {
    const key = row?.id || crypto.randomUUID();
    map.set(key, { ...row, id: key });
  }
  return Array.from(map.values());
}

function applyImportedData(mode) {
  if (!pendingImportData) return;
  const incoming = pendingImportData;

  if (mode === "replace") {
    state.items = incoming.items;
    state.dailyLogs = incoming.dailyLogs;
    state.manualVoteCounts = incoming.manualVoteCounts;
    state.categoryOrder = incoming.categoryOrder;
    state.categoryColors = incoming.categoryColors;
    state.purchaseSort = incoming.purchaseSort;
    state.outfitSort = incoming.outfitSort;
    state.tagUsageSort = incoming.tagUsageSort;
  } else {
    state.items = mergeById(state.items, incoming.items);
    state.dailyLogs = mergeById(state.dailyLogs, incoming.dailyLogs);
    state.manualVoteCounts = mergeVoteCounts(state.manualVoteCounts, incoming.manualVoteCounts);
    state.categoryOrder = [...new Set([...(state.categoryOrder || []), ...(incoming.categoryOrder || [])])];
    state.categoryColors = { ...(state.categoryColors || {}), ...(incoming.categoryColors || {}) };
    state.purchaseSort = incoming.purchaseSort || state.purchaseSort;
    state.outfitSort = incoming.outfitSort || state.outfitSort;
    state.tagUsageSort = incoming.tagUsageSort || state.tagUsageSort;
  }

  pendingImportData = null;
  normalizeCategoryOrder();
  recomputeWearCounts();
  persistAll();
  importModeDialog.close();
  renderAll();
  alert("匯入完成");
}

function mergeVoteCounts(a, b) {
  const merged = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) {
    merged[k] = Number(merged[k] || 0) + Number(v || 0);
  }
  return merged;
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

function averageUsePriceText(item) {
  const prices = [item.originalPrice, item.specialPrice, item.discountPrice]
    .map((x) => (x == null ? NaN : Number(x)))
    .filter((x) => Number.isFinite(x) && x > 0);
  if (!prices.length) return "未填價格";
  const minPrice = Math.min(...prices);
  const count = Number(item.wearCountTotal || 0);
  if (count <= 0) return "尚無使用次數";
  return (minPrice / count).toFixed(2);
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
        const outW = 720;
        const outH = 960;
        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result || ""));
          return;
        }
        ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outW, outH);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.onerror = () => reject(new Error("image-decode-failed"));
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
