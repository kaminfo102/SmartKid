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
})();
