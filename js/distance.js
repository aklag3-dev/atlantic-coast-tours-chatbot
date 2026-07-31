window.ACTDistance = (function () {
  'use strict';

  var PROXY_URL = 'https://act-chatbot-proxy.symphony-driver-assist.workers.dev';

  // Cache distance results for 10 minutes
  var cache = {};
  var CACHE_TTL = 10 * 60 * 1000;

  function cacheKey(startStr, endStr) {
    return startStr + '|' + endStr;
  }

  function getFromCache(startStr, endStr) {
    var key = cacheKey(startStr, endStr);
    var entry = cache[key];
    if (entry && Date.now() - entry.ts < CACHE_TTL) {
      return entry.data;
    }
    return null;
  }

  function setCache(startStr, endStr, data) {
    cache[cacheKey(startStr, endStr)] = { data: data, ts: Date.now() };
  }

  async function getDistance(startLon, startLat, endLon, endLat) {
    var startStr = startLon.toFixed(4) + ',' + startLat.toFixed(4);
    var endStr = endLon.toFixed(4) + ',' + endLat.toFixed(4);

    var cached = getFromCache(startStr, endStr);
    if (cached) return cached;

    try {
      var res = await fetch(PROXY_URL.replace(/\/$/, '') + '/api/distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: [startLon, startLat],
          end: [endLon, endLat]
        })
      });

      if (!res.ok) return null;

      var data = await res.json();
      if (data && data.ok) {
        setCache(startStr, endStr, data);
        return data;
      }
    } catch (e) {}
    return null;
  }

  function formatDistanceContext(distances) {
    if (!distances || !distances.length) return '';
    var lines = [];
    lines.push('DRIVING DISTANCES FROM USER LOCATION:');
    for (var i = 0; i < distances.length; i++) {
      var d = distances[i];
      lines.push('  ' + d.label + ': ' + d.distance_formatted + ' (' + d.duration_formatted + ' drive)');
    }
    return lines.join('\n');
  }

  return {
    getDistance: getDistance,
    formatDistanceContext: formatDistanceContext
  };
})();
