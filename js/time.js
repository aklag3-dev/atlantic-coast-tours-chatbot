window.ACTTime = (function () {
  'use strict';

  var TIME_API = 'https://timeapi.io/api/time/current/zone';
  var HOLIDAYS_API = 'https://openholidaysapi.org/PublicHolidays';

  var cachedTime = null;
  var cachedHolidays = null;
  var cacheTime = 0;
  var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  function nowFormatted() {
    var d = new Date();
    return d.toISOString().split('T')[0];
  }

  function yearStart() {
    return nowFormatted().split('-')[0] + '-01-01';
  }

  function yearEnd() {
    return nowFormatted().split('-')[0] + '-12-31';
  }

  async function getIrishTime() {
    if (cachedTime && Date.now() - cacheTime < CACHE_TTL) {
      return cachedTime;
    }
    try {
      var res = await fetch(TIME_API + '?timeZone=Europe/Dublin');
      if (res.ok) {
        cachedTime = await res.json();
        cacheTime = Date.now();
        return cachedTime;
      }
    } catch (e) {}
    return cachedTime;
  }

  async function getIrishHolidays() {
    if (cachedHolidays) return cachedHolidays;
    try {
      var url = HOLIDAYS_API + '?countryIsoCode=IE&languageIsoCode=EN&validFrom=' + yearStart() + '&validTo=' + yearEnd();
      var res = await fetch(url);
      if (res.ok) {
        cachedHolidays = await res.json();
        return cachedHolidays;
      }
    } catch (e) {}
    return cachedHolidays;
  }

  function formatTimeContext(timeData) {
    if (!timeData) return '';
    var lines = [];
    lines.push('CURRENT TIME IN IRELAND (Europe/Dublin):');
    lines.push('  Date: ' + timeData.date + ' (' + timeData.dayOfWeek + ')');
    lines.push('  Time: ' + timeData.time);
    lines.push('  Full: ' + timeData.dateTime);
    lines.push('  DST active: ' + (timeData.dstActive ? 'Yes (IST)' : 'No (GMT)'));
    return lines.join('\n');
  }

  function formatHolidaysContext(holidays) {
    if (!holidays || !holidays.length) return '';
    var today = nowFormatted();
    var upcoming = [];
    var past = [];

    for (var i = 0; i < holidays.length; i++) {
      var h = holidays[i];
      var name = '';
      for (var j = 0; j < h.name.length; j++) {
        if (h.name[j].language === 'EN') { name = h.name[j].text; break; }
      }
      if (!name && h.name.length > 0) name = h.name[0].text;

      var entry = h.startDate + ' — ' + name;
      if (h.startDate >= today) {
        upcoming.push(entry);
      } else {
        past.push(entry);
      }
    }

    var lines = [];
    lines.push('IRISH PUBLIC HOLIDAYS ' + today.split('-')[0] + ':');
    if (upcoming.length > 0) {
      lines.push('  Upcoming: ' + upcoming.join('; '));
    }
    if (past.length > 0) {
      lines.push('  Past: ' + past.join('; '));
    }
    return lines.join('\n');
  }

  function isTodayAHoliday(holidays) {
    if (!holidays) return null;
    var today = nowFormatted();
    for (var i = 0; i < holidays.length; i++) {
      if (holidays[i].startDate === today) {
        for (var j = 0; j < holidays[i].name.length; j++) {
          if (holidays[i].name[j].language === 'EN') return holidays[i].name[j].text;
        }
        return holidays[i].name[0].text;
      }
    }
    return null;
  }

  async function getTimeAndHolidayContext() {
    var timeData = await getIrishTime();
    var holidays = await getIrishHolidays();
    var context = '';

    var timeStr = formatTimeContext(timeData);
    if (timeStr) context += timeStr;

    var holidayStr = formatHolidaysContext(holidays);
    if (holidayStr) context += '\n\n' + holidayStr;

    var todayHoliday = isTodayAHoliday(holidays);
    if (todayHoliday) {
      context += '\n\nNOTE: Today is a public holiday in Ireland — ' + todayHoliday + '. Tour availability may be affected.';
    }

    return context;
  }

  return {
    getIrishTime: getIrishTime,
    getIrishHolidays: getIrishHolidays,
    getTimeAndHolidayContext: getTimeAndHolidayContext,
    isTodayAHoliday: isTodayAHoliday,
    formatTimeContext: formatTimeContext,
    formatHolidaysContext: formatHolidaysContext
  };
})();
