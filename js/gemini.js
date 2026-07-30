window.ACTGemini = (function () {
  'use strict';

  var PROXY_URL = 'https://act-chatbot-proxy.symphony-driver-assist.workers.dev';

  var FALLBACK_HTML = "<p>I'm having trouble reaching the AI service right now. I can still help with tour information and booking questions.</p>";

  function isConfigured() {
    return PROXY_URL.length > 0;
  }

  function setProxyUrl(url) {
    PROXY_URL = url;
  }

  function statusLabel() {
    if (!PROXY_URL) return 'AI fallback: off (rule-based only)';
    try {
      var u = new URL(PROXY_URL);
      return 'AI fallback: on (' + u.host + ')';
    } catch (e) {
      return 'AI fallback: misconfigured';
    }
  }

  function markdownToHtml(text) {
    if (!text) return '';
    var html = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.split(/\n{2,}/).map(function (p) {
      p = p.replace(/\n/g, '<br>');
      return '<p>' + p + '</p>';
    }).join('');
    return html;
  }

  async function generateResponse(userInput, conversationHistory, policyContext) {
    if (!isConfigured()) return FALLBACK_HTML;

    try {
      var response = await fetch(PROXY_URL.replace(/\/$/, '') + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: String(userInput || ''),
          history: Array.isArray(conversationHistory) ? conversationHistory : [],
          policyContext: String(policyContext || '')
        })
      });

      if (!response.ok) return FALLBACK_HTML;

      var data = await response.json();
      if (data && data.reply) return String(data.reply);
      if (data && data.ok === false) return FALLBACK_HTML;
      return FALLBACK_HTML;
    } catch (e) {
      return FALLBACK_HTML;
    }
  }

  return {
    isConfigured: isConfigured,
    setProxyUrl: setProxyUrl,
    statusLabel: statusLabel,
    generateResponse: generateResponse
  };
})();
