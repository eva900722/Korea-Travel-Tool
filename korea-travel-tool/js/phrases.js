const STORAGE_KEY = 'korea-travel-phrases-v1';
const PINNED_FILTER = Symbol('pinned');

export async function initPhrases() {
  const search = document.getElementById('phrase-search');
  const filters = document.getElementById('phrase-filters');
  const list = document.getElementById('phrase-list');
  const status = document.getElementById('phrase-status');
  const editor = document.getElementById('phrase-editor');
  const editorTitle = document.getElementById('phrase-editor-title');
  const form = document.getElementById('phrase-form');
  const cancel = document.getElementById('phrase-cancel');
  const photoInput = document.getElementById('photo-input');
  const photoStatus = document.getElementById('photo-status');
  const photoResult = document.getElementById('photo-result');
  const photoOriginal = document.getElementById('photo-original');
  const photoTranslated = document.getElementById('photo-translated');
  const photoSave = document.getElementById('photo-save');
  let phrases = [];
  let category = '全部';
  let editingId = null;

  // 自訂內容與釘選保存在此裝置，初次使用才載入內建句庫。
  function commit(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      phrases = next;
      render();
      return true;
    } catch {
      status.textContent = '無法儲存變更，請確認瀏覽器允許儲存網站資料。';
      return false;
    }
  }

  function speak(korean) {
    if (!('speechSynthesis' in window)) {
      status.textContent = '此瀏覽器不支援語音朗讀，仍可查看韓文與拼音。';
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

  function resetEditor() {
    editingId = null;
    form.reset();
    editorTitle.textContent = '＋ 新增句子';
    cancel.hidden = true;
    editor.open = false;
  }

  function renderList() {
    const query = search.value.trim().toLocaleLowerCase();
    const matches = phrases.filter((item) =>
      (category === '全部' || (category === PINNED_FILTER ? item.pinned : item.category === category)) &&
      [item.chinese, item.korean, item.romanization].some((value) => value.toLocaleLowerCase().includes(query))
    ).sort((a, b) => Number(b.pinned) - Number(a.pinned));
    list.replaceChildren();
    for (const item of matches) {
      const card = document.createElement('article');
      card.className = 'phrase-card';
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
      pin.addEventListener('click', () => commit(phrases.map((phrase) =>
        phrase.id === item.id ? { ...phrase, pinned: !phrase.pinned } : phrase
      )));
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'speak-button';
      button.textContent = '▶ 發音';
      button.setAttribute('aria-label', `朗讀韓文：${item.korean}`);
      button.addEventListener('click', () => speak(item.korean));
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = '編輯';
      edit.setAttribute('aria-label', `編輯：${item.chinese}`);
      edit.addEventListener('click', () => {
        editingId = item.id;
        form.elements.chinese.value = item.chinese;
        form.elements.korean.value = item.korean;
        form.elements.category.value = item.category;
        form.elements.romanization.value = item.romanization;
        editorTitle.textContent = '編輯句子';
        cancel.hidden = false;
        editor.open = true;
        form.elements.chinese.focus();
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '刪除';
      remove.setAttribute('aria-label', `刪除：${item.chinese}`);
      remove.addEventListener('click', () => {
        if (confirm(`確定刪除「${item.chinese}」？`)) {
          if (commit(phrases.filter((phrase) => phrase.id !== item.id)) && editingId === item.id) resetEditor();
        }
      });
      actions.append(pin, button, edit, remove);
      top.append(intro, actions);
      const korean = document.createElement('p');
      korean.className = 'phrase-korean';
      korean.lang = 'ko';
      korean.textContent = item.korean;
      const romanization = document.createElement('p');
      romanization.className = 'phrase-romanization';
      romanization.textContent = item.romanization;
      card.append(top, korean, romanization);
      list.append(card);
    }
    if (!matches.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-message';
      empty.textContent = '找不到符合的語句，試試其他關鍵字或新增句子。';
      list.append(empty);
    }
    status.textContent = `顯示 ${matches.length} 句常用語。發音功能依裝置的韓語語音支援而定。`;
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

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const entry = {
      category: form.elements.category.value.trim(),
      chinese: form.elements.chinese.value.trim(),
      korean: form.elements.korean.value.trim(),
      romanization: form.elements.romanization.value.trim()
    };
    if (!entry.category || !entry.chinese || !entry.korean) return;
    const next = editingId
      ? phrases.map((item) => item.id === editingId ? { ...item, ...entry } : item)
      : [...phrases, { ...entry, id: `custom-${crypto.randomUUID()}`, pinned: false }];
    if (commit(next)) resetEditor();
  });
  cancel.addEventListener('click', resetEditor);
  search.addEventListener('input', renderList);

  // 照片在選取後立即送往本站 API；僅保存使用者主動加入的翻譯結果。
  photoInput.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    photoResult.hidden = true;
    photoInput.disabled = true;
    photoStatus.textContent = '正在辨識並翻譯照片…';
    try {
      if (!file.type.startsWith('image/')) throw new Error('請選擇照片檔案。');
      const image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('無法讀取照片。'));
        reader.readAsDataURL(file);
      });
      const photo = new Image();
      photo.src = image;
      await photo.decode();
      const scale = Math.min(1, 1600 / Math.max(photo.width, photo.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(photo.width * scale);
      canvas.height = Math.round(photo.height * scale);
      canvas.getContext('2d').drawImage(photo, 0, 0, canvas.width, canvas.height);
      const encoded = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      if (encoded.length > 4_000_000) throw new Error('照片過大，請改用較小的照片。');
      const response = await fetch('./api/photo-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: encoded })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '翻譯失敗，請稍後重試。');
      photoOriginal.textContent = result.original;
      photoTranslated.textContent = result.translated;
      photoResult.hidden = false;
      photoStatus.textContent = '翻譯完成。';
    } catch (error) {
      photoStatus.textContent = error.message || '翻譯失敗，請稍後重試。';
    } finally {
      photoInput.disabled = false;
      photoInput.value = '';
    }
  });
  photoSave.addEventListener('click', () => {
    resetEditor();
    form.elements.chinese.value = photoTranslated.textContent.slice(0, 200);
    form.elements.korean.value = photoOriginal.textContent.slice(0, 200);
    editor.open = true;
    form.elements.chinese.focus();
  });

  status.textContent = '正在載入常用語…';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const data = JSON.parse(saved);
      if (!Array.isArray(data)) throw new Error('Invalid saved phrases');
      phrases = data.filter((item) => item && typeof item.id === 'string' &&
        ['category', 'chinese', 'korean', 'romanization'].every((key) => typeof item[key] === 'string'));
    } else {
      const response = await fetch('./data/korean.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid phrase data');
      phrases = data.filter((item) => item && ['category', 'chinese', 'korean', 'romanization'].every((key) => typeof item[key] === 'string'))
        .map((item, index) => ({ ...item, id: `seed-${index}`, pinned: false }));
    }
    render();
  } catch {
    status.textContent = '無法載入常用語，請連線後重新整理。';
  }
}
