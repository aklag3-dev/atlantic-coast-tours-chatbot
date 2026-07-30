window.ACTTours = (function () {
  'use strict';

  var SHEET_ID = '1balBGf8QhZ5dc-RCCAPt2kcrcf6m_YRh0HL_r8bBtJw';
  var GID = '120683740';
  var CSV_URL = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/export?format=csv&gid=' + GID;

  function parseCSV(text) {
    var rows = [];
    var current = [];
    var field = '';
    var inQuotes = false;

    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var next = text.charAt(i + 1);

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          field += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          current.push(field);
          field = '';
        } else if (ch === '\n') {
          current.push(field);
          if (current.length > 0 && current.join('').trim().length > 0) {
            rows.push(current);
          }
          current = [];
          field = '';
        } else if (ch === '\r') {
        } else {
          field += ch;
        }
      }
    }
    current.push(field);
    if (current.length > 0 && current.join('').trim().length > 0) {
      rows.push(current);
    }

    return rows;
  }

  function rowsToTours(rows) {
    if (!rows || rows.length < 2) return [];
    var headers = rows[0];
    var tours = [];

    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      if (!row || row.length < 2) continue;
      var tour = {};
      for (var c = 0; c < headers.length; c++) {
        tour[headers[c].trim()] = (row[c] || '').trim();
      }
      if (tour.tour_id && tour.tour_name) {
        tours.push(tour);
      }
    }

    return tours;
  }

  function fetchTours() {
    return fetch(CSV_URL)
      .then(function (response) {
        if (!response.ok) throw new Error('Failed to fetch tours: HTTP ' + response.status);
        return response.text();
      })
      .then(function (csvText) {
        var rows = parseCSV(csvText);
        return rowsToTours(rows);
      });
  }

  function searchTours(query, tours) {
    if (!query || !tours || !tours.length) return [];
    var q = query.toLowerCase();

    var scored = [];
    for (var i = 0; i < tours.length; i++) {
      var t = tours[i];
      var score = 0;

      var name = (t.tour_name || '').toLowerCase();
      var category = (t.category || '').toLowerCase();
      var location = (t.location || '').toLowerCase();
      var description = (t.description || '').toLowerCase();
      var meetingPoint = (t.meeting_point || '').toLowerCase();
      var specialOffer = (t.special_offer || '').toLowerCase();

      if (name.indexOf(q) !== -1) score += 1.0;
      if (category.indexOf(q) !== -1) score += 0.5;
      if (location.indexOf(q) !== -1) score += 0.5;
      if (description.indexOf(q) !== -1) score += 0.15;
      if (meetingPoint.indexOf(q) !== -1) score += 0.3;
      if (specialOffer.indexOf(q) !== -1) score += 0.4;

      var qWords = q.split(/\s+/);
      for (var w = 0; w < qWords.length; w++) {
        var word = qWords[w];
        if (word.length < 3) continue;
        if (name.indexOf(word) !== -1) score += 0.3;
        if (category.indexOf(word) !== -1) score += 0.2;
        if (location.indexOf(word) !== -1) score += 0.2;
        if (description.indexOf(word) !== -1) score += 0.1;
      }

      var priceStr = (t.price_eur || '').replace(/[^0-9]/g, '');
      var priceNum = parseInt(priceStr, 10);
      var priceMatch = q.match(/(\d+)\s*euro?/i);
      if (priceMatch) {
        var askedPrice = parseInt(priceMatch[1], 10);
        if (priceNum > 0 && Math.abs(priceNum - askedPrice) <= 10) {
          score += 0.6;
        }
      }

      if (score > 0) {
        scored.push({ tour: t, score: score });
      }
    }

    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.map(function (s) { return s.tour; });
  }

  function filterByCategory(category, tours) {
    var cat = category.toLowerCase();
    return tours.filter(function (t) {
      return (t.category || '').toLowerCase() === cat;
    });
  }

  function filterByLocation(location, tours) {
    var loc = location.toLowerCase();
    return tours.filter(function (t) {
      return (t.location || '').toLowerCase().indexOf(loc) !== -1;
    });
  }

  function toursByPriceRange(min, max, tours) {
    return tours.filter(function (t) {
      var p = parseInt((t.price_eur || '').replace(/[^0-9]/g, ''), 10);
      return p >= min && p <= max;
    });
  }

  function formatTourList(tours, maxCount) {
    maxCount = maxCount || 5;
    var count = Math.min(tours.length, maxCount);
    var html = '';
    for (var i = 0; i < count; i++) {
      var t = tours[i];
      var offer = t.special_offer ? ' <em>(' + escapeText(t.special_offer) + ')</em>' : '';
      html += '<p><strong>' + escapeText(t.tour_name) + '</strong> &mdash; ' +
        escapeText('EUR' + t.price_eur) + ', ' +
        escapeText(t.duration_hours + 'h') + ', ' +
        escapeText(t.category) + ' in ' + escapeText(t.location) +
        offer + '</p>';
    }
    if (tours.length > maxCount) {
      html += '<p>... and ' + (tours.length - maxCount) + ' more tours.</p>';
    }
    return html;
  }

  function formatSingleTour(tour) {
    var offer = tour.special_offer ? '<p><strong>Special offer:</strong> ' + escapeText(tour.special_offer) + '</p>' : '';
    return '<p><strong>' + escapeText(tour.tour_name) + '</strong></p>' +
      '<p>' + escapeText(tour.description || '') + '</p>' +
      '<p><strong>Price:</strong> EUR' + escapeText(tour.price_eur) +
      ' &middot; <strong>Duration:</strong> ' + escapeText(tour.duration_hours + ' hours') +
      ' &middot; <strong>Capacity:</strong> ' + escapeText(tour.capacity || 'N/A') + ' people</p>' +
      '<p><strong>Location:</strong> ' + escapeText(tour.location || '') +
      ' &middot; <strong>Meeting point:</strong> ' + escapeText(tour.meeting_point || '') + '</p>' +
      '<p><strong>Availability:</strong> ' + escapeText(tour.availability || 'N/A') +
      ' (' + escapeText(tour.slots_this_week || '0') + ' slots this week)</p>' +
      offer;
  }

  function escapeText(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return {
    fetchTours: fetchTours,
    searchTours: searchTours,
    filterByCategory: filterByCategory,
    filterByLocation: filterByLocation,
    toursByPriceRange: toursByPriceRange,
    formatTourList: formatTourList,
    formatSingleTour: formatSingleTour
  };
})();
