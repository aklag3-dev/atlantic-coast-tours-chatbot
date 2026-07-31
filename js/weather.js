window.ACTWeather = (function () {
  'use strict';

  var FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
  var GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';

  // Weather cache: key = "lat,lon", value = { data, ts }
  var weatherCache = {};
  var CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  var WMO_CODES = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    66: 'Light freezing rain', 67: 'Heavy freezing rain',
    71: 'Slight snowfall', 73: 'Moderate snowfall', 75: 'Heavy snowfall',
    77: 'Snow grains',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    85: 'Slight snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
  };

  function describeWMO(code) {
    return WMO_CODES[code] || 'Unknown';
  }

  function windDir(deg) {
    if (deg == null) return '';
    var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
  }

  function nowFormatted() {
    var d = new Date();
    return d.toISOString().split('T')[0];
  }

  async function geocode(query) {
    var url = GEO_URL + '?name=' + encodeURIComponent(query) + '&count=1&language=en&format=json';
    try {
      var res = await fetch(url);
      var data = await res.json();
      if (data.results && data.results.length > 0) {
        var r = data.results[0];
        return { lat: r.latitude, lon: r.longitude, name: r.name, country: r.country || '' };
      }
    } catch (e) {}
    return null;
  }

  async function getForecast(lat, lon) {
    var cacheKey = lat.toFixed(2) + ',' + lon.toFixed(2);
    var cached = weatherCache[cacheKey];
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return cached.data;
    }

    var params =
      'latitude=' + lat +
      '&longitude=' + lon +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode,windspeed_10m_max,winddirection_10m_dominant,sunrise,sunset' +
      '&current=temperature_2m,weathercode,wind_speed_10m,apparent_temperature,precipitation' +
      '&timezone=auto&forecast_days=14';
    try {
      var res = await fetch(FORECAST_URL + '?' + params);
      var data = await res.json();
      weatherCache[cacheKey] = { data: data, ts: Date.now() };
      return data;
    } catch (e) {
      return cached ? cached.data : null;
    }
  }

  function formatCurrent(data) {
    if (!data || !data.current) return '';
    var c = data.current;
    var desc = describeWMO(c.weathercode);
    return 'Current: ' + c.temperature_2m + '°C (feels like ' + c.apparent_temperature + '°C), ' + desc + ', wind ' + c.wind_speed_10m + ' km/h';
  }

  function formatDaily(data, days) {
    days = days || 14;
    if (!data || !data.daily) return '';
    var d = data.daily;
    var lines = [];
    var today = nowFormatted();
    for (var i = 0; i < Math.min(days, d.time.length); i++) {
      var label = d.time[i] === today ? 'Today' : d.time[i];
      var precip = d.precipitation_sum[i] > 0 ? ', ' + d.precipitation_sum[i] + ' mm rain' : ', dry';
      var prob = d.precipitation_probability_max[i] != null ? ' (' + d.precipitation_probability_max[i] + '% chance)' : '';
      lines.push(label + ': ' + d.temperature_2m_min[i] + '-' + d.temperature_2m_max[i] + '°C, ' +
        describeWMO(d.weathercode[i]) + precip + prob +
        ', wind ' + d.windspeed_10m_max[i] + ' km/h ' + windDir(d.winddirection_10m_dominant[i]));
    }
    return lines.join('\n');
  }

  function summarizeForPrompt(data, locationName) {
    if (!data) return '';
    var loc = locationName ? 'Weather for ' + locationName : 'Weather';
    return loc + ':\n' + formatCurrent(data) + '\n' + formatDaily(data, 14);
  }

  async function getTourLocationsWeather(tours) {
    if (!tours || !tours.length) return '';
    var seen = {};
    var results = [];
    for (var i = 0; i < tours.length; i++) {
      var loc = tours[i].location;
      if (!loc || seen[loc]) continue;
      seen[loc] = true;
      var coords = await geocode(loc);
      if (coords) {
        var forecast = await getForecast(coords.lat, coords.lon);
        if (forecast) {
          results.push(summarizeForPrompt(forecast, loc));
        }
      }
    }
    return results.length ? results.join('\n\n') : '';
  }

  // Preload weather for all tour locations on page load
  async function preloadWeather(tours) {
    if (!tours || !tours.length) return;
    var seen = {};
    var promises = [];
    for (var i = 0; i < tours.length; i++) {
      var loc = tours[i].location;
      if (!loc || seen[loc]) continue;
      seen[loc] = true;
      promises.push((function(location) {
        return geocode(location).then(function(coords) {
          if (coords) {
            return getForecast(coords.lat, coords.lon);
          }
          return null;
        });
      })(loc));
    }
    // Wait for all to complete (don't block on errors)
    await Promise.allSettled(promises);
  }

  function packingAdvice(weather, tourCategory, durationHours) {
    var tips = [];
    var w = weather && weather.current;
    if (!w) return '';

    var temp = w.temperature_2m;
    var code = w.weathercode;
    var isRain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
    var isCold = temp < 10;
    var isWindy = w.wind_speed_10m > 30;
    var isHot = temp > 22;
    var isKayak = tourCategory && tourCategory.toLowerCase().indexOf('kayak') !== -1;
    var isWalk = tourCategory && (tourCategory.toLowerCase().indexOf('walk') !== -1 || tourCategory.toLowerCase().indexOf('hike') !== -1);
    var isCycle = tourCategory && tourCategory.toLowerCase().indexOf('cycle') !== -1;
    var isBoat = tourCategory && tourCategory.toLowerCase().indexOf('boat') !== -1;
    var isFood = tourCategory && tourCategory.toLowerCase().indexOf('food') !== -1;

    if (isRain) tips.push('waterproof jacket or poncho');
    if (isCold) tips.push('warm layers (fleece or jumper)');
    if (isWindy) tips.push('windproof outer layer');
    if (isHot) tips.push('sun protection (hat, sunscreen, sunglasses)');
    if (isWalk || isCycle) tips.push('comfortable walking shoes or trainers');
    if (isKayak) tips.push('change of clothes, towel, and waterproof bag for valuables');
    if (isBoat) tips.push('warm jacket, seasickness tablets if prone, and a camera');
    if (isFood) tips.push('an appetite and comfortable shoes for walking between stops');
    if (durationHours && durationHours > 4) tips.push('water bottle and light snacks');
    tips.push('fully charged phone or camera');

    return tips;
  }

  // Extract potential location names from user message
  // Looks for capitalized words that might be place names
  function extractLocationFromMessage(message) {
    if (!message || typeof message !== 'string') return null;

    // Common Irish and tourist location patterns
    var locationPatterns = [
      // Two-word Irish place names (e.g., "Co. Clare", "Co. Galway", "Co. Mayo")
      /(?:Co\.?\s+)?(?:Clare|Galway|Mayo|Sligo|Donegal|Kerry|Cork|Limerick|Tipperary|Waterford|Wexford|Wicklow|Meath|Louth|Cavan|Monaghan|Leitrim|Roscommon|Longford|Westmeath|Offaly|Laois|Kilkenny|Carlow|Dublin)/i,
      // Specific well-known locations
      /(?:Cliffs?\s+of\s+)?Moher/i,
      /(?:Connemara|Achill|Aran|Inish|Doolin|Kilkee|Killary|Burren|Croagh\s+Patrick|Westport|Clifden|Letterfrack|Leenane|Roundstone|Kinvara|Spiddal|Renvyle|Ballyvaughan|Louisburgh|Delphi|Ballycroy|Fanore|Kilbaha|Murrisk|Cleggan|Roonagh|Salthill|Galway\s+City|Galway\s+Bay)/i,
      // General location pattern: capitalized word(s) that aren't common English words
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/
    ];

    for (var i = 0; i < locationPatterns.length; i++) {
      var match = message.match(locationPatterns[i]);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  // Fetch weather for a user-mentioned location
  async function getUserLocationWeather(message) {
    var locationName = extractLocationFromMessage(message);
    if (!locationName) return '';

    try {
      var coords = await geocode(locationName + ', Ireland');
      if (!coords) return '';

      var forecast = await getForecast(coords.lat, coords.lon);
      if (!forecast) return '';

      return summarizeForPrompt(forecast, locationName);
    } catch (e) {
      return '';
    }
  }

  return {
    geocode: geocode,
    getForecast: getForecast,
    formatCurrent: formatCurrent,
    formatDaily: formatDaily,
    summarizeForPrompt: summarizeForPrompt,
    getTourLocationsWeather: getTourLocationsWeather,
    getUserLocationWeather: getUserLocationWeather,
    extractLocationFromMessage: extractLocationFromMessage,
    preloadWeather: preloadWeather,
    packingAdvice: packingAdvice,
    describeWMO: describeWMO
  };
})();
