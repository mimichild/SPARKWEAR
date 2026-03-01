const DEFAULT_CATEGORY_ORDER = ["上衣", "裙裝", "褲裝", "洋裝", "外套", "套裝", "日常", "鞋類", "包包", "猶豫", "留校", "冷凍", "未分類"];
const SEASON_TAG_OPTIONS = ["春季", "夏季", "秋季", "冬季"];
const DEFAULT_ORIGIN_OPTIONS = ["日貨", "韓貨", "品牌", "蝦皮", "其他"];
const CUSTOM_ORIGINS_KEY = "closet_custom_origins";
const DELETED_ORIGINS_KEY = "closet_deleted_origins";
const PHOTO_DB_NAME = "closet_photo_db";
const PHOTO_DB_VERSION = 1;
const PHOTO_DB_STORE = "photos";
const LAST_CLEANUP_KEY = "closet_last_cleanup_at";
const APP_VERSION_LABEL = "v1.0.20+21";
const MISSING_PHOTO_SRC = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960"><rect width="100%" height="100%" fill="#e5e0d8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#7b7368" font-size="42">MISSING</text></svg>');
const LOADING_PHOTO_SRC = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960"><rect width="100%" height="100%" fill="#f5f1e9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9f9689" font-size="30">LOADING</text></svg>');

const state = {
  items: load("closet_items", []),
  dailyLogs: load("closet_daily_logs", []),
  manualVoteCounts: load("closet_manual_vote_counts", {}),
  categoryOrder: load("closet_category_order", []),
  categoryColors: load("closet_category_colors", {}),
  purchaseSort: load("closet_purchase_sort", "desc"),
  outfitSort: load("closet_outfit_sort", "desc"),
  tagUsageSort: load("closet_tag_usage_sort", "none"),
  customOrigins: load(CUSTOM_ORIGINS_KEY, []),
  deletedOrigins: load(DELETED_ORIGINS_KEY, []),
  selectedCategory: "",
  selectedTags: [],
  closetQuery: "",
  outfitQuery: "",
  categoryItemsQuery: "",
};

const homePage = document.getElementById("homePage");
const closetPage = document.getElementById("closetPage");
const outfitPage = document.getElementById("outfitPage");
const exportDataBtn = document.getElementById("exportDataBtn");
const importDataBtn = document.getElementById("importDataBtn");
const openSettingsBtn = document.getElementById("openSettingsBtn");
const importFileInput = document.getElementById("importFileInput");
const storageStatsText = null;
const appVersionText = document.getElementById("appVersionText");
const uploadProgressOverlay = document.getElementById("uploadProgressOverlay");
const uploadProgressTitle = document.getElementById("uploadProgressTitle");
const uploadProgressFill = document.getElementById("uploadProgressFill");
const uploadProgressMeta = document.getElementById("uploadProgressMeta");
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
const bulkMoveClosetBtn = document.getElementById("bulkMoveClosetBtn");
const bulkDeleteClosetBtn = document.getElementById("bulkDeleteClosetBtn");
const closetSearchBar = document.getElementById("closetSearchBar");
const closetSearchInput = document.getElementById("closetSearchInput");
const clearClosetSearch = document.getElementById("clearClosetSearch");
const toggleOutfitSearch = document.getElementById("toggleOutfitSearch");
const bulkDeleteOutfitBtn = document.getElementById("bulkDeleteOutfitBtn");
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
const itemPurchaseTimeInput = itemForm.querySelector('input[name="purchaseTime"]');
const itemPhotosInput = itemForm.querySelector('input[name="itemPhotos"]');
const openItemForm = document.getElementById("openItemForm");
const closeItemBtn = document.querySelector("[data-close-item]");
const itemCategorySelect = document.getElementById("itemCategorySelect");
const itemOriginSelect = document.getElementById("itemOriginSelect");
const openOriginDialogBtn = document.getElementById("openOriginDialogBtn");
const originDialog = document.getElementById("originDialog");
const originForm = document.getElementById("originForm");
const newOriginInput = document.getElementById("newOriginInput");
const cancelOriginDialog = document.getElementById("cancelOriginDialog");
const originModeAddBtn = document.getElementById("originModeAddBtn");
const originModeDeleteBtn = document.getElementById("originModeDeleteBtn");
const originDeletePanel = document.getElementById("originDeletePanel");
const originDeleteList = document.getElementById("originDeleteList");
const cancelOriginDelete = document.getElementById("cancelOriginDelete");
const confirmOriginDelete = document.getElementById("confirmOriginDelete");
const originDeleteEmpty = document.getElementById("originDeleteEmpty");
const originDeleteCloseOnly = document.getElementById("originDeleteCloseOnly");
const closeOriginDeleteOnly = document.getElementById("closeOriginDeleteOnly");
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
const outfitTimeInput = outfitForm.querySelector('input[name="time"]');
const outfitPhotosInput = outfitForm.querySelector('input[name="outfitPhotos"]');
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
const detailLocation = document.getElementById("detailLocation");
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
const toggleCategoryItemsSearch = document.getElementById("toggleCategoryItemsSearch");
const bulkMoveCategoryItemsBtn = document.getElementById("bulkMoveCategoryItemsBtn");
const bulkDeleteCategoryItemsBtn = document.getElementById("bulkDeleteCategoryItemsBtn");
const categoryItemsSearchBar = document.getElementById("categoryItemsSearchBar");
const categoryItemsSearchInput = document.getElementById("categoryItemsSearchInput");
const clearCategoryItemsSearch = document.getElementById("clearCategoryItemsSearch");

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
const photoCropDialog = document.getElementById("photoCropDialog");
const photoCropMeta = document.getElementById("photoCropMeta");
const photoCropViewport = document.getElementById("photoCropViewport");
const photoCropImage = document.getElementById("photoCropImage");
const cancelPhotoCrop = document.getElementById("cancelPhotoCrop");
const confirmPhotoCrop = document.getElementById("confirmPhotoCrop");
const bulkCategoryDialog = document.getElementById("bulkCategoryDialog");
const bulkCategoryForm = document.getElementById("bulkCategoryForm");
const bulkCategoryText = document.getElementById("bulkCategoryText");
const bulkCategorySelect = document.getElementById("bulkCategorySelect");
const cancelBulkCategory = document.getElementById("cancelBulkCategory");
const bulkDeleteDialog = document.getElementById("bulkDeleteDialog");
const bulkDeleteText = document.getElementById("bulkDeleteText");
const cancelBulkDelete = document.getElementById("cancelBulkDelete");
const confirmBulkDelete = document.getElementById("confirmBulkDelete");
const settingsDialog = document.getElementById("settingsDialog");
const settingsForm = document.getElementById("settingsForm");
const themeColorInput = document.getElementById("themeColorInput");
const themePaletteGrid = document.getElementById("themePaletteGrid");
const cancelSettings = document.getElementById("cancelSettings");
const bulkDeleteOutfitDialog = document.getElementById("bulkDeleteOutfitDialog");
const bulkDeleteOutfitText = document.getElementById("bulkDeleteOutfitText");
const cancelBulkDeleteOutfit = document.getElementById("cancelBulkDeleteOutfit");
const confirmBulkDeleteOutfit = document.getElementById("confirmBulkDeleteOutfit");

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
const photoSrcCache = new Map();
const photoSrcLoading = new Set();
let scheduledPhotoRerender = false;
let uploadProgressVisible = false;
const detailPhotoZoomStates = new WeakMap();
let cropSession = null;
let stagedItemUploadFiles = null;
let stagedOutfitUploadFiles = null;
let originDialogMode = "add";
let selectedDeleteOriginKey = "";
let cropDialogProgrammaticClose = false;
let selectionContext = "";
let selectedItemIds = new Set();
const LONG_PRESS_MS = 1000;
let suppressSelectionClickUntil = 0;
const ACTIVE_THEME_COLOR_KEY = "spark_theme_color";
const ACTIVE_VIEW_STATE_KEY = "spark_active_view_state";
let restoringViewState = false;
let pendingThemeColor = "#f1aba7";
const PULL_REFRESH_MIN_DISTANCE = 64;
let pullRefreshStartY = 0;
let pullRefreshTracking = false;
let pullRefreshTriggered = false;
let pullRefreshing = false;

if (itemPurchaseDateInput) itemPurchaseDateInput.valueAsDate = new Date();
if (itemPurchaseTimeInput) itemPurchaseTimeInput.value = formatTimeNow();
outfitForm.date.valueAsDate = new Date();
if (outfitTimeInput) outfitTimeInput.value = formatTimeNow();
if (!["asc", "desc"].includes(state.purchaseSort)) state.purchaseSort = "desc";
purchaseSortSelect.value = state.purchaseSort;
if (!["asc", "desc"].includes(state.outfitSort)) state.outfitSort = "desc";
outfitSortSelect.value = state.outfitSort;
if (!["none", "desc", "asc"].includes(state.tagUsageSort)) state.tagUsageSort = "none";
tagUsageSortSelect.value = state.tagUsageSort;

const platform = typeof window !== "undefined" ? window.Capacitor?.getPlatform?.() || "web" : "web";
document.body.classList.add(`platform-${platform}`);

applyThemeColor(loadThemeColor());
pendingThemeColor = loadThemeColor();
renderThemePalette();

// 初始化狀態列
const initStatusBar = async () => {
  const { StatusBar } = window.Capacitor?.Plugins || {};
  if (StatusBar) {
    try {
      // 強制 Webview 延伸到狀態列下方（以便我們用 CSS 位移內容）
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setBackgroundColor({ color: loadThemeColor() });
      // 設定圖示顏色為白色 (Style.LIGHT)
      await StatusBar.setStyle({ style: "LIGHT" });
    } catch (e) {
      console.warn("StatusBar plugin not available or failed", e);
    }
  }
};
initStatusBar();


if (appVersionText) appVersionText.textContent = `版本 ${APP_VERSION_LABEL}`;


state.items = state.items.map((item) => ({
  ...item,
  purchaseTime: normalizeTimeText(item?.purchaseTime, item?.createdAt),
  itemPhotos: normalizePhotoList(item?.itemPhotos),
}));
state.dailyLogs = state.dailyLogs.map((log) => ({
  ...log,
  time: normalizeTimeText(log?.time, log?.createdAt),
  outfitPhotos: normalizePhotoList(log?.outfitPhotos),
}));
state.customOrigins = normalizeOriginList(state.customOrigins);
state.deletedOrigins = normalizeDeletedOriginList(state.deletedOrigins);

normalizeCategoryOrder();
recomputeWearCounts();

for (const btn of openPageBtns) btn.addEventListener("click", () => openPage(btn.dataset.openPage));
for (const btn of backBtns) btn.addEventListener("click", showHome);
for (const btn of subTabs) btn.addEventListener("click", () => {
  clearSelectionMode();
  switchSub(btn.dataset.subTab);
});

openItemForm.addEventListener("click", () => openNewItemForm());
closeItemBtn.addEventListener("click", () => {
  editingItemId = null;
  stagedItemUploadFiles = null;
  if (itemPhotosInput) itemPhotosInput.value = "";
  itemDialog.close();
});
openOriginDialogBtn?.addEventListener("click", () => openOriginDialogForm());
cancelOriginDialog?.addEventListener("click", () => originDialog?.close());
originForm?.addEventListener("submit", (e) => onSaveOrigin(e));
originModeAddBtn?.addEventListener("click", () => setOriginDialogMode("add"));
originModeDeleteBtn?.addEventListener("click", () => setOriginDialogMode("delete"));
cancelOriginDelete?.addEventListener("click", () => originDialog?.close());
confirmOriginDelete?.addEventListener("click", () => onDeleteOrigin());
closeOriginDeleteOnly?.addEventListener("click", () => originDialog?.close());
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
  stagedOutfitUploadFiles = null;
  if (outfitPhotosInput) outfitPhotosInput.value = "";
  outfitForm.date.valueAsDate = new Date();
  if (outfitTimeInput) outfitTimeInput.value = formatTimeNow();
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

closeOutfitBtn.addEventListener("click", () => {
  stagedOutfitUploadFiles = null;
  if (outfitPhotosInput) outfitPhotosInput.value = "";
  outfitFormDialog.close();
});
closeVoteDialogBtn.addEventListener("click", () => voteDialog.close());
closeDetail.addEventListener("click", () => outfitDetailDialog.close());
editOutfitDetail.addEventListener("click", () => openOutfitEditForm());
deleteOutfitDetail.addEventListener("click", () => openDeleteOutfitConfirm());
editItemDetail.addEventListener("click", () => openItemEditForm());
deleteItemDetail.addEventListener("click", () => openDeleteItemConfirm());
closeItemDetail.addEventListener("click", () => itemDetailDialog.close());
closeCategoryItemsPage.addEventListener("click", () => {
  clearSelectionMode();
  categoryItemsPage.classList.remove("active");
  document.body.classList.remove("category-items-open");
  categoryItemsSearchBar.classList.add("hidden");
  state.categoryItemsQuery = "";
  categoryItemsSearchInput.value = "";
  saveActiveViewState();
});
itemDetailPrev.addEventListener("click", () => stepDetailPhoto(-1));
itemDetailNext.addEventListener("click", () => stepDetailPhoto(1));
outfitDetailPrev.addEventListener("click", () => stepOutfitDetailPhoto(-1));
outfitDetailNext.addEventListener("click", () => stepOutfitDetailPhoto(1));
categoryItemsLatestTab.addEventListener("click", () => {
  clearSelectionMode();
  categoryItemsView = "latest";
  renderCategoryItemsPage();
  saveActiveViewState();
});
categoryItemsPhotosTab.addEventListener("click", () => {
  clearSelectionMode();
  categoryItemsView = "photos";
  renderCategoryItemsPage();
  saveActiveViewState();
});
toggleCategoryItemsSearch.addEventListener("click", () => {
  categoryItemsSearchBar.classList.toggle("hidden");
  if (!categoryItemsSearchBar.classList.contains("hidden")) categoryItemsSearchInput.focus();
});
bulkMoveClosetBtn.addEventListener("click", () => openBulkCategoryDialog("closet"));
bulkDeleteClosetBtn.addEventListener("click", () => openBulkDeleteDialog("closet"));
bulkMoveCategoryItemsBtn.addEventListener("click", () => openBulkCategoryDialog("categoryItems"));
bulkDeleteCategoryItemsBtn.addEventListener("click", () => openBulkDeleteDialog("categoryItems"));
bulkDeleteOutfitBtn.addEventListener("click", () => openBulkDeleteOutfitDialog());
categoryItemsSearchInput.addEventListener("input", () => {
  state.categoryItemsQuery = categoryItemsSearchInput.value.trim().toLowerCase();
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

setupDetailPhotoZoom(itemDetailMainPhoto, itemDetailDialog);
setupDetailPhotoZoom(outfitDetailMainPhoto, outfitDetailDialog);

let touchStartX = 0;
itemDetailMainPhoto.addEventListener("touchstart", (e) => {
  if ((detailPhotoZoomStates.get(itemDetailMainPhoto)?.scale || 1) > 1 || (e.touches?.length || 0) > 1) {
    touchStartX = 0;
    return;
  }
  touchStartX = e.touches[0]?.clientX || 0;
});
itemDetailMainPhoto.addEventListener("touchend", (e) => {
  if (!touchStartX) return;
  const endX = e.changedTouches[0]?.clientX || 0;
  const dx = endX - touchStartX;
  touchStartX = 0;
  if (Math.abs(dx) < 30) return;
  stepDetailPhoto(dx < 0 ? 1 : -1);
});

let outfitTouchStartX = 0;
outfitDetailMainPhoto.addEventListener("touchstart", (e) => {
  if ((detailPhotoZoomStates.get(outfitDetailMainPhoto)?.scale || 1) > 1 || (e.touches?.length || 0) > 1) {
    outfitTouchStartX = 0;
    return;
  }
  outfitTouchStartX = e.touches[0]?.clientX || 0;
});
outfitDetailMainPhoto.addEventListener("touchend", (e) => {
  if (!outfitTouchStartX) return;
  const endX = e.changedTouches[0]?.clientX || 0;
  const dx = endX - outfitTouchStartX;
  outfitTouchStartX = 0;
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
  if (dx > 0) {
    navigateSwipeBack();
  } else {
    navigateSwipeForward();
  }
});

document.addEventListener("touchstart", (e) => {
  if (hasBlockingDialogOpenForPullRefresh()) {
    pullRefreshTracking = false;
    return;
  }
  if ((e.touches?.length || 0) !== 1) {
    pullRefreshTracking = false;
    return;
  }
  const target = e.target;
  if (isSwipeNavBlockedTarget(target)) {
    pullRefreshTracking = false;
    return;
  }
  pullRefreshStartY = e.touches[0]?.clientY || 0;
  pullRefreshTriggered = false;
  pullRefreshTracking = isAtTopForPullRefresh();
}, { passive: true });

document.addEventListener("touchmove", (e) => {
  if (!pullRefreshTracking || pullRefreshTriggered) return;
  const currentY = e.touches[0]?.clientY || 0;
  const dy = currentY - pullRefreshStartY;
  if (dy >= PULL_REFRESH_MIN_DISTANCE) {
    pullRefreshTriggered = true;
  }
}, { passive: true });

document.addEventListener("touchend", () => {
  if (!pullRefreshTracking) return;
  const shouldRefresh = pullRefreshTriggered;
  pullRefreshTracking = false;
  pullRefreshTriggered = false;
  if (shouldRefresh) {
    refreshCurrentView();
  }
}, { passive: true });

document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("gesturechange", (e) => e.preventDefault());
document.addEventListener("gestureend", (e) => e.preventDefault());
document.addEventListener("wheel", (e) => {
  if (e.ctrlKey || e.metaKey) e.preventDefault();
}, { passive: false });

itemForm.addEventListener("submit", onSaveItem);
outfitForm.addEventListener("submit", onSaveOutfit);
itemPhotosInput?.addEventListener("change", () => onPhotoInputChanged("item"));
outfitPhotosInput?.addEventListener("change", () => onPhotoInputChanged("outfit"));
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
clearCategoryItemsSearch.addEventListener("click", () => clearSearch("categoryItems"));
exportDataBtn.addEventListener("click", exportDataAsJson);
importDataBtn.addEventListener("click", () => importFileInput.click());
openSettingsBtn.addEventListener("click", () => openSettingsDialog());
settingsDialog.addEventListener("click", (e) => {
  const btn = e.target instanceof Element ? e.target.closest("[data-theme-color]") : null;
  if (!btn) return;
  const color = normalizeThemeHex(btn.dataset.themeColor || "#f1aba7");
  pendingThemeColor = color;
  if (themeColorInput) themeColorInput.value = color;
  updateThemeColorActive(color);
});
importFileInput.addEventListener("change", onImportFilePicked);
importMergeBtn.addEventListener("click", () => applyImportedData("merge"));
importReplaceBtn.addEventListener("click", () => applyImportedData("replace"));
cancelImportBtn.addEventListener("click", () => {
  pendingImportData = null;
  importModeDialog.close();
});
cancelPhotoCrop.addEventListener("click", () => cancelCropSession());
confirmPhotoCrop.addEventListener("click", () => confirmCropFrame());
cancelBulkCategory.addEventListener("click", () => bulkCategoryDialog.close());
bulkCategoryForm.addEventListener("submit", (e) => onConfirmBulkCategory(e));
cancelBulkDelete.addEventListener("click", () => bulkDeleteDialog.close());
confirmBulkDelete.addEventListener("click", () => onConfirmBulkDelete());
cancelBulkDeleteOutfit.addEventListener("click", () => bulkDeleteOutfitDialog.close());
confirmBulkDeleteOutfit.addEventListener("click", () => onConfirmBulkDeleteOutfit());
cancelSettings.addEventListener("click", () => settingsDialog.close());
settingsForm.addEventListener("submit", (e) => onSaveSettings(e));
themeColorInput?.addEventListener("input", () => {
  pendingThemeColor = normalizeThemeHex(themeColorInput.value);
  updateThemeColorActive(themeColorInput.value);
});
photoCropDialog.addEventListener("cancel", (e) => {
  e.preventDefault();
  cancelCropSession();
});
photoCropDialog.addEventListener("close", () => {
  if (cropDialogProgrammaticClose) {
    cropDialogProgrammaticClose = false;
    return;
  }
  if (cropSession) cancelCropSession();
});
itemDialog.addEventListener("close", () => {
  editingItemId = null;
  stagedItemUploadFiles = null;
  if (itemPhotosInput) itemPhotosInput.value = "";
  existingItemPhotosSection.classList.add("hidden");
  existingItemPhotosList.innerHTML = "";
});
originDialog?.addEventListener("close", () => {
  if (newOriginInput) newOriginInput.value = "";
  selectedDeleteOriginKey = "";
  originDialogMode = "add";
});
outfitFormDialog.addEventListener("close", () => {
  stagedOutfitUploadFiles = null;
  if (outfitPhotosInput) outfitPhotosInput.value = "";
});
cancelDeleteItem.addEventListener("click", () => confirmDeleteItemDialog.close());
cancelDeleteOutfit.addEventListener("click", () => confirmDeleteOutfitDialog.close());
confirmDeleteItem.addEventListener("click", () => deleteCurrentItem());
confirmDeleteOutfit.addEventListener("click", () => deleteCurrentOutfit());
window.addEventListener("pagehide", () => saveActiveViewState());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveActiveViewState();
});

initApp();

async function initApp() {
  try {
    await warmupInitialPhotos();
  } catch (err) {
    console.warn("warmupInitialPhotos failed:", err);
  }
  renderAll();
  restoreActiveViewState();
}

function showHome() {
  clearSelectionMode();
  document.body.classList.remove("category-items-open");
  homePage.classList.add("active");
  closetPage.classList.remove("active");
  outfitPage.classList.remove("active");
  saveActiveViewState();
}

function openPage(type) {
  clearSelectionMode();
  if (type !== "closet") document.body.classList.remove("category-items-open");
  homePage.classList.remove("active");
  closetPage.classList.toggle("active", type === "closet");
  outfitPage.classList.toggle("active", type === "outfit");
  saveActiveViewState();
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
  saveActiveViewState();
}

function loadActiveViewState() {
  try {
    const raw = localStorage.getItem(ACTIVE_VIEW_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveActiveViewState() {
  if (restoringViewState) return;
  const payload = {
    main: currentMainPage(),
    closetSub: activeClosetSubTab(),
    categoryItemsOpen: categoryItemsPage.classList.contains("active"),
    categoryName: currentCategoryItemsName || "",
    categoryItemsView,
  };
  try {
    localStorage.setItem(ACTIVE_VIEW_STATE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
}

function restoreActiveViewState() {
  const snapshot = loadActiveViewState();
  if (!snapshot) {
    saveActiveViewState();
    return;
  }
  restoringViewState = true;
  try {
    const main = String(snapshot.main || "home");
    if (main === "closet") openPage("closet");
    else if (main === "outfit") openPage("outfit");
    else showHome();

    const sub = String(snapshot.closetSub || "latest");
    if (["latest", "photos", "category", "tags"].includes(sub)) switchSub(sub);

    if (snapshot.categoryItemsOpen && snapshot.categoryName && main === "closet") {
      openCategoryItemsPage(String(snapshot.categoryName), String(snapshot.categoryItemsView || "latest"));
    }
  } finally {
    restoringViewState = false;
    saveActiveViewState();
  }
}

function openNewItemForm() {
  editingItemId = null;
  itemFormTitle.textContent = "記錄新品";
  itemForm.reset();
  renderItemOriginOptions("");
  stagedItemUploadFiles = null;
  if (itemPhotosInput) itemPhotosInput.value = "";
  if (itemPurchaseDateInput) itemPurchaseDateInput.valueAsDate = new Date();
  if (itemPurchaseTimeInput) itemPurchaseTimeInput.value = formatTimeNow();
  existingItemPhotosSection.classList.add("hidden");
  existingItemPhotosList.innerHTML = "";
  itemDialog.showModal();
}

function openOriginDialogForm() {
  if (!itemDialog?.open) return;
  if (newOriginInput) newOriginInput.value = "";
  selectedDeleteOriginKey = "";
  setOriginDialogMode("add");
  originDialog?.showModal();
}

function setOriginDialogMode(mode) {
  originDialogMode = mode === "delete" ? "delete" : "add";
  const isAdd = originDialogMode === "add";
  originForm?.classList.toggle("hidden", !isAdd);
  originDeletePanel?.classList.toggle("hidden", isAdd);
  originModeAddBtn?.classList.toggle("is-active", isAdd);
  originModeDeleteBtn?.classList.toggle("is-active", !isAdd);
  if (isAdd) {
    originDeleteEmpty?.classList.add("hidden");
    originDeleteCloseOnly?.classList.add("hidden");
    newOriginInput?.focus();
    return;
  }
  renderOriginDeleteOptions();
}

function onSaveOrigin(e) {
  e.preventDefault();
  const name = normalizeOriginName(newOriginInput?.value || "");
  if (!name) {
    alert("請輸入來源名稱");
    return;
  }
  if (SEASON_TAG_OPTIONS.includes(name)) {
    alert("來源名稱不能與季節標籤重複");
    return;
  }
  const key = normalizeLookupKey(name);
  const exists = buildOriginOptions().some((origin) => normalizeLookupKey(origin) === key);
  if (exists) {
    renderItemOriginOptions(name);
    selectedDeleteOriginKey = "";
    renderOriginDeleteOptions();
    originDialog?.close();
    return;
  }
  state.deletedOrigins = normalizeDeletedOriginList((state.deletedOrigins || []).filter((origin) => normalizeLookupKey(origin) !== key));
  state.customOrigins = normalizeOriginList([...(state.customOrigins || []), name]);
  if (!persistAll()) return;
  renderItemOriginOptions(name);
  renderAll();
  selectedDeleteOriginKey = "";
  renderOriginDeleteOptions();
  originDialog?.close();
}

function renderOriginDeleteOptions() {
  const options = buildOriginOptions();
  if (!originDeleteList) return;
  if (!options.length) {
    originDeleteList.innerHTML = "";
    originDeleteEmpty?.classList.remove("hidden");
    originDeleteCloseOnly?.classList.remove("hidden");
    originDeletePanel?.classList.add("hidden");
    return;
  }
  originDeleteEmpty?.classList.add("hidden");
  originDeleteCloseOnly?.classList.add("hidden");
  originDeletePanel?.classList.remove("hidden");
  if (!options.some((origin) => normalizeLookupKey(origin) === selectedDeleteOriginKey)) {
    selectedDeleteOriginKey = normalizeLookupKey(options[0] || "");
  }
  originDeleteList.innerHTML = options
    .map((origin) => {
      const key = normalizeLookupKey(origin);
      const selected = key === selectedDeleteOriginKey;
      return `<button type="button" class="chip ${selected ? "is-selected" : ""}" data-origin-delete-key="${escapeAttr(key)}">${escapeHtml(origin)}</button>`;
    })
    .join("");
  for (const btn of originDeleteList.querySelectorAll("[data-origin-delete-key]")) {
    btn.addEventListener("click", () => {
      selectedDeleteOriginKey = String(btn.dataset.originDeleteKey || "");
      renderOriginDeleteOptions();
    });
  }
}

function onDeleteOrigin() {
  const key = normalizeLookupKey(selectedDeleteOriginKey);
  if (!key) {
    alert("請先選擇要刪除的來源");
    return;
  }
  const options = buildOriginOptions();
  const target = options.find((origin) => normalizeLookupKey(origin) === key);
  if (!target) {
    alert("找不到要刪除的來源");
    return;
  }

  state.customOrigins = normalizeOriginList((state.customOrigins || []).filter((origin) => normalizeLookupKey(origin) !== key));
  state.deletedOrigins = normalizeDeletedOriginList([...(state.deletedOrigins || []), target]);
  for (const item of state.items) {
    if (normalizeLookupKey(item?.origin) === key) item.origin = "";
  }

  if (!persistAll()) return;
  if (normalizeLookupKey(itemOriginSelect?.value || "") === key) {
    renderItemOriginOptions("");
  } else {
    renderItemOriginOptions(itemOriginSelect?.value || "");
  }
  selectedDeleteOriginKey = "";
  renderOriginDeleteOptions();
  renderAll();
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
          <img class="existing-photo-thumb" src="${photoSrc(photo)}" alt="商品照片${idx + 1}" />
          <span><input type="checkbox" name="deleteExistingPhotos" value="${idx}" /> 刪除</span>
        </label>`
      )
      .join("")
    : '<p class="meta">目前沒有已存照片，請新增照片。</p>';
}

function isSwipeNavBlockedTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("input,textarea,select,button,label,[contenteditable='true'],.carousel,.detail-photo,.photo-crop-viewport,.photo-crop-image"));
}

function closeTopOverlay() {
  const dialogs = [
    confirmDeleteItemDialog,
    confirmDeleteOutfitDialog,
    bulkDeleteOutfitDialog,
    outfitDetailDialog,
    itemDetailDialog,
    voteDialog,
    outfitFormDialog,
    outfitMenuDialog,
    itemDialog,
    originDialog,
    categoryEditDialog,
    photoCropDialog,
    bulkCategoryDialog,
    bulkDeleteDialog,
    settingsDialog,
  ];
  for (const dialog of dialogs) {
    if (dialog?.open) {
      dialog.close();
      return true;
    }
  }
  if (categoryItemsPage.classList.contains("active")) {
    clearSelectionMode();
    categoryItemsPage.classList.remove("active");
    document.body.classList.remove("category-items-open");
    categoryItemsSearchBar.classList.add("hidden");
    state.categoryItemsQuery = "";
    categoryItemsSearchInput.value = "";
    saveActiveViewState();
    return true;
  }
  return false;
}

function hasOpenOverlay() {
  if (categoryItemsPage.classList.contains("active")) return true;
  return [
    confirmDeleteItemDialog,
    confirmDeleteOutfitDialog,
    bulkDeleteOutfitDialog,
    outfitDetailDialog,
    itemDetailDialog,
    voteDialog,
    outfitFormDialog,
    outfitMenuDialog,
    itemDialog,
    categoryEditDialog,
    photoCropDialog,
    bulkCategoryDialog,
    bulkDeleteDialog,
    settingsDialog,
  ]
    .some((dialog) => Boolean(dialog?.open));
}

function hasBlockingDialogOpenForPullRefresh() {
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
    photoCropDialog,
    bulkCategoryDialog,
    bulkDeleteDialog,
    bulkDeleteOutfitDialog,
    settingsDialog,
  ].some((dialog) => Boolean(dialog?.open));
}

function currentMainPage() {
  if (closetPage.classList.contains("active")) return "closet";
  if (outfitPage.classList.contains("active")) return "outfit";
  return "home";
}

function isAtTopForPullRefresh() {
  if ((window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0) > 0) return false;
  if (categoryItemsPage.classList.contains("active")) {
    return categoryItemsPage.scrollTop <= 0;
  }
  const main = currentMainPage();
  if (main === "closet") return closetPage.scrollTop <= 0;
  if (main === "outfit") return outfitPage.scrollTop <= 0;
  return homePage.scrollTop <= 0;
}

async function refreshCurrentView() {
  if (pullRefreshing) return;
  pullRefreshing = true;
  startUploadProgress("更新中...");
  try {
    await warmupInitialPhotos();
  } catch (err) {
    console.warn("refreshCurrentView warmupInitialPhotos failed:", err);
  } finally {
    renderAll();
    finishUploadProgress();
    pullRefreshing = false;
  }
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
  requestExitApp();
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

async function requestExitApp() {
  const shouldExit = window.confirm("是否要關閉 APP？");
  if (!shouldExit) return;
  const appPlugin = window.Capacitor?.Plugins?.App;
  if (typeof appPlugin?.exitApp === "function") {
    try {
      await appPlugin.exitApp();
      return;
    } catch (err) {
      console.warn("App.exitApp failed:", err);
    }
  }
  if (window.navigator?.app?.exitApp) {
    window.navigator.app.exitApp();
    return;
  }
  alert("目前環境不支援直接關閉 APP。");
}

function setupDetailPhotoZoom(photoEl, hostDialog) {
  if (!photoEl || !hostDialog) return;
  const state = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    pointers: new Map(),
    pointerAnchorX: 0,
    pointerAnchorY: 0,
    pinchStartDistance: 0,
    pinchStartScale: 1,
  };
  detailPhotoZoomStates.set(photoEl, state);

  const applyTransform = () => {
    const boundedScale = Math.max(1, Math.min(4, state.scale || 1));
    state.scale = boundedScale;
    const host = photoEl.closest(".carousel") || photoEl.parentElement;
    const hostW = Number(host?.clientWidth || photoEl.clientWidth || 1);
    const hostH = Number(host?.clientHeight || photoEl.clientHeight || 1);
    const displayW = Number(photoEl.clientWidth || hostW);
    const displayH = Number(photoEl.clientHeight || hostH);
    const maxX = Math.max(0, (displayW * boundedScale - hostW) / 2);
    const maxY = Math.max(0, (displayH * boundedScale - hostH) / 2);
    state.offsetX = Math.max(-maxX, Math.min(maxX, state.offsetX));
    state.offsetY = Math.max(-maxY, Math.min(maxY, state.offsetY));
    photoEl.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${boundedScale})`;
    photoEl.classList.toggle("is-zoomed", boundedScale > 1.01);
  };

  const reset = () => {
    state.scale = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    state.pointers.clear();
    applyTransform();
  };
  photoEl.dataset.resetZoom = "1";
  photoEl.__resetZoom = reset;

  photoEl.addEventListener("dblclick", () => {
    state.scale = state.scale > 1.01 ? 1 : 2;
    if (state.scale <= 1.01) {
      state.offsetX = 0;
      state.offsetY = 0;
    }
    applyTransform();
  });

  photoEl.addEventListener("pointerdown", (e) => {
    if (!hostDialog.open) return;
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    photoEl.setPointerCapture(e.pointerId);
    if (state.pointers.size === 1) {
      state.pointerAnchorX = e.clientX;
      state.pointerAnchorY = e.clientY;
    } else if (state.pointers.size === 2) {
      const points = Array.from(state.pointers.values());
      state.pinchStartDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) || 1;
      state.pinchStartScale = state.scale || 1;
    }
  });

  photoEl.addEventListener("pointermove", (e) => {
    if (!state.pointers.has(e.pointerId)) return;
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (state.pointers.size === 2) {
      const points = Array.from(state.pointers.values());
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) || 1;
      state.scale = Math.max(1, Math.min(4, state.pinchStartScale * (dist / Math.max(state.pinchStartDistance, 1))));
      applyTransform();
      return;
    }
    if (state.scale <= 1.01 || state.pointers.size !== 1) return;
    const dx = e.clientX - state.pointerAnchorX;
    const dy = e.clientY - state.pointerAnchorY;
    state.pointerAnchorX = e.clientX;
    state.pointerAnchorY = e.clientY;
    state.offsetX += dx;
    state.offsetY += dy;
    applyTransform();
  });

  const onPointerEnd = (e) => {
    state.pointers.delete(e.pointerId);
    if (!state.pointers.size && state.scale <= 1.01) {
      state.offsetX = 0;
      state.offsetY = 0;
      applyTransform();
    }
  };
  photoEl.addEventListener("pointerup", onPointerEnd);
  photoEl.addEventListener("pointercancel", onPointerEnd);
  hostDialog.addEventListener("close", reset);
  photoEl.addEventListener("load", reset);
}

function resetDetailPhotoZoom(photoEl) {
  if (!photoEl) return;
  if (typeof photoEl.__resetZoom === "function") photoEl.__resetZoom();
}

async function onPhotoInputChanged(type) {
  const isItem = type === "item";
  const input = isItem ? itemPhotosInput : outfitPhotosInput;
  if (!input) return;
  const files = Array.from(input.files || []).filter((file) => file && String(file.type || "").startsWith("image/"));
  if (!files.length) {
    if (isItem) stagedItemUploadFiles = null;
    else stagedOutfitUploadFiles = null;
    return;
  }
  const profile = isItem ? "grid" : "detail";
  try {
    const cropped = await cropFilesForUpload(files, profile);
    if (isItem) stagedItemUploadFiles = cropped;
    else stagedOutfitUploadFiles = cropped;
  } catch (err) {
    const text = String(err?.message || err || "").toLowerCase();
    if (text.includes("crop-cancelled")) {
      if (isItem) stagedItemUploadFiles = null;
      else stagedOutfitUploadFiles = null;
      input.value = "";
      alert("已取消本次照片裁切。");
      return;
    }
    console.warn("onPhotoInputChanged crop failed, fallback to original files:", err);
    if (isItem) stagedItemUploadFiles = files;
    else stagedOutfitUploadFiles = files;
  }
}

async function cropFilesForUpload(files, profileName) {
  const list = Array.from(files || []).filter((file) => file && String(file.type || "").startsWith("image/"));
  if (!list.length) return [];
  const profile = getCompressionProfile(profileName);
  if (!profile.width || !profile.height) return list;
  const ratio = 3 / 4;
  const output = [];
  for (let i = 0; i < list.length; i += 1) {
    try {
      const blob = await cropSingleFile(list[i], i + 1, list.length, ratio, profile.width, profile.height);
      output.push(blob);
    } catch (err) {
      const text = String(err?.message || err || "").toLowerCase();
      if (text.includes("crop-cancelled")) throw err;
      console.warn("cropSingleFile fallback to original file:", err);
      output.push(list[i]);
    }
  }
  return output;
}

function cropSingleFile(file, index, total, ratio, outW, outH) {
  return new Promise((resolve, reject) => {
    if (!photoCropDialog || !photoCropImage || !photoCropViewport) {
      resolve(file);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    cropSession = {
      resolve,
      reject,
      objectUrl,
      index,
      total,
      ratio,
      outW,
      outH,
      scale: 1,
      minScale: 1,
      maxScale: 4,
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      dragStartX: 0,
      dragStartY: 0,
      pointers: new Map(),
      pinchStartDistance: 0,
      pinchStartScale: 1,
      imgW: 1,
      imgH: 1,
      viewportW: 1,
      viewportH: 1,
    };

    photoCropImage.onload = () => {
      if (!cropSession || cropSession.objectUrl !== objectUrl) return;
      const session = cropSession;
      if (!photoCropDialog.open) photoCropDialog.showModal();
      requestAnimationFrame(() => {
        if (!cropSession || cropSession.objectUrl !== objectUrl) return;
        session.imgW = Math.max(1, photoCropImage.naturalWidth || 1);
        session.imgH = Math.max(1, photoCropImage.naturalHeight || 1);
        session.viewportW = Math.max(1, photoCropViewport.clientWidth || photoCropViewport.getBoundingClientRect().width || 1);
        session.viewportH = Math.max(1, Math.round(session.viewportW / Math.max(session.ratio, 0.01)));
        const containScale = Math.min(session.viewportW / session.imgW, session.viewportH / session.imgH);
        const coverScale = Math.max(session.viewportW / session.imgW, session.viewportH / session.imgH);
        session.minScale = Math.max(0.05, containScale);
        session.maxScale = Math.max(coverScale * 6, coverScale + 0.2);
        session.scale = coverScale;
        session.offsetX = 0;
        session.offsetY = 0;
        if (photoCropMeta) photoCropMeta.textContent = `第 ${index} / ${total} 張`;
        confirmPhotoCrop.textContent = "確定";
        applyCropTransform();
      });
    };
    photoCropImage.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      cropSession = null;
      reject(new Error("image-decode-failed"));
    };
    photoCropImage.src = objectUrl;
  });
}

function applyCropTransform() {
  if (!cropSession || !photoCropImage) return;
  clampCropOffsets();
  photoCropImage.style.width = `${cropSession.imgW}px`;
  photoCropImage.style.height = `${cropSession.imgH}px`;
  photoCropImage.style.transform = `translate(calc(-50% + ${cropSession.offsetX}px), calc(-50% + ${cropSession.offsetY}px)) scale(${cropSession.scale})`;
}

function clampCropOffsets() {
  if (!cropSession) return;
  const scaledW = cropSession.imgW * cropSession.scale;
  const scaledH = cropSession.imgH * cropSession.scale;
  const maxX = Math.max(0, (scaledW - cropSession.viewportW) / 2);
  const maxY = Math.max(0, (scaledH - cropSession.viewportH) / 2);
  cropSession.offsetX = Math.max(-maxX, Math.min(maxX, cropSession.offsetX));
  cropSession.offsetY = Math.max(-maxY, Math.min(maxY, cropSession.offsetY));
}

function cancelCropSession() {
  if (!cropSession) return;
  const current = cropSession;
  cropSession = null;
  if (photoCropDialog?.open) {
    cropDialogProgrammaticClose = true;
    photoCropDialog.close();
  }
  if (current.objectUrl) URL.revokeObjectURL(current.objectUrl);
  current.reject(new Error("crop-cancelled"));
}

async function confirmCropFrame() {
  if (!cropSession) return;
  const current = cropSession;
  try {
    const blob = await renderCropBlob(current);
    cropSession = null;
    if (photoCropDialog?.open) {
      cropDialogProgrammaticClose = true;
      photoCropDialog.close();
    }
    if (current.objectUrl) URL.revokeObjectURL(current.objectUrl);
    current.resolve(blob);
  } catch (err) {
    current.reject(err);
  }
}

async function renderCropBlob(session) {
  const source = photoCropImage;
  if (!source) throw new Error("crop-image-missing");
  const scaledW = session.imgW * session.scale;
  const scaledH = session.imgH * session.scale;
  const left = (session.viewportW / 2) - (scaledW / 2) + session.offsetX;
  const top = (session.viewportH / 2) - (scaledH / 2) + session.offsetY;
  const sx = Math.max(0, (0 - left) / session.scale);
  const sy = Math.max(0, (0 - top) / session.scale);
  const sw = Math.min(session.imgW, session.viewportW / session.scale);
  const sh = Math.min(session.imgH, session.viewportH / session.scale);
  const canvas = document.createElement("canvas");
  canvas.width = session.outW;
  canvas.height = session.outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-context-unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, session.outW, session.outH);
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, session.outW, session.outH);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("image-crop-failed"));
        return;
      }
      resolve(blob);
    }, "image/jpeg", 0.92);
  });
}

photoCropViewport?.addEventListener("pointerdown", (e) => {
  if (!cropSession) return;
  cropSession.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  cropSession.dragging = cropSession.pointers.size === 1;
  cropSession.dragStartX = e.clientX;
  cropSession.dragStartY = e.clientY;
  if (cropSession.pointers.size === 2) {
    const points = Array.from(cropSession.pointers.values());
    cropSession.pinchStartDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) || 1;
    cropSession.pinchStartScale = cropSession.scale;
  }
  photoCropViewport.setPointerCapture(e.pointerId);
});

photoCropViewport?.addEventListener("pointermove", (e) => {
  if (!cropSession || !cropSession.pointers.has(e.pointerId)) return;
  cropSession.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (cropSession.pointers.size >= 2) {
    const points = Array.from(cropSession.pointers.values());
    const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) || 1;
    const nextScale = cropSession.pinchStartScale * (distance / Math.max(cropSession.pinchStartDistance, 1));
    cropSession.scale = Math.max(cropSession.minScale, Math.min(cropSession.maxScale, nextScale));
    applyCropTransform();
    return;
  }
  if (!cropSession.dragging) return;
  const dx = e.clientX - cropSession.dragStartX;
  const dy = e.clientY - cropSession.dragStartY;
  cropSession.dragStartX = e.clientX;
  cropSession.dragStartY = e.clientY;
  cropSession.offsetX += dx;
  cropSession.offsetY += dy;
  applyCropTransform();
});

const stopCropDrag = (e) => {
  if (!cropSession) return;
  cropSession.pointers.delete(e.pointerId);
  if (cropSession.pointers.size === 1) {
    const onlyPoint = Array.from(cropSession.pointers.values())[0];
    cropSession.dragging = true;
    cropSession.dragStartX = onlyPoint.x;
    cropSession.dragStartY = onlyPoint.y;
    return;
  }
  cropSession.dragging = false;
};
photoCropViewport?.addEventListener("pointerup", stopCropDrag);
photoCropViewport?.addEventListener("pointercancel", stopCropDrag);

async function onSaveItem(e) {
  e.preventDefault();
  const fd = new FormData(itemForm);
  let newPhotos = [];
  const hasFileSelection = Boolean(itemPhotosInput?.files?.length);
  try {
    if (hasFileSelection) {
      startUploadProgress("照片壓縮中...");
      const uploadFiles = stagedItemUploadFiles?.length ? stagedItemUploadFiles : Array.from(itemPhotosInput?.files || []);
      newPhotos = await filesToPhotoRefs(uploadFiles, "grid", (done, total) => {
        setUploadProgress(20 + Math.round((done / Math.max(total, 1)) * 60), `已處理 ${done}/${total} 張`);
      });
    }
  } catch (err) {
    alert(humanizePhotoError(err, "照片處理失敗，請重新選擇照片後再試。"));
    return;
  } finally {
    if (hasFileSelection) finishUploadProgress();
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
  const detachedPhotos = editing ? diffRemovedPhotoRefs(editing.itemPhotos || [], finalPhotos) : [];

  const item = {
    id: editing?.id || crypto.randomUUID(),
    brand: String(fd.get("brand") || "").trim(),
    name: String(fd.get("name") || "").trim(),
    purchaseDate: String(fd.get("purchaseDate") || ""),
    purchaseTime: normalizeTimeText(fd.get("purchaseTime"), editing?.createdAt || new Date().toISOString()),
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
  cleanupDetachedPhotoRefs(detachedPhotos);
  cleanupOrphanPhotos();
  normalizeCategoryOrder();
  recomputeWearCounts();
  if (!persistAll()) return;

  itemForm.reset();
  stagedItemUploadFiles = null;
  if (itemPhotosInput) itemPhotosInput.value = "";
  if (itemPurchaseDateInput) itemPurchaseDateInput.valueAsDate = new Date();
  if (itemPurchaseTimeInput) itemPurchaseTimeInput.value = formatTimeNow();
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
  const hasFileSelection = Boolean(outfitForm.outfitPhotos.files?.length);
  try {
    startUploadProgress(hasFileSelection ? "照片壓縮中..." : "挑選照片中...");
    if (hasFileSelection) {
      const uploadFiles = stagedOutfitUploadFiles?.length ? stagedOutfitUploadFiles : Array.from(outfitForm.outfitPhotos.files || []);
      photos = await filesToPhotoRefs(uploadFiles, "detail", (done, total) => {
        setUploadProgress(20 + Math.round((done / Math.max(total, 1)) * 60), `已處理 ${done}/${total} 張`);
      });
    } else if (!editingOutfitId) {
      photos = await pickAndSavePhotosViaBridge(20, "detail", (done, total) => {
        setUploadProgress(20 + Math.round((done / Math.max(total, 1)) * 60), `已儲存 ${done}/${total} 張`);
      });
    }
  } catch (err) {
    alert(humanizePhotoError(err, "照片處理失敗，請重新選擇照片後再試。"));
    return;
  } finally {
    finishUploadProgress();
  }
  if (!photos.length && !editingOutfitId) {
    alert("請至少上傳 1 張穿搭照片");
    return;
  }

  const editing = editingOutfitId ? state.dailyLogs.find((x) => x.id === editingOutfitId) : null;
  const finalPhotos = photos.length ? photos.slice(0, 20) : editing?.outfitPhotos || [];
  const detachedPhotos = editing ? diffRemovedPhotoRefs(editing.outfitPhotos || [], finalPhotos) : [];
  const log = {
    id: editing?.id || crypto.randomUUID(),
    date: String(fd.get("date") || ""),
    time: normalizeTimeText(fd.get("time"), editing?.createdAt || new Date().toISOString()),
    weather: String(fd.get("weather") || "").trim(),
    county: String(fd.get("county") || "").trim(),
    place: String(fd.get("place") || "").trim(),
    temperature: String(fd.get("temperature") || "").trim(),
    note: String(fd.get("note") || "").trim(),
    wornItemIds: Array.from(outfitSelection),
    outfitPhotos: finalPhotos,
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
  cleanupDetachedPhotoRefs(detachedPhotos);
  cleanupOrphanPhotos();
  recomputeWearCounts();
  if (!persistAll()) return;

  outfitForm.reset();
  stagedOutfitUploadFiles = null;
  if (outfitPhotosInput) outfitPhotosInput.value = "";
  outfitForm.date.valueAsDate = new Date();
  if (outfitTimeInput) outfitTimeInput.value = formatTimeNow();
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
  renderItemOriginOptions(itemOriginSelect?.value || "");
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
  updateBulkActionButtons();
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
    state.customOrigins = normalizeOriginList(state.customOrigins);
    state.deletedOrigins = normalizeDeletedOriginList(state.deletedOrigins);
    save("closet_items", state.items);
    save("closet_daily_logs", state.dailyLogs);
    save("closet_category_order", state.categoryOrder);
    save("closet_category_colors", state.categoryColors);
    save("closet_manual_vote_counts", state.manualVoteCounts);
    save(CUSTOM_ORIGINS_KEY, state.customOrigins);
    save(DELETED_ORIGINS_KEY, state.deletedOrigins);
    return true;
  } catch (err) {
    console.error("persistAll failed:", err);
    alert(humanizePhotoError(err, "儲存失敗，可能是手機儲存空間不足或照片太大。請減少照片數量後再試。"));
    return false;
  }
}

function sortedByPurchase(items) {
  return [...items].sort((a, b) => {
    const ta = closetSortTimestamp(a);
    const tb = closetSortTimestamp(b);
    return state.purchaseSort === "asc" ? ta - tb : tb - ta;
  });
}

function safeTimestamp(value) {
  const t = new Date(String(value || "")).getTime();
  return Number.isFinite(t) ? t : 0;
}

function formatTimeNow() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function normalizeTimeText(value, fallbackCreatedAt = "") {
  const text = String(value || "").trim();
  if (/^\d{2}:\d{2}$/.test(text)) return text;
  const d = new Date(String(fallbackCreatedAt || ""));
  if (Number.isFinite(d.getTime())) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  return "";
}

function combineDateAndTime(dateText, timeText, fallbackCreatedAt = "") {
  const date = String(dateText || "").trim();
  const time = normalizeTimeText(timeText, fallbackCreatedAt);
  if (date) {
    const candidate = safeTimestamp(`${date}T${time || "00:00"}:00`);
    if (candidate) return candidate;
  }
  return safeTimestamp(fallbackCreatedAt);
}

function timeOfDayFromCreatedAt(createdAt) {
  const d = new Date(String(createdAt || ""));
  if (!Number.isFinite(d.getTime())) return 0;
  return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) * 1000 + d.getMilliseconds();
}

function closetSortTimestamp(item) {
  return combineDateAndTime(item?.purchaseDate, item?.purchaseTime, item?.createdAt);
}

function outfitSortTimestamp(log) {
  return combineDateAndTime(log?.date, log?.time, log?.createdAt);
}

function matchesClosetQuery(item) {
  const q = state.closetQuery;
  if (!q) return true;
  const text = [
    item.brand || "",
    item.name || "",
    item.purchaseDate || "",
    item.purchaseTime || "",
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
  const text = [log.date || "", log.time || "", log.weather || "", log.temperature || "", log.note || "", log.county || "", log.place || "", itemNames]
    .join(" ")
    .toLowerCase();
  return text.includes(q);
}

function matchesCategoryItemsQuery(item) {
  const q = state.categoryItemsQuery;
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
    item.miniNote || "",
    item.pros || "",
    item.cons || "",
    item.remark || "",
  ]
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
  if (type === "categoryItems") {
    state.categoryItemsQuery = "";
    categoryItemsSearchInput.value = "";
    renderCategoryItemsPage();
    return;
  }
  state.outfitQuery = "";
  outfitSearchInput.value = "";
  renderOutfitGrid();
}

function normalizeThemeHex(value) {
  const text = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(text)) return text.toLowerCase();
  return "#f1aba7";
}

function loadThemeColor() {
  try {
    return normalizeThemeHex(localStorage.getItem(ACTIVE_THEME_COLOR_KEY));
  } catch {
    return "#f1aba7";
  }
}

function applyThemeColor(hex) {
  const color = normalizeThemeHex(hex);
  document.documentElement.style.setProperty("--theme", color);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color);
}

function renderThemePalette() {
  if (!themePaletteGrid) return;
  const palette = [
    "#f4b2c2", "#ec9bb0", "#e4829a", "#da6a86", "#c45072", "#a33b5a",
    "#f27a82", "#e9646d", "#cd3f4a", "#912b34",
    "#f5e9aa", "#efdf95", "#e7d47f", "#ddc66a", "#d1b856", "#bea247",
    "#bcd7f1", "#a6c8ea", "#79a8d8", "#4f82bb",
    "#d7c4e8", "#c7afe0", "#a488ca", "#7c62a9",
    "#c5dfc8", "#add3b2", "#7fb988", "#4e925d",
    "#d8c0ad", "#bfa48e", "#a68872", "#8d6f5a",
    "#ffffff", "#f2f0ec", "#e3e0da", "#d2cfc8", "#b8b3ab", "#989289", "#6f6961", "#1f1f1f",
  ];
  themePaletteGrid.innerHTML = palette
    .map(
      (hex) =>
        `<button type="button" class="theme-palette-swatch" data-theme-color="${hex}" title="${hex.toUpperCase()}" style="--preset:${hex};" aria-label="選擇顏色 ${hex.toUpperCase()}"></button>`
    )
    .join("");
}

function openSettingsDialog() {
  const color = loadThemeColor();
  pendingThemeColor = color;
  if (themeColorInput) themeColorInput.value = color;
  updateThemeColorActive(color);
  settingsDialog.showModal();
}

async function onSaveSettings(e) {
  e.preventDefault();
  const color = normalizeThemeHex(pendingThemeColor || themeColorInput?.value || "#f1aba7");
  try {
    localStorage.setItem(ACTIVE_THEME_COLOR_KEY, color);
  } catch {
    // ignore storage failures
  }
  applyThemeColor(color);
  await initStatusBar();
  updateThemeColorActive(color);
  settingsDialog.close();
}

function updateThemeColorActive(hex) {
  const active = normalizeThemeHex(hex);
  for (const btn of document.querySelectorAll("[data-theme-color]")) {
    btn.classList.toggle("is-active", normalizeThemeHex(btn.dataset.themeColor || "") === active);
  }
}

function clearSelectionMode() {
  selectionContext = "";
  selectedItemIds.clear();
  updateBulkActionButtons();
}

function activeSelectionContext() {
  if (categoryItemsPage.classList.contains("active")) return "categoryItems";
  if (outfitPage.classList.contains("active")) return "outfit";
  return "closet";
}

function updateBulkActionButtons() {
  const hasSelection = selectedItemIds.size > 0;
  const context = activeSelectionContext();
  bulkMoveClosetBtn.classList.toggle("hidden", !(hasSelection && context === "closet"));
  bulkDeleteClosetBtn.classList.toggle("hidden", !(hasSelection && context === "closet"));
  bulkMoveCategoryItemsBtn.classList.toggle("hidden", !(hasSelection && context === "categoryItems"));
  bulkDeleteCategoryItemsBtn.classList.toggle("hidden", !(hasSelection && context === "categoryItems"));
  bulkDeleteOutfitBtn.classList.toggle("hidden", !(hasSelection && context === "outfit"));
}

function toggleItemSelection(itemId, context) {
  if (!itemId) return;
  if (!selectionContext || selectionContext !== context) {
    selectionContext = context;
    selectedItemIds = new Set();
  }
  if (selectedItemIds.has(itemId)) selectedItemIds.delete(itemId);
  else selectedItemIds.add(itemId);
  if (!selectedItemIds.size) selectionContext = "";
  updateBulkActionButtons();
  renderAll();
}

function onItemTap(itemId, context, openDetailFn) {
  if (selectedItemIds.size > 0 && selectionContext === context) {
    return;
  }
  openDetailFn();
}

function bindSelectionCheckboxes(root, context) {
  if (!root) return;
  for (const box of root.querySelectorAll("[data-select-item]")) {
    const itemId = String(box.getAttribute("data-select-item") || "");
    const toggle = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!itemId) return;
      toggleItemSelection(itemId, context);
    };
    box.addEventListener("click", toggle);
    box.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    box.addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false });
  }
}

function bindLongPressSelectable(button, itemId, context, openDetailFn) {
  if (!button) return;
  let timer = null;
  let longPressed = false;
  let touchMoved = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let suppressNextClick = false;
  const MOVE_TOLERANCE = 12;
  const start = () => {
    longPressed = false;
    timer = setTimeout(() => {
      if (longPressed) return;
      longPressed = true;
      suppressNextClick = true;
      suppressSelectionClickUntil = Date.now() + 700;
      toggleItemSelection(itemId, context);
    }, LONG_PRESS_MS);
  };
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const cancel = () => {
    clear();
    longPressed = false;
  };
  button.classList.add("selectable-item");
  if (selectedItemIds.has(itemId) && selectionContext === context) button.classList.add("is-selected");
  button.addEventListener("pointerdown", start);
  button.addEventListener("pointerup", clear);
  button.addEventListener("pointerleave", cancel);
  button.addEventListener("pointercancel", cancel);
  button.addEventListener("touchstart", (e) => {
    if (!e.touches?.length) return;
    touchMoved = false;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    start();
  }, { passive: true });
  button.addEventListener("touchmove", (e) => {
    if (!e.touches?.length) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartX);
    const dy = Math.abs(e.touches[0].clientY - touchStartY);
    if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) {
      touchMoved = true;
      cancel();
    }
  }, { passive: true });
  button.addEventListener("touchend", () => {
    if (touchMoved) cancel();
    else clear();
  }, { passive: true });
  button.addEventListener("touchcancel", cancel, { passive: true });
  button.addEventListener("contextmenu", (e) => e.preventDefault());
  button.addEventListener("click", (e) => {
    e.preventDefault();
    clear();
    if (Date.now() < suppressSelectionClickUntil) return;
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    if (longPressed) return;
    onItemTap(itemId, context, openDetailFn);
  });
}

function openBulkCategoryDialog(context) {
  if (!selectedItemIds.size || selectionContext !== context) return;
  bulkCategorySelect.innerHTML = state.categoryOrder.map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
  bulkCategoryText.textContent = `將 ${selectedItemIds.size} 件商品批次移到指定分類。`;
  bulkCategoryDialog.dataset.context = context;
  bulkCategoryDialog.showModal();
}

function onConfirmBulkCategory(e) {
  e.preventDefault();
  const context = bulkCategoryDialog.dataset.context || "";
  if (!selectedItemIds.size || selectionContext !== context) return;
  const targetCategory = String(bulkCategorySelect.value || "").trim();
  if (!targetCategory) return;
  const selected = new Set(selectedItemIds);
  for (const item of state.items) {
    if (selected.has(item.id)) item.category = targetCategory;
  }
  normalizeCategoryOrder();
  persistAll();
  clearSelectionMode();
  bulkCategoryDialog.close();
  renderAll();
}

function openBulkDeleteDialog(context) {
  if (!selectedItemIds.size || selectionContext !== context) return;
  bulkDeleteText.textContent = `確定要刪除已選取的 ${selectedItemIds.size} 件商品嗎？`;
  bulkDeleteDialog.dataset.context = context;
  bulkDeleteDialog.showModal();
}

function onConfirmBulkDelete() {
  const context = bulkDeleteDialog.dataset.context || "";
  if (!selectedItemIds.size || selectionContext !== context) return;
  const selected = new Set(selectedItemIds);
  const remaining = [];
  for (const item of state.items) {
    if (selected.has(item.id)) {
      cleanupDetachedPhotoRefs(item.itemPhotos || []);
      delete state.manualVoteCounts[item.id];
      for (const log of state.dailyLogs) {
        log.wornItemIds = (log.wornItemIds || []).filter((id) => id !== item.id);
      }
      continue;
    }
    remaining.push(item);
  }
  state.items = remaining;
  cleanupOrphanPhotos();
  recomputeWearCounts();
  normalizeCategoryOrder();
  persistAll();
  clearSelectionMode();
  bulkDeleteDialog.close();
  renderAll();
}

function openBulkDeleteOutfitDialog() {
  if (!selectedItemIds.size || selectionContext !== "outfit") return;
  const count = selectedItemIds.size;
  bulkDeleteOutfitText.textContent = count > 1
    ? `確定要批次刪除已選取的 ${count} 筆穿搭紀錄嗎？`
    : "確定要刪除此筆穿搭紀錄嗎？";
  bulkDeleteOutfitDialog.showModal();
}

function onConfirmBulkDeleteOutfit() {
  if (!selectedItemIds.size || selectionContext !== "outfit") return;
  const selected = new Set(selectedItemIds);
  const remaining = [];
  for (const log of state.dailyLogs) {
    if (selected.has(log.id)) {
      cleanupDetachedPhotoRefs(log.outfitPhotos || []);
      continue;
    }
    remaining.push(log);
  }
  state.dailyLogs = remaining;
  cleanupOrphanPhotos();
  recomputeWearCounts();
  persistAll();
  clearSelectionMode();
  bulkDeleteOutfitDialog.close();
  renderAll();
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

function normalizeOriginName(value) {
  return String(value || "").trim();
}

function normalizeLookupKey(value) {
  return normalizeOriginName(value).toLocaleLowerCase();
}

function normalizeOriginList(values) {
  const list = Array.isArray(values) ? values : [];
  const seen = new Set();
  const result = [];
  for (const row of list) {
    const name = normalizeOriginName(row);
    if (!name) continue;
    if (SEASON_TAG_OPTIONS.includes(name)) continue;
    const key = normalizeLookupKey(name);
    if (seen.has(key)) continue;
    if (DEFAULT_ORIGIN_OPTIONS.some((origin) => normalizeLookupKey(origin) === key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

function normalizeDeletedOriginList(values) {
  const list = Array.isArray(values) ? values : [];
  const seen = new Set();
  const result = [];
  for (const row of list) {
    const name = normalizeOriginName(row);
    if (!name) continue;
    const key = normalizeLookupKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

function buildOriginOptions() {
  const merged = [];
  const seen = new Set();
  const deleted = new Set((state.deletedOrigins || []).map((origin) => normalizeLookupKey(origin)));
  const add = (value) => {
    const name = normalizeOriginName(value);
    if (!name) return;
    const key = normalizeLookupKey(name);
    if (deleted.has(key)) return;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(name);
  };
  for (const origin of DEFAULT_ORIGIN_OPTIONS) add(origin);
  for (const origin of state.customOrigins || []) add(origin);
  for (const item of state.items || []) add(item?.origin);
  return merged;
}

function buildTagOptions() {
  return [...SEASON_TAG_OPTIONS, ...buildOriginOptions()];
}

function renderItemOriginOptions(selectedValue = "") {
  if (!itemOriginSelect) return;
  const options = buildOriginOptions();
  itemOriginSelect.innerHTML = ['<option value="">未設定</option>', ...options.map((origin) => `<option value="${escapeAttr(origin)}">${escapeHtml(origin)}</option>`)]
    .join("");
  const expectedKey = normalizeLookupKey(selectedValue || "");
  if (!expectedKey) {
    itemOriginSelect.value = "";
    return;
  }
  const matched = options.find((origin) => normalizeLookupKey(origin) === expectedKey);
  itemOriginSelect.value = matched || "";
}

function renderLatest() {
  const items = sortedByPurchase(state.items).filter(matchesClosetQuery);
  const selectionVisible = selectionContext === "closet" && selectedItemIds.size > 0;
  queuePhotoRefs(items.map((item) => item.itemPhotos?.[0]));
  if (!items.length) {
    closetLatest.innerHTML = state.closetQuery ? emptyResultBlock("closet") : '<p class="meta">目前沒有資料。</p>';
    bindClearSearchButtons(closetLatest);
    return;
  }

  closetLatest.innerHTML = `
    <div class="latest-list">
      ${items
      .map(
        (item) => {
          const selected = selectionVisible && selectedItemIds.has(item.id);
          return `
            <article class="latest-row">
              <button type="button" class="latest-open-btn ${selectionVisible ? "selection-visible" : ""} ${selected ? "selected-lines" : ""}" data-open-item-detail="${item.id}">
                <div class="latest-title">
                  ${selectionVisible ? `<span class="selection-checkbox inline ${selected ? "is-selected" : ""}" data-select-item="${item.id}" aria-label="選取單品"></span>` : ""}
                  <span class="latest-title-text"><strong>${escapeHtml(item.brand || "未填品牌")}</strong>&nbsp;${escapeHtml(item.name)}</span>
                </div>
                <p class="latest-category meta">${escapeHtml(item.category || "未分類")}</p>
                <img class="latest-thumb" src="${photoSrc(item.itemPhotos?.[0])}" alt="${escapeHtml(item.name)}" />
              </button>
            </article>`;
        }
      )
      .join("")}
    </div>
  `;

  for (const btn of closetLatest.querySelectorAll("[data-open-item-detail]")) {
    const itemId = String(btn.dataset.openItemDetail || "");
    bindLongPressSelectable(btn, itemId, "closet", () => openItemDetail(itemId));
  }
  bindSelectionCheckboxes(closetLatest, "closet");
}

function renderPhotosWall() {
  const items = sortedByPurchase(state.items).filter(matchesClosetQuery);
  const selectionVisible = selectionContext === "closet" && selectedItemIds.size > 0;
  queuePhotoRefs(items.map((item) => item.itemPhotos?.[0]));
  if (!items.length) {
    closetPhotos.innerHTML = state.closetQuery ? emptyResultBlock("closet") : '<p class="meta">目前沒有照片。</p>';
    bindClearSearchButtons(closetPhotos);
    return;
  }

  closetPhotos.innerHTML = `
    <div class="photo-grid">
      ${items
      .map(
        (item) => {
          const selected = selectionVisible && selectedItemIds.has(item.id);
          return `<button type="button" class="photo-open-btn ${selectionVisible ? "selection-visible" : ""} ${selected ? "is-selected" : ""}" data-open-item-detail="${item.id}">
            ${selectionVisible ? `<span class="selection-checkbox corner ${selected ? "is-selected" : ""}" data-select-item="${item.id}" aria-label="選取單品"></span>` : ""}
            <img class="cover-grid" src="${photoSrc(item.itemPhotos?.[0])}" alt="${escapeHtml(item.name)}" />
          </button>`;
        }
      )
      .join("")}
    </div>
  `;

  for (const btn of closetPhotos.querySelectorAll("[data-open-item-detail]")) {
    const itemId = String(btn.dataset.openItemDetail || "");
    bindLongPressSelectable(btn, itemId, "closet", () => openItemDetail(itemId));
  }
  bindSelectionCheckboxes(closetPhotos, "closet");
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
  if (itemPurchaseTimeInput) itemPurchaseTimeInput.value = normalizeTimeText(item.purchaseTime, item.createdAt);
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
  renderItemOriginOptions(item.origin || "");
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
  cleanupDetachedPhotoRefs(state.items[idx].itemPhotos || []);
  state.items.splice(idx, 1);
  delete state.manualVoteCounts[itemId];
  for (const log of state.dailyLogs) {
    log.wornItemIds = (log.wornItemIds || []).filter((id) => id !== itemId);
  }
  currentItemDetailId = null;
  cleanupOrphanPhotos();
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
    .sort((a, b) => outfitSortTimestamp(b) - outfitSortTimestamp(a));
  queuePhotoRefs(usedLogs.map((log) => log.outfitPhotos?.[0]));

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
            <img class="cover-grid" src="${photoSrc(log.outfitPhotos?.[0])}" alt="${escapeHtml(log.date || "穿搭")}" />
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
    resetDetailPhotoZoom(itemDetailMainPhoto);
    itemDetailMainPhoto.removeAttribute("src");
    itemDetailCounter.textContent = "沒有照片";
    return;
  }
  resetDetailPhotoZoom(itemDetailMainPhoto);
  queuePhotoRefs([detailItemPhotos[detailPhotoIndex]]);
  itemDetailMainPhoto.src = photoSrc(detailItemPhotos[detailPhotoIndex]);
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
      const count = countMap.get(c) || 0;
      return `<button class="chip category-chip ${active ? "active" : ""}" data-category-chip="${escapeAttr(c)}"><span class="category-chip-inner"><span>${escapeHtml(c)}</span><span class="category-count">${count}</span></span></button>`;
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

function openCategoryItemsPage(category, preferredView = "latest") {
  clearSelectionMode();
  currentCategoryItemsName = category;
  categoryItemsView = preferredView === "photos" ? "photos" : "latest";
  state.categoryItemsQuery = "";
  categoryItemsSearchInput.value = "";
  categoryItemsSearchBar.classList.add("hidden");
  document.body.classList.add("category-items-open");
  renderCategoryItemsPage();
  categoryItemsPage.classList.add("active");
  saveActiveViewState();
}

function renderCategoryItemsPage() {
  if (!currentCategoryItemsName) return;
  const category = currentCategoryItemsName;
  const selectionVisible = selectionContext === "categoryItems" && selectedItemIds.size > 0;
  const items = sortedByPurchase(state.items).filter((x) => x.category === category && matchesCategoryItemsQuery(x));
  queuePhotoRefs(items.map((item) => item.itemPhotos?.[0]));
  categoryItemsTitle.textContent = category;
  categoryItemsLatestTab.classList.toggle("active", categoryItemsView === "latest");
  categoryItemsPhotosTab.classList.toggle("active", categoryItemsView === "photos");

  if (!items.length) {
    categoryItemsList.innerHTML = state.categoryItemsQuery ? '<div class="empty-block">找不到符合條件的分類商品。<br /><button type="button" data-clear-search="categoryItems">一鍵清除搜尋</button></div>' : '<p class="meta">此分類目前沒有商品。</p>';
    bindClearSearchButtons(categoryItemsList);
    return;
  }

  if (categoryItemsView === "photos") {
    categoryItemsList.innerHTML = `
      <div class="photo-grid">
        ${items
        .map(
          (item) => {
            const selected = selectionVisible && selectedItemIds.has(item.id);
            return `<button type="button" class="photo-open-btn ${selectionVisible ? "selection-visible" : ""} ${selected ? "is-selected" : ""}" data-open-item-detail="${item.id}">
              ${selectionVisible ? `<span class="selection-checkbox corner ${selected ? "is-selected" : ""}" data-select-item="${item.id}" aria-label="選取單品"></span>` : ""}
              <img class="cover-grid" src="${photoSrc(item.itemPhotos?.[0])}" alt="${escapeHtml(item.name)}" />
            </button>`;
          }
        )
        .join("")}
      </div>
    `;
  } else {
    categoryItemsList.innerHTML = `
      <div class="latest-list">
        ${items
        .map(
          (item) => {
            const selected = selectionVisible && selectedItemIds.has(item.id);
            return `
              <article class="latest-row">
                <button type="button" class="latest-open-btn ${selectionVisible ? "selection-visible" : ""} ${selected ? "selected-lines" : ""}" data-open-item-detail="${item.id}">
                  <div class="latest-title">
                    ${selectionVisible ? `<span class="selection-checkbox inline ${selected ? "is-selected" : ""}" data-select-item="${item.id}" aria-label="選取單品"></span>` : ""}
                    <span class="latest-title-text"><strong>${escapeHtml(item.brand || "未填品牌")}</strong>&nbsp;${escapeHtml(item.name)}</span>
                  </div>
                  <p class="latest-category meta">${escapeHtml(item.category || "未分類")}</p>
                  <img class="latest-thumb" src="${photoSrc(item.itemPhotos?.[0])}" alt="${escapeHtml(item.name)}" />
                </button>
              </article>`;
          }
        )
        .join("")}
      </div>
    `;
  }

  for (const btn of categoryItemsList.querySelectorAll("[data-open-item-detail]")) {
    const itemId = String(btn.dataset.openItemDetail || "");
    bindLongPressSelectable(btn, itemId, "categoryItems", () => openItemDetail(itemId));
  }
  bindSelectionCheckboxes(categoryItemsList, "categoryItems");
}

function renderTagTab() {
  const tagOptions = buildTagOptions();
  state.selectedTags = state.selectedTags.filter((tag) => tagOptions.includes(tag));
  tagChips.innerHTML = tagOptions.map((tag) => {
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
    if (SEASON_TAG_OPTIONS.includes(tag)) {
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
  queuePhotoRefs(result.map((item) => item.itemPhotos?.[0]));

  tagResult.innerHTML = result.length
    ? result
      .map(
        (item) => `
          <button type="button" class="item-open-btn" data-open-item-detail="${item.id}">
            <article class="item-row">
              <img class="cover-sm" src="${photoSrc(item.itemPhotos?.[0])}" alt="${escapeHtml(item.name)}" />
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
  queuePhotoRefs(items.map((item) => item.itemPhotos?.[0]));
  container.innerHTML = items.length
    ? items
      .map(
        (item) => `
          <label class="item-row">
            <img class="cover-sm" src="${photoSrc(item.itemPhotos?.[0])}" alt="${escapeHtml(item.name)}" />
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
  queuePhotoRefs(rows.map((item) => item.itemPhotos?.[0]));

  voteManualChecklist.innerHTML = rows.length
    ? rows
      .map(
        (item) => `
          <label class="item-row">
            <img class="cover-sm" src="${photoSrc(item.itemPhotos?.[0])}" alt="${escapeHtml(item.name)}" />
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
  queuePhotoRefs(rows.map((item) => item.itemPhotos?.[0]));

  outfitItemChecklist.innerHTML = rows.length
    ? rows
      .map(
        (item) => `
          <label class="item-row">
            <img class="cover-sm" src="${photoSrc(item.itemPhotos?.[0])}" alt="${escapeHtml(item.name)}" />
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
      const ta = outfitSortTimestamp(a);
      const tb = outfitSortTimestamp(b);
      return state.outfitSort === "asc" ? ta - tb : tb - ta;
    });

  if (!logs.length) {
    outfitGrid.innerHTML = state.outfitQuery ? emptyResultBlock("outfit") : '<p class="meta">目前沒有穿搭紀錄。</p>';
    bindClearSearchButtons(outfitGrid);
    return;
  }
  queuePhotoRefs(logs.map((log) => log.outfitPhotos?.[0]));
  const selectionVisible = selectionContext === "outfit" && selectedItemIds.size > 0;
  outfitGrid.innerHTML = logs
    .map(
      (log) => {
        const selected = selectionVisible && selectedItemIds.has(log.id);
        return `<button type="button" class="photo-open-btn ${selectionVisible ? "selection-visible" : ""} ${selected ? "is-selected" : ""}" data-open-outfit-detail="${log.id}">
          ${selectionVisible ? `<span class="selection-checkbox corner ${selected ? "is-selected" : ""}" data-select-item="${log.id}" aria-label="選取穿搭"></span>` : ""}
          <img class="cover-grid" src="${photoSrc(log.outfitPhotos?.[0])}" alt="${escapeAttr(log.date || "穿搭照片")}" />
        </button>`;
      }
    )
    .join("");
  for (const btn of outfitGrid.querySelectorAll("[data-open-outfit-detail]")) {
    const logId = String(btn.dataset.openOutfitDetail || "");
    bindLongPressSelectable(btn, logId, "outfit", () => openOutfitDetail(logId));
  }
  bindSelectionCheckboxes(outfitGrid, "outfit");
}

function openOutfitDetail(logId) {
  const log = state.dailyLogs.find((x) => x.id === logId);
  if (!log) return;
  currentOutfitDetailId = logId;

  const names = (log.wornItemIds || [])
    .map((id) => state.items.find((x) => x.id === id))
    .filter(Boolean);
  queuePhotoRefs(names.map((item) => item.itemPhotos?.[0]));

  detailDate.textContent = `${log.date || ""}${log.time ? ` ${log.time}` : ""}`.trim();
  detailMeta.textContent = `天氣：${log.weather || "未填"}`;
  detailTemp.textContent = `氣溫：${log.temperature || "未填"}`;
  detailLocation.textContent = `縣市：${log.county || "未填"} | 地點：${log.place || "未填"}`;
  detailNote.textContent = `穿搭想法：${log.note || "-"}`;
  detailItems.innerHTML = names.length
    ? `<div><strong>搭配單品</strong></div>
      <div class="outfit-items-strip">
        ${names
      .map(
        (item) => `
            <button type="button" class="item-open-btn outfit-item-card" data-open-item-detail="${item.id}">
              <img class="cover-grid" src="${photoSrc(item.itemPhotos?.[0])}" alt="${escapeHtml(item.name)}" />
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
  if (outfitTimeInput) outfitTimeInput.value = normalizeTimeText(log.time, log.createdAt);
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
  cleanupDetachedPhotoRefs(state.dailyLogs[idx].outfitPhotos || []);
  state.dailyLogs.splice(idx, 1);
  currentOutfitDetailId = null;
  cleanupOrphanPhotos();
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
    resetDetailPhotoZoom(outfitDetailMainPhoto);
    outfitDetailMainPhoto.removeAttribute("src");
    outfitDetailCounter.textContent = "沒有照片";
    return;
  }
  resetDetailPhotoZoom(outfitDetailMainPhoto);
  queuePhotoRefs([detailOutfitPhotos[detailOutfitIndex]]);
  outfitDetailMainPhoto.src = photoSrc(detailOutfitPhotos[detailOutfitIndex]);
  outfitDetailCounter.textContent = `${detailOutfitIndex + 1} / ${detailOutfitPhotos.length}`;
}

async function exportDataAsJson() {
  startUploadProgress("準備匯出中...");
  try {
    const exportItems = state.items.map((item) => ({
      ...item,
      itemPhotos: sanitizePhotosForExport(item.itemPhotos),
    }));
    const exportLogs = state.dailyLogs.map((log) => ({
      ...log,
      outfitPhotos: sanitizePhotosForExport(log.outfitPhotos),
    }));
    setUploadProgress(20, "整理照片資料...");
    const mediaPhotos = await collectExportPhotoBundle([...exportItems, ...exportLogs]);
    const payload = {
      app: "SPARK WEAR",
      version: 2,
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
        items: exportItems,
        dailyLogs: exportLogs,
        manualVoteCounts: state.manualVoteCounts,
        categoryOrder: state.categoryOrder,
        categoryColors: state.categoryColors,
        purchaseSort: state.purchaseSort,
        outfitSort: state.outfitSort,
        tagUsageSort: state.tagUsageSort,
        customOrigins: state.customOrigins,
        deletedOrigins: state.deletedOrigins,
      },
      media: {
        photos: [],
      },
    };
    const zipEntries = [];
    const mediaManifest = [];
    for (let i = 0; i < mediaPhotos.length; i += 1) {
      const photo = mediaPhotos[i];
      const dataUrl = String(photo?.dataUrl || "");
      if (!dataUrl) continue;
      const base64 = dataUrlToBase64(dataUrl);
      if (!base64) continue;
      const ext = mimeToExtension(photo?.mimeType || extractMimeFromDataUrl(dataUrl) || "image/jpeg");
      const safeKey = sanitizeFileName(photo.key || `photo-${i + 1}`);
      const fileName = `photos/${String(i + 1).padStart(5, "0")}-${safeKey}.${ext}`;
      zipEntries.push({ name: fileName, base64 });
      mediaManifest.push({
        key: String(photo.key || ""),
        profile: String(photo.profile || "grid"),
        mimeType: String(photo.mimeType || extractMimeFromDataUrl(dataUrl) || "image/jpeg"),
        file: fileName,
      });
    }
    payload.media.photos = mediaManifest;
    const JSZipCtor = getJSZipConstructor();
    const zip = new JSZipCtor();
    zip.file("manifest.json", JSON.stringify(payload, null, 2));
    for (const entry of zipEntries) {
      zip.file(entry.name, entry.base64, { base64: true });
    }
    setUploadProgress(60, "壓縮 ZIP...");
    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const fileName = `spark-wear-backup-${y}-${m}-${day}-${hh}${mm}.zip`;
    setUploadProgress(80, "呼叫儲存...");
    try {
      const saved = await trySaveZipViaNativeBridge(blob, fileName);
      if (saved) return;
    } catch (err) {
      const text = String(err?.message || err || "").toLowerCase();
      if (text.includes("save-cancelled")) return;
      console.warn("trySaveZipViaNativeBridge failed, fallback:", err);
    }
    if (typeof window.showSaveFilePicker === "function") {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: "ZIP backup",
            accept: { "application/zip": [".zip"] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        alert("備份 ZIP 已儲存完成。");
        return;
      } catch (err) {
        const text = String(err?.name || err?.message || err || "").toLowerCase();
        if (text.includes("abort") || text.includes("cancel")) return;
        console.warn("showSaveFilePicker failed, fallback to download link:", err);
      }
    }
    alert("無法開啟儲存位置對話框，請在支援檔案儲存對話框的裝置上匯出。");
  } catch (err) {
    console.error("exportDataAsJson failed:", err);
    alert("匯出失敗，請重試。若仍失敗請回報此錯誤。");
  } finally {
    finishUploadProgress();
  }
}

async function trySaveZipViaNativeBridge(blob, fileName) {
  const bridge = getNativePhotoBridge();
  if (!bridge?.saveBackupZip) return false;
  const dataUrl = await blobToDataUrl(blob);
  const base64 = dataUrlToBase64(dataUrl);
  if (!base64) return false;
  const picked = await bridge.saveBackupZip({
    fileName,
    mimeType: "application/zip",
    base64,
  });
  if (picked?.saved) {
    alert("備份 ZIP 已儲存完成。");
    return true;
  }
  const uri = String(picked?.uri || "");
  if (!uri) return false;
  const shouldSave = window.confirm(`將備份儲存到：\n${uri}\n\n按「確定」立即儲存 ZIP。`);
  if (!shouldSave) {
    if (typeof bridge.cancelSaveBackupZip === "function") {
      try {
        await bridge.cancelSaveBackupZip();
      } catch {
        // ignore cancellation failure
      }
    }
    throw new Error("save-cancelled");
  }
  if (typeof bridge.confirmSaveBackupZip === "function") {
    const result = await bridge.confirmSaveBackupZip({ uri });
    if (result?.saved) {
      alert("備份 ZIP 已儲存完成。");
      return true;
    }
    return false;
  }
  return false;
}

async function onImportFilePicked() {
  const file = importFileInput.files?.[0];
  if (!file) return;
  try {
    const raw = await readBackupFile(file);
    const normalized = normalizeImportedData(raw?.data && typeof raw.data === "object" ? raw.data : raw);
    const mediaPhotos = Array.isArray(raw?.media?.photos) ? raw.media.photos : [];
    pendingImportData = { ...normalized, mediaPhotos };
    importModeDialog.showModal();
  } catch {
    alert("匯入失敗：檔案格式不是有效的 ZIP 備份檔");
  } finally {
    importFileInput.value = "";
  }
}

function normalizeImportedData(source) {
  const data = source && typeof source === "object" ? source : {};
  const items = Array.isArray(data.items)
    ? data.items.map((item) => ({
      ...item,
      itemPhotos: normalizePhotoList(item?.itemPhotos),
    }))
    : [];
  const dailyLogs = Array.isArray(data.dailyLogs)
    ? data.dailyLogs.map((log) => ({
      ...log,
      outfitPhotos: normalizePhotoList(log?.outfitPhotos),
    }))
    : [];
  return {
    items,
    dailyLogs,
    manualVoteCounts: data.manualVoteCounts && typeof data.manualVoteCounts === "object" ? data.manualVoteCounts : {},
    categoryOrder: Array.isArray(data.categoryOrder) ? data.categoryOrder : [],
    categoryColors: data.categoryColors && typeof data.categoryColors === "object" ? data.categoryColors : {},
    purchaseSort: data.purchaseSort === "asc" ? "asc" : "desc",
    outfitSort: data.outfitSort === "asc" ? "asc" : "desc",
    tagUsageSort: ["none", "asc", "desc"].includes(data.tagUsageSort) ? data.tagUsageSort : "none",
    customOrigins: normalizeOriginList(data.customOrigins),
    deletedOrigins: normalizeDeletedOriginList(data.deletedOrigins),
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

async function applyImportedData(mode) {
  if (!pendingImportData) return;
  let incoming;
  try {
    incoming = await materializeImportPhotos(pendingImportData);
  } catch (err) {
    console.error("materializeImportPhotos failed:", err);
    alert("匯入失敗：照片重建過程發生錯誤，請重試。");
    return;
  }

  if (mode === "replace") {
    state.items = incoming.items;
    state.dailyLogs = incoming.dailyLogs;
    state.manualVoteCounts = incoming.manualVoteCounts;
    state.categoryOrder = incoming.categoryOrder;
    state.categoryColors = incoming.categoryColors;
    state.purchaseSort = incoming.purchaseSort;
    state.outfitSort = incoming.outfitSort;
    state.tagUsageSort = incoming.tagUsageSort;
    state.customOrigins = normalizeOriginList(incoming.customOrigins);
    state.deletedOrigins = normalizeDeletedOriginList(incoming.deletedOrigins);
  } else {
    state.items = mergeById(state.items, incoming.items);
    state.dailyLogs = mergeById(state.dailyLogs, incoming.dailyLogs);
    state.manualVoteCounts = mergeVoteCounts(state.manualVoteCounts, incoming.manualVoteCounts);
    state.categoryOrder = [...new Set([...(state.categoryOrder || []), ...(incoming.categoryOrder || [])])];
    state.categoryColors = { ...(state.categoryColors || {}), ...(incoming.categoryColors || {}) };
    state.purchaseSort = incoming.purchaseSort || state.purchaseSort;
    state.outfitSort = incoming.outfitSort || state.outfitSort;
    state.tagUsageSort = incoming.tagUsageSort || state.tagUsageSort;
    state.customOrigins = normalizeOriginList([...(state.customOrigins || []), ...(incoming.customOrigins || [])]);
    state.deletedOrigins = normalizeDeletedOriginList([...(state.deletedOrigins || []), ...(incoming.deletedOrigins || [])]);
  }

  pendingImportData = null;
  normalizeCategoryOrder();
  recomputeWearCounts();
  hydratePhotoRefs();
  await cleanupOrphanPhotos();
  persistAll();
  importModeDialog.close();
  renderAll();
  const missingCount = Number(incoming.__missingPhotoCount || 0);
  if (missingCount > 0) {
    alert(`匯入完成，但有 ${missingCount} 張照片遺失（來源備份缺檔或損毀）。`);
  } else {
    alert("匯入完成");
  }
  refreshStorageStats(false);
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

let photoDbPromise = null;
const NATIVE_PHOTO_BRIDGE = "PhotoStorageBridge";

function normalizePhotoList(photos) {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((photo) => {
      if (typeof photo === "string") return photo;
      if (!photo || typeof photo !== "object") return null;
      return {
        id: String(photo.id || photo.path || crypto.randomUUID()),
        path: photo.path ? String(photo.path) : String(photo.id || ""),
        storage: photo.storage === "idb" ? "idb" : (photo.storage || "native"),
        mimeType: photo.mimeType ? String(photo.mimeType) : "image/jpeg",
        size: Number(photo.size || 0),
        width: Number(photo.width || 0),
        height: Number(photo.height || 0),
        createdAt: photo.createdAt || new Date().toISOString(),
        profile: photo.profile || "grid",
        webSrc: photo.storage === "idb" ? "" : String(photo.webSrc || ""),
        bundleKey: photo.bundleKey ? String(photo.bundleKey) : "",
        inlineDataUrl: photo.inlineDataUrl ? String(photo.inlineDataUrl) : "",
      };
    })
    .filter(Boolean);
}

function sanitizePhotosForExport(photos) {
  return normalizePhotoList(photos)
    .map((photo) => {
      if (typeof photo === "string") {
        const dataUrl = photo.startsWith("data:image/") ? photo : "";
        const key = `legacy-inline:${crypto.randomUUID()}`;
        return {
          id: `legacy-${crypto.randomUUID()}`,
          path: "",
          storage: "legacy-inline",
          mimeType: extractMimeFromDataUrl(dataUrl) || "image/jpeg",
          size: 0,
          width: 0,
          height: 0,
          createdAt: new Date().toISOString(),
          profile: "legacy",
          webSrc: "",
          bundleKey: key,
          inlineDataUrl: dataUrl,
        };
      }
      const key = exportPhotoBundleKey(photo);
      return {
        id: photo.id || photo.path || crypto.randomUUID(),
        path: photo.path || "",
        storage: photo.storage || "native",
        mimeType: photo.mimeType || "image/jpeg",
        size: Number(photo.size || 0),
        width: Number(photo.width || 0),
        height: Number(photo.height || 0),
        createdAt: photo.createdAt || new Date().toISOString(),
        profile: photo.profile || "grid",
        webSrc: "",
        bundleKey: key,
      };
    })
    .filter(Boolean);
}

function exportPhotoBundleKey(photo) {
  if (!photo || typeof photo !== "object") return "";
  const key = photoKey(photo);
  if (!key) return "";
  const storage = photo.storage || "native";
  return `${storage}:${key}`;
}

function collectAllExportPhotos(rows) {
  const photos = [];
  for (const row of rows || []) {
    if (Array.isArray(row.itemPhotos)) photos.push(...row.itemPhotos);
    if (Array.isArray(row.outfitPhotos)) photos.push(...row.outfitPhotos);
  }
  return normalizePhotoList(photos).filter((photo) => typeof photo !== "string");
}

async function collectExportPhotoBundle(rows) {
  const unique = new Map();
  for (const photo of collectAllExportPhotos(rows)) {
    const key = String(photo.bundleKey || exportPhotoBundleKey(photo));
    if (!key || unique.has(key)) continue;
    unique.set(key, photo);
  }
  const bundle = [];
  for (const [key, photo] of unique.entries()) {
    const dataUrl = String(photo.inlineDataUrl || "") || await readPhotoAsDataUrl(photo);
    if (!dataUrl) continue;
    bundle.push({
      key,
      profile: photo.profile || "grid",
      mimeType: photo.mimeType || "image/jpeg",
      dataUrl,
    });
  }
  return bundle;
}

function getCompressionProfile(name) {
  const profileName = String(name || "grid");
  if (profileName === "thumb") return { name: "thumb", width: 320, height: 427, quality: 0.66 };
  if (profileName === "detail") return { name: "detail", width: 1080, height: 1440, quality: 0.82 };
  if (profileName === "backup-lite") return { name: "backup-lite", maxLongEdge: 1600, quality: 0.86 };
  return { name: "grid", width: 720, height: 960, quality: 0.76 };
}

async function filesToPhotoRefs(files, profileName, onProgress) {
  const list = Array.from(files || []);
  const output = [];
  for (let i = 0; i < list.length; i += 1) {
    const ref = await fileToPhotoRef(list[i], profileName);
    output.push(ref);
    if (onProgress) onProgress(i + 1, list.length);
  }
  return output;
}

async function fileToPhotoRef(file, profileName) {
  const profile = getCompressionProfile(profileName);
  let blob;
  let width = 0;
  let height = 0;
  try {
    const compressed = await compressImage(file, profile);
    blob = compressed.blob;
    width = compressed.width;
    height = compressed.height;
  } catch (err) {
    console.warn("compressImage fallback to original blob:", err);
    blob = file instanceof Blob ? file : new Blob([file], { type: "application/octet-stream" });
  }
  const nativeSaved = await savePhotoViaNativeBridge(blob, profile.name, width, height);
  if (nativeSaved) return nativeSaved;
  const photoId = await putPhotoBlob(blob);
  const cachedSrc = URL.createObjectURL(blob);
  photoSrcCache.set(photoId, cachedSrc);
  return {
    id: photoId,
    path: photoId,
    storage: "idb",
    mimeType: blob.type || "image/jpeg",
    size: blob.size,
    width,
    height,
    createdAt: new Date().toISOString(),
    profile: profile.name,
    webSrc: "",
  };
}

function compressImage(file, profile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const srcW = img.naturalWidth || 1;
        const srcH = img.naturalHeight || 1;
        const canvas = document.createElement("canvas");
        let sx = 0;
        let sy = 0;
        let sw = srcW;
        let sh = srcH;
        let outW = srcW;
        let outH = srcH;

        if (profile.width && profile.height) {
          const targetRatio = profile.width / profile.height;
          const srcRatio = srcW / srcH;
          if (srcRatio > targetRatio) {
            sw = srcH * targetRatio;
            sx = Math.max(0, (srcW - sw) / 2);
          } else {
            sh = srcW / targetRatio;
            sy = Math.max(0, (srcH - sh) / 2);
          }
          outW = profile.width;
          outH = profile.height;
        } else if (profile.maxLongEdge) {
          const longEdge = Math.max(srcW, srcH);
          const ratio = longEdge > profile.maxLongEdge ? (profile.maxLongEdge / longEdge) : 1;
          outW = Math.max(1, Math.round(srcW * ratio));
          outH = Math.max(1, Math.round(srcH * ratio));
        }

        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas-context-unavailable"));
          return;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("image-compress-failed"));
            return;
          }
          resolve({ blob, width: outW, height: outH });
        }, "image/jpeg", profile.quality);
      };
      img.onerror = () => reject(new Error("image-decode-failed"));
      img.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error("file-read-failed"));
    reader.readAsDataURL(file);
  });
}

function openPhotoDb() {
  if (photoDbPromise) return photoDbPromise;
  photoDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexeddb-unavailable"));
      return;
    }
    const req = indexedDB.open(PHOTO_DB_NAME, PHOTO_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTO_DB_STORE)) {
        db.createObjectStore(PHOTO_DB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("indexeddb-open-failed"));
  });
  return photoDbPromise;
}

async function putPhotoBlob(blob) {
  const id = crypto.randomUUID();
  const db = await openPhotoDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_DB_STORE, "readwrite");
    const store = tx.objectStore(PHOTO_DB_STORE);
    store.put({ id, blob, updatedAt: Date.now() });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error("indexeddb-write-failed"));
  });
  return id;
}

async function getPhotoBlob(id) {
  const db = await openPhotoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_DB_STORE, "readonly");
    const store = tx.objectStore(PHOTO_DB_STORE);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result?.blob || null);
    req.onerror = () => reject(req.error || new Error("indexeddb-read-failed"));
  });
}

async function listPhotoIds() {
  const db = await openPhotoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_DB_STORE, "readonly");
    const store = tx.objectStore(PHOTO_DB_STORE);
    const req = store.getAllKeys();
    req.onsuccess = () => resolve((req.result || []).map((x) => String(x)));
    req.onerror = () => reject(req.error || new Error("indexeddb-list-failed"));
  });
}

async function deletePhotoById(id) {
  const db = await openPhotoDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_DB_STORE, "readwrite");
    const store = tx.objectStore(PHOTO_DB_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error("indexeddb-delete-failed"));
  });
  const cached = photoSrcCache.get(id);
  if (cached) URL.revokeObjectURL(cached);
  photoSrcCache.delete(id);
}

function photoKey(photo) {
  if (!photo || typeof photo !== "object") return "";
  return String(photo.path || photo.id || "");
}

function photoSrc(photo) {
  if (!photo) return MISSING_PHOTO_SRC;
  if (typeof photo === "string") return photo;
  if (photo.storage === "missing") return MISSING_PHOTO_SRC;
  if (photo.webSrc) return String(photo.webSrc);
  const key = photoKey(photo);
  if (!key) return "";
  if (photo.storage !== "idb") {
    const maybeCapacitor = typeof window !== "undefined" ? window.Capacitor : null;
    if (maybeCapacitor?.convertFileSrc && key.startsWith("file://")) {
      return maybeCapacitor.convertFileSrc(key);
    }
    return key;
  }
  return photoSrcCache.get(key) || LOADING_PHOTO_SRC;
}

function queuePhotoRefs(photos) {
  for (const photo of photos || []) {
    if (!photo || typeof photo !== "object" || photo.storage !== "idb") continue;
    const key = photoKey(photo);
    if (!key || photoSrcCache.has(key) || photoSrcLoading.has(key)) continue;
    photoSrcLoading.add(key);
    getPhotoBlob(key)
      .then((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        photoSrcCache.set(key, url);
        schedulePhotoRerender();
      })
      .catch(() => null)
      .finally(() => {
        photoSrcLoading.delete(key);
      });
  }
}

async function preloadPhotoRefs(photos, limit = 120) {
  const targets = [];
  for (const photo of photos || []) {
    if (!photo || typeof photo !== "object" || photo.storage !== "idb") continue;
    const key = photoKey(photo);
    if (!key || photoSrcCache.has(key)) continue;
    targets.push(key);
    if (targets.length >= limit) break;
  }
  await Promise.all(targets.map(async (key) => {
    try {
      const blob = await getPhotoBlob(key);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      photoSrcCache.set(key, url);
    } catch {
      // ignore single-photo preload failures
    }
  }));
}

async function warmupInitialPhotos() {
  const primary = [];
  for (const item of state.items || []) {
    if (item?.itemPhotos?.[0]) primary.push(item.itemPhotos[0]);
  }
  for (const log of state.dailyLogs || []) {
    if (log?.outfitPhotos?.[0]) primary.push(log.outfitPhotos[0]);
  }
  await preloadPhotoRefs(primary, 200);
  hydratePhotoRefs();
}

function schedulePhotoRerender() {
  if (scheduledPhotoRerender) return;
  scheduledPhotoRerender = true;
  setTimeout(() => {
    scheduledPhotoRerender = false;
    renderAll();
    if (itemDetailDialog?.open) renderDetailPhoto();
    if (outfitDetailDialog?.open) renderOutfitDetailPhoto();
  }, 0);
}

function hydratePhotoRefs() {
  const refs = [];
  for (const item of state.items) refs.push(...(item.itemPhotos || []));
  for (const log of state.dailyLogs) refs.push(...(log.outfitPhotos || []));
  queuePhotoRefs(refs);
}

function collectReferencedPhotoIds() {
  const used = new Set();
  for (const item of state.items || []) {
    for (const photo of item.itemPhotos || []) {
      if (photo && typeof photo === "object" && photo.storage === "idb") {
        const id = photoKey(photo);
        if (id) used.add(id);
      }
    }
  }
  for (const log of state.dailyLogs || []) {
    for (const photo of log.outfitPhotos || []) {
      if (photo && typeof photo === "object" && photo.storage === "idb") {
        const id = photoKey(photo);
        if (id) used.add(id);
      }
    }
  }
  return used;
}

async function cleanupOrphanPhotos() {
  let touched = false;
  try {
    const ids = await listPhotoIds();
    const used = collectReferencedPhotoIds();
    for (const id of ids) {
      if (!used.has(id)) {
        touched = true;
        await deletePhotoById(id);
      }
    }
  } catch {
    // noop
  }
  const nativeDeleted = await cleanupNativeOrphanPhotos();
  if (nativeDeleted > 0) touched = true;
  if (touched) save(LAST_CLEANUP_KEY, new Date().toISOString());
  refreshStorageStats(false);
}

function collectReferencedNativePaths() {
  const used = new Set();
  const put = (photo) => {
    if (!photo || typeof photo !== "object") return;
    if (photo.storage !== "native") return;
    const key = photoKey(photo);
    if (key) used.add(key);
  };
  for (const item of state.items || []) for (const photo of item.itemPhotos || []) put(photo);
  for (const log of state.dailyLogs || []) for (const photo of log.outfitPhotos || []) put(photo);
  return Array.from(used);
}

async function cleanupNativeOrphanPhotos() {
  const bridge = getNativePhotoBridge();
  if (!bridge?.cleanupOrphans) return 0;
  try {
    const result = await bridge.cleanupOrphans({ referencedPaths: collectReferencedNativePaths() });
    return Number(result?.deleted || 0);
  } catch {
    return 0;
  }
}

function getNativePhotoBridge() {
  if (typeof window === "undefined") return null;
  const plugins = window.Capacitor?.Plugins;
  return (plugins && plugins[NATIVE_PHOTO_BRIDGE]) || window[NATIVE_PHOTO_BRIDGE] || null;
}

function startUploadProgress(title) {
  uploadProgressVisible = true;
  if (uploadProgressOverlay) uploadProgressOverlay.classList.remove("hidden");
  if (uploadProgressTitle) uploadProgressTitle.textContent = title || "處理中...";
  if (uploadProgressFill) uploadProgressFill.style.width = "5%";
  if (uploadProgressMeta) uploadProgressMeta.textContent = "0%";
}

function setUploadProgress(percent, text) {
  if (!uploadProgressVisible) return;
  const value = Math.max(0, Math.min(100, Number(percent || 0)));
  if (uploadProgressFill) uploadProgressFill.style.width = `${value}%`;
  if (uploadProgressMeta) uploadProgressMeta.textContent = text || `${value}%`;
}

function finishUploadProgress() {
  if (!uploadProgressVisible) return;
  if (uploadProgressFill) uploadProgressFill.style.width = "100%";
  if (uploadProgressMeta) uploadProgressMeta.textContent = "完成";
  setTimeout(() => {
    uploadProgressVisible = false;
    if (uploadProgressOverlay) uploadProgressOverlay.classList.add("hidden");
    if (uploadProgressFill) uploadProgressFill.style.width = "0%";
    if (uploadProgressMeta) uploadProgressMeta.textContent = "0%";
  }, 250);
}

function humanizePhotoError(err, fallback) {
  const text = String(err?.message || err || "").toLowerCase();
  if (text.includes("crop-cancelled")) {
    return "已取消照片裁切，未儲存本次照片。";
  }
  if (text.includes("permission") || text.includes("denied")) {
    return "照片權限被拒絕，請到系統設定開啟相簿/檔案存取權限後再試。";
  }
  if (text.includes("quota") || text.includes("storage") || text.includes("no space") || text.includes("insufficient")) {
    return "儲存空間不足，請先清理手機空間或刪除部分照片後再試。";
  }
  if (text.includes("decode") || text.includes("invalid image") || text.includes("corrupt")) {
    return "照片檔案可能損毀或格式不支援，請改用其他照片。";
  }
  if (text.includes("timeout") || text.includes("network")) {
    return "處理照片逾時，請降低一次上傳張數後再試。";
  }
  return fallback;
}

async function getIdbPhotoStats() {
  try {
    const ids = await listPhotoIds();
    let bytes = 0;
    for (const id of ids) {
      const blob = await getPhotoBlob(id);
      bytes += Number(blob?.size || 0);
    }
    return { count: ids.length, bytes };
  } catch {
    return { count: 0, bytes: 0 };
  }
}

async function getNativePhotoStats() {
  const bridge = getNativePhotoBridge();
  if (!bridge?.getStorageStats) return { count: 0, bytes: 0 };
  try {
    const res = await bridge.getStorageStats();
    return { count: Number(res?.count || 0), bytes: Number(res?.bytes || 0) };
  } catch {
    return { count: 0, bytes: 0 };
  }
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

async function refreshStorageStats(showAlert) {
  const idb = await getIdbPhotoStats();
  const native = await getNativePhotoStats();
  const totalCount = idb.count + native.count;
  const totalBytes = idb.bytes + native.bytes;
  const lastCleanup = load(LAST_CLEANUP_KEY, "");
  const cleanupLabel = lastCleanup ? formatDateTime(lastCleanup) : "尚未清理";
  if (storageStatsText) {
    storageStatsText.textContent = `照片 ${totalCount} 張 / ${formatBytes(totalBytes)}（Native ${native.count}，IDB ${idb.count}）｜最近清理：${cleanupLabel}`;
  }
  if (showAlert) {
    alert(`照片 ${totalCount} 張，總容量 ${formatBytes(totalBytes)}\nNative: ${native.count} 張 (${formatBytes(native.bytes)})\nIDB: ${idb.count} 張 (${formatBytes(idb.bytes)})\n最近清理：${cleanupLabel}`);
  }
}

async function onCleanupPhotos() {
  await cleanupOrphanPhotos();
  alert("已清理未引用照片。");
}

function formatDateTime(iso) {
  const d = new Date(String(iso || ""));
  if (!Number.isFinite(d.getTime())) return "未知";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("blob-read-failed"));
    reader.readAsDataURL(blob);
  });
}

async function savePhotoViaNativeBridge(blob, profileName, width, height) {
  const bridge = getNativePhotoBridge();
  if (!bridge?.saveImage) return null;
  try {
    const dataUrl = await blobToDataUrl(blob);
    const result = await bridge.saveImage({ dataUrl, profile: profileName });
    const path = String(result?.path || result?.id || "");
    if (!path) return null;
    return {
      id: String(result?.id || path),
      path,
      storage: "native",
      mimeType: String(result?.mimeType || blob.type || "image/jpeg"),
      size: Number(result?.size || blob.size || 0),
      width: Number(result?.width || width || 0),
      height: Number(result?.height || height || 0),
      createdAt: result?.createdAt || new Date().toISOString(),
      profile: profileName,
      webSrc: String(result?.webSrc || ""),
    };
  } catch (err) {
    console.warn("savePhotoViaNativeBridge fallback to idb:", err);
    return null;
  }
}

async function readPhotoViaNativeBridge(path) {
  const bridge = getNativePhotoBridge();
  if (!bridge?.readImage || !path) return null;
  try {
    const result = await bridge.readImage({ path });
    const dataUrl = String(result?.dataUrl || "");
    if (!dataUrl) return null;
    return {
      dataUrl,
      mimeType: String(result?.mimeType || "image/jpeg"),
      size: Number(result?.size || 0),
    };
  } catch (err) {
    console.warn("readPhotoViaNativeBridge failed:", err);
    return null;
  }
}

async function readPhotoAsDataUrl(photo) {
  if (!photo) return "";
  if (typeof photo === "string") {
    return photo.startsWith("data:image/") ? photo : "";
  }
  const key = photoKey(photo);
  if (!key) return "";
  if (photo.storage === "idb") {
    const blob = await getPhotoBlob(key);
    return blob ? blobToDataUrl(blob) : "";
  }
  const native = await readPhotoViaNativeBridge(key);
  if (native?.dataUrl) return native.dataUrl;
  try {
    const src = photoSrc(photo);
    if (!src) return "";
    const res = await fetch(src);
    if (!res.ok) return "";
    const blob = await res.blob();
    return blobToDataUrl(blob);
  } catch {
    return "";
  }
}

async function saveBundledDataUrlToPhotoRef(bundlePhoto) {
  const dataUrl = String(bundlePhoto?.dataUrl || "");
  const profile = String(bundlePhoto?.profile || "grid");
  if (!dataUrl) return null;
  try {
    const bridge = getNativePhotoBridge();
    if (bridge?.saveImage) {
      const result = await bridge.saveImage({ dataUrl, profile });
      const path = String(result?.path || result?.id || "");
      if (path) {
        return {
          id: String(result?.id || path),
          path,
          storage: "native",
          mimeType: String(result?.mimeType || bundlePhoto?.mimeType || "image/jpeg"),
          size: Number(result?.size || 0),
          width: Number(result?.width || 0),
          height: Number(result?.height || 0),
          createdAt: result?.createdAt || new Date().toISOString(),
          profile,
          webSrc: String(result?.webSrc || ""),
        };
      }
    }
  } catch (err) {
    console.warn("saveBundledDataUrlToPhotoRef bridge fallback:", err);
  }

  const blob = await dataUrlToBlob(dataUrl);
  if (!blob) return null;
  const id = await putPhotoBlob(blob);
  const url = URL.createObjectURL(blob);
  photoSrcCache.set(id, url);
  return {
    id,
    path: id,
    storage: "idb",
    mimeType: String(bundlePhoto?.mimeType || blob.type || "image/jpeg"),
    size: blob.size,
    width: 0,
    height: 0,
    createdAt: new Date().toISOString(),
    profile,
    webSrc: "",
  };
}

async function materializeImportPhotos(incoming) {
  const bundle = Array.isArray(incoming?.mediaPhotos) ? incoming.mediaPhotos : [];
  if (!bundle.length) return incoming;
  const keyToRef = new Map();
  for (const entry of bundle) {
    const key = String(entry?.key || "");
    if (!key) continue;
    const ref = await saveBundledDataUrlToPhotoRef(entry);
    if (ref) keyToRef.set(key, ref);
  }
  let missingCount = 0;

  const mapRowPhotos = (photos) =>
    normalizePhotoList(photos).map((photo) => {
      if (!photo || typeof photo !== "object") return photo;
      const key = String(photo.bundleKey || exportPhotoBundleKey(photo));
      if (!key) return photo;
      const resolved = keyToRef.get(key);
      if (resolved) return { ...resolved, profile: photo.profile || resolved.profile };
      missingCount += 1;
      return {
        ...photo,
        storage: "missing",
        path: "",
        webSrc: "",
      };
    });

  return {
    ...incoming,
    items: (incoming.items || []).map((item) => ({ ...item, itemPhotos: mapRowPhotos(item.itemPhotos) })),
    dailyLogs: (incoming.dailyLogs || []).map((log) => ({ ...log, outfitPhotos: mapRowPhotos(log.outfitPhotos) })),
    __missingPhotoCount: missingCount,
  };
}

async function pickAndSavePhotosViaBridge(limit, profileName, onProgress) {
  const bridge = getNativePhotoBridge();
  if (!bridge?.pickImages || !bridge?.saveImage) return [];
  try {
    const picked = await bridge.pickImages({ limit, source: "library" });
    const images = Array.isArray(picked?.images) ? picked.images : [];
    const refs = [];
    for (const image of images) {
      const tempUri = String(image?.tempUri || "");
      if (!tempUri) continue;
      const result = await bridge.saveImage({ tempUri, profile: profileName });
      const path = String(result?.path || result?.id || "");
      if (!path) continue;
      refs.push({
        id: String(result?.id || path),
        path,
        storage: "native",
        mimeType: String(result?.mimeType || "image/jpeg"),
        size: Number(result?.size || 0),
        width: Number(result?.width || 0),
        height: Number(result?.height || 0),
        createdAt: result?.createdAt || new Date().toISOString(),
        profile: String(result?.profile || profileName),
        webSrc: String(result?.webSrc || ""),
      });
      if (onProgress) onProgress(refs.length, images.length);
    }
    return refs;
  } catch (err) {
    console.warn("pickAndSavePhotosViaBridge fallback:", err);
    return [];
  }
}

async function dataUrlToBlob(dataUrl) {
  try {
    const res = await fetch(dataUrl);
    if (!res.ok) return null;
    return res.blob();
  } catch {
    return null;
  }
}

async function readBackupFile(file) {
  const name = String(file?.name || "").toLowerCase();
  if (!(name.endsWith(".zip") || file?.type === "application/zip")) {
    throw new Error("invalid-backup-format");
  }
  const JSZipCtor = getJSZipConstructor();
  const zip = await JSZipCtor.loadAsync(await file.arrayBuffer());
  const manifestEntry = zip.file("manifest.json");
  if (!manifestEntry) throw new Error("manifest.json missing");
  const manifest = JSON.parse(await manifestEntry.async("string"));
  const photos = Array.isArray(manifest?.media?.photos) ? manifest.media.photos : [];
  const hydratedPhotos = [];
  for (const photo of photos) {
    const fileName = String(photo?.file || "");
    const entry = zip.file(fileName);
    if (!entry) {
      hydratedPhotos.push({ ...photo, dataUrl: "" });
      continue;
    }
    const base64 = await entry.async("base64");
    const mimeType = String(photo?.mimeType || guessMimeFromFileName(fileName));
    hydratedPhotos.push({ ...photo, dataUrl: `data:${mimeType};base64,${base64}` });
  }
  return {
    ...manifest,
    media: {
      ...(manifest.media || {}),
      photos: hydratedPhotos,
    },
  };
}

function sanitizeFileName(name) {
  return String(name || "")
    .replaceAll(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 60) || "photo";
}

function extractMimeFromDataUrl(dataUrl) {
  const m = String(dataUrl || "").match(/^data:([^;,]+)[;,]/i);
  return m ? m[1] : "";
}

function mimeToExtension(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  return "jpg";
}

function guessMimeFromFileName(fileName) {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function dataUrlToBase64(dataUrl) {
  const value = String(dataUrl || "");
  const comma = value.indexOf(",");
  if (comma < 0) return null;
  return value.slice(comma + 1);
}

function getJSZipConstructor() {
  const ctor = typeof window !== "undefined" ? window.JSZip : null;
  if (!ctor) throw new Error("jszip-not-loaded");
  return ctor;
}

function diffRemovedPhotoRefs(before, after) {
  const beforeList = normalizePhotoList(before);
  const afterSet = new Set(
    normalizePhotoList(after).map((photo) => {
      if (typeof photo === "string") return photo;
      return photoKey(photo);
    })
  );
  return beforeList.filter((photo) => {
    if (typeof photo === "string") return false;
    const key = photoKey(photo);
    return key && !afterSet.has(key);
  });
}

function cleanupDetachedPhotoRefs(photos) {
  for (const photo of normalizePhotoList(photos)) {
    if (!photo || typeof photo === "string") continue;
    const key = photoKey(photo);
    if (!key) continue;
    if (photo.storage === "idb") {
      deletePhotoById(key).catch(() => null);
      continue;
    }
    const bridge = getNativePhotoBridge();
    if (bridge?.deleteImage) {
      bridge.deleteImage({ path: key }).catch(() => null);
    }
  }
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
