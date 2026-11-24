/* Zero-dependency Persian Jalali DatePicker for [data-kn-jdate] inputs */
(function () {
  var MONTHS = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  var WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  function toFa(str) {
    var d = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(str).replace(/\d/g, function (w) { return d[+w]; });
  }

  function toEn(str) {
    var fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    var ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    var out = String(str || '');
    for (var i = 0; i < 10; i++) {
      out = out.split(fa[i]).join(String(i)).split(ar[i]).join(String(i));
    }
    return out;
  }

  function div(a, b) {
    return Math.floor(a / b);
  }

  function mod(a, b) {
    return a - Math.floor(a / b) * b;
  }

  function g2j(gy, gm, gd) {
    var g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var gy2 = gm > 2 ? gy + 1 : gy;
    var days = 355666 + (365 * gy) + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) + gd + g_d_m[gm - 1];
    var jy = -1595 + (33 * div(days, 12053));
    days = mod(days, 12053);
    jy += 4 * div(days, 1461);
    days = mod(days, 1461);
    if (days > 365) {
      jy += div(days - 1, 365);
      days = mod(days - 1, 365);
    }
    var jm, jd;
    if (days < 186) {
      jm = 1 + div(days, 31);
      jd = 1 + mod(days, 31);
    } else {
      jm = 7 + div(days - 186, 30);
      jd = 1 + mod(days - 186, 30);
    }
    return [jy, jm, jd];
  }

  function j2g(jy, jm, jd) {
    jy += 1595;
    var days = -355668 + (365 * jy) + (div(jy, 33) * 8) + div(mod(jy, 33) + 3, 4) + jd + (jm < 7 ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    var gy = 400 * div(days, 146097);
    days = mod(days, 146097);
    if (days > 36524) {
      gy += 100 * div(--days, 36524);
      days = mod(days, 36524);
      if (days >= 365) days++;
    }
    gy += 4 * div(days, 1461);
    days = mod(days, 1461);
    if (days > 365) {
      gy += div(days - 1, 365);
      days = mod(days - 1, 365);
    }
    var gd = days + 1;
    var sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var gm = 0;
    while (gm < 13 && gd > sal_a[gm]) {
      gd -= sal_a[gm];
      gm++;
    }
    return [gy, gm, gd];
  }

  function isJLeap(jy) {
    var breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
    var jp = breaks[0], jump = 0;
    for (var i = 1; i < breaks.length; i++) {
      var jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      jp = jm;
    }
    var n = jy - jp;
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    var leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return leap === 0;
  }

  function monthDays(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isJLeap(jy) ? 30 : 29;
  }

  function jalaliMonthStartWeekday(jy, jm) {
    var g = j2g(jy, jm, 1);
    var d = new Date(g[0], g[1] - 1, g[2]);
    return (d.getDay() + 1) % 7; // 0 = Sat .. 6 = Fri
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  var now = new Date();
  var todayJ = g2j(now.getFullYear(), now.getMonth() + 1, now.getDate());
  var popup = null;
  var activeInput = null;
  var viewYear = todayJ[0];
  var viewMonth = todayJ[1];

  function parseInputJDate(val) {
    var clean = toEn(val).trim();
    var m = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (!m) return null;
    var jy = parseInt(m[1], 10);
    var jm = parseInt(m[2], 10);
    var jd = parseInt(m[3], 10);
    if (jy < 1300 || jy > 1550 || jm < 1 || jm > 12 || jd < 1 || jd > monthDays(jy, jm)) return null;
    return [jy, jm, jd];
  }

  function closePicker() {
    if (popup && popup.parentNode) {
      popup.parentNode.removeChild(popup);
    }
    popup = null;
    activeInput = null;
  }

  function renderCalendar() {
    if (!popup || !activeInput) return;
    popup.innerHTML = '';

    var selected = parseInputJDate(activeInput.value);

    // Header
    var header = document.createElement('div');
    header.className = 'kn-jdp-header';

    var prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'kn-jdp-nav';
    prevBtn.textContent = '‹';
    prevBtn.title = 'ماه قبل';
    prevBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      viewMonth--;
      if (viewMonth < 1) { viewMonth = 12; viewYear--; }
      renderCalendar();
    });

    var titleWrap = document.createElement('div');
    titleWrap.className = 'kn-jdp-title';

    var monthSel = document.createElement('select');
    monthSel.className = 'kn-jdp-select';
    for (var m = 1; m <= 12; m++) {
      var opt = document.createElement('option');
      opt.value = String(m);
      opt.textContent = MONTHS[m - 1];
      if (m === viewMonth) opt.selected = true;
      monthSel.appendChild(opt);
    }
    monthSel.addEventListener('change', function () {
      viewMonth = parseInt(monthSel.value, 10);
      renderCalendar();
    });

    var yearSel = document.createElement('select');
    yearSel.className = 'kn-jdp-select';
    for (var y = todayJ[0] - 5; y <= todayJ[0] + 5; y++) {
      var yopt = document.createElement('option');
      yopt.value = String(y);
      yopt.textContent = toFa(y);
      if (y === viewYear) yopt.selected = true;
      yearSel.appendChild(yopt);
    }
    yearSel.addEventListener('change', function () {
      viewYear = parseInt(yearSel.value, 10);
      renderCalendar();
    });

    titleWrap.appendChild(monthSel);
    titleWrap.appendChild(yearSel);

    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'kn-jdp-nav';
    nextBtn.textContent = '›';
    nextBtn.title = 'ماه بعد';
    nextBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      viewMonth++;
      if (viewMonth > 12) { viewMonth = 1; viewYear++; }
      renderCalendar();
    });

    header.appendChild(prevBtn);
    header.appendChild(titleWrap);
    header.appendChild(nextBtn);
    popup.appendChild(header);

    // Weekdays
    var wRow = document.createElement('div');
    wRow.className = 'kn-jdp-weekdays';
    WEEKDAYS.forEach(function (wd) {
      var cell = document.createElement('div');
      cell.textContent = wd;
      wRow.appendChild(cell);
    });
    popup.appendChild(wRow);

    // Days grid
    var grid = document.createElement('div');
    grid.className = 'kn-jdp-days';
    var offset = jalaliMonthStartWeekday(viewYear, viewMonth);
    for (var b = 0; b < offset; b++) {
      var blank = document.createElement('div');
      grid.appendChild(blank);
    }

    var totalDays = monthDays(viewYear, viewMonth);
    for (var d = 1; d <= totalDays; d++) {
      (function (dayNum) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'kn-jdp-day';
        btn.textContent = toFa(dayNum);

        if (viewYear === todayJ[0] && viewMonth === todayJ[1] && dayNum === todayJ[2]) {
          btn.classList.add('is-today');
        }
        if (selected && selected[0] === viewYear && selected[1] === viewMonth && selected[2] === dayNum) {
          btn.classList.add('is-selected');
        }

        btn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          activeInput.value = viewYear + '/' + pad2(viewMonth) + '/' + pad2(dayNum);
          activeInput.dispatchEvent(new Event('change', { bubbles: true }));
          closePicker();
        });
        grid.appendChild(btn);
      })(d);
    }
    popup.appendChild(grid);

    // Footer
    var foot = document.createElement('div');
    foot.className = 'kn-jdp-footer';

    var todayBtn = document.createElement('button');
    todayBtn.type = 'button';
    todayBtn.className = 'kn-jdp-foot-btn';
    todayBtn.textContent = 'امروز (' + toFa(todayJ[0] + '/' + pad2(todayJ[1]) + '/' + pad2(todayJ[2])) + ')';
    todayBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      activeInput.value = todayJ[0] + '/' + pad2(todayJ[1]) + '/' + pad2(todayJ[2]);
      activeInput.dispatchEvent(new Event('change', { bubbles: true }));
      closePicker();
    });

    var clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'kn-jdp-foot-btn';
    clearBtn.textContent = 'پاک کردن';
    clearBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      activeInput.value = '';
      activeInput.dispatchEvent(new Event('change', { bubbles: true }));
      closePicker();
    });

    foot.appendChild(todayBtn);
    foot.appendChild(clearBtn);
    popup.appendChild(foot);
  }

  function openPicker(input) {
    if (activeInput === input && popup) return;
    closePicker();
    activeInput = input;

    var parsed = parseInputJDate(input.value);
    if (parsed) {
      viewYear = parsed[0];
      viewMonth = parsed[1];
    } else {
      viewYear = todayJ[0];
      viewMonth = todayJ[1];
    }

    popup = document.createElement('div');
    popup.className = 'kn-jdp-popup';
    document.body.appendChild(popup);
    renderCalendar();

    var rect = input.getBoundingClientRect();
    var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var scrollX = window.pageXOffset || document.documentElement.scrollLeft || 0;
    var left = rect.left + scrollX;
    if (left + 275 > scrollX + document.documentElement.clientWidth) {
      left = scrollX + document.documentElement.clientWidth - 280;
    }
    if (left < 8) left = 8;

    var top = rect.bottom + scrollY + 6;
    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
  }

  document.addEventListener('focusin', function (e) {
    var inp = e.target.closest('input[data-kn-jdate]');
    if (inp) {
      openPicker(inp);
    }
  });

  document.addEventListener('click', function (e) {
    var inp = e.target.closest('input[data-kn-jdate]');
    if (inp) {
      openPicker(inp);
      return;
    }
    if (popup && !popup.contains(e.target)) {
      closePicker();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closePicker();
    }
  });
})();
