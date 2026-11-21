(function () {
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
    }
  });
})();
