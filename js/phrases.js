const STORAGE_KEY = 'korea-travel-phrases-v2';
const PINS_KEY = 'korea-travel-pins-v1';
const OLD_PHRASES_KEY = 'korea-travel-phrases-v1';
const PINNED_FILTER = Symbol('pinned');

export async function initPhrases() {
  const search = document.getElementById('phrase-search');
  const link = document.getElementById('translate-link');
  const status = document.getElementById('phrase-status');
  const listSearch = document.getElementById('phrase-filter-search');
  const filters = document.getElementById('phrase-filters');
  const list = document.getElementById('phrase-list');
  const listStatus = document.getElementById('phrase-list-status');
  const customForm = document.getElementById('custom-phrase-form');
  const customChinese = document.getElementById('custom-chinese');
  const customKorean = document.getElementById('custom-korean');
  const customRomanization = document.getElementById('custom-romanization');
  const customStatus = document.getElementById('custom-phrase-status');
  const customList = document.getElementById('custom-phrase-list');
  const deleteSelected = document.getElementById('delete-selected-phrases');
  let phrases = [];
  let category = '全部';
  const selectedIds = new Set();
  let loaded = false;

  function speak(korean) {
    if (!('speechSynthesis' in window)) {
      listStatus.textContent = '此瀏覽器不支援語音朗讀。';
      return;
    }
    const voice = new SpeechSynthesisUtterance(korean);
    voice.lang = 'ko-KR';
    voice.rate = 0.85;
    const koreanVoice = speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith('ko'));
    if (koreanVoice) voice.voice = koreanVoice;
    speechSynthesis.cancel();
    speechSynthesis.speak(voice);
  }

  // 釘選與刪除都儲存在此裝置，重新開啟後維持原狀。
  function save(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      phrases = next;
      render();
      return true;
    } catch {
      listStatus.textContent = '無法儲存變更，請確認瀏覽器允許儲存網站資料。';
      return false;
    }
  }

  function updateDeleteButton() {
    deleteSelected.disabled = selectedIds.size === 0;
    deleteSelected.textContent = `刪除選取（${selectedIds.size}）`;
  }

  // 內建句子與自訂句子共用卡片；只有自訂句子可勾選批次刪除。
  function renderList() {
    const query = listSearch.value.trim().toLocaleLowerCase();
    const matches = phrases.filter((item) =>
      (category === '全部' || (category === PINNED_FILTER ? item.pinned : item.category === category)) &&
      [item.chinese, item.korean, item.romanization].some((value) => value.toLocaleLowerCase().includes(query))
    ).sort((a, b) => Number(b.pinned) - Number(a.pinned));
    list.replaceChildren();
    customList.replaceChildren();
    for (const id of selectedIds) {
      if (!phrases.some((item) => item.id === id && item.custom)) selectedIds.delete(id);
    }
    for (const item of matches) {
      const card = document.createElement('article');
      card.className = 'phrase-card';
      if (item.custom) {
        const selection = document.createElement('label');
        selection.className = 'phrase-select';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selectedIds.has(item.id);
        checkbox.setAttribute('aria-label', `選取刪除：${item.chinese}`);
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) selectedIds.add(item.id);
          else selectedIds.delete(item.id);
          updateDeleteButton();
        });
        selection.append(checkbox, '選取');
        card.append(selection);
      }
      const top = document.createElement('div');
      top.className = 'phrase-top';
      const intro = document.createElement('div');
      const label = document.createElement('p');
      label.className = 'phrase-category';
      label.textContent = item.category;
      const chinese = document.createElement('p');
      chinese.className = 'phrase-chinese';
      chinese.textContent = item.chinese;
      intro.append(label, chinese);
      const actions = document.createElement('div');
      actions.className = 'phrase-actions';
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.textContent = item.pinned ? '★ 已釘選' : '☆ 釘選';
      pin.setAttribute('aria-pressed', String(item.pinned));
      pin.setAttribute('aria-label', `${item.pinned ? '取消釘選' : '釘選'}：${item.chinese}`);
      pin.addEventListener('click', () => save(phrases.map((phrase) =>
        phrase.id === item.id ? { ...phrase, pinned: !phrase.pinned } : phrase
      )));
      const speakButton = document.createElement('button');
      speakButton.type = 'button';
      speakButton.className = 'speak-button';
      speakButton.textContent = '▶ 發音';
      speakButton.setAttribute('aria-label', `朗讀韓文：${item.korean}`);
      speakButton.addEventListener('click', () => speak(item.korean));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '刪除';
      remove.setAttribute('aria-label', `刪除：${item.chinese}`);
      remove.addEventListener('click', () => {
        if (confirm(`確定刪除「${item.chinese}」？`)) save(phrases.filter((phrase) => phrase.id !== item.id));
      });
      actions.append(pin, speakButton, remove);
      top.append(intro, actions);
      const korean = document.createElement('p');
      korean.className = 'phrase-korean';
      korean.lang = 'ko';
      korean.textContent = item.korean;
      const romanization = document.createElement('p');
      romanization.className = 'phrase-romanization';
      romanization.textContent = item.romanization;
      card.append(top, korean, romanization);
      (item.custom ? customList : list).append(card);
    }
    if (!matches.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-message';
      empty.textContent = '找不到符合的語句。';
      list.append(empty);
    }
    listStatus.textContent = `顯示 ${matches.length} 句用語。發音功能依裝置的韓語語音支援而定。`;
    updateDeleteButton();
  }

  function renderFilters() {
    filters.replaceChildren();
    const categories = [['全部', '全部'], ['已釘選', PINNED_FILTER],
      ...[...new Set(phrases.map((item) => item.category))].map((name) => [name, name])];
    if (!categories.some(([, value]) => value === category)) category = '全部';
    for (const [name, value] of categories) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `filter-button${value === category ? ' is-active' : ''}`;
      button.textContent = name;
      button.setAttribute('aria-pressed', String(value === category));
      button.addEventListener('click', () => {
        category = value;
        render();
      });
      filters.append(button);
    }
  }

  function render() {
    renderFilters();
    renderList();
  }

  listSearch.addEventListener('input', renderList);

  // 手動新增與批次刪除共用既有的本機儲存。
  customForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!loaded) {
      customStatus.textContent = '常用語尚未載入，請重新整理後再試。';
      return;
    }
    const chinese = customChinese.value.trim();
    const korean = customKorean.value.trim();
    if (!chinese || !korean) {
      customStatus.textContent = '請填寫中文和韓文。';
      (chinese ? customKorean : customChinese).focus();
      return;
    }
    const item = { id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      category: '我的用語', chinese, korean, romanization: customRomanization.value.trim(),
      pinned: false, custom: true };
    category = '全部';
    listSearch.value = '';
    if (save([...phrases, item])) {
      customForm.reset();
      customStatus.textContent = '已新增用語。';
    }
  });
  deleteSelected.addEventListener('click', () => {
    if (!selectedIds.size || !confirm(`確定刪除選取的 ${selectedIds.size} 句用語？`)) return;
    if (save(phrases.filter((item) => !selectedIds.has(item.id)))) {
      selectedIds.clear();
      updateDeleteButton();
      customStatus.textContent = '已刪除選取的用語。';
    }
  });

  // 文字會帶入 Google 翻譯網址，並盡可能複製到剪貼簿。
  search.addEventListener('input', () => {
    const text = search.value.trim();
    const url = new URL('https://translate.google.com/');
    if (text) {
      url.searchParams.set('sl', 'zh-TW');
      url.searchParams.set('tl', 'ko');
      url.searchParams.set('text', text);
      url.searchParams.set('op', 'translate');
    }
    link.href = url.toString();
    status.textContent = text ? '' : '先輸入中文，再開啟 Google 翻譯。';
  });
  link.addEventListener('click', (event) => {
    const text = search.value.trim();
    if (!text) {
      event.preventDefault();
      status.textContent = '請先輸入想說的中文。';
      search.focus();
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => { status.textContent = '已複製中文，可在 Google 翻譯貼上。'; })
          .catch(() => { status.textContent = '無法自動複製；若文字未帶入，請手動複製。'; });
      } else {
        search.select();
        const copied = document.execCommand?.('copy');
        status.textContent = copied ? '已複製中文，可在 Google 翻譯貼上。' : '無法自動複製；若文字未帶入，請手動複製。';
      }
    } catch {
      status.textContent = '無法自動複製；若文字未帶入，請手動複製。';
    }
  });

  // 先載入已儲存的版本；首次使用則讀取內建句庫，並承接舊版釘選。
  listStatus.textContent = '正在載入常用語…';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const old = saved === null ? localStorage.getItem(OLD_PHRASES_KEY) : null;
    let data;
    if (saved !== null || old !== null) {
      data = JSON.parse(saved ?? old);
    } else {
      const response = await fetch('./data/korean.json');
      if (!response.ok) throw new Error('無法載入內建句庫');
      data = await response.json();
    }
    if (!Array.isArray(data)) throw new Error('語句資料格式不正確');
    phrases = data.filter((item) => item && ['category', 'chinese', 'korean', 'romanization']
      .every((key) => typeof item[key] === 'string'))
      .map((item, index) => ({ ...item, id: typeof item.id === 'string' ? item.id : `seed-${index}`,
        pinned: Boolean(item.pinned), custom: item.custom === true }));

    let saveError = false;
    if (saved === null) {
      const oldPins = localStorage.getItem(PINS_KEY);
      if (oldPins !== null) {
        const storedPins = JSON.parse(oldPins);
        if (Array.isArray(storedPins)) {
          const pins = storedPins.filter((pin) => pin && typeof pin.chinese === 'string' && typeof pin.korean === 'string');
          phrases = phrases.map((item) => ({ ...item, pinned: pins.some((pin) => pin.chinese === item.chinese && pin.korean === item.korean) }));
          pins.filter((pin) => !phrases.some((item) => item.chinese === pin.chinese && item.korean === pin.korean))
            .forEach((pin, index) => phrases.push({ id: `pin-${index}`, category: '已收藏',
              chinese: pin.chinese, korean: pin.korean, romanization: '', pinned: true }));
        }
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(phrases)); } catch { saveError = true; }
    }
    loaded = true;
    render();
    if (saveError) listStatus.textContent = '常用語已顯示，但無法在此裝置儲存變更。';
  } catch {
    listStatus.textContent = '無法載入常用語，請連線後重新整理。';
  }
  if (!status.textContent) status.textContent = '先輸入中文，再開啟 Google 翻譯。';
}
