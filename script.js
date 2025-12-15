// ============================
// script.js - 修正版（API削除）
// ============================

// --- constants / keys
const FAVORITES_KEY = "favorites";
const HISTORY_KEY = "favorite_history";
const HISTORY_MAX = 15;

// --- グローバルデータ保持用
let eventsData = [];
let optionsData = null;
let festivalsData = [];
let linksData = [];
let contactData = null;

// ============================
// 📥 JSON データ読み込み
// ============================
async function loadAllData() {
  try {
    const [events, options, festivals, links, contact] = await Promise.all([
      fetch('data/events.json').then(r => r.json()),
      fetch('data/options.json').then(r => r.json()),
      fetch('data/festivals.json').then(r => r.json()),
      fetch('data/links.json').then(r => r.json()),
      fetch('data/contact.json').then(r => r.json())
    ]);

    eventsData = events;
    optionsData = options;
    festivalsData = festivals;
    linksData = links;
    contactData = contact;

    return true;
  } catch (error) {
    console.error('データ読み込みエラー:', error);
    alert('データの読み込みに失敗しました。ページを再読み込みしてください。');
    return false;
  }
}

// --- データアクセサ
function getAllEvents() {
  return Array.isArray(eventsData) ? eventsData : [];
}

function evTitle(ev) {
  return ev.name || ev["企画名"] || ev.title || "(無題)";
}
function evUniversity(ev) {
  return ev.university || ev["大学"] || "";
}
function evCategory(ev) {
  return ev.category || ev["カテゴリ"] || "";
}
function evField(ev) {
  return ev.field || ev["分野"] || "";
}
function evDescription(ev) {
  return ev.description || ev["説明"] || "";
}
function evStartDateTime(ev) {
  return ev.startDatetime || ev.start_datetime || ev["start_datetime"] || "";
}
function evEndDateTime(ev) {
  return ev.endDatetime || ev.end_datetime || ev["end_datetime"] || "";
}
function evPlace(ev) {
  return ev.location || ev["場所"] || "";
}

// ============================
// 📅 日時を人間が読みやすい形式に変換
// ============================
function formatDateTime(startStr, endStr) {
  if (!startStr) return "";
  
  try {
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : null;
    
    const year = start.getFullYear();
    const month = start.getMonth() + 1;
    const day = start.getDate();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[start.getDay()];
    
    const startHour = String(start.getHours()).padStart(2, '0');
    const startMin = String(start.getMinutes()).padStart(2, '0');
    
    let result = `${year}年${month}月${day}日（${weekday}） ${startHour}:${startMin}`;
    
    if (end) {
      const endHour = String(end.getHours()).padStart(2, '0');
      const endMin = String(end.getMinutes()).padStart(2, '0');
      result += `～${endHour}:${endMin}`;
    }
    
    return result;
  } catch (e) {
    return startStr;
  }
}

// ============================
// 初期ロード
// ============================
document.addEventListener("DOMContentLoaded", async () => {
  const loaded = await loadAllData();
  if (!loaded) return;

  try {
    loadOptionsSafe();
  } catch (e) {
    console.warn("loadOptionsSafe error:", e);
  }

  try {
    setupNavigation();
  } catch (e) {
    console.warn("setupNavigation error:", e);
  }

  try {
    setupIntroModal();
  } catch (e) {
    console.warn("setupIntroModal error:", e);
  }

  try {
    setupFestivalSlider();
  } catch (e) {
    console.warn("setupFestivalSlider error:", e);
  }

  try {
    setupInfoPage();
  } catch (e) {
    console.warn("setupInfoPage error:", e);
  }

  try {
    setupDescriptionButtons();
  } catch (e) {
    console.warn("setupDescriptionButtons error:", e);
  }

  renderResults(getAllEvents());
  loadFavorites();
  loadHistory();

  const sBtn = document.getElementById("searchBtn");
  const cBtn = document.getElementById("clearBtn");
  if (sBtn) sBtn.addEventListener("click", onSearch);
  if (cBtn) cBtn.addEventListener("click", onClear);
});

// ============================
// 🎪 学祭情報スライダー
// ============================
let currentSlide = 0;

function setupFestivalSlider() {
  if (!festivalsData || festivalsData.length === 0) return;

  const prevBtn = document.getElementById("sliderPrev");
  const nextBtn = document.getElementById("sliderNext");
  const dotsContainer = document.getElementById("sliderDots");

  festivalsData.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.className = "slider-dot";
    if (index === 0) dot.classList.add("active");
    dot.addEventListener("click", () => goToSlide(index));
    dotsContainer.appendChild(dot);
  });

  if (prevBtn) prevBtn.addEventListener("click", () => changeSlide(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => changeSlide(1));

  updateSlide();
  setInterval(() => changeSlide(1), 5000);
}

function changeSlide(direction) {
  currentSlide += direction;
  if (currentSlide < 0) currentSlide = festivalsData.length - 1;
  if (currentSlide >= festivalsData.length) currentSlide = 0;
  updateSlide();
}

function goToSlide(index) {
  currentSlide = index;
  updateSlide();
}

function updateSlide() {
  if (!festivalsData || festivalsData.length === 0) return;

  const festival = festivalsData[currentSlide];
  
  const nameEl = document.getElementById("sliderFestivalName");
  const datesEl = document.getElementById("sliderDates");
  const highlightEl = document.getElementById("sliderHighlight");
  const messageEl = document.getElementById("sliderMessage");

  if (nameEl) {
    const number = festival.number ? `${festival.number} ` : "";
    nameEl.textContent = `${festival.university} ${number}${festival.festivalName}`;
  }
  if (datesEl) datesEl.textContent = `開催日：${festival.dates}`;
  if (highlightEl) highlightEl.textContent = `目玉企画：${festival.highlight}`;
  if (messageEl) messageEl.textContent = festival.message;

  const dots = document.querySelectorAll(".slider-dot");
  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentSlide);
  });

  // 🆕 スライダークリックで大学名検索
  const sliderCard = document.querySelector('.festival-slider-card');
  if (sliderCard) {
    sliderCard.style.cursor = 'pointer';
    sliderCard.onclick = () => {
      const uniEl = document.getElementById("university");
      if (uniEl) {
        // festivalsDataのuniversityとoptionsDataのマッチング
        const universityName = festival.campus; // "市谷田町キャンパス" など
        const matchingOption = optionsData.universityOptions.find(opt => 
          opt.includes(festival.university.replace("大学", "")) && 
          opt.includes(universityName.replace("キャンパス", "").replace("（", "").replace("）", ""))
        );
        
        if (matchingOption) {
          uniEl.value = matchingOption;
          onSearch();
          document.getElementById("search-area")?.scrollIntoView({ behavior: "smooth" });
        }
      }
    };
  }
}

// ============================
// ℹ️ 情報ページ
// ============================
function setupInfoPage() {
  const linksList = document.getElementById("links-list");
  if (linksList && linksData && linksData.length > 0) {
    linksData.forEach(link => {
      const card = document.createElement("div");
      card.className = "link-card";
      
      const hasUrl = link.url && link.url !== "";
      const hasInstagram = link.sns.instagram && link.sns.instagram !== "";
      const hasX = link.sns.x && link.sns.x !== "";
      
      card.innerHTML = `
        <div class="link-card-title">${escapeHtml(link.university)}</div>
        <div class="link-card-campus">${escapeHtml(link.campus)}</div>
        <div class="link-card-festival">${escapeHtml(link.festivalName)}</div>
        ${hasUrl ? `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" class="link-card-url">${escapeHtml(link.url)}</a>` : '<div class="link-card-url" style="color:#999;">URL準備中</div>'}
        ${hasInstagram || hasX ? `
          <div class="link-card-sns">
            ${hasInstagram ? `<a href="https://instagram.com/${escapeHtml(link.sns.instagram).replace('@', '')}" target="_blank" rel="noopener" class="sns-link">📷 ${escapeHtml(link.sns.instagram)}</a>` : ''}
            ${hasX ? `<a href="https://x.com/${escapeHtml(link.sns.x).replace('@', '')}" target="_blank" rel="noopener" class="sns-link">𝕏 ${escapeHtml(link.sns.x)}</a>` : ''}
          </div>
        ` : ''}
      `;
      linksList.appendChild(card);
    });
  }

  const contactInfo = document.getElementById("contact-info");
  if (contactInfo && contactData && contactData.email) {
    contactInfo.innerHTML = `
      <p class="contact-message">${escapeHtml(contactData.message || "")}</p>
      <div class="contact-item">
        <span class="contact-label">Email:</span>
        <span class="contact-value">${escapeHtml(contactData.email)}</span>
      </div>
      ${contactData.sns.instagram ? `
        <div class="contact-item">
          <span class="contact-label">Instagram:</span>
          <a href="${escapeHtml(contactData.sns.instagram.url)}" target="_blank" rel="noopener" class="contact-link">${escapeHtml(contactData.sns.instagram.id)}</a>
        </div>
      ` : ''}
      ${contactData.sns.x ? `
        <div class="contact-item">
          <span class="contact-label">X (Twitter):</span>
          <a href="${escapeHtml(contactData.sns.x.url)}" target="_blank" rel="noopener" class="contact-link">${escapeHtml(contactData.sns.x.id)}</a>
        </div>
      ` : ''}
    `;
  }
}

// ============================
// 📖 説明ボタン
// ============================
function setupDescriptionButtons() {
  const descModal = document.getElementById("descModal");
  const descTitle = document.getElementById("descTitle");
  const descText = document.getElementById("descText");
  const descClose = document.getElementById("descClose");
  const descOk = document.getElementById("descOk");

  document.querySelectorAll(".info-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;
      const selectEl = document.getElementById(type);
      const selectedValue = selectEl ? selectEl.value : "";

      let title = "";
      let text = "";

      if (type === "category") {
        const categories = optionsData?.categoryOptions || [];
        if (selectedValue) {
          const cat = categories.find(c => c.value === selectedValue);
          if (cat) {
            title = cat.value;
            text = cat.description;
          }
        } else {
          title = "カテゴリについて";
          text = "企画のジャンルを選択できます。お笑い、音楽、展示、飲食など様々なカテゴリから絞り込めます。";
        }
      } else if (type === "field") {
        const fields = optionsData?.fieldOptions || [];
        if (selectedValue) {
          const field = fields.find(f => f.value === selectedValue);
          if (field) {
            title = field.value;
            text = field.description;
          }
        } else {
          title = "分野について";
          text = "企画の学問分野を選択できます。理工、芸術、社会、法など、専門分野で絞り込めます。";
        }
      } else if (type === "university") {
        title = "大学について";
        text = "開催キャンパスで絞り込めます。複数キャンパスで開催している大学もあります。";
      }

      if (descTitle) descTitle.textContent = title;
      if (descText) descText.textContent = text;
      if (descModal) descModal.classList.remove("hidden");
    });
  });

  if (descClose) descClose.addEventListener("click", () => {
    if (descModal) descModal.classList.add("hidden");
  });
  if (descOk) descOk.addEventListener("click", () => {
    if (descModal) descModal.classList.add("hidden");
  });
}

// ============================
// 🔍 検索処理
// ============================
function onSearch() {
  const uni = (document.getElementById("university") || {}).value || "";
  const cat = (document.getElementById("category") || {}).value || "";
  const field = (document.getElementById("field") || {}).value || "";

  const all = getAllEvents();
  const filtered = all.filter((ev) => {
    if (uni && evUniversity(ev) !== uni) return false;
    if (cat && evCategory(ev) !== cat) return false;
    if (field && evField(ev) !== field) return false;
    return true;
  });

  renderResults(filtered);
}

function onClear() {
  const uniEl = document.getElementById("university");
  const catEl = document.getElementById("category");
  const fieldEl = document.getElementById("field");
  if (uniEl) uniEl.value = "";
  if (catEl) catEl.value = "";
  if (fieldEl) fieldEl.value = "";
  renderResults(getAllEvents());
}

// ============================
// 📄 結果表示
// ============================
async function renderResults(list) {
  const area = document.getElementById("results");
  const noData = document.getElementById("no-results");
  if (!area) return;

  area.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    if (noData) noData.hidden = false;
    return;
  }
  if (noData) noData.hidden = true;

  for (const ev of list) {
    const card = await createEventCard(ev);
    area.appendChild(card);
  }
}

// ============================
// カード生成（修正版：API削除、詳細ページ遷移）
// ============================
async function createEventCard(ev) {
  const card = document.createElement("article");
  card.className = "result-card";
  card.dataset.eventId = ev.id;

  const favs = loadFavoritesArray();
  const isFav = favs.includes(ev.id);

  const fullDescription = evDescription(ev);
  const university = evUniversity(ev);

  card.innerHTML = `
    <button class="fav-btn ${isFav ? "active" : ""}" data-id="${ev.id}" aria-label="お気に入り">⭐</button>
    <h4>${escapeHtml(evTitle(ev))}</h4>
    <p class="muted event-summary">${escapeHtml(fullDescription)}</p>
    <div class="card-meta">
      <span class="university-tag">
        ${escapeHtml(university)}
      </span> /
      ${escapeHtml(evCategory(ev))} /
      ${escapeHtml(evField(ev))}
    </div>
  `;

  // 🆕 カードクリック → event_detail.html?id=◯◯ へ遷移
  card.addEventListener("click", (e) => {
    // お気に入りボタンのクリックは除外
    if (e.target.closest('.fav-btn')) return;
    window.location.href = `event_detail.html?id=${ev.id}`;
  });

  // ⭐ お気に入りボタン
  const favBtn = card.querySelector(".fav-btn");
  if (favBtn) {
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(ev);
    });
  }

  return card;
}

function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ============================
// ⭐ お気に入り管理
// ============================
function loadFavoritesArray() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
}
function loadHistoryArray() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveFavoritesArray(arr) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr));
}
function saveHistoryArray(arr) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
}

function toggleFavorite(ev) {
  const id = ev.id;
  if (typeof id === "undefined") return;

  let favs = loadFavoritesArray();
  let history = loadHistoryArray();

  if (favs.includes(id)) {
    favs = favs.filter((x) => x !== id);
  } else {
    favs.unshift(id);
    history = addToHistory(id, history);
  }

  saveFavoritesArray(favs);
  saveHistoryArray(history);

  renderFavorites();
  renderHistory();

  const uni = (document.getElementById("university") || {}).value || "";
  const cat = (document.getElementById("category") || {}).value || "";
  const field = (document.getElementById("field") || {}).value || "";

  if (uni || cat || field) onSearch();
  else renderResults(getAllEvents());
}

async function renderFavorites() {
  const list = document.getElementById("favorites-list");
  if (!list) return;
  list.innerHTML = "";

  const favs = loadFavoritesArray();
  if (favs.length === 0) {
    list.innerHTML = '<div class="muted">お気に入りはまだありません。</div>';
    return;
  }

  const all = getAllEvents();
  for (const id of favs) {
    const ev = all.find((x) => x.id === id);
    if (ev) {
      const card = await createEventCard(ev);
      list.appendChild(card);
    }
  }
}

function loadFavorites() {
  renderFavorites();
}
function loadHistory() {
  renderHistory();
}

// ============================
// 🕘 履歴管理
// ============================
function addToHistory(id, history) {
  let h = Array.isArray(history) ? history.slice() : loadHistoryArray();
  h = h.filter((x) => x !== id);
  h.unshift(id);
  if (h.length > HISTORY_MAX) h = h.slice(0, HISTORY_MAX);
  return h;
}

function renderHistory() {
  const area = document.getElementById("fav-history");
  if (!area) return;
  area.innerHTML = "";

  const history = loadHistoryArray();
  if (history.length === 0) {
    area.innerHTML = '<div class="muted">履歴はありません。</div>';
    return;
  }

  const all = getAllEvents();
  history.forEach((id) => {
    const ev = all.find((e) => e.id === id);
    if (!ev) return;

    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(evTitle(ev))}</strong>
        <div class="muted">${escapeHtml(evUniversity(ev))}</div>
      </div>
      <div class="history-actions">
        <button class="btn small readd" data-id="${id}">再登録</button>
        <button class="btn small del" data-id="${id}">🗑️</button>
      </div>
    `;

    item.querySelector(".readd").addEventListener("click", () => {
      const favs = loadFavoritesArray();
      if (!favs.includes(id)) {
        favs.unshift(id);
        saveFavoritesArray(favs);
      }
      renderFavorites();
      renderHistory();
    });

    item.querySelector(".del").addEventListener("click", () => {
      let h = loadHistoryArray().filter((x) => x !== id);
      saveHistoryArray(h);
      renderHistory();
    });

    area.appendChild(item);
  });
}

// ============================
// 📱 ナビゲーション
// ============================
function setupNavigation() {
  const buttons = document.querySelectorAll(".nav-btn");
  if (!buttons) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const view = btn.dataset.view;
      const searchArea = document.getElementById("search-area");
      const resultsArea = document.getElementById("results-area");
      const favoritesArea = document.getElementById("favorites-area");
      const mapArea = document.getElementById("map-area");
      const infoArea = document.getElementById("info-area");

      if (searchArea) searchArea.classList.toggle("hidden", view !== "search");
      if (resultsArea) resultsArea.classList.toggle("hidden", view !== "search");
      if (favoritesArea) favoritesArea.classList.toggle("hidden", view !== "favorites");
      if (mapArea) mapArea.classList.toggle("hidden", view !== "map");
      if (infoArea) infoArea.classList.toggle("hidden", view !== "info");

      if (view === "favorites") {
        renderFavorites();
        renderHistory();
      }
    });
  });
}

// ============================
// 📝 初回モーダル
// ============================
function setupIntroModal() {
  const modal = document.getElementById("introModal");
  const dontShow = document.getElementById("dontShow");
  const closeBtns = [
    document.getElementById("introClose"),
    document.getElementById("introOk")
  ];

  if (!localStorage.getItem("hideIntro") && modal) {
    setTimeout(() => modal.classList.remove("hidden"), 280);
  }

  closeBtns.forEach((btn) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (dontShow && dontShow.checked) localStorage.setItem("hideIntro", "1");
      if (modal) modal.classList.add("hidden");
    });
  });
}

// ============================
// 📌 セレクト選択肢ロード
// ============================
function loadOptionsSafe() {
  try {
    const uniEl = document.getElementById("university");
    const catEl = document.getElementById("category");
    const fieldEl = document.getElementById("field");

    if (!uniEl || !catEl || !fieldEl) {
      console.warn("select elements missing");
      return;
    }

    if (!optionsData) {
      console.warn("optionsData not loaded");
      return;
    }

    if (Array.isArray(optionsData.universityOptions)) {
      uniEl.innerHTML = `<option value="">指定なし</option>`;
      optionsData.universityOptions.forEach((u) => {
        const op = document.createElement("option");
        op.value = u;
        op.textContent = u;
        uniEl.appendChild(op);
      });
    }

    if (Array.isArray(optionsData.categoryOptions)) {
      catEl.innerHTML = `<option value="">指定なし</option>`;
      optionsData.categoryOptions.forEach((c) => {
        const op = document.createElement("option");
        op.value = c.value;
        op.textContent = c.value;
        catEl.appendChild(op);
      });
    }

    if (Array.isArray(optionsData.fieldOptions)) {
      fieldEl.innerHTML = `<option value="">指定なし</option>`;
      optionsData.fieldOptions.forEach((f) => {
        const op = document.createElement("option");
        op.value = f.value;
        op.textContent = f.value;
        fieldEl.appendChild(op);
      });
    }
  } catch (e) {
    console.error("loadOptionsSafe failed:", e);
  }
}
