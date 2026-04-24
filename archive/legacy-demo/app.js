import {
  DEFAULT_CHART_VIEW,
  PROFILE_VIEW,
  REDIRECT_URL,
  createChartMetrics,
  supabase,
} from "./src/config.js?v=20260423-2";
import { createChartManager } from "./src/chart.js?v=20260423-2";
import { getDom } from "./src/dom.js?v=20260423-2";
import {
  buildRecordFromForm,
  ensureSegmentalData,
  formatDate,
  formatDisplayNumber,
  formatShortDate,
  formatSourceType,
  getAvatarUrl,
  getDisplayName,
  hydrateSegmentalData,
  mapRecordRow,
} from "./src/utils.js?v=20260423-2";

const chartMetrics = createChartMetrics(ensureSegmentalData);

let overviewCharts = [];
let activeChartView = DEFAULT_CHART_VIEW;
let inbodyData = [];
let updatingRecordIds = new Set();
let editingRecordId = null;
const mountedDialogBindings = new Set();
let loginFragmentPromise = null;
const THEME_STORAGE_KEY = "insightup-theme-override";
const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const DEBUG = false;
const DEBUG_PREFIX = "[InsightUp debug]";
const debugLogBuffer = [];
let authSubscriptionReady = false;

function getDebugViewState() {
  return {
    href: window.location.href,
    bodyClass: document.body.className,
    topbarHidden: topbar?.classList.contains("hidden") ?? null,
    guestExists: Boolean(document.getElementById("guest-view")),
    guestHidden: document.getElementById("guest-view")?.classList.contains("hidden") ?? null,
    homeExists: Boolean(homeView),
    homeHidden: homeView?.classList.contains("hidden") ?? null,
    profileExists: Boolean(profileView),
    profileHidden: profileView?.classList.contains("hidden") ?? null,
    userMenuHidden: userMenuContainer?.classList.contains("hidden") ?? null,
  };
}

function debugLog(event, details = {}) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    details,
    state: getDebugViewState(),
  };

  debugLogBuffer.push(entry);
  if (debugLogBuffer.length > 200) {
    debugLogBuffer.shift();
  }

  globalThis.__insightupDebug = {
    enabled: DEBUG,
    logs: debugLogBuffer,
    dump: () => [...debugLogBuffer],
    latest: () => debugLogBuffer.at(-1) || null,
  };

  if (!DEBUG) return;

  console.info(DEBUG_PREFIX, event, entry);
}

let {
  topbar,
  loginButton,
  logoutButton,
  brandButton,
  openProfileButton,
  backButton,
  guestView,
  homeView,
  profileView,
  userMenuContainer,
  userMenuButton,
  userDropdown,
  userAvatar,
  dropdownAvatar,
  dropdownName,
  dropdownEmail,
  profileAvatar,
  profileName,
  profileEmail,
  profileCreated,
  profileRecordCount,
  profileLatestDate,
  profileChartSummary,
  recordManagerEmpty,
  recordManagerList,
  addDataButton,
  addDataModal,
  modalBackdrop,
  closeModalButton,
  cancelModalButton,
  addDataForm,
  modalTitle,
  submitRecordButton,
  formSaveFeedback,
  headerThemeToggle,
} = getDom();

function refreshDomBindings() {
  ({
    topbar,
    loginButton,
    logoutButton,
    brandButton,
    openProfileButton,
    backButton,
    guestView,
    homeView,
    profileView,
    userMenuContainer,
    userMenuButton,
    userDropdown,
    userAvatar,
    dropdownAvatar,
    dropdownName,
    dropdownEmail,
    profileAvatar,
    profileName,
    profileEmail,
    profileCreated,
    profileRecordCount,
    profileLatestDate,
    profileChartSummary,
    recordManagerEmpty,
    recordManagerList,
    addDataButton,
    addDataModal,
    modalBackdrop,
    closeModalButton,
    cancelModalButton,
    addDataForm,
    modalTitle,
    submitRecordButton,
    formSaveFeedback,
    headerThemeToggle,
  } = getDom());

  debugLog("refreshDomBindings");
}

function refreshThemeControls() {
  updateThemeToggleIcon();
}

function getStoredThemeOverride() {
  const value = localStorage.getItem(THEME_STORAGE_KEY);
  return value === "light" || value === "dark" ? value : null;
}

function getCurrentTheme() {
  return getStoredThemeOverride() || (systemThemeQuery.matches ? "dark" : "light");
}

const RECORD_FORM_FIELD_CONFIG = {
  "form-date": { label: "Date", supportingText: "Required. Used for history order and chart placement.", required: true },
  "form-source-type": { label: "Source", supportingText: "How this record entered the system.", required: true },
  "form-height": { label: "Height", supportingText: "Optional. Used for context and future analysis.", min: 80, max: 250 },
  "form-age": { label: "Age", supportingText: "Optional. Whole years only.", min: 1, max: 120, integer: true },
  "form-gender": { label: "Gender", supportingText: "Optional. Helps contextualize score and composition." },
  "form-score": { label: "InBody Score", supportingText: "Optional. Usually shown on the InBody report.", min: 0, max: 100, integer: true },
  "form-weight": { label: "Weight", supportingText: "Required for a usable body composition record.", required: true, min: 10, max: 400 },
  "form-muscle": { label: "Skeletal Muscle Mass", supportingText: "Required. Used for both overall and segmental comparisons.", required: true, min: 1, max: 200 },
  "form-fat": { label: "Body Fat Mass", supportingText: "Required. Keep decimals if available.", required: true, min: 0, max: 200 },
  "form-fat-percent": { label: "Body Fat Percentage", supportingText: "Required. Enter the percentage shown on the report.", required: true, min: 0, max: 100 },
  "form-visceral-fat": { label: "Visceral Fat Level", supportingText: "Optional. Whole-number level only.", min: 0, max: 30, integer: true },
  "form-bmr": { label: "Basal Metabolic Rate", supportingText: "Optional. Calories burned at rest.", min: 500, max: 5000, integer: true },
  "form-calories": { label: "Recommended Calories", supportingText: "Optional. Recommended daily calorie intake.", min: 500, max: 8000, integer: true },
  "form-segment-left-arm-muscle": { label: "Left Arm Muscle", supportingText: "Optional override.", min: 0, max: 50 },
  "form-segment-left-arm-fat": { label: "Left Arm Fat", supportingText: "Optional override.", min: 0, max: 50 },
  "form-segment-right-arm-muscle": { label: "Right Arm Muscle", supportingText: "Optional override.", min: 0, max: 50 },
  "form-segment-right-arm-fat": { label: "Right Arm Fat", supportingText: "Optional override.", min: 0, max: 50 },
  "form-segment-trunk-muscle": { label: "Trunk Muscle", supportingText: "Optional override.", min: 0, max: 80 },
  "form-segment-trunk-fat": { label: "Trunk Fat", supportingText: "Optional override.", min: 0, max: 80 },
  "form-segment-left-leg-muscle": { label: "Left Leg Muscle", supportingText: "Optional override.", min: 0, max: 60 },
  "form-segment-left-leg-fat": { label: "Left Leg Fat", supportingText: "Optional override.", min: 0, max: 60 },
  "form-segment-right-leg-muscle": { label: "Right Leg Muscle", supportingText: "Optional override.", min: 0, max: 60 },
  "form-segment-right-leg-fat": { label: "Right Leg Fat", supportingText: "Optional override.", min: 0, max: 60 },
};

function setFormSaveFeedback(message = "") {
  if (!formSaveFeedback) return;
  formSaveFeedback.textContent = message;
  formSaveFeedback.classList.toggle("hidden", !message);
}

function getRecordFormField(fieldId) {
  return document.getElementById(fieldId);
}

function setNativeDateFieldState(message = "") {
  const dateInput = getRecordFormField("form-date");
  const support = document.getElementById("form-date-support");
  const config = RECORD_FORM_FIELD_CONFIG["form-date"];
  if (!dateInput || !support || !config) return;

  dateInput.setAttribute("aria-invalid", message ? "true" : "false");
  support.textContent = message || config.supportingText;
  support.dataset.invalid = message ? "true" : "false";
}

function setMaterialFieldState(fieldId, message = "") {
  const field = getRecordFormField(fieldId);
  const config = RECORD_FORM_FIELD_CONFIG[fieldId];
  if (!field || !config) return;

  field.error = Boolean(message);
  field.errorText = message;
  if ("supportingText" in field) {
    field.supportingText = config.supportingText;
  }
}

function clearRecordFormValidation() {
  Object.keys(RECORD_FORM_FIELD_CONFIG).forEach((fieldId) => {
    if (fieldId === "form-date") {
      setNativeDateFieldState("");
      return;
    }
    setMaterialFieldState(fieldId, "");
  });
  setFormSaveFeedback("");
}

function getFieldStringValue(field) {
  if (!field) return "";
  if (field.tagName === "MD-SWITCH") {
    return field.selected ? String(field.value || "on") : "";
  }
  return String(field.value ?? "").trim();
}

function validateRecordFormField(fieldId) {
  const config = RECORD_FORM_FIELD_CONFIG[fieldId];
  const field = getRecordFormField(fieldId);
  if (!config || !field) return true;

  const value = getFieldStringValue(field);
  let message = "";

  if (config.required && !value) {
    message = `${config.label} is required.`;
  } else if (value && Object.prototype.hasOwnProperty.call(config, "min")) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      message = `${config.label} must be a valid number.`;
    } else if (config.integer && !Number.isInteger(numericValue)) {
      message = `${config.label} must be a whole number.`;
    } else if (numericValue < config.min) {
      message = `${config.label} must be at least ${config.min}.`;
    } else if (Object.prototype.hasOwnProperty.call(config, "max") && numericValue > config.max) {
      message = `${config.label} must be ${config.max} or less.`;
    }
  }

  if (fieldId === "form-date") {
    setNativeDateFieldState(message);
  } else {
    setMaterialFieldState(fieldId, message);
  }

  return !message;
}

function validateRecordForm() {
  clearRecordFormValidation();
  const fieldIds = Object.keys(RECORD_FORM_FIELD_CONFIG);
  let firstInvalidId = null;
  fieldIds.forEach((fieldId) => {
    const isValid = validateRecordFormField(fieldId);
    if (!isValid && !firstInvalidId) {
      firstInvalidId = fieldId;
    }
  });
  if (!firstInvalidId) return true;

  const firstInvalidField = getRecordFormField(firstInvalidId);
  setFormSaveFeedback("Review the highlighted fields before saving this record.");
  firstInvalidField?.focus?.();
  return false;
}

function resetRecordFormUi() {
  addDataForm?.reset();
  clearRecordFormValidation();
  const sourceTypeField = getRecordFormField("form-source-type");
  const includeField = getRecordFormField("form-include-in-charts");
  if (sourceTypeField) sourceTypeField.value = "manual";
  if (includeField) includeField.selected = true;
}

function ensureLazyDialogMounted({ templateId, dialogId, bindEvents }) {
  const existingDialog = document.getElementById(dialogId);
  if (existingDialog) {
    if (!mountedDialogBindings.has(dialogId)) {
      bindEvents();
      mountedDialogBindings.add(dialogId);
    }
    return true;
  }

  const dialogTemplate = document.getElementById(templateId);
  if (!(dialogTemplate instanceof HTMLTemplateElement)) {
    return false;
  }

  document.body.appendChild(dialogTemplate.content.cloneNode(true));
  refreshDomBindings();
  bindEvents();
  mountedDialogBindings.add(dialogId);
  return Boolean(document.getElementById(dialogId));
}

function bindRecordDialogEvents() {
  if (!addDataModal || !addDataForm) return;

  closeModalButton?.addEventListener("click", closeAddDataModal);
  cancelModalButton?.addEventListener("click", closeAddDataModal);
  addDataModal.addEventListener("cancel", () => {
    resetRecordFormUi();
    editingRecordId = null;
    if (modalTitle) modalTitle.textContent = "Add InBody Record";
    if (submitRecordButton) submitRecordButton.textContent = "Save";
  });

  addDataForm.addEventListener("input", (event) => {
    const fieldId = event.target?.id;
    if (!fieldId || !RECORD_FORM_FIELD_CONFIG[fieldId]) return;
    setFormSaveFeedback("");
    validateRecordFormField(fieldId);
  });

  addDataForm.addEventListener("change", (event) => {
    const fieldId = event.target?.id;
    if (!fieldId || !RECORD_FORM_FIELD_CONFIG[fieldId]) return;
    setFormSaveFeedback("");
    validateRecordFormField(fieldId);
  });

  addDataForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validateRecordForm()) {
      return;
    }

    const baseRecord = editingRecordId ? getRecordById(editingRecordId) : null;
    const record = buildRecordFromForm(addDataForm, baseRecord);

    try {
      const user = await getCurrentUser();
      if (!user) {
        showGuestView();
        return;
      }

      if (editingRecordId) {
        await updateRecord(editingRecordId, record);
      } else {
        await createRecord(record, user.id);
      }

      await loadInbodyData();
      fillUserUI(user);
      if (isProfileRoute()) {
        showProfileView(false);
      } else {
        renderDashboard();
      }
      closeAddDataModal();
    } catch (error) {
      console.error("saveRecord error:", error);
      setFormSaveFeedback(`Failed to save record: ${error.message}`);
    }
  });

}

function ensureAddDataDialogMounted() {
  return ensureLazyDialogMounted({
    templateId: "add-data-dialog-template",
    dialogId: "add-data-modal",
    bindEvents: bindRecordDialogEvents,
  });
}

function populateRecordForm(record) {
  const setValue = (id, value) => {
    const field = getRecordFormField(id);
    if (!field) return;
    if (field.tagName === "MD-SWITCH") {
      field.selected = Boolean(value);
      return;
    }
    field.value = value ?? "";
  };

  setValue("form-date", record.date);
  setValue("form-source-type", record.sourceType || "manual");
  setValue("form-height", record.height);
  setValue("form-age", record.age);
  setValue("form-gender", record.gender === "unknown" ? "" : record.gender);
  setValue("form-score", record.score);
  setValue("form-weight", record.weight);
  setValue("form-muscle", record.muscle);
  setValue("form-fat", record.fat);
  setValue("form-fat-percent", record.fatPercent);
  setValue("form-visceral-fat", record.visceralFatLevel);
  setValue("form-bmr", record.bmr);
  setValue("form-calories", record.recommendedCalories);
  setValue("form-include-in-charts", record.isIncludedInCharts !== false);
  setValue("form-segment-left-arm-muscle", record.segmental?.leftArm?.muscle);
  setValue("form-segment-left-arm-fat", record.segmental?.leftArm?.fat);
  setValue("form-segment-right-arm-muscle", record.segmental?.rightArm?.muscle);
  setValue("form-segment-right-arm-fat", record.segmental?.rightArm?.fat);
  setValue("form-segment-trunk-muscle", record.segmental?.trunk?.muscle);
  setValue("form-segment-trunk-fat", record.segmental?.trunk?.fat);
  setValue("form-segment-left-leg-muscle", record.segmental?.leftLeg?.muscle);
  setValue("form-segment-left-leg-fat", record.segmental?.leftLeg?.fat);
  setValue("form-segment-right-leg-muscle", record.segmental?.rightLeg?.muscle);
  setValue("form-segment-right-leg-fat", record.segmental?.rightLeg?.fat);
}

function applyTheme(theme, persist = false) {
  try {
    document.documentElement.setAttribute("data-theme", theme);
    if (persist) {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch (e) {
    // ignore
  }
  debugLog("applyTheme", { theme, persist });
  updateThemeToggleIcon();
  renderDashboard();
}

function updateThemeToggleIcon() {
  if (!headerThemeToggle) return;
  const icon = headerThemeToggle.querySelector(".material-symbols-outlined");
  const current = document.documentElement.getAttribute("data-theme") || getCurrentTheme();
  if (icon) icon.textContent = current === "dark" ? "light_mode" : "dark_mode";
  headerThemeToggle.setAttribute(
    "aria-label",
    current === "dark" ? "Switch to light mode" : "Switch to dark mode",
  );
}

function bindThemeToggle() {
  if (!headerThemeToggle || headerThemeToggle.dataset.bound === "true") return;

  headerThemeToggle.addEventListener("click", () => {
    const next = (document.documentElement.getAttribute("data-theme") || getCurrentTheme()) === "dark"
      ? "light"
      : "dark";
    debugLog("themeToggle:click", { current: getCurrentTheme(), next });
    applyTheme(next, true);
    refreshThemeControls();
  });

  headerThemeToggle.dataset.bound = "true";
}

const { renderDashboard } = createChartManager({
  getRecords: () => inbodyData,
  getActiveChartView: () => activeChartView,
  setActiveChartView: (viewKey) => {
    activeChartView = viewKey;
  },
  getOverviewCharts: () => overviewCharts,
  setOverviewCharts: (charts) => {
    overviewCharts = charts;
  },
  dom: getDom(),
  chartMetrics,
});
 

if (typeof Chart !== "undefined" && typeof ChartDataLabels !== "undefined") {
  Chart.register(ChartDataLabels);
}

function sortInbodyDataByDate() {
  inbodyData.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getLatestRecord() {
  sortInbodyDataByDate();
  return inbodyData.at(-1) || null;
}

function getLatestIncludedRecord() {
  sortInbodyDataByDate();
  return inbodyData.filter((record) => record.isIncludedInCharts !== false).at(-1) || null;
}

function getRecordById(recordId) {
  return inbodyData.find((record) => record.id === recordId) || null;
}

function renderRecordManager() {
  if (!recordManagerList || !recordManagerEmpty) return;

  sortInbodyDataByDate();

  const sortedRecords = [...inbodyData].reverse();
  const includedCount = sortedRecords.filter((record) => record.isIncludedInCharts !== false).length;
  const excludedCount = sortedRecords.length - includedCount;

  if (profileChartSummary) {
    profileChartSummary.textContent = `${includedCount} included / ${excludedCount} excluded`;
  }

  recordManagerList.replaceChildren();
  recordManagerEmpty.classList.toggle("hidden", sortedRecords.length > 0);

  sortedRecords.forEach((record) => {
    const isIncluded = record.isIncludedInCharts !== false;
    const isUpdating = updatingRecordIds.has(record.id);

    const row = document.createElement("article");
    row.className = `record-row${isIncluded ? "" : " is-excluded"}`;

    const main = document.createElement("div");
    main.className = "record-row-main";

    const top = document.createElement("div");
    top.className = "record-row-top";

    const date = document.createElement("div");
    date.className = "record-row-date";
    date.textContent = formatShortDate(record.date);

    const status = document.createElement("div");
    status.className = `record-row-status ${isIncluded ? "is-included" : "is-excluded"}`;
    status.textContent = isIncluded ? "Included in chart" : "Excluded from chart";

    top.append(date, status);

    const meta = document.createElement("div");
    meta.className = "record-row-meta";

    [
      record.weight != null ? `Weight ${formatDisplayNumber(record.weight, " kg")}` : null,
      record.muscle != null ? `Muscle ${formatDisplayNumber(record.muscle, " kg")}` : null,
      record.fatPercent != null ? `Fat ${formatDisplayNumber(record.fatPercent, "%")}` : null,
    ]
      .filter(Boolean)
      .forEach((metricText) => {
        const metric = document.createElement("span");
        metric.className = "record-metric";
        metric.textContent = metricText;
        meta.appendChild(metric);
      });

    const source = document.createElement("span");
    source.className = "record-source";
    source.textContent = formatSourceType(record.sourceType);
    meta.appendChild(source);

    main.append(top, meta);

    const action = document.createElement("div");
    action.className = "record-row-action";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "secondary-button record-action-button icon-action-button";
    editButton.disabled = isUpdating;
    editButton.setAttribute("aria-label", "Edit record");
    editButton.title = "Edit";
    editButton.innerHTML = '<span class="material-symbols-outlined">edit</span>';
    editButton.addEventListener("click", () => {
      openEditDataModal(record.id);
    });

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = `primary-button record-toggle-button icon-action-button${isIncluded ? "" : " is-excluded"}`;
    toggleButton.disabled = isUpdating;
    const toggleIcon = isUpdating ? "autorenew" : (isIncluded ? "visibility" : "visibility_off");
    const toggleLabel = isUpdating ? "Saving..." : (isIncluded ? "Exclude from chart" : "Include in chart");
    toggleButton.setAttribute("aria-label", toggleLabel);
    toggleButton.title = toggleLabel;
    toggleButton.innerHTML = `<span class="material-symbols-outlined">${toggleIcon}</span>`;

    toggleButton.addEventListener("click", async () => {
      await setRecordChartInclusion(record.id, !isIncluded);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "secondary-button record-action-button record-delete-button icon-action-button";
    deleteButton.disabled = isUpdating;
    deleteButton.setAttribute("aria-label", "Delete record");
    deleteButton.title = "Delete";
    deleteButton.innerHTML = '<span class="material-symbols-outlined">delete</span>';
    deleteButton.addEventListener("click", async () => {
      await deleteRecord(record.id);
    });

    action.append(editButton, toggleButton, deleteButton);
    row.append(main, action);
    recordManagerList.appendChild(row);
  });
}

function fillUserUI(user) {
  if (!user) return;

  const avatarUrl = getAvatarUrl(user);
  const displayName = getDisplayName(user);
  const email = user.email || "-";
  const createdAt = formatDate(user.created_at);

  if (userAvatar) userAvatar.src = avatarUrl;
  if (dropdownAvatar) dropdownAvatar.src = avatarUrl;
  if (dropdownName) dropdownName.textContent = displayName;
  if (dropdownEmail) dropdownEmail.textContent = email;

  if (profileAvatar) profileAvatar.src = avatarUrl;
  if (profileName) profileName.textContent = displayName;
  if (profileEmail) profileEmail.textContent = email;
  if (profileCreated) profileCreated.textContent = `Created: ${createdAt}`;
  if (profileRecordCount) profileRecordCount.textContent = String(inbodyData.length);
  if (profileLatestDate) profileLatestDate.textContent = formatShortDate(getLatestRecord()?.date);
  renderRecordManager();
}

async function showGuestView(normalizeRoute = true) {
  debugLog("showGuestView:start", { normalizeRoute, hasGuestView: Boolean(guestView) });
  document.body.classList.add("guest-mode");
  topbar?.classList.remove("hidden");

  if (normalizeRoute && isProfileRoute()) {
    debugLog("showGuestView:normalizeRoute", { from: window.location.href, to: getHomeUrl() });
    history.replaceState({ page: "guest" }, "", getHomeUrl());
  }

  if (!guestView) {
    debugLog("showGuestView:loadLoginFragment");
    await loadLoginFragment();
    refreshDomBindings();
    bindLoginHandlers();
  }

  guestView?.classList.remove("hidden");
  homeView?.classList.add("hidden");
  profileView?.classList.add("hidden");
  userMenuContainer?.classList.add("hidden");
  userDropdown?.classList.add("hidden");
  debugLog("showGuestView:end");
}

function getHomeUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("view");
  url.hash = "";
  return `${url.pathname}${url.search}`;
}

function getProfileUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("view", PROFILE_VIEW);
  url.hash = "";
  return `${url.pathname}${url.search}`;
}

function isProfileRoute() {
  return new URLSearchParams(window.location.search).get("view") === PROFILE_VIEW;
}

function normalizeStrayHash() {
  if (window.location.hash !== "#") return;

  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  history.replaceState(history.state, "", cleanUrl);
  debugLog("normalizeStrayHash", { to: cleanUrl });
}

function showHomeView(updateHistory = false, replaceHistory = false) {
  debugLog("showHomeView:start", { updateHistory, replaceHistory });
  document.body.classList.remove("guest-mode");
  topbar?.classList.remove("hidden");
  if (updateHistory) {
    const homeUrl = getHomeUrl();

    if (replaceHistory) {
      history.replaceState({ page: "home" }, "", homeUrl);
    } else {
      history.pushState({ page: "home" }, "", homeUrl);
    }
  }

  guestView?.classList.add("hidden");
  homeView?.classList.remove("hidden");
  profileView?.classList.add("hidden");
  userMenuContainer?.classList.remove("hidden");
  userDropdown?.classList.add("hidden");
  renderDashboard();
  debugLog("showHomeView:end");
}

function showProfileView(pushHistory = true) {
  debugLog("showProfileView:start", { pushHistory, hasProfileView: Boolean(profileView) });
  document.body.classList.remove("guest-mode");
  topbar?.classList.remove("hidden");
  (async () => {
    if (!profileView) {
      debugLog("showProfileView:loadProfileFragment");
      await loadProfileFragment();
      refreshDomBindings();
      bindProfileHandlers();
    }

    // ensure profile has up-to-date records and UI bindings
    try {
      await loadInbodyData();
    } catch (err) {
      console.error('Failed loading inbody data for profile:', err);
      debugLog("showProfileView:loadInbodyData:error", { message: err?.message || String(err) });
    }

    const currentUser = await getCurrentUser();
    if (currentUser) fillUserUI(currentUser);

    if (pushHistory && !isProfileRoute()) {
      history.pushState({ page: "profile" }, "", getProfileUrl());
    }

    guestView?.classList.add("hidden");
    homeView?.classList.add("hidden");
    profileView?.classList.remove("hidden");
    userMenuContainer?.classList.remove("hidden");
    userDropdown?.classList.add("hidden");
    debugLog("showProfileView:end", { hasCurrentUser: Boolean(currentUser) });
  })();
}

async function loadProfileFragment() {
  try {
    debugLog("loadProfileFragment:fetch:start");
    const resp = await fetch("./profile.html?v=20260423-3", { cache: "no-store" });
    const text = await resp.text();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = text;
    const fragment = wrapper.querySelector("#profile-view");
    if (!fragment) return;

    const placeholder = document.getElementById("profile-placeholder");
    if (placeholder) {
      placeholder.replaceWith(fragment);
    } else {
      document.querySelector("main.page-shell")?.appendChild(fragment);
    }
    debugLog("loadProfileFragment:fetch:done", { ok: resp.ok, status: resp.status });
  } catch (err) {
    console.error("Failed to load profile fragment:", err);
    debugLog("loadProfileFragment:error", { message: err?.message || String(err) });
  }
}

async function loadLoginFragment() {
  if (document.getElementById("guest-view")) {
    debugLog("loadLoginFragment:skip:existing");
    return;
  }

  if (loginFragmentPromise) {
    debugLog("loadLoginFragment:await:existingPromise");
    await loginFragmentPromise;
    return;
  }

  loginFragmentPromise = (async () => {
  try {
    debugLog("loadLoginFragment:fetch:start");
    const resp = await fetch('./login.html?v=20260423-2', { cache: 'no-store' });
    const text = await resp.text();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = text;
    const fragment = wrapper.querySelector('#guest-view');
    if (!fragment) return;

    const existingGuestView = document.getElementById('guest-view');
    if (existingGuestView) {
      debugLog("loadLoginFragment:skip:lateExisting");
      return;
    }

    const placeholder = document.getElementById('guest-placeholder');
    if (placeholder) {
      placeholder.replaceWith(fragment);
    } else {
      document.querySelector('main.page-shell')?.prepend(fragment);
    }
    debugLog("loadLoginFragment:fetch:done", { ok: resp.ok, status: resp.status });
  } catch (err) {
    console.error('Failed to load login fragment:', err);
    debugLog("loadLoginFragment:error", { message: err?.message || String(err) });
  } finally {
    loginFragmentPromise = null;
  }
  })();

  await loginFragmentPromise;
}

function bindLoginHandlers() {
  if (!loginButton) return;
  debugLog("bindLoginHandlers");
  loginButton.addEventListener('click', async () => {
    debugLog("loginButton:click");
    loginButton.disabled = true;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: REDIRECT_URL },
    });

    if (error) {
      console.error('signInWithOAuth error:', error);
      debugLog("loginButton:error", { message: error.message });
      loginButton.disabled = false;
      alert(`Login failed: ${error.message}`);
    }
  });
}

function bindProfileHandlers() {
  if (backButton) {
    backButton.addEventListener("click", async () => {
      const user = await getCurrentUser();
      if (!user) {
        showGuestView();
        return;
      }

      fillUserUI(user);
      showHomeView(true, true);
    });
  }
}

async function syncViewWithRoute() {
  debugLog("syncViewWithRoute:start", { isProfileRoute: isProfileRoute() });
  const user = await getCurrentUser();
  if (!user) {
    await showGuestView();
    debugLog("syncViewWithRoute:end", { resolvedView: "guest" });
    return;
  }

  fillUserUI(user);

  if (isProfileRoute()) {
    showProfileView(false);
  } else {
    showHomeView(false);
  }
  debugLog("syncViewWithRoute:end", { resolvedView: isProfileRoute() ? "profile" : "home" });
}

async function getCurrentUser() {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("getSession error:", sessionError);
      debugLog("getCurrentUser:sessionError", { message: sessionError.message });
      return null;
    }

    const user = sessionData.session?.user || null;
    debugLog("getCurrentUser:done", {
      hasSession: Boolean(sessionData.session),
      hasUser: Boolean(user),
      userId: user?.id || null,
    });

    return user;
  } catch (error) {
    console.error("getSession threw:", error);
    debugLog("getCurrentUser:throw", { message: error?.message || String(error) });
    return null;
  }
}

async function loadInbodyData() {
  debugLog("loadInbodyData:start");
  const { data, error } = await supabase
    .from("inbody_records")
    .select(`
      id,
      user_id,
      recorded_at,
      height,
      age,
      gender,
      score,
      weight,
      muscle,
      fat,
      fat_percent,
      visceral_fat_level,
      bmr,
      recommended_calories,
      is_included_in_charts,
      source_type,
      inbody_segments (
        part_key,
        part_name,
        muscle,
        fat,
        muscle_ratio,
        fat_ratio
      )
    `)
    .is("deleted_at", null)
    .order("recorded_at", { ascending: true });

  if (error) {
    console.error("loadInbodyData error:", error);
    debugLog("loadInbodyData:error", { message: error.message, code: error.code || null });
    throw error;
  }

  inbodyData = (data || []).map(mapRecordRow);
  hydrateSegmentalData(inbodyData);
  debugLog("loadInbodyData:end", { count: inbodyData.length });
}

async function createRecord(record, userId) {
  const { data: insertedRecord, error: recordError } = await supabase
    .from("inbody_records")
    .insert({
      user_id: userId,
      recorded_at: record.date,
      height: record.height,
      age: record.age,
      gender: record.gender || "unknown",
      score: record.score,
      weight: record.weight,
      muscle: record.muscle,
      fat: record.fat,
      fat_percent: record.fatPercent,
      visceral_fat_level: record.visceralFatLevel,
      bmr: record.bmr,
      recommended_calories: record.recommendedCalories,
      is_included_in_charts: record.isIncludedInCharts,
      source_type: record.sourceType || "manual",
    })
    .select("id")
    .single();

  if (recordError) {
    console.error("createRecord record insert error:", recordError);
    throw recordError;
  }

  const segmental = ensureSegmentalData({ ...record, segmental: record.segmental ?? null });
  const segmentRows = Object.entries(segmental).map(([partKey, segment]) => ({
    record_id: insertedRecord.id,
    part_key: partKey,
    part_name: segment.name,
    muscle: segment.muscle,
    fat: segment.fat,
    muscle_ratio: segment.muscleRatio,
    fat_ratio: segment.fatRatio,
  }));

  const { error: segmentError } = await supabase
    .from("inbody_segments")
    .insert(segmentRows);

  if (segmentError) {
    console.error("createRecord segment insert error:", segmentError);
    throw segmentError;
  }
}

async function updateRecord(recordId, record) {
  const { error: recordError } = await supabase
    .from("inbody_records")
    .update({
      recorded_at: record.date,
      height: record.height,
      age: record.age,
      gender: record.gender || "unknown",
      score: record.score,
      weight: record.weight,
      muscle: record.muscle,
      fat: record.fat,
      fat_percent: record.fatPercent,
      visceral_fat_level: record.visceralFatLevel,
      bmr: record.bmr,
      recommended_calories: record.recommendedCalories,
      is_included_in_charts: record.isIncludedInCharts,
      source_type: record.sourceType || "manual",
    })
    .eq("id", recordId);

  if (recordError) {
    console.error("updateRecord record update error:", recordError);
    throw recordError;
  }

  const segmental = ensureSegmentalData({ ...record, segmental: record.segmental ?? null });
  const segmentRows = Object.entries(segmental).map(([partKey, segment]) => ({
    record_id: recordId,
    part_key: partKey,
    part_name: segment.name,
    muscle: segment.muscle,
    fat: segment.fat,
    muscle_ratio: segment.muscleRatio,
    fat_ratio: segment.fatRatio,
  }));

  const { error: segmentError } = await supabase
    .from("inbody_segments")
    .upsert(segmentRows, { onConflict: "record_id,part_key" });

  if (segmentError) {
    console.error("updateRecord segment upsert error:", segmentError);
    throw segmentError;
  }
}

async function deleteRecord(recordId) {
  const record = getRecordById(recordId);
  if (!record) return;

  const confirmed = window.confirm(`Delete the record from ${formatDate(record.date)}? It will be hidden from the app.`);
  if (!confirmed) return;

  updatingRecordIds = new Set(updatingRecordIds).add(recordId);
  renderRecordManager();

  try {
    const { error } = await supabase
      .from("inbody_records")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", recordId);

    if (error) {
      throw error;
    }

    inbodyData = inbodyData.filter((item) => item.id !== recordId);

    const user = await getCurrentUser();
    if (user) fillUserUI(user);
    renderDashboard();
  } catch (error) {
    console.error("deleteRecord error:", error);
    alert(`Failed to delete record: ${error.message}`);
  } finally {
    const nextUpdatingIds = new Set(updatingRecordIds);
    nextUpdatingIds.delete(recordId);
    updatingRecordIds = nextUpdatingIds;
    renderRecordManager();
  }
}

async function setRecordChartInclusion(recordId, isIncludedInCharts) {
  updatingRecordIds = new Set(updatingRecordIds).add(recordId);
  renderRecordManager();

  try {
    const { error } = await supabase
      .from("inbody_records")
      .update({ is_included_in_charts: isIncludedInCharts })
      .eq("id", recordId);

    if (error) {
      throw error;
    }

    inbodyData = inbodyData.map((record) => (
      record.id === recordId
        ? { ...record, isIncludedInCharts }
        : record
    ));

    const user = await getCurrentUser();
    if (user) fillUserUI(user);
    renderDashboard();
  } catch (error) {
    console.error("setRecordChartInclusion error:", error);
    alert(`Failed to update chart inclusion: ${error.message}`);
  } finally {
    const nextUpdatingIds = new Set(updatingRecordIds);
    nextUpdatingIds.delete(recordId);
    updatingRecordIds = nextUpdatingIds;
    renderRecordManager();
  }
}


function openAddDataModal() {
  if (!ensureAddDataDialogMounted()) return;

  editingRecordId = null;
  resetRecordFormUi();
  if (modalTitle) modalTitle.textContent = "Add InBody Record";
  if (submitRecordButton) submitRecordButton.textContent = "Save";

  const heightInput = document.getElementById("form-height");
  const ageInput = document.getElementById("form-age");
  const genderSelect = document.getElementById("form-gender");

  if (heightInput && !heightInput.value) heightInput.value = "165";
  if (ageInput && !ageInput.value) ageInput.value = "29";
  if (genderSelect && !genderSelect.value) genderSelect.value = "male";

  void addDataModal?.show?.();
}

function openEditDataModal(recordId) {
  if (!ensureAddDataDialogMounted()) return;

  const record = getRecordById(recordId);
  if (!record || !addDataForm) return;

  editingRecordId = recordId;
  resetRecordFormUi();

  if (modalTitle) modalTitle.textContent = "Edit InBody Record";
  if (submitRecordButton) submitRecordButton.textContent = "Save Changes";
  populateRecordForm(record);

  void addDataModal?.show?.();
}

function closeAddDataModal() {
  if (addDataModal?.open) {
    void addDataModal.close();
  }
  resetRecordFormUi();
  editingRecordId = null;
  if (modalTitle) modalTitle.textContent = "Add InBody Record";
  if (submitRecordButton) submitRecordButton.textContent = "Save";
}


async function renderApp(defaultView = "home") {
  debugLog("renderApp:start", { defaultView });
  const user = await getCurrentUser();
  if (!user) {
    await showGuestView();
    debugLog("renderApp:end", { rendered: "guest" });
    return;
  }

  try {
    await loadInbodyData();
  } catch (error) {
    console.error("renderApp loadInbodyData error:", error);
    debugLog("renderApp:loadInbodyData:error", { message: error?.message || String(error) });
    inbodyData = [];
  }

  fillUserUI(user);
  if (defaultView === "profile") {
    showProfileView(false);
  } else {
    showHomeView(false);
  }
  debugLog("renderApp:end", { rendered: defaultView, userId: user.id });
}

addDataButton?.addEventListener("click", openAddDataModal);

logoutButton?.addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("signOut error:", error);
    alert(`Logout failed: ${error.message}`);
    return;
  }

  showGuestView();
});

brandButton?.addEventListener("click", async () => {
  const user = await getCurrentUser();
  if (!user) {
    showGuestView();
    return;
  }

  fillUserUI(user);
  showHomeView(true, true);
});

openProfileButton?.addEventListener("click", async () => {
  const user = await getCurrentUser();
  if (!user) {
    showGuestView();
    return;
  }

  fillUserUI(user);
  showProfileView();
});

backButton?.addEventListener("click", async () => {
  const user = await getCurrentUser();
  if (!user) {
    showGuestView();
    return;
  }

  fillUserUI(user);
  showHomeView(true, true);
});

if (userMenuButton && userDropdown && userMenuContainer) {
  userMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    userDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!userMenuContainer.contains(event.target)) {
      userDropdown.classList.add("hidden");
    }
  });
}

window.addEventListener("popstate", syncViewWithRoute);
// Initialize theme (bindings for controls are attached when profile loads)
applyTheme(getCurrentTheme());
bindThemeToggle();
refreshThemeControls();

systemThemeQuery.addEventListener("change", (event) => {
  if (getStoredThemeOverride()) return;
  applyTheme(event.matches ? "dark" : "light");
  refreshThemeControls();
});

window.addEventListener("error", (event) => {
  debugLog("window:error", {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  debugLog("window:unhandledrejection", {
    reason: event.reason?.message || String(event.reason),
  });
});

function bindAuthSubscription() {
  if (authSubscriptionReady) return;

  supabase.auth.onAuthStateChange(async (event) => {
  debugLog("auth:onAuthStateChange", { event });
  try {
    if (event === "SIGNED_OUT") {
      await showGuestView();
      return;
    }

    await renderApp(isProfileRoute() ? "profile" : "home");
  } catch (error) {
    console.error("onAuthStateChange handler error:", error);
    await showGuestView();
  }
  });

  authSubscriptionReady = true;
}

async function initializeApp() {
  debugLog("initializeApp:start", { profileRoute: isProfileRoute() });
  try {
    normalizeStrayHash();
    await supabase.auth.getSession();
    await renderApp(isProfileRoute() ? "profile" : "home");
    debugLog("initializeApp:end");
  } catch (error) {
    console.error("initializeApp error:", error);
    debugLog("initializeApp:error", { message: error?.message || String(error) });
    await showGuestView();
  }
}

await initializeApp();
bindAuthSubscription();