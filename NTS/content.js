// SL Script - Content Script
// Гарна архітектура з модулями та класами

console.log("🚀 SL Script завантажено");

// === КОНФІГУРАЦІЯ ===
const CONFIG = {
  API_BASE_URL: "http://localhost:3000",
  SELECTORS: {
    timocomId: '.Normalize_normalize__LfLr9u.Link_root__UBnUWu.Link_fontStyling__iYOSOE.HeaderTitle_profileLink__YiVgzP',
    contactName: '.ContactView_name__z6l8Vf',
    loadingCountry0: '[data-testid="LoadingPlacesView/loadingPlaceCountry_0"]',
    loadingCity0: '[data-testid="LoadingPlacesView/loadingPlaceCity_0"]',
    loadingCountry1: '[data-testid="LoadingPlacesView/loadingPlaceCountry_1"]',
    loadingCity1: '[data-testid="LoadingPlacesView/loadingPlaceCity_1"]',
    freightWeight: '[data-testid="FreightDescriptionView/freightWeight"]',
    freightLength: '[data-testid="FreightDescriptionView/freightLength"]',
    vehicleBody: '[data-testid="VehicleRequirementsView/vehicleBody"]',
    additionalInfo: '[data-testid="FreightDescriptionView/additionalInformation"]',
    earliestLoadDate0: '[data-testid="LoadingPlacesView/earliestLoadingDate_0"]',
    latestLoadDate0: '[data-testid="LoadingPlacesView/latestLoadingDate_0"]',
    earliestLoadDate1: '[data-testid="LoadingPlacesView/earliestLoadingDate_1"]',
    latestLoadDate1: '[data-testid="LoadingPlacesView/latestLoadingDate_1"]',
    earliestLoadTime0: '[data-testid="LoadingPlacesView/earliestLoadingTime_0"]',
    latestLoadTime0: '[data-testid="LoadingPlacesView/latestLoadingTime_0"]',
    earliestLoadTime1: '[data-testid="LoadingPlacesView/earliestLoadingTime_1"]',
    latestLoadTime1: '[data-testid="LoadingPlacesView/latestLoadingTime_1"]',
    vehicleCharacteristics: '[data-testid="VehicleRequirementsView/vehicleCharacteristicsCertificate"]'
  },
  STORAGE_KEYS: {
    token: 'nts_token',
    userId: 'nts_user_id',
    transHistory: 'trans_history',
    idColorToggled: 'ntc_idColorToggled',
    markedFirms1: 'marked_tc_ids_1',
    markedFirms2: 'marked_tc_ids_2'
  },
  COUNTRY_NAMES: {
    AL: 'Albania', AD: 'Andora', AT: 'Austria', BY: 'Białoruś', BE: 'Belgia',
    BA: 'Bośnia i Hercegowina', BG: 'Bułgaria', HR: 'Chorwacja', CY: 'Cypr',
    CZ: 'Czechy', DK: 'Dania', EE: 'Estonia', FI: 'Finlandia', FR: 'Francja',
    DE: 'Niemcy', GR: 'Grecja', HU: 'Węgry', IS: 'Islandia', IE: 'Irlandia',
    IT: 'Włochy', LV: 'Łotwa', LI: 'Liechtenstein', LT: 'Litwa', LU: 'Luksemburg',
    MT: 'Malta', MD: 'Mołdawia', MC: 'Monako', ME: 'Czarnogóra', NL: 'Holandia',
    MK: 'Północna Macedonia', NO: 'Norwegia', PL: 'Polska', PT: 'Portugalia',
    RO: 'Rumunia', SM: 'San Marino', RS: 'Serbia', SK: 'Słowacja', SI: 'Słowenia',
    ES: 'Hiszpania', SE: 'Szwecja', CH: 'Szwajcaria', UA: 'Ukraina', GB: 'Wielka Brytania', VA: 'Watykan'
  }
};

// === УТИЛІТИ ===
class Utils {
  static formatTime(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  static formatAddress(countrySelector, citySelector) {
    const countryCode = document.querySelector(countrySelector)?.textContent.trim() || '-';
    const cityRaw = document.querySelector(citySelector)?.textContent.trim() || '-';
    const countryFull = CONFIG.COUNTRY_NAMES[countryCode] || countryCode;

    if (countryCode === 'GB' || countryCode === 'IE') {
      return `${countryCode} ${cityRaw} (${countryFull})`;
} else {
      const zipMatch = cityRaw.match(/\d{2}/);
      const zipCode = zipMatch ? zipMatch[0] : '00';
      return `${countryCode} ${zipCode} (${countryFull})`;
    }
  }

  static waitForElement(selector, callback) {
    const el = document.querySelector(selector);
    if (el) {
      callback(el);
    } else {
      const observer = new MutationObserver(() => {
        const elNow = document.querySelector(selector);
        if (elNow) {
          observer.disconnect();
          callback(elNow);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  static processWeight(weightText) {
    if (!weightText || weightText === '-') return '-';
    
    // Витягуємо число з тексту (припускаємо формат "X t" або "X t Y kg")
    const match = weightText.match(/(\d+(?:\.\d+)?)\s*t(?:\s*(\d+)\s*kg)?/i);
    if (!match) return weightText;
    
    const tons = parseFloat(match[1]);
    const kg = match[2] ? parseInt(match[2]) : 0;
    
    let totalKg = (tons * 1000) + kg;
    
    // Якщо більше 1 тонни, віднімаємо 10кг
    if (tons > 1) {
      totalKg -= 10;
    }
    // Якщо менше 1 тонни, додаємо 10кг
    else if (tons < 1) {
      totalKg += 10;
    }
    
    const newTons = Math.floor(totalKg / 1000);
    const newKg = totalKg % 1000;
    
    if (newTons > 0) {
      return newKg > 0 ? `${newTons} t ${newKg} kg` : `${newTons} t`;
    } else {
      return `${newKg} kg`;
    }
  }

  static processSpecial(specialText) {
    if (!specialText || specialText === '-') return '-';
    
    // Конвертуємо "Tail lift" на "Winda"
    let processed = specialText.replace(/Tail lift/gi, 'Winda');
    
    return processed;
  }
}

// === СИСТЕМА СПОВІЩЕНЬ ===
class ToastManager {
  constructor() {
    this.container = this.createContainer();
  }

  createContainer() {
    const container = document.createElement('div');
    container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-family: 'Segoe UI', sans-serif;
  `;
    document.body.appendChild(container);
    return container;
  }

  show(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      background: #2196F3;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      opacity: 0;
      transform: translateY(-10px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;
    
    this.container.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

// === МЕНЕДЖЕР КНОПОК ===
class ButtonManager {
  constructor(toastManager) {
    this.toastManager = toastManager;
    this.buttonStyle = `
    padding: 10px 16px;
    background: #FFFFFF;
    color: white;
    font-size: 14px;
    font-weight: bold;
    border: none;
    border-radius: 30px;
    cursor: pointer;
    transition: background 0.3s ease;
  `;
  }

  createButton(config) {
    const container = document.createElement('div');
    container.style.cssText = `position: absolute; top: ${config.top}px; right: ${config.right}px; z-index: 9999;`;
    
    const btn = document.createElement('button');
    btn.innerText = config.text;
    btn.style.cssText = this.buttonStyle;
    btn.onclick = () => {
      const text = config.getText();
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          this.toastManager.show(`${config.label}: ${text}`);
        });
      }
    };
    
    container.appendChild(btn);
    document.body.appendChild(container);
    console.log(`🔘 Кнопка ${config.text} додана`);
  }

  createButtons() {
  const buttonConfigs = [
      {
        text: '🏢', top: 98, right: 255,
        getText: () => document.querySelector(CONFIG.SELECTORS.timocomId)?.textContent.trim(),
        label: "Скопійовано"
      },
      {
        text: '👤', top: 98, right: 310,
        getText: () => document.querySelector(CONFIG.SELECTORS.contactName)?.textContent.trim(),
        label: "Скопійовано"
      },
      {
        text: ' 📍 ', top: 98, right: 430,
        getText: () => {
          const lC = document.querySelector(CONFIG.SELECTORS.loadingCountry0)?.textContent.trim();
          const lP = document.querySelector(CONFIG.SELECTORS.loadingCity0)?.textContent.trim();
          const uC = document.querySelector(CONFIG.SELECTORS.loadingCountry1)?.textContent.trim();
          const uP = document.querySelector(CONFIG.SELECTORS.loadingCity1)?.textContent.trim();
        return `${lC || '-'} ${lP || '-'} - ${uC || '-'} ${uP || '-'}`;
        },
        label: "Адреса скопійована"
      },
      {
        text: '➕', top: 98, right: 215,
        getText: () => {
          const loadC = document.querySelector(CONFIG.SELECTORS.loadingCountry0)?.textContent.trim() || '-';
          const loadCode = document.querySelector(CONFIG.SELECTORS.loadingCity0)?.textContent.trim() || '-';
          const unloadC = document.querySelector(CONFIG.SELECTORS.loadingCountry1)?.textContent.trim() || '-';
          const unloadCode = document.querySelector(CONFIG.SELECTORS.loadingCity1)?.textContent.trim() || '-';
        const label = `${loadC} ${loadCode} - ${unloadC} ${unloadCode}`;
        const url = window.location.href;
          const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.transHistory) || '[]');
        history.unshift({ url, label });
          localStorage.setItem(CONFIG.STORAGE_KEYS.transHistory, JSON.stringify(history));
          if (window.historyManager) window.historyManager.updateList();
        return label;
        },
        label: "Додано вручну"
      },
      {
        text: '🎌', top: 55, right: 310,
        getText: () => this.generatePolishDescription(),
        label: "Opis wygenerowany"
      },
      {
        text: '🏴‍☠️', top: 55, right: 245,
        getText: () => this.generateEnglishDescription(),
        label: "English description generated"
      }
    ];

    buttonConfigs.forEach(config => this.createButton(config));
    console.log(`✅ Всього додано ${buttonConfigs.length} кнопок`);
  }

  generatePolishDescription() {
    const loadC = document.querySelector(CONFIG.SELECTORS.loadingCountry0)?.textContent.trim() || '-';
    const loadCode = document.querySelector(CONFIG.SELECTORS.loadingCity0)?.textContent.trim() || '-';
    const unloadC = document.querySelector(CONFIG.SELECTORS.loadingCountry1)?.textContent.trim() || '-';
    const unloadCode = document.querySelector(CONFIG.SELECTORS.loadingCity1)?.textContent.trim() || '-';
    const historyLabel = `${loadC} ${loadCode} - ${unloadC} ${unloadCode}`;

    const loadAddr = Utils.formatAddress(CONFIG.SELECTORS.loadingCountry0, CONFIG.SELECTORS.loadingCity0);
    const unloadAddr = Utils.formatAddress(CONFIG.SELECTORS.loadingCountry1, CONFIG.SELECTORS.loadingCity1);

    const weightRaw = document.querySelector(CONFIG.SELECTORS.freightWeight)?.textContent.trim() || '-';
    const weight = Utils.processWeight(weightRaw);
    const earliestLoadDate = document.querySelector(CONFIG.SELECTORS.earliestLoadDate0)?.textContent.trim() || '-';
    const latestLoadDate = document.querySelector(CONFIG.SELECTORS.latestLoadDate0)?.textContent.trim() || '-';
    const earliestUnloadDate = document.querySelector(CONFIG.SELECTORS.earliestLoadDate1)?.textContent.trim() || '-';
    const latestUnloadDate = document.querySelector(CONFIG.SELECTORS.latestLoadDate1)?.textContent.trim() || '-';

    const loadingTime = document.querySelector(CONFIG.SELECTORS.earliestLoadTime0)?.textContent?.trim() || '8';
    const latestLoadTime = document.querySelector(CONFIG.SELECTORS.latestLoadTime0)?.textContent?.trim() || '16';
    const deliveryTime = document.querySelector(CONFIG.SELECTORS.earliestLoadTime1)?.textContent?.trim() || '8';
    const latestUnloadTime = document.querySelector(CONFIG.SELECTORS.latestLoadTime1)?.textContent?.trim() || '16';
    const loadType = document.querySelector(CONFIG.SELECTORS.additionalInfo)?.textContent.trim() || '-';

    const loadingDateText = `${earliestLoadDate}${latestLoadDate && latestLoadDate !== earliestLoadDate ? ' - ' + latestLoadDate : ''} - ${loadingTime}-${latestLoadTime}`;
    const unloadingDateText = `${earliestUnloadDate}${latestUnloadDate && latestUnloadDate !== earliestUnloadDate ? ' - ' + latestUnloadDate : ''} - ${deliveryTime}-${latestUnloadTime}`;
    
    const specialRaw = document.querySelector(CONFIG.SELECTORS.vehicleCharacteristics)?.textContent.trim() || '-';
    const Special = Utils.processSpecial(specialRaw);



    const vehicleBodyRaw = document.querySelector(CONFIG.SELECTORS.vehicleBody)?.textContent.trim() || '-';
  const vbLower = vehicleBodyRaw.toLowerCase();
  const bodyTypeMap = { 'panel van':'Firanka', 'tautliner':'Firanka', 'curtain':'Firanka', 'box':'standart', 'refrigerator':'chlodnia', 'thermo':'chlodnia' };

  const matchedTypes = Object.entries(bodyTypeMap).filter(([key]) => vbLower.includes(key)).map(([,value]) => value);
  const vehicleBody = matchedTypes.length ? matchedTypes.join(', ') : vehicleBodyRaw;

    // Додаємо до історії
  const url = window.location.href;
    const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.transHistory) || '[]');
  history.unshift({ url, label: historyLabel });
    localStorage.setItem(CONFIG.STORAGE_KEYS.transHistory, JSON.stringify(history));
    if (window.historyManager) window.historyManager.updateList();

  return `Potrzebujemy następujący typ autka: ${vehicleBody}.
Typ załadunku: ${loadType}
Ładowność: ${weight}
Załadunek z: kraj ${loadAddr}
Załadunek do: ${loadingDateText}

Dostawa do: ${unloadAddr}
Rozładunek do: ${unloadingDateText}
Dodatkowe wymagania: ${Special}
`;
  }

  generateEnglishDescription() {
    const loadC = document.querySelector(CONFIG.SELECTORS.loadingCountry0)?.textContent.trim() || '-';
    const loadCode = document.querySelector(CONFIG.SELECTORS.loadingCity0)?.textContent.trim() || '-';
    const unloadC = document.querySelector(CONFIG.SELECTORS.loadingCountry1)?.textContent.trim() || '-';
    const unloadCode = document.querySelector(CONFIG.SELECTORS.loadingCity1)?.textContent.trim() || '-';
    const historyLabel = `${loadC} ${loadCode} - ${unloadC} ${unloadCode}`;

    const loadAddr = Utils.formatAddress(CONFIG.SELECTORS.loadingCountry0, CONFIG.SELECTORS.loadingCity0);
    const unloadAddr = Utils.formatAddress(CONFIG.SELECTORS.loadingCountry1, CONFIG.SELECTORS.loadingCity1);

    const weightRaw = document.querySelector(CONFIG.SELECTORS.freightWeight)?.textContent.trim() || '-';
    const weight = Utils.processWeight(weightRaw);
    const earliestLoadDate = document.querySelector(CONFIG.SELECTORS.earliestLoadDate0)?.textContent.trim() || '-';
    const latestLoadDate = document.querySelector(CONFIG.SELECTORS.latestLoadDate0)?.textContent.trim() || '-';
    const earliestUnloadDate = document.querySelector(CONFIG.SELECTORS.earliestLoadDate1)?.textContent.trim() || '-';
    const latestUnloadDate = document.querySelector(CONFIG.SELECTORS.latestLoadDate1)?.textContent.trim() || '-';

    const loadingTime = document.querySelector(CONFIG.SELECTORS.earliestLoadTime0)?.textContent?.trim() || '8';
    const latestLoadTime = document.querySelector(CONFIG.SELECTORS.latestLoadTime0)?.textContent?.trim() || '16';
    const deliveryTime = document.querySelector(CONFIG.SELECTORS.earliestLoadTime1)?.textContent?.trim() || '8';
    const latestUnloadTime = document.querySelector(CONFIG.SELECTORS.latestLoadTime1)?.textContent?.trim() || '16';
    const loadType = document.querySelector(CONFIG.SELECTORS.additionalInfo)?.textContent.trim() || '-';

    const loadingDateText = `${earliestLoadDate}${latestLoadDate && latestLoadDate !== earliestLoadDate ? ' - ' + latestLoadDate : ''} - ${loadingTime}-${latestLoadTime}`;
    const unloadingDateText = `${earliestUnloadDate}${latestUnloadDate && latestUnloadDate !== earliestUnloadDate ? ' - ' + latestUnloadDate : ''} - ${deliveryTime}-${latestUnloadTime}`;
    
    const specialRaw = document.querySelector(CONFIG.SELECTORS.vehicleCharacteristics)?.textContent.trim() || '-';
    const Special = Utils.processSpecial(specialRaw);

    const vehicleBodyRaw = document.querySelector(CONFIG.SELECTORS.vehicleBody)?.textContent.trim() || '-';
    const vbLower = vehicleBodyRaw.toLowerCase();
    const bodyTypeMap = { 'panel van':'Curtain', 'tautliner':'Curtain', 'curtain':'Curtain', 'box':'Box', 'refrigerator':'Refrigerator', 'thermo':'Thermo' };

    const matchedTypes = Object.entries(bodyTypeMap).filter(([key]) => vbLower.includes(key)).map(([,value]) => value);
    const vehicleBody = matchedTypes.length ? matchedTypes.join(', ') : vehicleBodyRaw;

    // Додаємо до історії
    const url = window.location.href;
    const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.transHistory) || '[]');
    history.unshift({ url, label: historyLabel });
    localStorage.setItem(CONFIG.STORAGE_KEYS.transHistory, JSON.stringify(history));
    if (window.historyManager) window.historyManager.updateList();

    return `

We need the following type of vehicle: ${vehicleBody}.
Loading type: ${loadType}
Weight capacity: ${weight}
Loading from: ${loadAddr}
Loading date: ${loadingDateText}

Delivery to: ${unloadAddr}
Delivery date: ${unloadingDateText}
Additional requirements: ${Special}


`;
  }
}


// === МЕНЕДЖЕР ІСТОРІЇ ===
class HistoryManager {
  constructor(toastManager) {
    this.toastManager = toastManager;
    this.createHistoryInterface();
  }

  createHistoryInterface() {
  const historyWrapper = document.createElement('div');
  historyWrapper.style.cssText = 'position: fixed; top: 60px; right: 900px; width: 280px; z-index: 9999; font-family: "Segoe UI", sans-serif;';

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = '📜';
    toggleBtn.style.cssText = `
      padding: 10px 16px;
      background: #FFFFFF;
      color: white;
      font-size: 14px;
      font-weight: bold;
      border: none;
      border-radius: 30px;
      cursor: pointer;
      transition: background 0.3s ease;
      width: 100%;
      border-radius: 8px 8px 0 0;
    `;

  const historyList = document.createElement('div');
  historyList.style.cssText = `
    max-height: 300px;
    overflow-y: auto;
    background: #FFFFFF;
    border: 1px solid #ccc;
    border-top: none;
    display: none;
    padding: 10px;
    border-radius: 0 0 8px 8px;
  `;

  const searchInput = document.createElement('input');
  searchInput.placeholder = 'Пошук...';
  searchInput.style.cssText = `
    width: 100%;
    margin-bottom: 10px;
    padding: 6px 10px;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 14px;
  `;

    this.entriesContainer = document.createElement('div');
  historyList.appendChild(searchInput);
    historyList.appendChild(this.entriesContainer);

  const clearButton = document.createElement('button');
  clearButton.textContent = 'Очистити список';
    clearButton.style.cssText = `
      padding: 10px 16px;
      background: #C21636;
      color: white;
      font-size: 14px;
      font-weight: bold;
      border: none;
      border-radius: 30px;
      cursor: pointer;
      transition: background 0.3s ease;
      width: 100%;
      margin-top: 10px;
    `;

    toggleBtn.onclick = () => {
      historyList.style.display = historyList.style.display === 'none' ? 'block' : 'none';
    };

    clearButton.onclick = () => this.clearHistory();

    searchInput.addEventListener('input', () => this.updateList());

  historyWrapper.appendChild(toggleBtn);
  historyWrapper.appendChild(historyList);
  historyWrapper.appendChild(clearButton);
  document.body.appendChild(historyWrapper);

    this.updateList();
  }

  updateList() {
    this.entriesContainer.innerHTML = '';
    const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.transHistory) || '[]');
    const searchTerm = document.querySelector('input[placeholder="Пошук..."]')?.value.toLowerCase() || '';
    
    history.filter(entry => entry.label.toLowerCase().includes(searchTerm)).forEach((entry, index) => {
      const item = document.createElement('div');
      item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 4px 0; gap: 5px;';

      const link = document.createElement('a');
      link.textContent = entry.label;
      link.href = entry.url;
      link.target = '_blank';
      link.style.cssText = 'flex: 1; color: #1976D2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-decoration: none;';

      const copyBtn = document.createElement('button');
      copyBtn.textContent = '✂️';
      copyBtn.style.cssText = 'background: none; border: none; cursor: pointer;';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(entry.label);
        this.toastManager.show('Скопійовано: ' + entry.label);
      };

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '❌';
      removeBtn.style.cssText = 'background: none; border: none; cursor: pointer;';
      removeBtn.onclick = () => {
        history.splice(index, 1);
        localStorage.setItem(CONFIG.STORAGE_KEYS.transHistory, JSON.stringify(history));
        this.updateList();
      };

      item.appendChild(link);
      item.appendChild(copyBtn);
      item.appendChild(removeBtn);
      this.entriesContainer.appendChild(item);
    });
  }

  clearHistory() {
    const oldHistory = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.transHistory) || '[]');
    if (oldHistory.length === 0) {
      this.toastManager.show('Список вже пустий');
      return;
    }

    localStorage.setItem(CONFIG.STORAGE_KEYS.transHistory, JSON.stringify([]));
    this.updateList();
    this.toastManager.show('Список очищено');

    // Undo функціональність
    this.showUndoOption(oldHistory);
  }

  showUndoOption(oldHistory) {
    const undoContainer = document.createElement('div');
    let secondsLeft = 6;
    undoContainer.textContent = `Список очищено. ⏳ Undo (${secondsLeft})`;
    undoContainer.style.cssText = `
      margin-top: 10px;
      padding: 10px;
      background: #FFFFFF;
      border-left: 5px solid #ffc107;
      border-radius: 6px;
      font-size: 14px;
      color: #856404;
    `;

    const undoButton = document.createElement('button');
    undoButton.textContent = '↩️ Повернути';
    undoButton.style.cssText = 'margin-left: 10px; padding: 6px 12px; background: #FFFFFF; border: 2px; border-radius: 4px; cursor: pointer;';
    undoButton.onclick = () => {
      localStorage.setItem(CONFIG.STORAGE_KEYS.transHistory, JSON.stringify(oldHistory));
      this.updateList();
      this.toastManager.show('Список відновлено');
      clearTimeout(this.undoTimeout);
      undoContainer.remove();
    };

    undoContainer.appendChild(undoButton);
    this.entriesContainer.parentNode.appendChild(undoContainer);

    this.undoTimeout = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        undoContainer.remove();
        clearInterval(this.undoTimeout);
  } else {
        undoContainer.firstChild.textContent = `Список очищено. ⏳ Undo (${secondsLeft})`;
      }
    }, 1000);
  }
}

// === МЕНЕДЖЕР КОЛЬОРІВ ===
class ColorManager {
  constructor(toastManager) {
    this.toastManager = toastManager;
    this.originalColor = "";
    this.idElement = null;
    this.initializeColorToggle();
  }


  initializeColorToggle() {
    Utils.waitForElement('.HeaderTitle_timocomID__pwgaiz', (el) => {
      this.idElement = el;
      this.originalColor = el.style.color || getComputedStyle(el).color;
      this.applyColorState();
    });
  }

  applyColorState() {
    const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.idColorToggled);
    if (!this.idElement) return;

  if (stored === "true") {
      if (!this.originalColor) {
        this.originalColor = this.idElement.style.color || getComputedStyle(this.idElement).color;
    }
      this.idElement.style.color = "red";
  } else {
      if (this.originalColor) {
        this.idElement.style.color = this.originalColor;
    } else {
        this.idElement.style.color = "";
      }
    }
  }

  toggleColor() {
    const current = localStorage.getItem(CONFIG.STORAGE_KEYS.idColorToggled) === "true";
    localStorage.setItem(CONFIG.STORAGE_KEYS.idColorToggled, (!current).toString());
    this.applyColorState();
    this.toastManager.show(current ? 'Колір повернуто' : 'Колір змінено');
  }
}

// === МЕНЕДЖЕР ПОЗНАЧОК ФІРМ ===
class FirmMarkerManager {
  constructor() {
    this.storageKeys = {
      btn1: CONFIG.STORAGE_KEYS.markedFirms1,
      btn2: CONFIG.STORAGE_KEYS.markedFirms2,
      btn3: 'marked_tc_ids_3'
    };
    this.lastTCID = null;
    this.initialize();
  }

  initialize() {
    const observer = new MutationObserver(() => {
      this.checkAndUpdate();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(() => this.checkAndUpdate(), 2000);
  }

  findTCIDElement() {
    const elements = [...document.querySelectorAll('[class^="HeaderTitle_"]')];
    return elements.find(el => el.textContent.includes('TC ID:'));
  }

  createButton(tcIdElement, id, key, btnId, rightOffset, activeColor) {
    if (document.querySelector('#' + btnId)) return;

    const button = document.createElement('button');
    button.id = btnId;
    button.textContent = '★';
    button.title = 'Позначити фірму';
    button.style.cssText = `
      position: fixed;
      top: 55px;
      right: ${rightOffset}px;
      z-index: 9999;
      padding: 4px 6px;
      font-size: 16px;
      cursor: pointer;
      border: none;
      border-radius: 4px;
    `;

    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    const isMarked = stored[id];

    if (isMarked) {
      button.style.background = activeColor;
      button.style.color = 'white';
    } else {
      button.style.background = '#ccc';
      button.style.color = '#000';
    }

    button.addEventListener('click', () => {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      if (saved[id]) {
        delete saved[id];
        button.style.background = '#ccc';
        button.style.color = '#000';
      } else {
        saved[id] = true;
        button.style.background = activeColor;
        button.style.color = 'white';
      }
      localStorage.setItem(key, JSON.stringify(saved));
    });

    document.body.appendChild(button);
  }

  checkAndUpdate() {
    const tcIdElement = this.findTCIDElement();
    if (!tcIdElement) return;

    const match = tcIdElement.textContent.match(/TC ID:\s*(\d+)/);
    if (!match) return;

    const id = match[1];
    if (id !== this.lastTCID) {
      this.lastTCID = id;

      const oldBtn1 = document.querySelector('#mark-firm-btn-1');
      const oldBtn2 = document.querySelector('#mark-firm-btn-2');
      const oldBtn3 = document.querySelector('#mark-firm-btn-3');
      if (oldBtn1) oldBtn1.remove();
      if (oldBtn2) oldBtn2.remove();
      if (oldBtn3) oldBtn3.remove();

      this.createButton(tcIdElement, id, this.storageKeys.btn1, 'mark-firm-btn-1', 50, 'red');
      this.createButton(tcIdElement, id, this.storageKeys.btn2, 'mark-firm-btn-2', 70, 'yellow');
      this.createButton(tcIdElement, id, this.storageKeys.btn3, 'mark-firm-btn-3', 90, 'green');
    }
  }
}

// === МЕНЕДЖЕР ТРАНСПОРТУ ===
class TransportManager {
  constructor(toastManager, historyManager) {
    this.toastManager = toastManager;
    this.historyManager = historyManager;
    this.createTransportButton();
  }

  createTransportButton() {
    const transBtn = document.createElement('button');
    transBtn.innerText = '🚚';
    transBtn.style.cssText = `
      padding: 10px 16px;
      background: #FFFFFF;
      color: white;
      font-size: 14px;
      font-weight: bold;
      border: none;
      border-radius: 30px;
      cursor: pointer;
      transition: background 0.3s ease;
    `;
    
    const transContainer = document.createElement('div');
    transContainer.style.cssText = `position: absolute; top: 98px; right: 370px; z-index: 9999;`;
    transContainer.appendChild(transBtn);
    document.body.appendChild(transContainer);

    transBtn.onclick = () => this.handleTransportClick();
  }

  handleTransportClick() {
    const loadC = document.querySelector(CONFIG.SELECTORS.loadingCountry0)?.textContent.trim() || '-';
    const loadCode = document.querySelector(CONFIG.SELECTORS.loadingCity0)?.textContent.trim() || '-';
    const unloadC = document.querySelector(CONFIG.SELECTORS.loadingCountry1)?.textContent.trim() || '-';
    const unloadCode = document.querySelector(CONFIG.SELECTORS.loadingCity1)?.textContent.trim() || '-';
    const label = `${loadC} ${loadCode} - ${unloadC} ${unloadCode}`;
    const url = window.location.href;

    const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.transHistory) || '[]');
    history.unshift({ url, label });
    localStorage.setItem(CONFIG.STORAGE_KEYS.transHistory, JSON.stringify(history));
    this.historyManager.updateList();

    window.open("https://platform.trans.eu/dashboards", "_blank", 'width=1605,height=800,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes');
  }
}

// === ОСНОВНИЙ КЛАС ДОДАТКУ ===
class SLExtension {
  constructor() {
    // Перевіряємо чи вже ініціалізовано
    if (window.slExtensionInitialized) {
      console.log("⚠️ Розширення вже ініціалізовано на цій сторінці");
      return;
    }

    this.toastManager = new ToastManager();
    this.buttonManager = new ButtonManager(this.toastManager);
    this.historyManager = new HistoryManager(this.toastManager);
    this.colorManager = new ColorManager(this.toastManager);
    this.firmMarkerManager = new FirmMarkerManager();
    this.transportManager = new TransportManager(this.toastManager, this.historyManager);
    
    // Додаємо глобальний доступ до historyManager
    window.historyManager = this.historyManager;
    
    // Позначаємо що розширення ініціалізовано
    window.slExtensionInitialized = true;
    
    // Ініціалізуємо лічильник generate
    this.initializeGenerateCounter();
  }
  
  // === ЛІЧИЛЬНИК GENERATE ===
  async initializeGenerateCounter() {
    // Завантажуємо поточний лічильник
    const { nts_generate_count } = await chrome.storage.local.get(['nts_generate_count']);
    this.generateCount = nts_generate_count || 0;
    
    // Слухаємо натискання на кнопку generatePolishDescription
    document.addEventListener('click', (event) => {
      if (event.target && event.target.textContent && 
          event.target.textContent.includes('generatePolishDescription')) {
        this.incrementGenerateCount();
      }
    });
  }
  
  async incrementGenerateCount() {
    this.generateCount++;
    await chrome.storage.local.set({ nts_generate_count: this.generateCount });
    console.log(`📊 Generate натискань: ${this.generateCount}`);
  }

  initialize() {
    console.log("🎯 NTS Extension ініціалізовано");
    console.log("🌍 Поточна сторінка:", window.location.href);
    
    this.buttonManager.createButtons();
    
    console.log("🎉 Всі компоненти ініціалізовано успішно!");
  }
}

// === ІНІЦІАЛІЗАЦІЯ ===
class ExtensionInitializer {
  static async initialize() {
    try {
      // Подвійна перевірка домену
      if (!DomainChecker.isTimocomSite()) {
        console.log("❌ Додаткова перевірка: не сайт Timocom");
        return;
      }

      // Перевіряємо токен
      const token = await this.getToken();
      if (!token) {
        console.log("⚠️ Перед роботою не забудь залогуватись :) .");
        return;
    }

      // Валідуємо токен на сервері
      const isValid = await this.validateToken(token);
      if (!isValid) {
        console.log("❌ Токен невалідний, видаляємо зі storage");
        await chrome.storage.local.remove(CONFIG.STORAGE_KEYS.token);
        
        // Показуємо повідомлення про вихід
        TokenMonitor.showLogoutMessage();
        
        // Перезавантажуємо сторінку через 2 секунди
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
    }

      console.log("✅ Токен валідний, продовжуємо ініціалізацію");

      // Запускаємо розширення
      console.log("✅ Токен валідний, запускаємо розширення");
      const extension = new SLExtension();
      extension.initialize();

    } catch (error) {
      console.error("💥 Помилка ініціалізації:", error);
      console.log("⚠️ Продовжуємо роботу без повної ініціалізації");
      // Не показуємо alert, щоб не заважати користувачу
    }
  }

  static getToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get([CONFIG.STORAGE_KEYS.token], ({ nts_token }) => {
        console.log("🔍 Перевіряємо токен:", nts_token ? "Токен знайдено" : "Токен не знайдено");
        resolve(nts_token);
    });
});
  }

  static async validateToken(token) {
    try {
      console.log("🌐 Відправляємо запит на перевірку токена...");
      
      const response = await fetch(`${CONFIG.API_BASE_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      console.log("📡 Відповідь сервера:", response.status);
      
      if (!response.ok) {
        console.log("❌ Помилка сервера:", response.status);
        return false;
      }
      
      const data = await response.json();
      console.log("📋 Дані від сервера:", data);
      
      return data.valid === true;
    } catch (error) {
      console.error("💥 Помилка перевірки токена:", error);
      // При помилках мережі не вважаємо токен невалідним
      console.log("⚠️ Мережева помилка, продовжуємо роботу");
      return true;
    }
  }
}

// === ПЕРЕВІРКА ДОМЕНУ ===
class DomainChecker {
  static isTimocomSite() {
    const currentHost = window.location.hostname;
    const timocomDomains = [
      'my.timocom.com',
      'timocom.com',
      'www.timocom.com'
    ];
    
    return timocomDomains.some(domain => 
      currentHost === domain || currentHost.endsWith('.' + domain)
    );
  }

  static initialize() {
    console.log("🌍 Поточний сайт:", window.location.hostname);
    
    if (this.isTimocomSite()) {
      console.log("✅ Це сайт Timocom, запускаємо розширення");
      ExtensionInitializer.initialize();
    } else {
      console.log("❌ Розширення працює тільки на сайтах Timocom");
      // Не показуємо сповіщення, просто не запускаємо розширення
    }
  }

  static showDomainWarning() {
    // Сповіщення прибрано - розширення просто не запускається на не-Timocom сайтах
    console.log("ℹ️ Розширення не запускається на цьому сайті");
  }
}

// === АВТОМАТИЧНА ПЕРЕВІРКА ТОКЕНА ===
class TokenMonitor {
  static checkInterval = null;
  static lastCheck = 0;
  
  static start() {
    // Запускаємо першу перевірку через 60 секунд після ініціалізації
    setTimeout(() => {
      // Перевіряємо кожні 15 секунд
      this.checkInterval = setInterval(() => {
        this.checkTokenStatus();
      }, 15000);
      
      console.log("🔍 TokenMonitor: Запущено автоматичну перевірку токена");
    }, 60000);
  }
  
  static stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log("🛑 TokenMonitor: Зупинено автоматичну перевірку токена");
    }
  }
  
  static async checkTokenStatus() {
    try {
      const { nts_token } = await chrome.storage.local.get(['nts_token']);
    if (!nts_token) {
        console.log("🔍 TokenMonitor: Токен не знайдено");
        return;
    }

      const response = await fetch(`${CONFIG.API_BASE_URL}/token-status`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + nts_token }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.log("🔍 TokenMonitor: Токен невалідний, видаляємо зі storage");
          await chrome.storage.local.remove(['nts_token', 'nts_user_id']);
          
          // Показуємо повідомлення про вихід
          this.showLogoutMessage();
          
          // Перезавантажуємо сторінку через 2 секунди
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else if (response.status === 404) {
          console.log("🔍 TokenMonitor: Endpoint /token-status не знайдено, використовуємо /verify");
          // Fallback до /verify endpoint
          const verifyResponse = await fetch(`${CONFIG.API_BASE_URL}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: nts_token })
          });
          
          if (!verifyResponse.ok) {
            console.log("🔍 TokenMonitor: Токен невалідний через /verify");
            await chrome.storage.local.remove(['nts_token', 'nts_user_id']);
            this.showLogoutMessage();
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            console.log("✅ TokenMonitor: Токен валідний через /verify");
          }
        } else {
          console.log("🔍 TokenMonitor: Помилка сервера, пропускаємо перевірку");
        }
      } else {
        console.log("✅ TokenMonitor: Токен валідний");
      }
    } catch (error) {
      console.error("🔍 TokenMonitor: Помилка перевірки токена:", error);
      // Не виконуємо logout при помилках мережі
    }
  }
  
  static showLogoutMessage() {
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10000;
      background: #ff6b35;
      color: white;
      padding: 20px 30px;
      border-radius: 10px;
      font-family: 'Segoe UI', sans-serif;
      font-size: 16px;
      font-weight: 500;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      text-align: center;
      animation: fadeIn 0.3s ease;
    `;
    message.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 10px;">🚪</div>
      <div><strong>Вас вилоговано</strong></div>
      <div style="font-size: 14px; margin-top: 5px; opacity: 0.9;">Сторінка перезавантажиться...</div>
    `;
    
    // Додаємо CSS анімацію
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(message);
  }
}

// === ЗАПУСК ===
DomainChecker.initialize();

// Запускаємо моніторинг токена
TokenMonitor.start();

// === СЛУХАЧ ЗМІН URL ===
let currentUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    console.log("🔄 URL змінився:", currentUrl);
    
    // Зупиняємо моніторинг токена
    TokenMonitor.stop();
    
    // Скидаємо прапорець ініціалізації
    window.slExtensionInitialized = false;
    
    // Невелика затримка для завантаження нової сторінки
    setTimeout(() => {
      DomainChecker.initialize();
      // Перезапускаємо моніторинг токена
      TokenMonitor.start();
    }, 1000);
  }
});

// Спостерігаємо за змінами в DOM (SPA навігація)
urlObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// Також слухаємо події навігації
window.addEventListener('popstate', () => {
  console.log("🔄 Popstate event - URL змінився");
  
  // Зупиняємо моніторинг токена
  TokenMonitor.stop();
  
  // Скидаємо прапорець ініціалізації
  window.ntsExtensionInitialized = false;
  
  setTimeout(() => {
    DomainChecker.initialize();
    // Перезапускаємо моніторинг токена
    TokenMonitor.start();
  }, 1000);
});

// === СЛУХАЧ ЗМІН STORAGE ===
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.nts_token) {
    console.log("🔄 ExtensionInitializer: Токен змінився в storage. Перезавантажуємо сторінку.");
    
    // Якщо токен був видалений (logout з адмін панелі)
    if (!changes.nts_token.newValue) {
      console.log("🚪 ExtensionInitializer: Токен видалено, показуємо повідомлення");
      TokenMonitor.showLogoutMessage();
      
      // Перезавантажуємо через 2 секунди
      setTimeout(() => {
        location.reload();
      }, 2000);
    } else {
      // Якщо токен змінився, просто перезавантажуємо
      location.reload();
    }
  }
});