const statusNode = document.getElementById("status");
const resultsNode = document.getElementById("results");
const autofillButton = document.getElementById("autofill-button");
const openPlatformButton = document.getElementById("open-platform-button");
const connectPlatformButton = document.getElementById("connect-platform-button");
const platformUrlInput = document.getElementById("platform-url");
const backendUrlInput = document.getElementById("backend-url");
const profileSummaryNode = document.getElementById("profile-summary");
const stepOpenNode = document.getElementById("step-open");
const stepConnectNode = document.getElementById("step-connect");
const stepAutofillNode = document.getElementById("step-autofill");

const PLATFORM_URL_STORAGE_KEY = "grantflow.extension.platformUrl";
const BACKEND_URL_STORAGE_KEY = "grantflow.extension.backendUrl";
const PLATFORM_PROFILE_STORAGE_KEY = "grantflow.extension.profileSummary";
const PLATFORM_PROFILE_TEXT_STORAGE_KEY = "grantflow.extension.profileText";
const PLATFORM_USER_ID_STORAGE_KEY = "grantflow.extension.userId";
const STRUCTURED_PROFILE_STORAGE_KEY = "grantflow.extension.structuredProfile";
const PROFILE_STORAGE_KEY = "grantflow.organizationProfile";
const PROFILE_SUMMARY_STORAGE_KEY = "grantflow.profileSummary";
const USER_ID_STORAGE_KEY = "grantflow.userId";

let lastScanPayload = null;

initializePopup().catch(console.error);

function setStatus(message) {
  statusNode.textContent = message;
}

function setStepState(node, state) {
  node.classList.remove("step-card--active", "step-card--done");
  if (state === "active") {
    node.classList.add("step-card--active");
  }
  if (state === "done") {
    node.classList.add("step-card--done");
  }
}

function updateFlowState(options = {}) {
  const hasPlatformOpen = Boolean(options.hasPlatformOpen);
  const hasConnectedProfile = Boolean(options.hasConnectedProfile);

  setStepState(stepOpenNode, hasPlatformOpen ? "done" : "active");
  setStepState(stepConnectNode, hasConnectedProfile ? "done" : (hasPlatformOpen ? "active" : ""));
  setStepState(stepAutofillNode, hasConnectedProfile ? "active" : "");

  autofillButton.disabled = !hasConnectedProfile;
  connectPlatformButton.textContent = hasConnectedProfile ? "Sync Again" : "Login / Connect";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function summarizeFields(fields) {
  return fields.reduce((acc, field) => {
    if (field.confidenceBucket === "high") {
      acc.high += 1;
    } else if (field.confidenceBucket === "review") {
      acc.review += 1;
    } else {
      acc.low += 1;
    }
    return acc;
  }, { high: 0, review: 0, low: 0 });
}

function getFieldGroup(fieldKey) {
  const groupMap = {
    organization_name: "Organization",
    organization_description: "Organization",
    organization_history: "Organization",
    organizational_capacity: "Organization",
    year_founded: "Organization",
    website: "Organization",
    type_of_applicant: "Organization",
    department: "Organization",
    division: "Organization",
    executive_officer_name: "Organization",
    executive_officer_email: "Organization",
    executive_officer_phone: "Organization",
    board_governance: "Organization",

    contact_name: "Contact",
    contact_prefix: "Contact",
    first_name: "Contact",
    middle_initial: "Contact",
    last_name: "Contact",
    contact_suffix: "Contact",
    email: "Contact",
    phone: "Contact",
    mobile_phone: "Contact",
    fax: "Contact",
    job_title: "Contact",
    principal_investigator_name: "Contact",
    principal_investigator_email: "Contact",
    principal_investigator_phone: "Contact",
    authorized_representative_name: "Contact",
    authorized_representative_email: "Contact",
    authorized_representative_phone: "Contact",

    mission_statement: "Narrative",
    need_statement: "Narrative",
    target_population: "Narrative",
    geographic_area_served: "Narrative",
    program_description: "Narrative",
    impact_statement: "Narrative",
    outcomes: "Narrative",
    evaluation_plan: "Narrative",
    sustainability_plan: "Narrative",
    implementation_timeline: "Narrative",
    methods_approach: "Narrative",
    staffing_plan: "Narrative",
    partnerships: "Narrative",
    dei_statement: "Narrative",
    financial_need: "Narrative",
    success_metrics: "Narrative",

    project_title: "Project",
    project_summary: "Project",
    project_abstract: "Project",
    project_goals: "Project",
    start_date: "Project",
    end_date: "Project",
    performance_site_name: "Project",
    performance_site_address_1: "Project",
    performance_site_city: "Project",
    performance_site_state: "Project",
    performance_site_zip: "Project",
    performance_site_country: "Project",
    request_type: "Project",

    funding_amount: "Budget",
    federal_request_amount: "Budget",
    non_federal_match_amount: "Budget",
    total_project_cost: "Budget",
    personnel_costs: "Budget",
    fringe_benefits: "Budget",
    travel_costs: "Budget",
    equipment_costs: "Budget",
    supplies_costs: "Budget",
    contractual_costs: "Budget",
    consultant_costs: "Budget",
    other_direct_costs: "Budget",
    indirect_costs: "Budget",

    address_line_1: "Address",
    address_line_2: "Address",
    city: "Address",
    state: "Address",
    zip: "Address",
    country: "Address",
    county: "Address",
    congressional_district_applicant: "Address",
    congressional_district_project: "Address",

    uei: "Compliance",
    duns: "Compliance",
    ein: "Compliance",
    assistance_listing_number: "Compliance",
    assistance_listing_title: "Compliance",
    funding_opportunity_number: "Compliance",
    agency_routing_identifier: "Compliance",
    federal_identifier: "Compliance",
    era_commons_id: "Compliance",

    username: "Account",
    password: "Account",
    confirm_password: "Account",
    birth_month: "Account",
    birth_day: "Account"
  };

  if (fieldKey === "unknown") {
    return "Unknown";
  }

  return groupMap[fieldKey] || "Other";
}

function groupFields(fields) {
  const orderedGroups = [
    "Organization",
    "Contact",
    "Narrative",
    "Project",
    "Budget",
    "Address",
    "Compliance",
    "Account",
    "Other",
    "Unknown"
  ];

  const groups = new Map(orderedGroups.map((group) => [group, []]));
  fields.forEach((field) => {
    const groupName = getFieldGroup(field.fieldKey);
    groups.get(groupName).push(field);
  });

  return Array.from(groups.entries()).filter(([, items]) => items.length > 0);
}

function renderFieldCard(field) {
  const title = field.fieldKey === "unknown" ? "Unknown field" : field.fieldKey.replace(/_/g, " ");
  const label = field.label || field.placeholder || field.name || field.id || "Unlabeled field";
  const reasons = (field.reasons || []).join(", ");
  const bucketLabel = field.confidenceBucket === "high"
    ? "High confidence"
    : field.confidenceBucket === "review"
      ? "Needs review"
      : "Unknown";

  return `
    <section class="field-card field-card--${escapeHtml(field.confidenceBucket)}">
      <h3>${escapeHtml(title)}</h3>
      <p class="field-meta"><strong>Label:</strong> ${escapeHtml(label)}</p>
      <p class="field-meta">Type: ${escapeHtml(field.tagName)} · ${escapeHtml(field.type)}</p>
      <p class="field-meta">Name/ID: ${escapeHtml(field.name || "(no name)")} · ${escapeHtml(field.id || "(no id)")}</p>
      <p class="field-meta">Required: ${field.required ? "Yes" : "No"}</p>
      <span class="confidence">${escapeHtml(bucketLabel)} · ${Math.round(field.confidence * 100)}%</span>
      <p class="field-meta"><strong>Signals:</strong> ${escapeHtml(reasons || "No keyword match, fallback heuristic only")}</p>
    </section>
  `;
}

function renderGroup(groupName, fields) {
  return `
    <section class="group-card">
      <div class="group-header">
        <h2 class="group-title">${escapeHtml(groupName)}</h2>
        <span class="group-count">${fields.length}</span>
      </div>
      <div class="group-fields">
        ${fields.map((field) => renderFieldCard(field)).join("")}
      </div>
    </section>
  `;
}

function renderFields(payload) {
  lastScanPayload = payload;
  const fields = payload.fields || [];
  const summary = summarizeFields(fields);
  const groupedFields = groupFields(fields);

  if (fields.length === 0) {
    resultsNode.innerHTML = "<p class=\"field-meta\">No visible form fields were detected on this page.</p>";
    return;
  }

  resultsNode.innerHTML = `
    <section class="summary-card">
      <p class="summary-line">High confidence: ${summary.high}</p>
      <p class="summary-line">Needs review: ${summary.review}</p>
      <p class="summary-line">Unknown: ${summary.low}</p>
    </section>
  ` + groupedFields.map(([groupName, groupItems]) => renderGroup(groupName, groupItems)).join("");
}

function renderProfileSummary(summary, structuredProfile, syncMeta = {}) {
  if (!summary) {
    profileSummaryNode.innerHTML = `<p class="field-meta">Not connected yet. Open the platform, upload profile documents there, then sync from the extension.</p>`;
    return;
  }

  const filledStructuredCount = structuredProfile
    ? Object.values(structuredProfile).filter((value) => String(value || "").trim()).length
    : 0;
  const syncBadge = syncMeta.documentContextUsed
    ? "Profile + stored docs"
    : structuredProfile
      ? "Profile structured"
      : "Profile only";

  profileSummaryNode.innerHTML = `
    <h3 class="profile-summary-title">Connected Profile</h3>
    <div class="profile-summary-grid">
      <p class="field-meta">Characters: ${escapeHtml(String(summary.characters || 0))}</p>
      <p class="field-meta">Sentences: ${escapeHtml(String(summary.sentences || 0))}</p>
      <p class="field-meta">Structured fields: ${escapeHtml(String(filledStructuredCount))}</p>
      <p class="field-meta">Sync source: ${escapeHtml(syncBadge)}</p>
      <p class="field-meta">${escapeHtml(summary.preview || "No preview available.")}</p>
    </div>
  `;
}

async function initializePopup() {
  const saved = await chrome.storage.local.get([
    PLATFORM_URL_STORAGE_KEY,
    BACKEND_URL_STORAGE_KEY,
    PLATFORM_PROFILE_STORAGE_KEY,
    STRUCTURED_PROFILE_STORAGE_KEY,
    PLATFORM_PROFILE_TEXT_STORAGE_KEY
  ]);

  if (saved[PLATFORM_URL_STORAGE_KEY]) {
    platformUrlInput.value = saved[PLATFORM_URL_STORAGE_KEY];
  }
  if (saved[BACKEND_URL_STORAGE_KEY]) {
    backendUrlInput.value = saved[BACKEND_URL_STORAGE_KEY];
  }

  renderProfileSummary(
    saved[PLATFORM_PROFILE_STORAGE_KEY] || null,
    saved[STRUCTURED_PROFILE_STORAGE_KEY] || null
  );
  const hasPlatformOpen = Boolean(saved[PLATFORM_URL_STORAGE_KEY]);
  const hasConnectedProfile = Boolean(saved[PLATFORM_PROFILE_TEXT_STORAGE_KEY]);
  updateFlowState({ hasPlatformOpen, hasConnectedProfile });
}

async function getPlatformTab(platformUrl) {
  const [exactTab] = await chrome.tabs.query({ url: `${platformUrl}/*` });
  if (exactTab?.id) {
    return exactTab;
  }

  const tabs = await chrome.tabs.query({});
  return tabs.find((tab) => tab.url && tab.url.startsWith(platformUrl)) || null;
}

async function syncStructuredProfile(backendUrl, profileText, userId) {
  if (!backendUrl || !profileText) {
    return { structuredProfile: null, documentContextUsed: false };
  }

  const response = await fetch(`${backendUrl}/api/profile-structure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organizationProfile: profileText,
      userId: userId || ""
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Profile sync failed: ${response.status}`);
  }

  return {
    structuredProfile: data.profile || null,
    documentContextUsed: Boolean(data.documentContextUsed)
  };
}

async function connectToPlatform() {
  const platformUrl = platformUrlInput.value.trim().replace(/\/+$/, "");
  const backendUrl = backendUrlInput.value.trim().replace(/\/+$/, "");

  if (!platformUrl) {
    setStatus("Enter the platform URL first.");
    return;
  }

  await chrome.storage.local.set({
    [PLATFORM_URL_STORAGE_KEY]: platformUrl,
    [BACKEND_URL_STORAGE_KEY]: backendUrl
  });

  const tab = await getPlatformTab(platformUrl);
  if (!tab?.id) {
    setStatus("Platform tab not found. Open the platform first, then connect.");
    updateFlowState({ hasPlatformOpen: false, hasConnectedProfile: false });
    return;
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (profileKey, summaryKey, userIdKey) => {
      try {
        const profile = window.localStorage.getItem(profileKey) || "";
        const rawSummary = window.localStorage.getItem(summaryKey);
        const summary = rawSummary ? JSON.parse(rawSummary) : null;
        const explicitUserId = window.localStorage.getItem(userIdKey) || "";
        const authKey = Object.keys(window.localStorage).find((key) => key.includes("-auth-token"));
        let userId = explicitUserId;
        if (authKey) {
          try {
            const rawSession = window.localStorage.getItem(authKey);
            const parsedSession = rawSession ? JSON.parse(rawSession) : null;
            userId = explicitUserId || parsedSession?.user?.id || parsedSession?.currentSession?.user?.id || "";
          } catch {
            userId = explicitUserId;
          }
        }
        return { profile, summary, userId };
      } catch (error) {
        return {
          profile: "",
          summary: null,
          userId: "",
          error: error instanceof Error ? error.message : "Could not read platform state."
        };
      }
    },
    args: [PROFILE_STORAGE_KEY, PROFILE_SUMMARY_STORAGE_KEY, USER_ID_STORAGE_KEY]
  });

  if (!result || result.error) {
    setStatus(result?.error || "Could not read the platform profile.");
    updateFlowState({ hasPlatformOpen: true, hasConnectedProfile: false });
    return;
  }

  if (!result.profile) {
    setStatus("No uploaded-document profile was found yet. Upload documents in the platform first.");
    renderProfileSummary(null, null);
    updateFlowState({ hasPlatformOpen: true, hasConnectedProfile: false });
    return;
  }

  let structuredProfile = null;
  let documentContextUsed = false;

  if (backendUrl) {
    try {
      const syncResult = await syncStructuredProfile(backendUrl, result.profile, result.userId || "");
      structuredProfile = syncResult.structuredProfile;
      documentContextUsed = syncResult.documentContextUsed;
    } catch (error) {
      console.warn("Structured profile sync failed", error);
    }
  }

  await chrome.storage.local.set({
    [PLATFORM_PROFILE_STORAGE_KEY]: result.summary,
    [PLATFORM_PROFILE_TEXT_STORAGE_KEY]: result.profile,
    [PLATFORM_USER_ID_STORAGE_KEY]: result.userId || "",
    [STRUCTURED_PROFILE_STORAGE_KEY]: structuredProfile
  });

  renderProfileSummary(result.summary, structuredProfile, { documentContextUsed });
  updateFlowState({ hasPlatformOpen: true, hasConnectedProfile: true });
  setStatus(structuredProfile
    ? "Connected and synced organization data successfully."
    : "Connected to the platform profile. Backend sync can be retried later."
  );
}

async function prepareCurrentPage(tabId) {
  return await chrome.tabs.sendMessage(tabId, { type: "GRANT_HELPER_PREPARE_AUTOFILL" }).catch(() => null);
}

function chooseAutofillTargets(fields) {
  const blocked = new Set([
    "password",
    "confirm_password",
    "username",
    "birth_month",
    "birth_day",
    "unknown"
  ]);

  return fields.filter((field) => {
    if (blocked.has(field.fieldKey)) {
      return false;
    }
    if (field.type === "checkbox" || field.type === "radio" || field.type === "password") {
      return false;
    }
    return field.confidenceBucket === "high";
  }).sort((a, b) => {
    if (a.required !== b.required) {
      return a.required ? -1 : 1;
    }
    return b.confidence - a.confidence;
  });
}

function getStructuredValue(structuredProfile, fieldKey) {
  if (!structuredProfile) {
    return "";
  }

  const contactName = String(structuredProfile.contact_name || "").trim();
  const contactParts = contactName.split(/\s+/).filter(Boolean);
  const direct = structuredProfile[fieldKey];
  if (String(direct || "").trim()) {
    return String(direct).trim();
  }

  if (fieldKey === "mobile_phone" && structuredProfile.phone) {
    return "";
  }

  if (fieldKey === "first_name" && contactParts.length >= 2) {
    return contactParts[0];
  }

  if (fieldKey === "last_name" && contactParts.length >= 2) {
    return contactParts.slice(1).join(" ");
  }

  if (fieldKey === "contact_name") {
    const first = String(structuredProfile.first_name || "").trim();
    const last = String(structuredProfile.last_name || "").trim();
    const full = [first, last].filter(Boolean).join(" ").trim();
    if (full) {
      return full;
    }
  }

  if (fieldKey === "organization_description" && structuredProfile.mission_statement) {
    return String(structuredProfile.mission_statement).trim();
  }

  return "";
}

function sanitizeStructuredProfile(structuredProfile) {
  if (!structuredProfile) {
    return null;
  }

  const next = { ...structuredProfile };
  const trimValue = (key) => String(next[key] || "").trim();
  const clearIfUnsafe = (key, predicate) => {
    const value = trimValue(key);
    if (!value) {
      next[key] = "";
      return;
    }
    next[key] = predicate(value) ? value : "";
  };

  clearIfUnsafe("email", isLikelyEmail);
  clearIfUnsafe("phone", isLikelyPhone);
  clearIfUnsafe("mobile_phone", isLikelyPhone);
  clearIfUnsafe("zip", isLikelyZip);
  clearIfUnsafe("city", isLikelyCityValue);
  clearIfUnsafe("state", isLikelyStateValue);
  clearIfUnsafe("country", isLikelyCountryValue);
  clearIfUnsafe("address_line_1", isLikelyAddressValue);
  clearIfUnsafe("first_name", isLikelyNameValue);
  clearIfUnsafe("last_name", isLikelyNameValue);
  clearIfUnsafe("contact_name", isLikelyNameValue);

  const first = trimValue("first_name");
  const last = trimValue("last_name");
  if (first && last && normalizeFillText(first) === normalizeFillText(last)) {
    next.last_name = "";
  }

  const contactName = trimValue("contact_name");
  if (contactName && (!first || !last)) {
    const parts = contactName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      if (!first && isLikelyNameValue(parts[0])) {
        next.first_name = parts[0];
      }
      const inferredLast = parts.slice(1).join(" ");
      if (!last && isLikelyNameValue(inferredLast)) {
        next.last_name = inferredLast;
      }
    }
  }

  return next;
}

function buildStructuredFills(fields, structuredProfile) {
  const safeStructuredProfile = sanitizeStructuredProfile(structuredProfile);
  const resolvedFields = fields.map((field) => ({
    ...field,
    resolvedFieldKey: resolveFieldKeyForFill(field)
  }));
  const fills = [];
  const hasRequiredPrimaryPhone = resolvedFields.some((field) => field.resolvedFieldKey === "phone" && field.required);
  const phoneValue = String(safeStructuredProfile?.phone || "").trim();
  const mobileValue = String(safeStructuredProfile?.mobile_phone || "").trim();

  resolvedFields.forEach((field) => {
    const resolvedFieldKey = field.resolvedFieldKey || field.fieldKey;
    let value = getStructuredValue(safeStructuredProfile, resolvedFieldKey);

    if (resolvedFieldKey === "phone" && !value && mobileValue) {
      value = mobileValue;
    }

    if (resolvedFieldKey === "mobile_phone") {
      if (mobileValue) {
        value = mobileValue;
      } else if (hasRequiredPrimaryPhone && phoneValue) {
        value = "";
      } else if (field.required && phoneValue) {
        value = phoneValue;
      }
    }

    if (!value || !isSafeValueForFieldKey(resolvedFieldKey, value)) {
      return;
    }

    fills.push({
      index: field.index,
      value,
      confidence: field.required ? "high" : "medium",
      fieldKey: resolvedFieldKey
    });
  });

  return fills;
}

function buildQuestionText(field) {
  return [
    field.label,
    field.placeholder,
    field.name,
    field.id
  ].filter(Boolean).join(" | ");
}

function normalizeFillText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPhrase(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`, "i").test(text);
}

function inferFieldKeyFromText(text, fallbackKey) {
  const normalized = normalizeFillText(text);
  if (!normalized) {
    return fallbackKey;
  }

  if (
    hasPhrase(normalized, "zip/postal code") ||
    hasPhrase(normalized, "zip postal code") ||
    hasPhrase(normalized, "postal code") ||
    hasPhrase(normalized, "zipcode") ||
    hasPhrase(normalized, "zip code")
  ) {
    return "zip";
  }

  if (
    hasPhrase(normalized, "state/province") ||
    hasPhrase(normalized, "state province") ||
    hasPhrase(normalized, "province") ||
    hasPhrase(normalized, "state")
  ) {
    return "state";
  }

  if (hasPhrase(normalized, "country")) {
    return "country";
  }

  if (hasPhrase(normalized, "city") || hasPhrase(normalized, "suburb")) {
    return "city";
  }

  if (
    hasPhrase(normalized, "address 2") ||
    hasPhrase(normalized, "address line 2") ||
    hasPhrase(normalized, "suite") ||
    hasPhrase(normalized, "apartment")
  ) {
    return "address_line_2";
  }

  if (hasPhrase(normalized, "address") || hasPhrase(normalized, "street")) {
    return "address_line_1";
  }

  if (hasPhrase(normalized, "website") || hasPhrase(normalized, "web site") || hasPhrase(normalized, "url")) {
    return "website";
  }

  if (hasPhrase(normalized, "mission statement") || hasPhrase(normalized, "organization mission")) {
    return "mission_statement";
  }

  if (hasPhrase(normalized, "organization description") || hasPhrase(normalized, "about your organization")) {
    return "organization_description";
  }

  if (hasPhrase(normalized, "mobile phone") || hasPhrase(normalized, "cell phone")) {
    return "mobile_phone";
  }

  if (hasPhrase(normalized, "phone")) {
    return "phone";
  }

  if (hasPhrase(normalized, "email")) {
    return "email";
  }

  if (hasPhrase(normalized, "first name")) {
    return "first_name";
  }

  if (hasPhrase(normalized, "last name")) {
    return "last_name";
  }

  return fallbackKey;
}

function isLikelyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isLikelyPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function isLikelyZip(value) {
  return /^\d{5}(?:-\d{4})?$/.test(String(value || "").trim());
}

function isLikelyStateValue(value) {
  const trimmed = String(value || "").trim();
  return /^[A-Za-z]{2}$/.test(trimmed) || /^[A-Za-z][A-Za-z\s.-]{2,}$/.test(trimmed);
}

function isLikelyCityValue(value) {
  const trimmed = String(value || "").trim();
  return Boolean(trimmed) && !/\d/.test(trimmed) && /^[A-Za-z][A-Za-z\s.'-]{1,}$/.test(trimmed);
}

function isLikelyCountryValue(value) {
  const trimmed = String(value || "").trim();
  return Boolean(trimmed) && !/\d/.test(trimmed) && /^[A-Za-z][A-Za-z\s.'-]{2,}$/.test(trimmed);
}

function isLikelyAddressValue(value) {
  const trimmed = String(value || "").trim();
  return Boolean(trimmed) && /\d/.test(trimmed) && /[A-Za-z]/.test(trimmed);
}

function isLikelyNameValue(value) {
  const trimmed = String(value || "").trim();
  return Boolean(trimmed) && !/\d/.test(trimmed) && /^[A-Za-z][A-Za-z\s.'-]{0,}$/.test(trimmed);
}

function isSafeValueForFieldKey(fieldKey, value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return false;
  }

  switch (fieldKey) {
    case "email":
    case "principal_investigator_email":
    case "authorized_representative_email":
    case "executive_officer_email":
      return isLikelyEmail(trimmed);
    case "phone":
    case "mobile_phone":
    case "fax":
    case "principal_investigator_phone":
    case "authorized_representative_phone":
    case "executive_officer_phone":
      return isLikelyPhone(trimmed);
    case "zip":
    case "performance_site_zip":
      return isLikelyZip(trimmed);
    case "city":
    case "performance_site_city":
      return isLikelyCityValue(trimmed);
    case "state":
    case "performance_site_state":
      return isLikelyStateValue(trimmed);
    case "country":
    case "performance_site_country":
      return isLikelyCountryValue(trimmed);
    case "address_line_1":
    case "performance_site_address_1":
      return isLikelyAddressValue(trimmed);
    case "address_line_2":
      return trimmed.length >= 2 && trimmed.length <= 120;
    case "first_name":
    case "last_name":
    case "contact_name":
    case "principal_investigator_name":
    case "authorized_representative_name":
    case "executive_officer_name":
      return isLikelyNameValue(trimmed);
    case "website":
      return /^(https?:\/\/|www\.)/i.test(trimmed) || /^[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/.*)?$/.test(trimmed);
    case "ein":
      return /^\d{2}-?\d{7}$/.test(trimmed.replace(/\s+/g, ""));
    case "mission_statement":
    case "organization_description":
    case "organization_history":
      return trimmed.length >= 20 && !isLikelyStateValue(trimmed);
    default:
      return true;
  }
}

function resolveFieldKeyForFill(field) {
  const directText = [
    field.label,
    field.placeholder,
    field.name,
    field.id
  ].filter(Boolean).join(" ");
  const directMatch = inferFieldKeyFromText(directText, "");
  if (directMatch) {
    return directMatch;
  }

  return inferFieldKeyFromText(field.descriptor, field.fieldKey);
}

function shouldUseAiFallback(field) {
  const group = getFieldGroup(field.fieldKey);
  const tagName = String(field.tagName || "").toLowerCase();
  const inputType = String(field.type || "").toLowerCase();
  const labelBlob = [field.label, field.placeholder, field.name, field.id, field.descriptor]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (tagName === "textarea") {
    return true;
  }

  if (group === "Narrative" || group === "Budget") {
    return true;
  }

  if (group === "Project" && inputType !== "date") {
    return true;
  }

  if (group === "Organization" && (
    labelBlob.includes("describe") ||
    labelBlob.includes("summary") ||
    labelBlob.includes("mission") ||
    labelBlob.includes("history") ||
    labelBlob.includes("purpose")
  )) {
    return true;
  }

  return false;
}

async function requestBatchAutofillAnswers(backendUrl, payload) {
  const response = await fetch(`${backendUrl}/api/autofill-fields`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Backend autofill failed: ${response.status}`);
  }

  return data.answers || [];
}

async function autofillCurrentPage() {
  const platformUrl = platformUrlInput.value.trim().replace(/\/+$/, "");
  const backendUrl = backendUrlInput.value.trim().replace(/\/+$/, "");

  if (!backendUrl) {
    setStatus("Enter the backend URL first.");
    return;
  }

  await chrome.storage.local.set({
    [PLATFORM_URL_STORAGE_KEY]: platformUrl,
    [BACKEND_URL_STORAGE_KEY]: backendUrl
  });

  const saved = await chrome.storage.local.get([
    PLATFORM_PROFILE_STORAGE_KEY,
    PLATFORM_PROFILE_TEXT_STORAGE_KEY,
    PLATFORM_USER_ID_STORAGE_KEY,
    STRUCTURED_PROFILE_STORAGE_KEY
  ]);

  let profileSummary = saved[PLATFORM_PROFILE_STORAGE_KEY] || null;
  let profileText = saved[PLATFORM_PROFILE_TEXT_STORAGE_KEY] || "";
  let userId = saved[PLATFORM_USER_ID_STORAGE_KEY] || "";
  let structuredProfile = saved[STRUCTURED_PROFILE_STORAGE_KEY] || null;

  if (!profileText) {
    await connectToPlatform();
    const refreshed = await chrome.storage.local.get([
      PLATFORM_PROFILE_STORAGE_KEY,
      PLATFORM_PROFILE_TEXT_STORAGE_KEY,
      PLATFORM_USER_ID_STORAGE_KEY,
      STRUCTURED_PROFILE_STORAGE_KEY
    ]);
    profileSummary = refreshed[PLATFORM_PROFILE_STORAGE_KEY] || profileSummary;
    profileText = refreshed[PLATFORM_PROFILE_TEXT_STORAGE_KEY] || "";
    userId = refreshed[PLATFORM_USER_ID_STORAGE_KEY] || "";
    structuredProfile = refreshed[STRUCTURED_PROFILE_STORAGE_KEY] || structuredProfile;
  }

  if (!profileText) {
    setStatus("No uploaded-document profile is available yet. Sync the platform first.");
    updateFlowState({ hasPlatformOpen: Boolean(platformUrl), hasConnectedProfile: false });
    return;
  }

  if (!structuredProfile) {
    try {
      const syncResult = await syncStructuredProfile(backendUrl, profileText, userId);
      structuredProfile = syncResult.structuredProfile;
      await chrome.storage.local.set({
        [STRUCTURED_PROFILE_STORAGE_KEY]: structuredProfile
      });
      renderProfileSummary(profileSummary, structuredProfile, { documentContextUsed: syncResult.documentContextUsed });
    } catch (error) {
      console.warn("Late structured profile sync failed", error);
    }
  }

  updateFlowState({ hasPlatformOpen: true, hasConnectedProfile: true });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus("Could not find the active tab.");
    return;
  }

  setStatus("Analyzing the current page and matching profile data...");
  const scanResponse = await prepareCurrentPage(tab.id);
  if (!scanResponse) {
    setStatus("This page did not respond. Refresh the page and try again.");
    return;
  }

  const targets = chooseAutofillTargets(scanResponse.fields || []);
  if (!targets.length) {
    renderFields(scanResponse);
    setStatus("No supported autofill targets were detected on this page.");
    return;
  }

  const fills = buildStructuredFills(targets, structuredProfile);
  const filledIndexes = new Set(fills.map((fill) => fill.index));
  const aiTargets = targets
    .filter((field) => !filledIndexes.has(field.index))
    .filter((field) => shouldUseAiFallback(field));

  if (aiTargets.length) {
    setStatus(`Using uploaded documents to draft ${aiTargets.length} additional answer${aiTargets.length === 1 ? "" : "s"}...`);
    try {
      const answers = await requestBatchAutofillAnswers(backendUrl, {
        fields: aiTargets.map((field) => ({
          index: field.index,
          fieldKey: resolveFieldKeyForFill(field),
          questionText: buildQuestionText(field),
          descriptor: field.descriptor,
          tagName: field.tagName,
          inputType: field.type
        })),
        pageTitle: scanResponse.title,
        pageUrl: scanResponse.url,
        organizationProfile: profileText,
        grantContext: "",
        userId
      });

      answers.forEach((answer) => {
        const resolvedFieldKey = answer.fieldKey || "unknown";
        if (answer.answer && answer.confidence !== "low" && isSafeValueForFieldKey(resolvedFieldKey, answer.answer)) {
          fills.push({
            index: answer.index,
            value: answer.answer,
            confidence: answer.confidence || "medium",
            fieldKey: resolvedFieldKey
          });
        }
      });
    } catch (error) {
      console.error("Batch autofill failed", error);
    }
  }

  if (!fills.length) {
    renderFields(scanResponse);
    setStatus("No safe autofill values were generated. Review the highlighted fields for manual mapping.");
    return;
  }

  const fillResponse = await chrome.tabs.sendMessage(tab.id, {
    type: "GRANT_HELPER_AUTOFILL_FIELDS",
    fills
  }).catch(() => null);

  renderFields(scanResponse);
  if (!fillResponse) {
    setStatus("Autofill values were prepared, but the page could not be updated.");
    return;
  }

  const applied = fillResponse.applied?.length || 0;
  const skipped = fillResponse.skipped?.length || 0;
  setStatus(`Autofilled ${applied} field${applied === 1 ? "" : "s"} from uploaded-document context. ${skipped ? `${skipped} still need review.` : "Review highlights for any remaining fields."}`);
}

autofillButton.addEventListener("click", () => {
  autofillCurrentPage().catch((error) => {
    console.error(error);
    setStatus("Could not autofill this page.");
  });
});

openPlatformButton.addEventListener("click", () => {
  chrome.tabs.create({ url: platformUrlInput.value.trim() || "http://localhost:5173" });
});

connectPlatformButton.addEventListener("click", () => {
  connectToPlatform().catch((error) => {
    console.error(error);
    setStatus("Could not connect to the platform.");
  });
});
