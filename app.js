const STORAGE_KEY = "shopping-pwa-state-v1";
const TRASH_TTL = 24 * 60 * 60 * 1000;

const THEMES = {
  calm: {
    name: "Calm",
    bg: "#eef4f2",
    surface: "#ffffff",
    surfaceSoft: "#f8fbfa",
    ink: "#17201d",
    muted: "#65716d",
    line: "#d8e1de",
    accent: "#11695d",
    accentSoft: "#d9f1ea",
    danger: "#b33b46",
  },
  sky: {
    name: "Sky",
    bg: "#eef5ff",
    surface: "#ffffff",
    surfaceSoft: "#f7fbff",
    ink: "#172033",
    muted: "#607086",
    line: "#d7e3f5",
    accent: "#245cc7",
    accentSoft: "#dfeaff",
    danger: "#b33b46",
  },
  lavender: {
    name: "Lavender",
    bg: "#f4f0ff",
    surface: "#ffffff",
    surfaceSoft: "#fbf9ff",
    ink: "#251d38",
    muted: "#716882",
    line: "#e1d8f1",
    accent: "#6a45b8",
    accentSoft: "#e8ddff",
    danger: "#b33b72",
  },
  peach: {
    name: "Peach",
    bg: "#fff1e8",
    surface: "#ffffff",
    surfaceSoft: "#fff9f4",
    ink: "#2c1d17",
    muted: "#77675f",
    line: "#efd9ca",
    accent: "#b6562d",
    accentSoft: "#ffe1d1",
    danger: "#ad3434",
  },
  rose: {
    name: "Rose",
    bg: "#fff0f4",
    surface: "#ffffff",
    surfaceSoft: "#fff8fa",
    ink: "#2d1c23",
    muted: "#76656b",
    line: "#efd5df",
    accent: "#b33d66",
    accentSoft: "#ffdce8",
    danger: "#9f2e3b",
  },
  graphite: {
    name: "Graphite",
    bg: "#17191f",
    surface: "#22252e",
    surfaceSoft: "#1d2028",
    ink: "#f5f7fb",
    muted: "#b7bfcc",
    line: "#373c49",
    accent: "#70d6b8",
    accentSoft: "#263f3a",
    danger: "#ff8a93",
  },
  cream: {
    name: "Cream",
    bg: "#fbf5e8",
    surface: "#ffffff",
    surfaceSoft: "#fffaf0",
    ink: "#252018",
    muted: "#716958",
    line: "#e4d9c4",
    accent: "#6f6236",
    accentSoft: "#eee6ca",
    danger: "#a8413d",
  },
};

const defaultState = {
  notes: [],
  trash: [],
  activeNoteId: null,
  settings: {
    theme: "calm",
    background: "#eef4f2",
    fontSize: 17,
    sortMode: "date",
  },
};

let state = loadState();
let searchQuery = "";
let toastTimer = null;

const dom = {
  workspace: document.querySelector("#workspace"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsPanel: document.querySelector("#settingsPanel"),
  trashButton: document.querySelector("#trashButton"),
  trashPanel: document.querySelector("#trashPanel"),
  trashList: document.querySelector("#trashList"),
  trashBadge: document.querySelector("#trashBadge"),
  backButton: document.querySelector("#backButton"),
  shareButton: document.querySelector("#shareButton"),
  searchButton: document.querySelector("#searchButton"),
  searchWrap: document.querySelector("#searchWrap"),
  searchInput: document.querySelector("#searchInput"),
  themeGrid: document.querySelector("#themeGrid"),
  fontSize: document.querySelector("#fontSize"),
  toast: document.querySelector("#toast"),
};

init();

function init() {
  cleanupTrash();
  renderThemeChoices();
  applySettings();
  history.replaceState({ page: "home" }, "");
  if (state.activeNoteId) history.pushState({ page: "note" }, "");
  bindEvents();
  render();
  registerServiceWorker();
}

function bindEvents() {
  dom.settingsButton.addEventListener("click", () =>
    openPanel(dom.settingsPanel),
  );
  dom.trashButton.addEventListener("click", () => {
    renderTrash();
    openPanel(dom.trashPanel);
  });

  document.querySelectorAll("[data-close-panel]").forEach((button) => {
    button.addEventListener("click", closePanels);
  });

  [dom.settingsPanel, dom.trashPanel].forEach((panel) => {
    panel.addEventListener("click", (event) => {
      if (event.target === panel) closePanels();
    });
  });

  dom.fontSize.addEventListener("input", (event) => {
    state.settings.fontSize = Number(event.target.value);
    persist();
    applySettings();
  });

  document.querySelectorAll("input[name='sortMode']").forEach((radio) => {
    radio.addEventListener("change", (event) => {
      state.settings.sortMode = event.target.value;
      persist();
      render();
    });
  });

  dom.backButton.addEventListener("click", () => {
    history.back();
  });

  window.addEventListener("popstate", () => {
    if (state.activeNoteId) {
      pruneEmptyItems(state.activeNoteId);
      state.activeNoteId = null;
      persist();
      render();
    }
  });

  dom.searchButton.addEventListener("click", () => {
    dom.searchWrap.classList.toggle("is-open");
    if (dom.searchWrap.classList.contains("is-open")) dom.searchInput.focus();
  });

  dom.searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value.trim().toLowerCase();
    render();
  });

  dom.shareButton.addEventListener("click", copyCurrentList);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const settings = { ...defaultState.settings, ...saved?.settings };
    if (!THEMES[settings.theme]) settings.theme = "calm";
    return { ...defaultState, ...saved, settings };
  } catch {
    return structuredClone(defaultState);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateTrashBadge();
}

function renderThemeChoices() {
  dom.themeGrid.innerHTML = "";
  Object.entries(THEMES).forEach(([key, theme]) => {
    const button = document.createElement("button");
    button.className = "theme-choice";
    button.type = "button";
    button.dataset.theme = key;
    button.innerHTML = `
      <span class="theme-choice__swatches" aria-hidden="true">
        <span style="background:${theme.bg}"></span>
        <span style="background:${theme.accent}"></span>
        <span style="background:${theme.surface}"></span>
      </span>
      <span>${theme.name}</span>
    `;
    button.addEventListener("click", () => {
      state.settings.theme = key;
      state.settings.background = theme.bg;
      persist();
      applySettings();
    });
    dom.themeGrid.append(button);
  });
}

function applySettings() {
  const theme = THEMES[state.settings.theme] || THEMES.calm;
  const root = document.documentElement;

  root.style.setProperty("--app-bg", theme.bg);
  root.style.setProperty("--surface", theme.surface);
  root.style.setProperty("--surface-soft", theme.surfaceSoft);
  root.style.setProperty("--ink", theme.ink);
  root.style.setProperty("--muted", theme.muted);
  root.style.setProperty("--line", theme.line);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-soft", theme.accentSoft);
  root.style.setProperty("--danger", theme.danger);
  root.style.setProperty("--font-size", `${state.settings.fontSize}px`);

  document
    .querySelector("meta[name='theme-color']")
    ?.setAttribute("content", theme.bg);
  dom.fontSize.value = state.settings.fontSize;
  dom.themeGrid.querySelectorAll(".theme-choice").forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.theme === state.settings.theme,
    );
  });

  const sortRadio = document.querySelector(
    `input[name='sortMode'][value='${state.settings.sortMode}']`,
  );
  if (sortRadio) sortRadio.checked = true;
  updateTrashBadge();
}

function render() {
  cleanupTrash();
  const note = state.notes.find((entry) => entry.id === state.activeNoteId);
  dom.shareButton.hidden = !note;
  dom.backButton.hidden = !note;
  if (note) {
    renderNote(note);
  } else {
    renderHome();
  }
}

function renderHome() {
  const notes = getSortedNotes().filter((note) => {
    if (!searchQuery) return true;
    return (
      note.title.toLowerCase().includes(searchQuery) ||
      note.items.some((item) => item.text.toLowerCase().includes(searchQuery))
    );
  });

  dom.workspace.innerHTML = `
    <div class="screen-title">
      <div>
        <h1>Списки покупок</h1>
      </div>
      <button class="primary-action" data-create-note type="button"><span aria-hidden="true">+</span> Додати список</button>
    </div>
    <div class="list-grid" id="notesList"></div>
  `;

  dom.workspace
    .querySelector("[data-create-note]")
    .addEventListener("click", createNote);
  const list = dom.workspace.querySelector("#notesList");

  if (!notes.length) {
    list.innerHTML = `
      <div class="empty-state">
        <strong>Поки немає записів</strong>
        <span>Створіть список, додайте покупки.</span>
      </div>
    `;
    return;
  }

  notes.forEach((note) => {
    const card = document.createElement("article");
    card.className = "note-card";
    card.innerHTML = `
      <div>
        <input class="note-card__title" value="${escapeHtml(note.title)}" aria-label="Назва списку" data-rename-note="${note.id}" />
        <div class="note-card__meta">${formatDate(note.createdAt)} · ${countFilledItems(note)} покупок</div>
      </div>
      <button class="secondary-action" data-open-note="${note.id}" type="button">Відкрити</button>
    `;
    list.append(card);
  });

  bindNoteCards();
}

function renderNote(note) {
  const visibleItems = note.items.filter((item) =>
    item.text.toLowerCase().includes(searchQuery),
  );

  dom.workspace.innerHTML = `
    <div class="screen-title">
      <div>
        <p class="eyebrow">Список</p>
        <input class="note-card__title note-card__title--large" value="${escapeHtml(note.title)}" aria-label="Назва списку" data-active-title />
        <div class="note-card__meta">Створено ${formatDate(note.createdAt)}</div>
      </div>
      <button class="danger-action" data-delete-note="${note.id}" type="button">Видалити список</button>
    </div>
    <div class="items" id="itemsList"></div>
    <div class="bottom-add">
      <button class="primary-action" data-add-item type="button"><span aria-hidden="true">+</span> Додати запис</button>
    </div>
  `;

  const titleInput = dom.workspace.querySelector("[data-active-title]");
  titleInput.addEventListener("change", () =>
    renameNote(note.id, titleInput.value),
  );
  dom.workspace
    .querySelector("[data-delete-note]")
    .addEventListener("click", () => deleteNote(note.id));
  dom.workspace
    .querySelector("[data-add-item]")
    .addEventListener("click", () => addItem(note.id));

  const list = dom.workspace.querySelector("#itemsList");
  if (!visibleItems.length) {
    list.innerHTML = `<div class="empty-state"><span>Додайте першу покупку.</span></div>`;
    return;
  }

  visibleItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <input class="item-row__text" value="${escapeHtml(item.text)}" placeholder="Назва покупки" aria-label="Назва покупки" data-item-text="${item.id}" />
      <input class="item-row__qty" value="${escapeHtml(item.qty)}" placeholder="Кількість" aria-label="Кількість" data-item-qty="${item.id}" list="quantityOptions" inputmode="decimal" />
      <button class="item-row__delete" data-delete-item="${item.id}" type="button" aria-label="Видалити покупку">−</button>
    `;
    list.append(row);
  });

  bindItems(note.id);
}

function bindNoteCards() {
  dom.workspace.querySelectorAll("[data-open-note]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeNoteId = button.dataset.openNote;
      persist();
      history.pushState({ page: "note" }, "");
      render();
    });
  });

  dom.workspace.querySelectorAll("[data-rename-note]").forEach((input) => {
    input.addEventListener("change", () =>
      renameNote(input.dataset.renameNote, input.value),
    );
  });
}

function bindItems(noteId) {
  dom.workspace.querySelectorAll("[data-item-text]").forEach((input) => {
    input.addEventListener("input", () =>
      updateItem(noteId, input.dataset.itemText, { text: input.value }),
    );
  });

  dom.workspace.querySelectorAll("[data-item-qty]").forEach((input) => {
    input.addEventListener("input", () =>
      updateItem(noteId, input.dataset.itemQty, { qty: input.value }),
    );
    input.addEventListener("focus", () => input.select());
    input.addEventListener("click", () => input.select());
  });

  dom.workspace.querySelectorAll("[data-delete-item]").forEach((button) => {
    button.addEventListener("click", () =>
      deleteItem(noteId, button.dataset.deleteItem),
    );
  });
}

function createNote() {
  const now = new Date().toISOString();
  const note = {
    id: crypto.randomUUID(),
    title: `Покупки ${formatDate(now)}`,
    createdAt: now,
    updatedAt: now,
    items: [],
  };
  state.notes.push(note);
  state.activeNoteId = note.id;
  persist();
  history.pushState({ page: "note" }, "");
  render();
}

function renameNote(noteId, title) {
  const note = state.notes.find((entry) => entry.id === noteId);
  if (!note) return;
  note.title = title.trim() || `Покупки ${formatDate(note.createdAt)}`;
  note.updatedAt = new Date().toISOString();
  persist();
  render();
}

function deleteNote(noteId) {
  const index = state.notes.findIndex((entry) => entry.id === noteId);
  if (index === -1) return;
  const [note] = state.notes.splice(index, 1);
  state.trash.push({
    id: crypto.randomUUID(),
    type: "note",
    payload: note,
    deletedAt: new Date().toISOString(),
  });
  state.activeNoteId = null;
  persist();
  render();
  showToast("Список переміщено в корзину на 24 години.");
}

function addItem(noteId) {
  const note = state.notes.find((entry) => entry.id === noteId);
  if (!note) return;
  const emptyItem = note.items.find((item) => !item.text.trim());
  if (emptyItem) {
    const input = dom.workspace.querySelector(
      `[data-item-text="${emptyItem.id}"]`,
    );
    input?.focus();
    showToast("Спочатку заповніть порожній запис.");
    return;
  }
  note.items.push({
    id: crypto.randomUUID(),
    text: "",
    qty: "",
    createdAt: new Date().toISOString(),
  });
  note.updatedAt = new Date().toISOString();
  persist();
  render();
  const inputs = dom.workspace.querySelectorAll("[data-item-text]");
  inputs[inputs.length - 1]?.focus();
}

function updateItem(noteId, itemId, patch) {
  const note = state.notes.find((entry) => entry.id === noteId);
  const item = note?.items.find((entry) => entry.id === itemId);
  if (!item) return;
  Object.assign(item, patch);
  note.updatedAt = new Date().toISOString();
  persist();
}

function deleteItem(noteId, itemId) {
  const note = state.notes.find((entry) => entry.id === noteId);
  if (!note) return;
  const index = note.items.findIndex((entry) => entry.id === itemId);
  if (index === -1) return;
  const [item] = note.items.splice(index, 1);
  state.trash.push({
    id: crypto.randomUUID(),
    type: "item",
    noteId,
    noteTitle: note.title,
    payload: item,
    deletedAt: new Date().toISOString(),
  });
  note.updatedAt = new Date().toISOString();
  persist();
  render();
  showToast("Покупку переміщено в корзину на 24 години.");
}

function pruneEmptyItems(noteId) {
  const note = state.notes.find((entry) => entry.id === noteId);
  if (!note) return;
  const before = note.items.length;
  note.items = note.items.filter((item) => item.text.trim());
  if (before !== note.items.length) note.updatedAt = new Date().toISOString();
}

function countFilledItems(note) {
  return note.items.filter((item) => item.text.trim()).length;
}

function renderTrash() {
  cleanupTrash();
  if (!state.trash.length) {
    dom.trashList.innerHTML = `<div class="empty-state"><span>Корзина порожня.</span></div>`;
    return;
  }

  dom.trashList.innerHTML = "";
  state.trash.forEach((entry) => {
    const expiresAt = new Date(new Date(entry.deletedAt).getTime() + TRASH_TTL);
    const title =
      entry.type === "note"
        ? entry.payload.title
        : `${entry.payload.text || "Порожня покупка"} · ${entry.noteTitle}`;
    const card = document.createElement("article");
    card.className = "trash-entry";
    card.innerHTML = `
      <strong>${escapeHtml(title)}</strong>
      <span>Зникне: ${formatDate(expiresAt.toISOString())}</span>
      <div class="trash-entry__actions">
        <button class="secondary-action" data-restore="${entry.id}" type="button">Відновити</button>
        <button class="danger-action" data-remove="${entry.id}" type="button">Видалити</button>
      </div>
    `;
    dom.trashList.append(card);
  });

  dom.trashList.querySelectorAll("[data-restore]").forEach((button) => {
    button.addEventListener("click", () =>
      restoreTrashEntry(button.dataset.restore),
    );
  });

  dom.trashList.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () =>
      removeTrashEntry(button.dataset.remove),
    );
  });
}

function restoreTrashEntry(trashId) {
  const index = state.trash.findIndex((entry) => entry.id === trashId);
  if (index === -1) return;
  const [entry] = state.trash.splice(index, 1);

  if (entry.type === "note") {
    state.notes.push(entry.payload);
  } else {
    const note = state.notes.find((item) => item.id === entry.noteId);
    if (note) note.items.push(entry.payload);
  }

  persist();
  renderTrash();
  render();
}

function removeTrashEntry(trashId) {
  state.trash = state.trash.filter((entry) => entry.id !== trashId);
  persist();
  renderTrash();
}

function cleanupTrash() {
  const now = Date.now();
  const before = state.trash.length;
  state.trash = state.trash.filter(
    (entry) => now - new Date(entry.deletedAt).getTime() < TRASH_TTL,
  );
  if (before !== state.trash.length) persist();
}

function getSortedNotes() {
  return [...state.notes].sort((a, b) => {
    if (state.settings.sortMode === "alpha")
      return a.title.localeCompare(b.title, "uk");
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

async function copyCurrentList() {
  if (!state.activeNoteId) return;
  const text = buildShareText();
  if (!text) {
    showToast("Немає що шерити.");
    return;
  }

  try {
    await copyToClipboard(text);
    showToast("Список скопійовано в буфер.");
  } catch {
    showToast("Не вдалось скопіювати список.");
  }
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function buildShareText() {
  const note = state.notes.find((entry) => entry.id === state.activeNoteId);
  if (note) {
    const items = note.items
      .filter((item) => item.text.trim())
      .map((item) => `- ${item.text} ${item.qty ? `(${item.qty})` : ""}`)
      .join("\n");
    return `${note.title}\n${items}`;
  }

  if (!state.notes.length) return "";
  return getSortedNotes()
    .map((entry) => {
      const filledItems = entry.items.filter((item) => item.text.trim()).length;
      return `${entry.title}: ${filledItems} покупок`;
    })
    .join("\n");
}

function openPanel(panel) {
  closePanels();
  panel.hidden = false;
}

function closePanels() {
  dom.settingsPanel.hidden = true;
  dom.trashPanel.hidden = true;
}

function updateTrashBadge() {
  const count = state.trash.length;
  dom.trashBadge.hidden = count === 0;
  dom.trashBadge.textContent = count;
}

function showToast(message) {
  clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => dom.toast.classList.remove("is-visible"), 2400);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      showToast("Офлайн-режим недоступний у цьому браузері.");
    });
  });
}
window.__onNativeBack = function () {
  if (!dom.settingsPanel.hidden || !dom.trashPanel.hidden) {
    closePanels();
    return true;
  }

  if (dom.searchWrap.classList.contains("is-open")) {
    dom.searchWrap.classList.remove("is-open");
    dom.searchInput.value = "";
    searchQuery = "";
    render();
    return true;
  }

  if (state.activeNoteId) {
    pruneEmptyItems(state.activeNoteId);
    state.activeNoteId = null;
    persist();
    render();
    return true;
  }
  return false;
};
