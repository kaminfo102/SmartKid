(function () {
  var voiceRowCounter = 1000;

  function syncAudioPreview(inputId, url) {
    if (!inputId) return;
    var audioEl = document.querySelector('[data-kn-audio-preview="' + inputId + '"]');
    if (!audioEl) return;
    var trimmed = (url || '').trim();
    if (trimmed) {
      audioEl.src = trimmed;
      audioEl.style.display = 'block';
      try {
        audioEl.load();
      } catch (err) {}
    } else {
      try {
        audioEl.pause();
      } catch (err) {}
      audioEl.removeAttribute('src');
      audioEl.style.display = 'none';
    }
  }

  function syncImagePreview(inputId, url) {
    if (!inputId) return;
    var imgEl = document.querySelector('[data-kn-image-preview="' + inputId + '"]');
    if (!imgEl) return;
    var trimmed = (url || '').trim();
    if (trimmed) {
      imgEl.src = trimmed;
      imgEl.style.display = 'block';
    } else {
      imgEl.removeAttribute('src');
      imgEl.style.display = 'none';
    }
  }

  document.addEventListener('click', function (e) {
    var copyBtn = e.target.closest('[data-kn-copy]');
    if (copyBtn) {
      var text = copyBtn.getAttribute('data-kn-copy');
      if (navigator.clipboard && text) {
        navigator.clipboard.writeText(text).then(function () {
          var original = copyBtn.textContent;
          copyBtn.textContent = 'کپی شد!';
          setTimeout(function () {
            copyBtn.textContent = original;
          }, 1600);
        });
      }
      return;
    }

    var toggleBtn = e.target.closest('[data-kn-toggle]');
    if (toggleBtn) {
      var targetId = toggleBtn.getAttribute('data-kn-toggle');
      var targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.classList.toggle('is-open');
      }
      return;
    }

    var mediaBtn = e.target.closest('[data-kn-media-target]');
    if (mediaBtn) {
      e.preventDefault();
      var inputId = mediaBtn.getAttribute('data-kn-media-target');
      var inputEl = document.getElementById(inputId);
      if (!inputEl) return;

      if (!window.wp || !window.wp.media) {
        inputEl.focus();
        return;
      }

      var frame = window.wp.media({
        title: 'انتخاب یا آپلود فایل صوتی',
        library: { type: 'audio' },
        button: { text: 'استفاده از این فایل صوتی' },
        multiple: false
      });

      frame.on('select', function () {
        var selection = frame.state().get('selection');
        if (!selection || !selection.first()) return;
        var attachment = selection.first().toJSON();
        if (attachment && attachment.url) {
          inputEl.value = attachment.url;
          syncAudioPreview(inputId, attachment.url);
        }
      });

      frame.open();
      return;
    }

    var clearBtn = e.target.closest('[data-kn-media-clear]');
    if (clearBtn) {
      e.preventDefault();
      var clearTargetId = clearBtn.getAttribute('data-kn-media-clear');
      var clearInput = document.getElementById(clearTargetId);
      if (clearInput) {
        clearInput.value = '';
      }
      syncAudioPreview(clearTargetId, '');
      return;
    }

    var imgBtn = e.target.closest('[data-kn-image-target]');
    if (imgBtn) {
      e.preventDefault();
      var imgInputId = imgBtn.getAttribute('data-kn-image-target');
      var imgInputEl = document.getElementById(imgInputId);
      if (!imgInputEl) return;

      if (!window.wp || !window.wp.media) {
        imgInputEl.focus();
        return;
      }

      var imgFrame = window.wp.media({
        title: 'انتخاب یا آپلود تصویر',
        library: { type: 'image' },
        button: { text: 'استفاده از این تصویر' },
        multiple: false
      });

      imgFrame.on('select', function () {
        var selection = imgFrame.state().get('selection');
        if (!selection || !selection.first()) return;
        var attachment = selection.first().toJSON();
        if (attachment && attachment.url) {
          imgInputEl.value = attachment.url;
          syncImagePreview(imgInputId, attachment.url);
        }
      });

      imgFrame.open();
      return;
    }

    var imgClearBtn = e.target.closest('[data-kn-image-clear]');
    if (imgClearBtn) {
      e.preventDefault();
      var clearImgId = imgClearBtn.getAttribute('data-kn-image-clear');
      var clearImgInput = document.getElementById(clearImgId);
      if (clearImgInput) {
        clearImgInput.value = '';
      }
      syncImagePreview(clearImgId, '');
      return;
    }

    var addVoiceBtn = e.target.closest('[data-kn-add-voice-row]');
    if (addVoiceBtn) {
      e.preventDefault();
      var tbody = document.getElementById('kn-voice-clips-body');
      var tpl = document.getElementById('kn-voice-row-template');
      if (!tbody || !tpl) return;
      voiceRowCounter += 1;
      var html = tpl.innerHTML.replace(/__INDEX__/g, String(voiceRowCounter));
      var tempTable = document.createElement('table');
      tempTable.innerHTML = '<tbody>' + html + '</tbody>';
      var newRow = tempTable.querySelector('tr');
      if (newRow) {
        tbody.appendChild(newRow);
      }
      return;
    }

    var removeVoiceBtn = e.target.closest('[data-kn-remove-voice-row]');
    if (removeVoiceBtn) {
      e.preventDefault();
      var row = removeVoiceBtn.closest('tr.kn-voice-clip-row');
      if (row) {
        row.remove();
      }
      return;
    }

    var addPronBtn = e.target.closest('[data-kn-add-pron-row]');
    if (addPronBtn) {
      e.preventDefault();
      var pronBody = document.getElementById('kn-tts-pron-body');
      var pronTpl = document.getElementById('kn-tts-pron-row-template');
      if (!pronBody || !pronTpl) return;
      var tempTbl = document.createElement('table');
      tempTbl.innerHTML = '<tbody>' + pronTpl.innerHTML + '</tbody>';
      var pronRow = tempTbl.querySelector('tr');
      if (pronRow) {
        pronBody.appendChild(pronRow);
      }
      return;
    }

    var removePronBtn = e.target.closest('[data-kn-remove-pron-row]');
    if (removePronBtn) {
      e.preventDefault();
      var pRow = removePronBtn.closest('tr.kn-tts-pron-row');
      if (pRow) {
        pRow.remove();
      }
      return;
    }

    var appendPromptBtn = e.target.closest('[data-kn-append-prompt]');
    if (appendPromptBtn) {
      e.preventDefault();
      var ruleText = (appendPromptBtn.getAttribute('data-kn-append-prompt') || '').trim();
      var instrEl = document.getElementById('kn-tts-instructions');
      if (instrEl && ruleText) {
        var cur = (instrEl.value || '').trim();
        if (cur.indexOf(ruleText) === -1) {
          instrEl.value = cur ? cur + '\n' + ruleText : ruleText;
        }
        instrEl.focus();
      }
    }
  });

  document.addEventListener('change', function (e) {
    var input = e.target.closest('input[data-kn-audio-input]');
    if (input && input.id) {
      syncAudioPreview(input.id, input.value);
    }
    var imgInput = e.target.closest('input[data-kn-image-input]');
    if (imgInput && imgInput.id) {
      syncImagePreview(imgInput.id, imgInput.value);
    }
  });

  // Live instant client-side table filter without extra server calls
  document.addEventListener('input', function (e) {
    var filterInput = e.target.closest('input[data-kn-filter-table]');
    if (!filterInput) return;
    var tableId = filterInput.getAttribute('data-kn-filter-table');
    var table = document.getElementById(tableId);
    if (!table) return;
    var term = (filterInput.value || '').trim().toLowerCase();
    var rows = table.querySelectorAll('tbody > tr[data-kn-row]');
    rows.forEach(function (tr) {
      var text = (tr.textContent || '').toLowerCase();
      tr.style.display = (!term || text.indexOf(term) !== -1) ? '' : 'none';
    });
  });

  // AI TTS Provider Preset Switcher & Live Voice Test in Admin Audio Page
  var ttsCard = document.getElementById('kn-tts-settings-card');
  if (ttsCard) {
    var catalogRaw = ttsCard.getAttribute('data-kn-tts-catalog');
    var catalog = {};
    try {
      catalog = catalogRaw ? JSON.parse(catalogRaw) : {};
    } catch (err) {
      catalog = {};
    }

    var providerSelect = document.getElementById('kn-tts-provider');
    var baseUrlInput = document.getElementById('kn-tts-base-url');
    var modelInput = document.getElementById('kn-tts-model');
    var voiceInput = document.getElementById('kn-tts-voice');
    var hintEl = document.getElementById('kn-tts-provider-hint');
    var modelsList = document.getElementById('kn-tts-models-list');
    var voicesList = document.getElementById('kn-tts-voices-list');

    if (providerSelect) {
      providerSelect.addEventListener('change', function () {
        var meta = catalog[providerSelect.value];
        if (!meta) return;
        if (hintEl) {
          hintEl.textContent = meta.hint || '';
        }
        if (baseUrlInput) {
          baseUrlInput.value = meta.base_url || '';
        }
        if (modelInput && meta.default_model) {
          modelInput.value = meta.default_model;
        }
        if (voiceInput && meta.default_voice) {
          voiceInput.value = meta.default_voice;
        }
        if (modelsList && Array.isArray(meta.models)) {
          modelsList.innerHTML = '';
          meta.models.forEach(function (m) {
            var opt = document.createElement('option');
            opt.value = m;
            modelsList.appendChild(opt);
          });
        }
        if (voicesList && Array.isArray(meta.voices)) {
          voicesList.innerHTML = '';
          meta.voices.forEach(function (v) {
            var opt = document.createElement('option');
            opt.value = v;
            voicesList.appendChild(opt);
          });
        }
      });
    }

    var basePresetBtns = ttsCard.querySelectorAll('[data-kn-tts-baseurl]');
    basePresetBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var val = btn.getAttribute('data-kn-tts-baseurl') || '';
        if (baseUrlInput && val) {
          baseUrlInput.value = val;
        }
      });
    });

    var originalPresetBtn = document.getElementById('kn-tts-preset-original');
    var formatSelect = document.getElementById('kn-tts-format');
    var speedSelect = document.getElementById('kn-tts-speed');
    var instructionsInput = document.getElementById('kn-tts-instructions');
    var presetNotice = document.getElementById('kn-tts-preset-notice');
    if (originalPresetBtn) {
      originalPresetBtn.addEventListener('click', function () {
        var currentBase = baseUrlInput ? (baseUrlInput.value || '').trim() : '';
        var wasGapgpt = providerSelect && providerSelect.value === 'gapgpt';
        if (providerSelect) {
          providerSelect.value = 'gapgpt';
          providerSelect.dispatchEvent(new Event('change'));
        }
        if (baseUrlInput && wasGapgpt && currentBase) {
          baseUrlInput.value = currentBase;
        }
        if (modelInput) modelInput.value = 'gemini-3.8-flash-tts';
        if (voiceInput) voiceInput.value = 'Kore';
        if (formatSelect) formatSelect.value = 'wav';
        if (speedSelect) speedSelect.value = '0.95';
        if (instructionsInput) {
          instructionsInput.value = 'Warm, gentle, cheerful Iranian female kindergarten teacher speaking clear, friendly Persian (fa-IR) warmly and slowly for children ages 4 to 15.';
        }
        if (presetNotice) {
          presetNotice.style.display = 'inline';
        }
      });
    }

    var testBtn = document.getElementById('kn-tts-test-btn');
    var testText = document.getElementById('kn-tts-test-text');
    var testTone = document.getElementById('kn-tts-test-tone');
    var testStatus = document.getElementById('kn-tts-test-status');
    var testAudio = document.getElementById('kn-tts-test-audio');

    if (testBtn && typeof window.ajaxurl === 'string') {
      testBtn.addEventListener('click', function () {
        var phrase = (testText && testText.value ? testText.value : '').trim();
        var tone = testTone ? testTone.value : 'cheer';
        var nonce = testBtn.getAttribute('data-nonce') || '';
        if (!phrase) {
          if (testStatus) testStatus.textContent = 'لطفاً یک متن فارسی وارد کنید.';
          return;
        }

        testBtn.disabled = true;
        if (testStatus) {
          testStatus.style.color = '#475569';
          testStatus.textContent = 'در حال ارسال به سرور و تولید صدا...';
        }

        var body = new URLSearchParams();
        body.append('action', 'kn_test_tts');
        body.append('nonce', nonce);
        body.append('text', phrase);
        body.append('tone', tone);

        fetch(window.ajaxurl, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: body.toString()
        })
          .then(function (r) {
            return r.json();
          })
          .then(function (resp) {
            if (!resp || !resp.success || !resp.data || !resp.data.audioBase64) {
              var errMsg = (resp && resp.data && resp.data.message) ? resp.data.message : 'خطا در تولید صدا.';
              throw new Error(errMsg);
            }
            var mime = resp.data.mimeType || 'audio/mpeg';
            var dataUri = 'data:' + mime + ';base64,' + resp.data.audioBase64;
            if (testAudio) {
              testAudio.src = dataUri;
              testAudio.style.display = 'block';
              testAudio.play().catch(function () {});
            }
            if (testStatus) {
              testStatus.style.color = '#15803d';
              var usedUrl = resp.data.usedBaseUrl ? ' | ' + resp.data.usedBaseUrl : '';
              var spokenNote = resp.data.spokenText ? ' — متن ارسالی: «' + resp.data.spokenText + '»' : '';
              testStatus.textContent = 'صدا با موفقیت از سرویس (' + (resp.data.provider || '') + usedUrl + ') تولید و پخش شد.' + spokenNote;
            }
          })
          .catch(function (err) {
            if (testStatus) {
              testStatus.style.color = '#b91c1c';
              testStatus.textContent = err && err.message ? err.message : 'ارتباط با سرویس ناموفق بود.';
            }
          })
          .finally(function () {
            testBtn.disabled = false;
          });
      });
    }
  }
})();
