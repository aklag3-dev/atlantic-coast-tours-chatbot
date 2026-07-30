window.ACTMatcher = (function () {
  'use strict';

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev = new Array(b.length + 1);
    var curr = new Array(b.length + 1);
    for (var j = 0; j <= b.length; j++) prev[j] = j;
    for (var i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (var j = 1; j <= b.length; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      for (var j = 0; j <= b.length; j++) prev[j] = curr[j];
    }
    return prev[b.length];
  }

  function tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(function (t) { return t.length > 0; });
  }

  function fuzzyContainsKeyword(token, keyword) {
    if (token === keyword) return true;
    if (token.length < 4 || keyword.length < 4) return false;
    if (token.indexOf(keyword) !== -1 || keyword.indexOf(token) !== -1) {
      return Math.abs(token.length - keyword.length) <= 3;
    }
    var allowed = Math.max(1, Math.floor(Math.min(token.length, keyword.length) / 4));
    return levenshtein(token, keyword) <= allowed;
  }

  function scoreCategory(input, tokens, category) {
    var score = 0;
    var triggerHits = 0;
    var keywordHits = 0;
    var lowerInput = input.toLowerCase();

    for (var i = 0; i < category.triggers.length; i++) {
      if (category.triggers[i].test(input)) {
        score += 0.35;
        triggerHits += 1;
      }
    }

    for (var i = 0; i < category.keywords.length; i++) {
      var kw = category.keywords[i];
      if (kw.indexOf(' ') !== -1) {
        if (lowerInput.indexOf(kw) !== -1) {
          score += 0.2;
          keywordHits += 1;
        }
        continue;
      }
      if (lowerInput.indexOf(kw) !== -1) {
        score += 0.18;
        keywordHits += 1;
        continue;
      }
      var matched = false;
      for (var t = 0; t < tokens.length; t++) {
        if (fuzzyContainsKeyword(tokens[t], kw)) {
          score += 0.12;
          keywordHits += 1;
          matched = true;
          break;
        }
      }
      if (!matched && kw.length >= 5) {
        for (var t = 0; t < tokens.length; t++) {
          if (tokens[t].length >= 4 && levenshtein(tokens[t], kw) <= 1) {
            score += 0.08;
            keywordHits += 1;
            break;
          }
        }
      }
    }

    if (triggerHits > 0 && keywordHits === 0) score += 0.05;
    if (score > 1) score = 1;
    return score;
  }

  function isTourQuery(input) {
    var triggers = window.ACTCompany.tourQueryTriggers;
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].test(input)) return true;
    }
    return false;
  }

  function matchIntent(userInput, tours, company) {
    var input = (userInput || '').trim();
    var fallback = {
      intent: null,
      confidence: 0,
      type: 'fallback',
      response: company.outOfScopeFallback.response,
      chips: company.outOfScopeFallback.followupChips,
      tours: []
    };

    if (!input) return fallback;

    var tokens = tokenize(input);

    // Score against FAQ categories
    var best = null;
    for (var i = 0; i < company.categories.length; i++) {
      var cat = company.categories[i];
      var score = scoreCategory(input, tokens, cat);
      if (best === null || score > best.score) {
        best = { score: score, category: cat };
      }
    }

    // If FAQ matched with high confidence, return it
    if (best && best.score >= 0.4) {
      return {
        intent: best.category.id,
        confidence: best.score,
        type: 'faq',
        response: best.category.response,
        chips: best.category.followupChips,
        tours: []
      };
    }

    // Check if this is a tour-related query
    if (isTourQuery(input) || best.score >= 0.18) {
      var searched = window.ACTTours.searchTours(input, tours);

      if (searched.length === 1) {
        var single = searched[0];
        return {
          intent: 'tour-single',
          confidence: 0.7,
          type: 'tour',
          response: window.ACTTours.formatSingleTour(single),
          chips: [
            'Show me more tours like this',
            'What is available in ' + single.location.split(',')[0] + '?',
            'Book this tour',
            'Back to tours'
          ],
          tours: searched
        };
      }

      if (searched.length > 1) {
        return {
          intent: 'tour-list',
          confidence: 0.5,
          type: 'tour-list',
          response: '<p>I found <strong>' + searched.length + '</strong> tours that match:</p>' + window.ACTTours.formatTourList(searched, 5),
          chips: [
            'Show me all tours',
            'What tours are under EUR 50?',
            'Do you have any food tours?',
            'Different question'
          ],
          tours: searched
        };
      }

      // No tour matches but tour-related query
      if (best && best.score >= 0.18) {
        return {
          intent: best.category.id,
          confidence: best.score,
          type: 'faq',
          response: best.category.response,
          chips: best.category.followupChips,
          tours: []
        };
      }
    }

    return fallback;
  }

  return {
    matchIntent: matchIntent,
    levenshtein: levenshtein
  };
})();
