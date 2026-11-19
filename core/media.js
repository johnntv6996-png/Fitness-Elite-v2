// core/media.js
(function() {
  'use strict';

  var VIDEO_PROVIDERS = [
    { name: 'YouTube', re: /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/, embed: function(m) { return 'https://youtube.com' + m.pop() + '?rel=0'; } },
    { name: 'Vimeo', re: /vimeo\.com\/(?:video\/)?(\d+)/, embed: function(m) { return 'https://vimeo.com' + m.pop(); } },
    { name: 'Rutube', re: /rutube\.ru\/(?:video|play\/embed)\/([a-zA-Z0-9]+)/, embed: function(m) { return 'https://rutube.ru' + m.pop(); } },
    { name: 'VK', re: /(?:vk\.com|vkvideo\.ru)\/video(?:_?)(-?\d+)_(\d+)/, embed: function(m) { var id = m.pop(), oid = m.pop(); return 'https://vk.com' + oid + '&id=' + id + '&hd=2'; } },
    { name: 'Dailymotion', re: /dailymotion\.com\/video\/([a-zA-Z0-9]+)/, embed: function(m) { return 'https://dailymotion.com' + m.pop(); } }
  ];

  function parseVideoUrl(url) {
    if (!url || typeof url !== 'string') return null;
    url = url.trim();
    if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url)) return { type: 'video', directUrl: url, provider: 'Файл' };
    for (var i = 0; i < VIDEO_PROVIDERS.length; i++) {
      var m = url.match(VIDEO_PROVIDERS[i].re);
      if (m) return { type: 'iframe', embedUrl: VIDEO_PROVIDERS[i].embed(m), provider: VIDEO_PROVIDERS[i].name };
    }
    return { type: 'unknown', url: url };
  }

  function renderVideo(url, opts) {
    opts = opts || {};
    var maxHeight = opts.maxHeight || 240;
    var marginTop = opts.marginTop !== undefined ? opts.marginTop : 12;
    var borderRadius = opts.borderRadius !== undefined ? opts.borderRadius : 10;
    var info = parseVideoUrl(url);
    if (!info) return null;

    if (info.type === 'iframe') {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'margin-top:' + marginTop + 'px;border-radius:' + borderRadius + 'px;overflow:hidden;background:#000;position:relative;padding-bottom:56.25%;height:0';
      var iframe = document.createElement('iframe');
      iframe.src = info.embedUrl;
      iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      wrap.appendChild(iframe);
      return wrap;
    }
    if (info.type === 'video') {
      var wrap2 = document.createElement('div');
      wrap2.style.cssText = 'margin-top:' + marginTop + 'px;border-radius:' + borderRadius + 'px;overflow:hidden;background:#000';
      var video = document.createElement('video');
      video.controls = true; video.preload = 'metadata';
      video.style.cssText = 'width:100%;max-height:' + maxHeight + 'px;display:block';
      var source = document.createElement('source'); source.src = info.directUrl;
      video.appendChild(source); wrap2.appendChild(video);
      return wrap2;
    }
    var linkWrap = document.createElement('div');
    linkWrap.style.cssText = 'margin-top:' + marginTop + 'px';
    linkWrap.innerHTML = '<a href="' + Store.esc(info.url) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;color:var(--accent-neon);text-decoration:none;font-size:0.85em;padding:8px 12px;background:var(--bg-primary);border-radius:8px;border:1px solid var(--border-subtle)"><i class="ph ph-external-link"></i> Открыть видео</a>';
    return linkWrap;
  }

  function renderImage(url, opts) {
    opts = opts || {};
    var maxHeight = opts.maxHeight || 240;
    var marginTop = opts.marginTop !== undefined ? opts.marginTop : 12;
    var borderRadius = opts.borderRadius !== undefined ? opts.borderRadius : 10;
    if (!url || typeof url !== 'string' || !url.trim()) return null;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:' + marginTop + 'px;border-radius:' + borderRadius + 'px;overflow:hidden;background:#000;max-height:' + maxHeight + 'px;position:relative';
    var img = document.createElement('img');
    img.src = url.trim(); img.alt = ''; img.loading = 'lazy';
    img.style.cssText = 'width:100%;max-height:' + maxHeight + 'px;object-fit:contain;display:block';
    img.onerror = function() { wrap.style.display = 'none'; };
    wrap.appendChild(img);
    return wrap;
  }

  function renderVideoPlaceholder(opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:12px;padding:16px;text-align:center;background:var(--bg-primary);border-radius:10px;border:1px dashed var(--border-subtle);opacity:0.75;font-size:0.85em';
    wrap.innerHTML = '<i class="ph ph-video-camera-slash" style="font-size:1.8em;color:var(--text-muted);display:block;margin-bottom:6px"></i><div style="margin-bottom:8px">Видео не добавлено</div>';
    if (typeof opts.onAdd === 'function') {
      var btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.style.cssText = 'padding:8px 14px;font-size:0.85em';
      btn.innerHTML = '<i class="ph ph-plus-circle"></i> Добавить видео';
      btn.onclick = opts.onAdd;
      wrap.appendChild(btn);
    }
    return wrap;
  }

  window.Media = { parseVideoUrl: parseVideoUrl, renderVideo: renderVideo, renderImage: renderImage, renderVideoPlaceholder: renderVideoPlaceholder };
})();
