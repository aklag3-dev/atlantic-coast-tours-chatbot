window.ACTApp = (function () {
  'use strict';

  var els = {};
  var state = {
    history: [],
    sending: false,
    infoOpen: false,
    lastFocused: null,
    tours: [],
    locationEnabled: false,
    userLocation: null,
    locationLoading: false,
    locationError: null,
    aiConfigured: false,
    personaEnabled: false,
    darkEnabled: false,
    lastResponsePersona: null
  };

  function $(id) { return document.getElementById(id); }

  function init() {
    cacheDom();
    checkAiStatus();
    bindHeader();
    bindComposer();
    bindInfo();
    bindLocation();
    renderWelcome();
  }

  function cacheDom() {
    els.thread = $('thread');
    els.composerInput = $('composer-input');
    els.composerForm = $('composer-form');
    els.sendBtn = $('send-btn');
    els.infoBtn = $('info-btn');
    els.infoOverlay = $('info-overlay');
    els.infoPanel = $('info-panel');
    els.infoCloseBtn = $('info-close-btn');
    els.statusLine = $('status-line');
    els.locBtn = $('loc-btn');
    els.locLabel = $('loc-label');
    els.locError = $('loc-error');
    els.suggestionsArea = $('suggestions-area');
    els.personaBtn = $('persona-btn');
    els.darkBtn = $('dark-btn');
  }

  function checkAiStatus() {
    state.aiConfigured = !!(window.ACTGemini && window.ACTGemini.isConfigured());
  }

  function bindHeader() {
    els.infoBtn.addEventListener('click', openInfo);

    // Persona toggle
    if (els.personaBtn) {
      var savedPersona = localStorage.getItem('act-persona');
      if (savedPersona === 'true') {
        state.personaEnabled = true;
        els.personaBtn.textContent = '\u{1F9D1}\u200D\u{1F9B0}';
        els.personaBtn.classList.add('active');
      }
      els.personaBtn.addEventListener('click', function () {
        state.personaEnabled = !state.personaEnabled;
        els.personaBtn.textContent = state.personaEnabled ? '\u{1F9D1}\u200D\u{1F9B0}' : '\u{1F454}';
        els.personaBtn.classList.toggle('active', state.personaEnabled);
        localStorage.setItem('act-persona', state.personaEnabled);
      });
    }

    // Dark mode toggle
    if (els.darkBtn) {
      var savedDark = localStorage.getItem('act-dark');
      if (savedDark === 'true') {
        state.darkEnabled = true;
        els.darkBtn.textContent = '\u{1F319}';
        els.darkBtn.classList.add('active');
        document.documentElement.classList.add('dark');
      }
      els.darkBtn.addEventListener('click', function () {
        state.darkEnabled = !state.darkEnabled;
        els.darkBtn.textContent = state.darkEnabled ? '\u{1F319}' : '\u{2600}\uFE0F';
        els.darkBtn.classList.toggle('active', state.darkEnabled);
        document.documentElement.classList.toggle('dark', state.darkEnabled);
        localStorage.setItem('act-dark', state.darkEnabled);
      });
    }
  }

  function bindComposer() {
    els.composerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      handleSend();
    });
    els.composerInput.addEventListener('input', function () {
      var has = els.composerInput.value.trim().length > 0;
      els.sendBtn.disabled = !has;
      els.sendBtn.style.opacity = has ? '1' : '0.3';
      autoResizeInput();
    });
    els.composerInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
  }

  function autoResizeInput() {
    els.composerInput.style.height = 'auto';
    els.composerInput.style.height = Math.min(els.composerInput.scrollHeight, 120) + 'px';
  }

  function bindInfo() {
    els.infoCloseBtn.addEventListener('click', closeInfo);
    els.infoOverlay.addEventListener('click', function (e) {
      if (e.target === els.infoOverlay) closeInfo();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.infoOpen) closeInfo();
    });
  }

  function openInfo() {
    state.infoOpen = true;
    state.lastFocused = document.activeElement;
    if (els.statusLine) {
      els.statusLine.textContent = window.ACTGemini ? window.ACTGemini.statusLabel() : 'AI fallback: off';
    }
    els.infoOverlay.classList.add('open');
    els.infoOverlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () {
      els.infoCloseBtn.focus();
    });
  }

  function closeInfo() {
    state.infoOpen = false;
    els.infoOverlay.classList.remove('open');
    els.infoOverlay.setAttribute('aria-hidden', 'true');
    if (state.lastFocused && state.lastFocused.focus) state.lastFocused.focus();
  }

  function bindLocation() {
    els.locBtn.addEventListener('click', toggleLocation);
  }

  function toggleLocation() {
    if (state.locationEnabled) {
      state.locationEnabled = false;
      state.userLocation = null;
      state.locationError = null;
      updateLocationUI();
      return;
    }
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }
    state.locationLoading = true;
    state.locationEnabled = true;
    state.locationError = null;
    updateLocationUI();
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        state.userLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        state.locationLoading = false;
        updateLocationUI();
      },
      function (err) {
        state.locationLoading = false;
        if (err.code === err.PERMISSION_DENIED) {
          state.locationEnabled = false;
          state.userLocation = null;
          setLocationError('Location access denied');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationError('Location unavailable');
          state.locationEnabled = false;
          state.userLocation = null;
        } else {
          setLocationError('Location request timed out');
          state.locationEnabled = false;
          state.userLocation = null;
        }
        updateLocationUI();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  function setLocationError(msg) {
    state.locationError = msg;
    if (els.locError) els.locError.textContent = msg;
  }

  function updateLocationUI() {
    if (!els.locBtn || !els.locLabel) return;
    if (state.locationLoading) {
      els.locLabel.textContent = 'Getting location...';
      els.locBtn.classList.add('active');
    } else if (state.locationEnabled && state.userLocation) {
      els.locLabel.textContent = 'Location: ' + state.userLocation.lat.toFixed(2) + ', ' + state.userLocation.lon.toFixed(2);
      els.locBtn.classList.add('active');
    } else if (state.locationEnabled && !state.userLocation) {
      els.locLabel.textContent = 'Getting location...';
      els.locBtn.classList.add('active');
    } else {
      els.locLabel.textContent = 'Use my location';
      els.locBtn.classList.remove('active');
    }
    if (!state.locationEnabled && els.locError) {
      els.locError.textContent = '';
    }
  }

  function pickGreeting() {
    var greetings = window.ACTCompany.greetings;
    if (!greetings || !greetings.length) return 'Hi, I am the Atlantic Coast Tours assistant.';
    var index = Math.floor(Math.random() * greetings.length);
    return greetings[index];
  }

  function nowTime() {
    var d = new Date();
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  function renderWelcome() {
    clearThread();
    var greeting = pickGreeting();
    appendBotMessage('<p>' + escapeText(greeting) + '</p>', false);
    appendWelcomeDisclaimer();
    appendChipRow(window.ACTCompany.starterChips, 'Suggested questions');
  }

  function appendWelcomeDisclaimer() {
    var text = window.ACTCompany.welcomeDisclaimer;
    if (!text) return;
    var wrap = document.createElement('div');
    wrap.className = 'welcome-notice';
    wrap.setAttribute('role', 'note');
    var p = document.createElement('p');
    p.textContent = text;
    wrap.appendChild(p);
    els.thread.appendChild(wrap);
    scrollToBottom();
  }

  function appendScopeNotice() {
    var notice = window.ACTCompany.scopeNotice;
    if (!notice) return;
    var wrap = document.createElement('div');
    wrap.className = 'scope-notice';
    wrap.setAttribute('role', 'status');
    var title = document.createElement('strong');
    title.textContent = notice.title || '';
    var body = document.createElement('span');
    body.textContent = notice.body || '';
    wrap.appendChild(title);
    wrap.appendChild(body);
    els.thread.appendChild(wrap);
    scrollToBottom();
  }

  function clearThread() {
    els.thread.innerHTML = '';
  }

  function appendBotMessage(html, withTimestamp) {
    var wrap = document.createElement('div');
    wrap.className = 'msg bot';
    var avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = state.personaEnabled ? '\u{1F9D1}\u200D\u{1F9B0}' : '\u{1F454}';
    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = html;
    if (withTimestamp !== false) {
      var t = document.createElement('time');
      t.className = 'time';
      t.setAttribute('datetime', nowTime());
      t.textContent = nowTime();
      bubble.appendChild(t);
    }
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    els.thread.appendChild(wrap);
    scrollToBottom();
  }

  function appendUserMessage(text) {
    var wrap = document.createElement('div');
    wrap.className = 'msg user';
    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    var p = document.createElement('p');
    p.textContent = text;
    bubble.appendChild(p);
    var t = document.createElement('time');
    t.className = 'time';
    t.setAttribute('datetime', nowTime());
    t.textContent = nowTime();
    bubble.appendChild(t);
    wrap.appendChild(bubble);
    els.thread.appendChild(wrap);
    scrollToBottom();
  }

  function appendLoadingBubble() {
    var wrap = document.createElement('div');
    wrap.className = 'msg bot';
    var avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = state.personaEnabled ? '\u{1F9D1}\u200D\u{1F9B0}' : '\u{1F454}';
    var bubble = document.createElement('div');
    bubble.className = 'bubble loading';
    bubble.setAttribute('role', 'status');
    bubble.setAttribute('aria-label', 'Atlantic Coast assistant is typing');
    for (var i = 0; i < 3; i++) {
      var d = document.createElement('span');
      d.className = 'dot';
      bubble.appendChild(d);
    }
    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    els.thread.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  function appendChipRow(labels, ariaLabel) {
    if (!labels || !labels.length) return;
    var wrap = document.createElement('div');
    wrap.className = 'chips';
    wrap.setAttribute('role', 'group');
    if (ariaLabel) wrap.setAttribute('aria-label', ariaLabel);
    for (var i = 0; i < labels.length; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.textContent = labels[i];
      btn.addEventListener('click', function (label) {
        return function () { handleChip(label); };
      }(labels[i]));
      wrap.appendChild(btn);
    }
    els.thread.appendChild(wrap);
    scrollToBottom();
  }

  function appendAiFootnote() {
    var wrap = document.createElement('div');
    wrap.className = 'ai-foot';
    wrap.textContent = 'via AI';
    els.thread.appendChild(wrap);
    scrollToBottom();
  }

  function scrollToBottom() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var behavior = reduce ? 'auto' : 'smooth';
    requestAnimationFrame(function () {
      els.thread.scrollTo({ top: els.thread.scrollHeight, behavior: behavior });
    });
  }

  function escapeText(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function handleChip(label) {
    if (state.sending) return;
    if (label === 'Call us') {
      appendUserMessage(label);
      appendBotMessage('<p>Call <strong>+353 86 229 3331</strong> to speak with us directly. We are available daily during tour hours.</p>', true);
      appendChipRow(['Back to tours', 'Show me all tours', 'Different question'], 'Next steps');
      return;
    }
    if (label === 'Send an email') {
      appendUserMessage(label);
      appendBotMessage('<p>Email us at <strong>info@atlanticcoasttours.ie</strong> and we will get back to you within 24 hours.</p>', true);
      appendChipRow(['Back to tours', 'Show me all tours', 'Different question'], 'Next steps');
      return;
    }
    if (label === 'Book this tour') {
      appendUserMessage(label);
      appendBotMessage('<p>To book, please call <strong>+353 86 229 3331</strong> or email <strong>info@atlanticcoasttours.ie</strong>. Have your preferred date and group size ready.</p>', true);
      appendChipRow(['Show me all tours', 'Different question'], 'Next steps');
      return;
    }
    if (label === 'Back to tours' || label === 'Show me all tours' || label === 'Show me more tours like this' || label === 'Different question') {
      els.composerInput.value = label === 'Different question' ? '' : 'What tours do you offer?';
      els.sendBtn.disabled = false;
      els.sendBtn.style.opacity = '1';
      handleSend();
      return;
    }
    els.composerInput.value = label;
    els.sendBtn.disabled = false;
    els.sendBtn.style.opacity = '1';
    handleSend();
  }

  function handleTourCommand(text, tours) {
    var lower = text.toLowerCase();
    if (lower.indexOf('all tours') !== -1 || lower.indexOf('show me all') !== -1 || lower.indexOf('what tours do you offer') !== -1) {
      var all = tours.slice(0, 5);
      var html = '<p>We offer <strong>' + tours.length + '</strong> tours along the Wild Atlantic Way. Here are some highlights:</p>' +
        window.ACTTours.formatTourList(tours, 5);
      return { response: html, chips: ['What is available in Galway?', 'Do you have any food tours?', 'Tours under EUR 50', 'Different question'] };
    }
    if (lower.indexOf('under') !== -1 || lower.indexOf('less than') !== -1 || lower.indexOf('budget') !== -1) {
      var match = lower.match(/(\d+)/);
      if (match) {
        var max = parseInt(match[1], 10);
        var filtered = window.ACTTours.toursByPriceRange(0, max, tours);
        if (filtered.length > 0) {
          return { response: '<p>Tours under EUR ' + max + ':</p>' + window.ACTTours.formatTourList(filtered, 5), chips: ['Show me all tours', 'What is under EUR 50?', 'Different question'] };
        }
      }
    }
    return null;
  }

  async function handleSend() {
    if (state.sending) return;
    var text = els.composerInput.value.trim();
    if (!text) return;

    state.sending = true;
    els.composerInput.value = '';
    els.sendBtn.disabled = true;
    els.sendBtn.style.opacity = '0.3';
    els.composerInput.style.height = 'auto';

    appendUserMessage(text);
    state.history.push({ role: 'user', text: text });

    try {
      state.tours = await window.ACTTours.fetchTours();
    } catch (e) {
      state.tours = state.tours || [];
    }

    if (window.ACTGemini && window.ACTGemini.isConfigured()) {
      await handleWithAI(text);
    } else {
      // AI not available — use rule-based fallback
      var command = handleTourCommand(text, state.tours);
      if (command) {
        appendBotMessage(command.response, true);
        appendChipRow(command.chips, 'Suggested follow-ups');
        state.history.push({ role: 'model', text: stripHtml(command.response) });
        state.sending = false;
        return;
      }

      var match = window.ACTMatcher.matchIntent(text, state.tours, window.ACTCompany);

      if (match.type === 'weather-tour' || match.type === 'tour') {
        var tour = match.tours && match.tours[0];
        if (tour) {
          appendBotMessage(window.ACTTours.formatSingleTour(tour), true);
        } else {
          appendBotMessage(match.response, true);
        }
        appendChipRow(match.chips, 'Suggested follow-ups');
        state.history.push({ role: 'model', text: stripHtml(tour ? window.ACTTours.formatSingleTour(tour) : match.response) });
      } else if (match.confidence >= 0.4) {
        appendBotMessage(match.response, true);
        appendChipRow(match.chips, 'Suggested follow-ups');
        state.history.push({ role: 'model', text: stripHtml(match.response) });
      } else {
        await handleOutOfPolicy(text, false);
      }
    }

    state.sending = false;
  }

  async function handleWithAI(text) {
    var loadingNode = appendLoadingBubble();
    var chips = ['Show me all tours', 'What is available in Galway?', 'What should I pack?', 'Different question'];

    try {
      var context = policyAsContext();
      var pChange = personaChanged();
      if (pChange) context = pChange + context;

      // Include tour location weather data
      try {
        if (state.tours && state.tours.length > 0) {
          var weatherData = await window.ACTWeather.getTourLocationsWeather(state.tours);
          if (weatherData) {
            context += '\n\nTOUR LOCATIONS WEATHER FORECAST:\n' + weatherData;
          }
        }
      } catch (e) {}

      // Include user location weather data
      if (state.userLocation) {
        try {
          var forecast = await window.ACTWeather.getForecast(state.userLocation.lat, state.userLocation.lon);
          if (forecast) {
            context += '\n\n' + window.ACTWeather.summarizeForPrompt(forecast, 'Your location');
          }
        } catch (e) {}
      }

      context += '\n\nINSTRUCTIONS: Answer the user question above using the tour database and company information provided. Use weather data when relevant to give personalised recommendations. Be specific — quote prices, durations, meeting points, and special offers where applicable. If the user asks about packing or what to bring, recommend items based on the tour type and weather forecast.';

      var html = await window.ACTGemini.generateResponse(text, state.history.slice(), context);
      loadingNode.remove();
      appendBotMessage(html, true);
      state.history.push({ role: 'model', text: stripHtml(html) });
      appendChipRow(chips, 'Suggested follow-ups');
      state.lastResponsePersona = state.personaEnabled;
    } catch (e) {
      loadingNode.remove();
      // Fallback to rule-based
      var match = window.ACTMatcher.matchIntent(text, state.tours || [], window.ACTCompany);
      if (match.confidence >= 0.4) {
        appendBotMessage(match.response, true);
        appendChipRow(match.chips, 'Suggested follow-ups');
        state.history.push({ role: 'model', text: stripHtml(match.response) });
      } else {
        appendBotMessage(window.ACTCompany.outOfScopeFallback.response, true);
        appendChipRow(window.ACTCompany.outOfScopeFallback.followupChips, 'Suggested follow-ups');
        state.history.push({ role: 'model', text: stripHtml(window.ACTCompany.outOfScopeFallback.response) });
      }
    }
  }

  function personaChanged() {
    if (state.lastResponsePersona === null) return '';
    if (state.personaEnabled === state.lastResponsePersona) return '';
    var switchingTo = state.personaEnabled ? window.ACTCompany.persona.name : 'professional mode';
    var switchingFrom = state.personaEnabled ? 'professional mode' : window.ACTCompany.persona.name;
    return 'NOTE: The assistant persona has just changed from ' + switchingFrom + ' to ' + switchingTo + '. Briefly acknowledge this switch at the very start of your response (e.g. "Right, professional hat on!" or "Ah, you have got Fiona back!"). Then continue with the answer normally.\n\n';
  }

  function stripHtml(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || '';
  }

  async function handleOutOfPolicy(text, includeWeather) {
    if (includeWeather === undefined) includeWeather = true;
    var fallback = window.ACTCompany.outOfScopeFallback;
    var chips = fallback.followupChips.slice();

    if (window.ACTGemini && window.ACTGemini.isConfigured()) {
      appendScopeNotice();
      var loadingNode = appendLoadingBubble();
      try {
        var context = policyAsContext();
        var pChange = personaChanged();
        if (pChange) context = pChange + context;
        if (includeWeather && state.userLocation) {
          try {
            var forecast = await window.ACTWeather.getForecast(state.userLocation.lat, state.userLocation.lon);
            if (forecast) {
              context += '\n\n' + window.ACTWeather.summarizeForPrompt(forecast, 'Your location');
            }
          } catch (e) {}
        }
        var html = await window.ACTGemini.generateResponse(text, state.history.slice(), context);
        loadingNode.remove();
        appendBotMessage(html, true);
        state.history.push({ role: 'model', text: stripHtml(html) });
        appendAiFootnote();
        appendChipRow(chips, 'Suggested follow-ups');
        state.lastResponsePersona = state.personaEnabled;
        return;
      } catch (e) {
        loadingNode.remove();
      }
    }

    appendScopeNotice();
    appendBotMessage(fallback.response, true);
    state.history.push({ role: 'model', text: stripHtml(fallback.response) });
    appendChipRow(chips, 'Suggested follow-ups');
  }

  function policyAsContext() {
    var cats = window.ACTCompany.categories;
    var persona = window.ACTCompany.persona;

    // Persona block at the top if enabled
    var personaBlock = '';
    if (state.personaEnabled && persona) {
      personaBlock = 'PERSONA: ' + persona.demeanor + '\n\n';
    }
    var tours = state.tours || [];
    var lines = [];
    if (personaBlock) lines.push(personaBlock);
    lines.push('ATLANTIC COAST TOURS — COMPANY INFORMATION:');
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i];
      var plain = stripHtml(c.response);
      lines.push('- ' + c.title + ': ' + plain);
    }
    lines.push('');
    lines.push('TOUR DATABASE (' + tours.length + ' tours available):');
    for (var t = 0; t < tours.length; t++) {
      var tour = tours[t];
      lines.push('- ' + tour.tour_name + ' | Category: ' + tour.category + ' | Location: ' + tour.location +
        ' | Price: EUR ' + tour.price_eur + ' | Duration: ' + tour.duration_hours + 'h | Capacity: ' + tour.capacity +
        ' | Availability: ' + tour.availability + ' | Slots: ' + tour.slots_this_week +
        ' | Meet: ' + tour.meeting_point +
        (tour.special_offer ? ' | Offer: ' + tour.special_offer : '') +
        ' | Description: ' + (tour.description || ''));
    }
    if (state.userLocation) {
      lines.push('');
      lines.push('USER LOCATION: lat=' + state.userLocation.lat + ', lon=' + state.userLocation.lon + ' (for reference if relevant to their question)');
    }
    lines.push('');
    lines.push('PACKING ADVICE: When the user asks about packing or what to bring for a tour, consider the tour category (cliff walk, kayaking, cycling, boat tour, food tour, outdoor activity), the duration, and any available weather data. Recommend appropriate clothing, footwear, sun/rain protection, and equipment based on the tour type and conditions.');
    lines.push('');
    lines.push('Contact: +353 86 229 3331 or info@atlanticcoasttours.ie');
    return lines.join('\n');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
