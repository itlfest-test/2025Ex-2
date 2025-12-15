// ============================
// script.js - 完全版（乗換案内統合）
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
  if (sliderCard && optionsData) {
    sliderCard.style.cursor = 'pointer';
    // 既存のイベントリスナーを削除
    const newSliderCard = sliderCard.cloneNode(true);
    sliderCard.parentNode.replaceChild(newSliderCard, sliderCard);
    
    newSliderCard.onclick = () => {
      const uniEl = document.getElementById("university");
      if (!uniEl) return;
      
      // 大学名とキャンパスからマッチング
      const uniName = festival.university.replace("大学", "");
      const campusName = festival.campus
        .replace("キャンパス", "")
        .replace("（", "")
        .replace("）", "");
      
      // optionsDataから一致するものを探す
      const matchingOption = optionsData.universityOptions.find(opt => {
        return opt.includes(uniName) && opt.includes(campusName);
      });
      
      if (matchingOption) {
        uniEl.value = matchingOption;
        onSearch();
        // 検索タブに切り替え
        const searchBtn = document.querySelector('.nav-btn[data-view="search"]');
        if (searchBtn) searchBtn.click();
        // スクロール
        setTimeout(() => {
          document.getElementById("search-area")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
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
// カード生成
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

  card.addEventListener("click", (e) => {
    if (e.target.closest('.fav-btn')) return;
    window.location.href = `event_detail.html?id=${ev.id}`;
  });

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
      const transitArea = document.getElementById("transit-area");
      const mapArea = document.getElementById("map-area");
      const infoArea = document.getElementById("info-area");

      if (searchArea) searchArea.classList.toggle("hidden", view !== "search");
      if (resultsArea) resultsArea.classList.toggle("hidden", view !== "search");
      if (favoritesArea) favoritesArea.classList.toggle("hidden", view !== "favorites");
      if (transitArea) transitArea.classList.toggle("hidden", view !== "transit");
      if (mapArea) mapArea.classList.toggle("hidden", view !== "map");
      if (infoArea) infoArea.classList.toggle("hidden", view !== "info");

      if (view === "favorites") {
        renderFavorites();
        renderHistory();
      } else if (view === "transit") {
        initTransitPage();
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

// ============================
// 🚇 乗換案内機能（完全統合版）
// ============================

// 運賃データ
const fareRates = {
  "東京メトロ": [
    { max: 6, fare: 180 },
    { max: 11, fare: 210 },
    { max: 19, fare: 260 },
    { max: 27, fare: 310 },
    { max: 40, fare: 330 }
  ],
  "都営地下鉄": [
    { max: 4, fare: 180 },
    { max: 8, fare: 220 },
    { max: 12, fare: 270 },
    { max: 20, fare: 320 },
    { max: 28, fare: 370 },
    { max: 40, fare: 430 }
  ],
  "JR東日本": [
    { max: 3, fare: 155 },
    { max: 6, fare: 199 },
    { max: 10, fare: 209 },
    { max: 15, fare: 253 },
    { max: 20, fare: 297 },
    { max: 25, fare: 341 },
    { max: 30, fare: 440 },
    { max: 35, fare: 528 },
    { max: 40, fare: 616 }
  ],
  "京王電鉄": [
    { max: 4, fare: 136 },
    { max: 8, fare: 167 },
    { max: 12, fare: 209 },
    { max: 16, fare: 251 },
    { max: 20, fare: 293 },
    { max: 24, fare: 335 },
    { max: 28, fare: 377 },
    { max: 32, fare: 419 },
    { max: 36, fare: 461 },
    { max: 40, fare: 503 },
    { max: 50, fare: 545 }
  ],
  "小田急電鉄": [
    { max: 4, fare: 136 },
    { max: 8, fare: 178 },
    { max: 12, fare: 220 },
    { max: 16, fare: 262 },
    { max: 20, fare: 304 },
    { max: 24, fare: 346 },
    { max: 28, fare: 388 },
    { max: 32, fare: 430 },
    { max: 36, fare: 472 },
    { max: 40, fare: 514 }
  ],
  "東急電鉄": [
    { max: 3, fare: 136 },
    { max: 7, fare: 157 },
    { max: 11, fare: 199 },
    { max: 15, fare: 220 },
    { max: 19, fare: 262 },
    { max: 23, fare: 283 },
    { max: 27, fare: 325 },
    { max: 31, fare: 346 },
    { max: 40, fare: 388 }
  ],
  "西武鉄道": [
    { max: 4, fare: 169 },
    { max: 8, fare: 207 },
    { max: 12, fare: 245 },
    { max: 16, fare: 284 },
    { max: 20, fare: 323 },
    { max: 24, fare: 362 },
    { max: 28, fare: 402 },
    { max: 32, fare: 442 },
    { max: 36, fare: 483 },
    { max: 40, fare: 521 },
    { max: 44, fare: 557 },
    { max: 48, fare: 592 }
  ],
  "東武鉄道": [
    { max: 3, fare: 146 },
    { max: 7, fare: 178 },
    { max: 11, fare: 220 },
    { max: 15, fare: 262 },
    { max: 19, fare: 304 },
    { max: 23, fare: 346 },
    { max: 27, fare: 388 },
    { max: 31, fare: 430 },
    { max: 35, fare: 472 },
    { max: 39, fare: 514 },
    { max: 43, fare: 556 },
    { max: 47, fare: 598 }
  ],
  "多摩都市モノレール": [
    { max: 3, fare: 136 },
    { max: 6, fare: 157 },
    { max: 9, fare: 199 },
    { max: 12, fare: 220 },
    { max: 15, fare: 262 },
    { max: 20, fare: 283 }
  ],
  "つくばエクスプレス": [
    { max: 5, fare: 199 },
    { max: 10, fare: 241 },
    { max: 15, fare: 283 },
    { max: 20, fare: 325 },
    { max: 25, fare: 367 },
    { max: 30, fare: 409 },
    { max: 35, fare: 451 },
    { max: 40, fare: 493 },
    { max: 45, fare: 535 },
    { max: 50, fare: 577 },
    { max: 55, fare: 619 },
    { max: 60, fare: 661 }
  ]
};

// 乗換時間データ
const transferData = {
  "飯田橋": { "JR中央・総武線 ⇔ 東京メトロ東西線": 5, "JR中央・総武線 ⇔ 東京メトロ有楽町線": 6, "JR中央・総武線 ⇔ 東京メトロ南北線": 6, "JR中央・総武線 ⇔ 都営大江戸線": 8, "東京メトロ東西線 ⇔ 東京メトロ有楽町線": 5, "東京メトロ東西線 ⇔ 東京メトロ南北線": 5, "東京メトロ東西線 ⇔ 都営大江戸線": 10, "東京メトロ有楽町線 ⇔ 東京メトロ南北線": 3, "東京メトロ有楽町線 ⇔ 都営大江戸線": 8, "東京メトロ南北線 ⇔ 都営大江戸線": 8 },
  "市ヶ谷": { "JR中央・総武線 ⇔ 東京メトロ有楽町線": 3, "JR中央・総武線 ⇔ 東京メトロ南北線": 5, "JR中央・総武線 ⇔ 都営新宿線": 5, "東京メトロ有楽町線 ⇔ 東京メトロ南北線": 3, "東京メトロ有楽町線 ⇔ 都営新宿線": 4, "東京メトロ南北線 ⇔ 都営新宿線": 5 },
  "四ツ谷": { "JR中央・総武線 ⇔ JR中央線快速": 3, "JR中央・総武線 ⇔ 東京メトロ丸ノ内線": 3, "JR中央・総武線 ⇔ 東京メトロ南北線": 4, "JR中央線快速 ⇔ 東京メトロ丸ノ内線": 2, "JR中央線快速 ⇔ 東京メトロ南北線": 3, "東京メトロ丸ノ内線 ⇔ 東京メトロ南北線": 3 },
  "後楽園": { "東京メトロ丸ノ内線 ⇔ 東京メトロ南北線": 6 },
  "春日": { "都営三田線 ⇔ 都営大江戸線": 4 }
};

// 路線データ（南北線を修正済み）
const routeData = {
  "東京メトロ南北線": [
    { from: "王子", to: "駒込", time: 4, distance: 2.4 },
    { from: "駒込", to: "東大前", time: 3, distance: 2.3 },
    { from: "東大前", to: "後楽園", time: 3, distance: 1.3 },
    { from: "後楽園", to: "飯田橋", time: 1, distance: 1.4 },
    { from: "飯田橋", to: "市ヶ谷", time: 2, distance: 1.5 },
    { from: "市ヶ谷", to: "四ツ谷", time: 1, distance: 1.0 },
    { from: "四ツ谷", to: "永田町", time: 2, distance: 1.5 },
    { from: "永田町", to: "溜池山王", time: 1, distance: 0.7 },
    { from: "溜池山王", to: "目黒", time: 12, distance: 5.7 }
  ],
  "JR中央・総武線": [
    { from: "吉祥寺", to: "三鷹", time: 2, distance: 1.6 },
    { from: "中野", to: "吉祥寺", time: 10, distance: 7.8 },
    { from: "東中野", to: "中野", time: 3, distance: 1.9 },
    { from: "新宿", to: "東中野", time: 5, distance: 2.5 },
    { from: "代々木", to: "新宿", time: 2, distance: 0.7 },
    { from: "信濃町", to: "代々木", time: 3, distance: 1.7 },
    { from: "信濃町", to: "四ツ谷", time: 2, distance: 1.3 },
    { from: "市ヶ谷", to: "四ツ谷", time: 2, distance: 0.8 },
    { from: "市ヶ谷", to: "飯田橋", time: 2, distance: 1.5 },
    { from: "飯田橋", to: "水道橋", time: 1, distance: 0.9 },
    { from: "水道橋", to: "御茶ノ水", time: 2, distance: 0.8 },
    { from: "御茶ノ水", to: "秋葉原", time: 2, distance: 0.9 }
  ],
  "東京メトロ丸ノ内線": [
    { from: "池袋", to: "茗荷谷", time: 5, distance: 3.0 },
    { from: "茗荷谷", to: "後楽園", time: 3, distance: 1.8 },
    { from: "後楽園", to: "本郷三丁目", time: 1, distance: 0.8 },
    { from: "本郷三丁目", to: "御茶ノ水", time: 1, distance: 0.8 }
  ]
};

// 乗換案内の駅リスト
const transitDestinations = [
  { name: "中央大学（市谷田町）", station: "市ヶ谷" },
  { name: "中央大学（後楽園）", station: "後楽園" },
  { name: "中央大学（茗荷谷）", station: "茗荷谷" },
  { name: "中央大学（多摩）", station: "中央大学・明星大学" },
  { name: "東京理科大（神楽坂）", station: "飯田橋" },
  { name: "東京理科大（葛飾）", station: "金町" },
  { name: "東京理科大（野田）", station: "運河" },
  { name: "法政大学（市ヶ谷）", station: "飯田橋" },
  { name: "上智大学（四谷）", station: "四ツ谷" },
  { name: "日本大学（水道橋）", station: "水道橋" },
  { name: "明治大学（和泉）", station: "明大前" },
  { name: "東京大学（駒場）", station: "駒場東大前" },
  { name: "早稲田大学（文）", station: "早稲田" },
  { name: "早稲田大学（理工）", station: "西早稲田" },
  { name: "東京科学大（湯島）", station: "御茶ノ水" },
  { name: "東京科学大（大岡山）", station: "大岡山" },
  { name: "武蔵野美術大学（鷹の台）", station: "鷹の台" },
  { name: "――――――――――", station: "", disabled: true },
  { name: "東京駅", station: "東京" },
  { name: "舞浜駅（TDL）", station: "舞浜" }
];

// 乗換案内ページ初期化
function initTransitPage() {
  const departureSelect = document.getElementById("transit-departure");
  const arrivalSelect = document.getElementById("transit-arrival");
  
  if (!departureSelect || !arrivalSelect) return;
  
  // 既に初期化済みの場合はスキップ
  if (departureSelect.options.length > 1) return;
  
  transitDestinations.forEach(dest => {
    if (dest.disabled) {
      const opt1 = new Option(dest.name, "", false, false);
      opt1.disabled = true;
      const opt2 = new Option(dest.name, "", false, false);
      opt2.disabled = true;
      departureSelect.add(opt1);
      arrivalSelect.add(opt2);
    } else {
      departureSelect.add(new Option(dest.name, dest.station));
      arrivalSelect.add(new Option(dest.name, dest.station));
    }
  });
}

// ルート検索
function searchTransitRoute() {
  const departure = document.getElementById("transit-departure")?.value;
  const arrival = document.getElementById("transit-arrival")?.value;
  const resultDiv = document.getElementById("transit-result");
  
  if (!departure || !arrival) {
    alert("出発地と到着地を選択してください");
    return;
  }
  
  if (departure === arrival) {
    alert("出発地と到着地が同じです");
    return;
  }
  
  if (!resultDiv) return;
  
  resultDiv.innerHTML = '<div style="text-align: center; color: #666;">検索中...</div>';
  
  setTimeout(() => {
    const route = findTransitRoute(departure, arrival, 'time');
    
    if (!route) {
      resultDiv.innerHTML = `
        <div style="background: #fee; border: 1px solid #fcc; border-radius: 8px; padding: 20px; color: #c33;">
          <strong>ルートが見つかりません</strong><br>
          ${departure} から ${arrival} への経路は、このシステムのデータに含まれていません。
        </div>
      `;
      return;
    }
    
    const fare = calculateTransitFare(route.segments);
    const transfers = countTransitTransfers(route.segments);
    
    resultDiv.innerHTML = `
      <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h3 style="color: #2563eb; margin-bottom: 16px;">
          <span style="background: #2563eb; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px;">早・安・短</span>
          おすすめルート
        </h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; text-align: center;">
          <div>
            <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${route.totalTime}分</div>
            <div style="font-size: 12px; color: #666;">所要時間</div>
          </div>
          <div>
            <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${fare}円</div>
            <div style="font-size: 12px; color: #666;">運賃(IC)</div>
          </div>
          <div>
            <div style="font-size: 24px; font-weight: bold; color: #9333ea;">${transfers}回</div>
            <div style="font-size: 12px; color: #666;">乗換</div>
          </div>
        </div>
        ${generateDetailedTransitRoute(route)}
      </div>
    `;
  }, 100);
}

// グラフ構築
function buildTransitGraph() {
  const graph = {};
  
  Object.entries(routeData).forEach(([lineName, segments]) => {
    segments.forEach(segment => {
      if (!graph[segment.from]) graph[segment.from] = [];
      graph[segment.from].push({
        station: segment.to,
        line: lineName,
        time: segment.time,
        distance: segment.distance
      });
      
      if (!graph[segment.to]) graph[segment.to] = [];
      graph[segment.to].push({
        station: segment.from,
        line: lineName,
        time: segment.time,
        distance: segment.distance
      });
    });
  });
  
  return graph;
}

// 乗換時間取得
function getTransferTime(station, line1, line2) {
  if (line1 === line2) return 0;
  
  const transfers = transferData[station];
  if (!transfers) return 5;
  
  const key1 = `${line1} ⇔ ${line2}`;
  const key2 = `${line2} ⇔ ${line1}`;
  
  return transfers[key1] || transfers[key2] || 5;
}

// ダイクストラ法でルート検索
function findTransitRoute(start, end, mode = 'time') {
  const graph = buildTransitGraph();
  
  if (!graph[start] || !graph[end]) {
    return null;
  }
  
  const dist = {};
  const prev = {};
  const lineUsed = {};
  const unvisited = new Set(Object.keys(graph));
  
  Object.keys(graph).forEach(station => {
    dist[station] = Infinity;
  });
  dist[start] = 0;
  
  while (unvisited.size > 0) {
    let current = null;
    let minDist = Infinity;
    
    unvisited.forEach(station => {
      if (dist[station] < minDist) {
        minDist = dist[station];
        current = station;
      }
    });
    
    if (current === null || current === end || dist[current] === Infinity) break;
    
    unvisited.delete(current);
    
    graph[current].forEach(edge => {
      if (!unvisited.has(edge.station)) return;
      
      let weight = mode === 'time' ? edge.time : edge.distance;
      
      if (prev[current]) {
        const prevLine = lineUsed[current];
        if (prevLine && prevLine !== edge.line) {
          const transferTime = getTransferTime(current, prevLine, edge.line);
          weight += transferTime;
        }
      }
      
      const newDist = dist[current] + weight;
      
      if (newDist < dist[edge.station]) {
        dist[edge.station] = newDist;
        prev[edge.station] = current;
        lineUsed[edge.station] = edge.line;
      }
    });
  }
  
  if (dist[end] === Infinity) return null;
  
  const path = [];
  let current = end;
  
  while (current !== start) {
    path.unshift(current);
    current = prev[current];
    if (!current) return null;
  }
  path.unshift(start);
  
  const segments = [];
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const line = lineUsed[to];
    
    const routeSegment = routeData[line]?.find(seg => 
      (seg.from === from && seg.to === to) || (seg.from === to && seg.to === from)
    );
    
    if (routeSegment) {
      segments.push({
        line: line,
        from: from,
        to: to,
        time: routeSegment.time,
        distance: routeSegment.distance
      });
    }
  }
  
  return {
    path: path,
    segments: segments,
    totalTime: Math.round(dist[end]),
    totalDistance: segments.reduce((sum, seg) => sum + seg.distance, 0)
  };
}

// 運賃計算
function calculateTransitFare(segments) {
  const companyDistances = {};
  
  segments.forEach(seg => {
    const company = getCompanyFromLine(seg.line);
    if (!companyDistances[company]) {
      companyDistances[company] = 0;
    }
    companyDistances[company] += seg.distance;
  });
  
  let totalFare = 0;
  Object.entries(companyDistances).forEach(([company, distance]) => {
    const rates = fareRates[company];
    if (!rates) return;
    
    for (let i = 0; i < rates.length; i++) {
      if (distance <= rates[i].max) {
        totalFare += rates[i].fare;
        break;
      }
    }
  });
  
  if (companyDistances["東京メトロ"] && companyDistances["都営地下鉄"]) {
    totalFare -= 70;
  }
  
  return totalFare;
}

// 路線から会社名を判定
function getCompanyFromLine(line) {
  if (line.includes("東京メトロ")) return "東京メトロ";
  if (line.includes("都営")) return "都営地下鉄";
  if (line.includes("JR")) return "JR東日本";
  if (line.includes("京王")) return "京王電鉄";
  if (line.includes("小田急")) return "小田急電鉄";
  if (line.includes("東急")) return "東急電鉄";
  if (line.includes("西武")) return "西武鉄道";
  if (line.includes("東武")) return "東武鉄道";
  if (line.includes("多摩モノレール") || line.includes("多摩都市モノレール")) return "多摩都市モノレール";
  if (line.includes("つくばエクスプレス")) return "つくばエクスプレス";
  return "その他";
}

// 乗換回数カウント
function countTransitTransfers(segments) {
  let count = 0;
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].line !== segments[i-1].line) {
      count++;
    }
  }
  return count;
}

// 詳細ルート生成
function generateDetailedTransitRoute(route) {
  let html = '<div style="border-top: 1px solid #ddd; padding-top: 16px;">';
  let currentLine = null;
  let lineSegments = [];
  
  for (let i = 0; i < route.segments.length; i++) {
    const seg = route.segments[i];
    
    if (currentLine !== null && seg.line !== currentLine) {
      html += generateTransitLineSection(currentLine, lineSegments);
      lineSegments = [];
    }
    
    currentLine = seg.line;
    lineSegments.push(seg);
  }
  
  if (lineSegments.length > 0) {
    html += generateTransitLineSection(currentLine, lineSegments);
  }
  
  html += '</div>';
  return html;
}

// 路線セクション生成
function generateTransitLineSection(lineName, segments) {
  if (segments.length === 0) return '';
  
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];
  const totalTime = segments.reduce((sum, seg) => sum + seg.time, 0);
  
  return `
    <div style="margin-bottom: 16px;">
      <div style="font-weight: 600; color: #2563eb; font-size: 14px; margin-bottom: 4px;">${lineName}</div>
      <div style="font-size: 14px; color: #333; margin-left: 16px;">
        ${firstSeg.from} → ${lastSeg.to} <span style="color: #666;">(約${totalTime}分)</span>
      </div>
    </div>
  `;
}
