(function () {
  function init() {
    var btn = document.createElement('a');
    btn.href = '/';
    btn.id = 'tools-lib-back-btn';
    btn.setAttribute('aria-label', 'Back to tools library');

    var icon = document.createElement('img');
    icon.src = 'https://raw.githubusercontent.com/nako-hikari/assets/main/ui/back_arrow.png';
    icon.alt = '';
    icon.style.cssText = 'width:14px;height:14px;filter:brightness(0) invert(1);opacity:0.9;';

    var label = document.createElement('span');
    label.textContent = 'Back';

    btn.appendChild(icon);
    btn.appendChild(label);

    btn.style.cssText = [
      'position:fixed',
      'top:16px',
      'left:16px',
      'z-index:99999',
      'display:inline-flex',
      'align-items:center',
      'gap:8px',
      'padding:8px 14px',
      'border-radius:999px',
      'border:1px solid #2d2d38',
      'background:#18181f',
      'color:#ffffff',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      'font-size:13px',
      'font-weight:500',
      'text-decoration:none',
      'box-shadow:0 2px 6px rgba(0,0,0,0.3)',
      'transition:border-color 0.15s ease, background 0.15s ease',
      'cursor:pointer',
    ].join(';');

    btn.addEventListener('mouseenter', function () {
      btn.style.borderColor = '#3d3d4c';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.borderColor = '#2d2d38';
    });
    btn.addEventListener('mousedown', function () {
      btn.style.background = '#1e1924';
      btn.style.transform = 'scale(0.98)';
    });
    btn.addEventListener('mouseup', function () {
      btn.style.background = '#18181f';
      btn.style.transform = 'scale(1)';
    });

    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
