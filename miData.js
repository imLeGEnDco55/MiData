/**
 * MiData — MD Reader Engine
 * Renders .md files as a beautiful SPA on GitHub Pages
 * with cross-file navigation, sidebar, and audio player.
 *
 * Usage: Include in your repo's index.html with:
 *   <div id="miData" data-repo="user/repo"></div>
 *   <script src="miData.js"></script>
 */

(function () {
  'use strict';

  // ─── Config ────────────────────────────────
  const GITHUB_API = 'https://api.github.com';
  const RAW_BASE = 'https://raw.githubusercontent.com';

  // ─── Marked.js Inline (minimal, no deps) ───
  let markedLoaded = false;

  function loadMarked() {
    return new Promise((resolve, reject) => {
      if (markedLoaded && window.marked) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/marked@15.0.6/marked.min.js';
      s.onload = () => { markedLoaded = true; resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // ─── State ─────────────────────────────────
  let state = {
    repo: '',
    owner: '',
    branch: 'main',
    tree: [],
    currentFile: '',
    title: '',
    sidebarOpen: false,
    audioInstances: [],
  };

  // ─── Init ──────────────────────────────────
  async function init() {
    const root = document.getElementById('miData');
    if (!root) return console.error('[MiData] #miData element not found');

    const dataRepo = root.dataset.repo;
    if (!dataRepo) return console.error('[MiData] data-repo attribute required');

    const [owner, repo] = dataRepo.split('/');
    state.owner = owner;
    state.repo = repo;
    state.branch = root.dataset.branch || 'main';
    state.title = root.dataset.title || repo;

    // Build shell
    root.innerHTML = buildShell();

    // Load marked.js
    await loadMarked();
    configureMarked();

    // Fetch repo tree
    await fetchTree();

    // Build sidebar
    renderSidebar();

    // Route
    handleRoute();
    window.addEventListener('hashchange', handleRoute);

    // Mobile toggle
    setupMobileToggle();
  }

  // ─── Shell HTML ────────────────────────────
  function buildShell() {
    return `
      <button class="md-menu-toggle" id="mdMenuToggle" aria-label="Menu">\u2630</button>
      <div class="md-overlay" id="mdOverlay"></div>
      <aside class="md-sidebar" id="mdSidebar">
        <div class="md-sidebar-header">
          <a href="#/" class="md-sidebar-title">
            <span class="logo">\ud83d\udcc4</span>
            <span>${esc(state.title)}</span>
          </a>
        </div>
        <nav class="md-nav" id="mdNav"></nav>
        <div class="md-toc" id="mdToc"></div>
      </aside>
      <main class="md-content">
        <div class="md-content-inner">
          <div class="md-breadcrumb" id="mdBreadcrumb"></div>
          <article class="md-body" id="mdBody">
            <div class="md-loading"><div class="md-spinner"></div> Loading...</div>
          </article>
          <footer class="md-footer">
            Powered by <a href="https://github.com/imLeGEnDco55/MiData" target="_blank">MiData</a>
          </footer>
        </div>
      </main>
    `;
  }

  // ─── Configure Marked ─────────────────────
  function configureMarked() {
    if (!window.marked) return;

    const renderer = new marked.Renderer();

    // Custom link renderer — detect audio files
    renderer.link = function ({ href, title, text }) {
      // Check if it's an audio file
      if (href && /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(href)) {
        const audioUrl = resolveUrl(href);
        const displayName = text || href.split('/').pop();
        return buildAudioPlayerHTML(audioUrl, displayName);
      }

      // Check if it's a .md link (cross-file navigation)
      if (href && /\.md$/i.test(href) && !href.startsWith('http')) {
        const hashPath = href.startsWith('/') ? href : '/' + href;
        return '<a href="#' + hashPath + '">' + text + '</a>';
      }

      // External links
      var targetAttr = href && href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
      var titleAttr = title ? ' title="' + esc(title) + '"' : '';
      return '<a href="' + href + '"' + titleAttr + targetAttr + '>' + text + '</a>';
    };

    // Checkbox support for task lists
    renderer.listitem = function ({ text }) {
      if (text.startsWith('<input')) {
        return '<li style="list-style:none;margin-left:-1.5em">' + text + '</li>\n';
      }
      return '<li>' + text + '</li>\n';
    };

    marked.setOptions({
      renderer: renderer,
      breaks: true,
      gfm: true,
    });
  }

  // ─── Fetch Repo Tree ──────────────────────
  async function fetchTree() {
    try {
      const resp = await fetch(GITHUB_API + '/repos/' + state.owner + '/' + state.repo + '/git/trees/' + state.branch + '?recursive=1');
      if (!resp.ok) throw new Error('GitHub API: ' + resp.status);
      const data = await resp.json();
      state.tree = data.tree || [];
    } catch (e) {
      console.error('[MiData] Failed to fetch tree:', e);
      state.tree = [];
    }
  }

  // ─── Render Sidebar ───────────────────────
  function renderSidebar() {
    var nav = document.getElementById('mdNav');
    if (!nav) return;

    var mdFiles = state.tree.filter(function(f) { return f.type === 'blob' && /\.md$/i.test(f.path); });
    var audioFiles = state.tree.filter(function(f) { return f.type === 'blob' && /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(f.path); });

    var structure = {};
    var rootFiles = [];

    mdFiles.forEach(function(f) {
      var parts = f.path.split('/');
      if (parts.length === 1) {
        rootFiles.push(f);
      } else {
        var folder = parts.slice(0, -1).join('/');
        if (!structure[folder]) structure[folder] = [];
        structure[folder].push(f);
      }
    });

    var audioFolders = {};
    audioFiles.forEach(function(f) {
      var parts = f.path.split('/');
      var folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'audio';
      if (!audioFolders[folder]) audioFolders[folder] = [];
      audioFolders[folder].push(f);
    });

    var html = '';

    // Root files
    if (rootFiles.length) {
      html += '<div class="md-nav-root">';
      rootFiles.forEach(function(f) {
        var name = f.path.replace('.md', '');
        var displayName = name === 'README' ? '\ud83c\udfe0 Home' : name;
        html += '<div class="md-nav-item"><a class="md-nav-link" href="#/' + f.path + '" data-path="' + f.path + '"><span class="icon">\ud83d\udcdd</span> ' + esc(displayName) + '</a></div>';
      });
      html += '</div>';
    }

    // Folder sections
    Object.keys(structure).sort().forEach(function(folder) {
      var files = structure[folder];
      html += '<div class="md-nav-section">';
      html += '<div class="md-nav-folder" data-folder="' + folder + '">\ud83d\udcc1 ' + esc(folder) + '</div>';
      html += '<div class="md-nav-items">';
      files.forEach(function(f) {
        var name = f.path.split('/').pop().replace('.md', '');
        html += '<div class="md-nav-item"><a class="md-nav-link" href="#/' + f.path + '" data-path="' + f.path + '"><span class="icon">\ud83d\udcdd</span> ' + esc(name) + '</a></div>';
      });
      html += '</div></div>';
    });

    // Audio folders
    Object.keys(audioFolders).sort().forEach(function(folder) {
      var files = audioFolders[folder];
      html += '<div class="md-nav-section">';
      html += '<div class="md-nav-folder" data-folder="' + folder + '">\ud83c\udfb5 ' + esc(folder) + '</div>';
      html += '<div class="md-nav-items">';
      files.forEach(function(f) {
        var name = f.path.split('/').pop();
        html += '<div class="md-nav-item"><a class="md-nav-link md-audio-sidebar-link" href="#" data-audio="' + f.path + '"><span class="icon">\ud83c\udfb5</span> ' + esc(name) + '</a></div>';
      });
      html += '</div></div>';
    });

    nav.innerHTML = html;

    // Folder toggle
    nav.querySelectorAll('.md-nav-folder').forEach(function(el) {
      el.addEventListener('click', function() { el.classList.toggle('open'); });
    });

    // Audio sidebar links
    nav.querySelectorAll('.md-audio-sidebar-link').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        var path = el.dataset.audio;
        var url = RAW_BASE + '/' + state.owner + '/' + state.repo + '/' + state.branch + '/' + path;
        var name = path.split('/').pop();
        playAudioInline(url, name);
      });
    });
  }

  // ─── Routing ──────────────────────────────
  function handleRoute() {
    var path = location.hash.replace('#/', '').replace('#', '');
    if (!path) path = 'README.md';
    if (!path.endsWith('.md')) path += '.md';
    loadFile(path);
  }

  // ─── Load File ────────────────────────────
  async function loadFile(path) {
    var body = document.getElementById('mdBody');
    var breadcrumb = document.getElementById('mdBreadcrumb');
    if (!body) return;

    // Stop any playing audio
    stopAllAudio();

    state.currentFile = path;

    // Loading state
    body.innerHTML = '<div class="md-loading"><div class="md-spinner"></div> Loading...</div>';

    // Breadcrumb
    if (breadcrumb) {
      var parts = path.split('/');
      var crumbs = '<a href="#/">\ud83c\udfe0</a>';
      parts.forEach(function(p, i) {
        crumbs += ' <span class="separator">/</span> ';
        if (i === parts.length - 1) {
          crumbs += '<span>' + esc(p.replace('.md', '')) + '</span>';
        } else {
          crumbs += '<a href="#/' + parts.slice(0, i + 1).join('/') + '">' + esc(p) + '</a>';
        }
      });
      breadcrumb.innerHTML = crumbs;
    }

    // Update active sidebar link
    document.querySelectorAll('.md-nav-link').forEach(function(el) {
      el.classList.toggle('active', el.dataset.path === path);
      if (el.dataset.path === path) {
        var folderEl = el.closest('.md-nav-section');
        if (folderEl) {
          var folderToggle = folderEl.querySelector('.md-nav-folder');
          if (folderToggle) folderToggle.classList.add('open');
        }
      }
    });

    // Fetch file
    try {
      var url = RAW_BASE + '/' + state.owner + '/' + state.repo + '/' + state.branch + '/' + path;
      var resp = await fetch(url);
      if (!resp.ok) throw new Error(resp.status + ' \u2014 File not found');
      var md = await resp.text();

      // Render markdown
      var html = marked.parse(md);
      body.innerHTML = html;

      // Build TOC
      buildTOC();

      // Scroll to top
      window.scrollTo(0, 0);

      // Close mobile sidebar
      closeMobileSidebar();

    } catch (e) {
      body.innerHTML = '<div class="md-error"><p>\ud83d\udcc4 Could not load file</p><code>' + esc(path) + '</code><p style="margin-top:12px;font-size:0.8rem">' + esc(e.message) + '</p></div>';
    }
  }

  // ─── Build TOC (in-page headers) ─────────
  function buildTOC() {
    var tocEl = document.getElementById('mdToc');
    var body = document.getElementById('mdBody');
    if (!tocEl || !body) return;

    var headings = body.querySelectorAll('h2, h3, h4');
    if (headings.length === 0) {
      tocEl.innerHTML = '';
      return;
    }

    var html = '<div class="md-toc-title">En esta p\u00e1gina</div><ul class="md-toc-list">';
    headings.forEach(function(h, i) {
      var id = 'heading-' + i;
      h.id = id;
      var depth = parseInt(h.tagName.charAt(1));
      var text = h.textContent;
      html += '<li><a class="md-toc-link depth-' + depth + '" href="#' + id + '" onclick="event.preventDefault(); document.getElementById(\'' + id + '\').scrollIntoView({behavior:\'smooth\'})">' + esc(text) + '</a></li>';
    });
    html += '</ul>';
    tocEl.innerHTML = html;
  }

  // ─── Audio Player HTML ────────────────────
  function buildAudioPlayerHTML(url, name) {
    var id = 'audio-' + Math.random().toString(36).substr(2, 9);
    return '<div class="md-audio-player" data-audio-id="' + id + '">' +
      '<button class="md-audio-play-btn" onclick="MiData.toggleAudio(\'' + id + '\', \'' + url + '\')" aria-label="Play">\u25b6</button>' +
      '<div class="md-audio-info">' +
        '<div class="md-audio-title">' + esc(name) + '</div>' +
        '<div class="md-audio-progress-wrap">' +
          '<div class="md-audio-progress" onclick="MiData.seekAudio(event, \'' + id + '\')">' +
            '<div class="md-audio-progress-bar" id="' + id + '-bar"></div>' +
          '</div>' +
          '<span class="md-audio-time" id="' + id + '-time">0:00 / 0:00</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ─── Audio Control ────────────────────────
  var audioElements = {};

  function toggleAudio(id, url) {
    if (audioElements[id]) {
      var audio = audioElements[id];
      if (audio.paused) {
        Object.keys(audioElements).forEach(function(k) {
          if (k !== id && !audioElements[k].paused) {
            audioElements[k].pause();
            updatePlayBtn(k, false);
          }
        });
        audio.play();
        updatePlayBtn(id, true);
      } else {
        audio.pause();
        updatePlayBtn(id, false);
      }
      return;
    }

    var audio = new Audio(url);
    audioElements[id] = audio;

    audio.addEventListener('timeupdate', function() {
      var bar = document.getElementById(id + '-bar');
      var timeEl = document.getElementById(id + '-time');
      if (bar) bar.style.width = ((audio.currentTime / audio.duration) * 100) + '%';
      if (timeEl) timeEl.textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration);
    });

    audio.addEventListener('ended', function() {
      updatePlayBtn(id, false);
    });

    Object.keys(audioElements).forEach(function(k) {
      if (k !== id && !audioElements[k].paused) {
        audioElements[k].pause();
        updatePlayBtn(k, false);
      }
    });

    audio.play();
    updatePlayBtn(id, true);
  }

  function seekAudio(event, id) {
    var audio = audioElements[id];
    if (!audio) return;
    var rect = event.currentTarget.getBoundingClientRect();
    var pct = (event.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  }

  function updatePlayBtn(id, playing) {
    var player = document.querySelector('[data-audio-id="' + id + '"]');
    if (!player) return;
    var btn = player.querySelector('.md-audio-play-btn');
    if (btn) btn.textContent = playing ? '\u23f8' : '\u25b6';
  }

  function stopAllAudio() {
    Object.keys(audioElements).forEach(function(k) {
      audioElements[k].pause();
      audioElements[k].currentTime = 0;
    });
  }

  function playAudioInline(url, name) {
    var body = document.getElementById('mdBody');
    if (!body) return;

    var id = 'sidebar-audio-' + Math.random().toString(36).substr(2, 9);
    var playerHTML = buildAudioPlayerHTML(url, name);

    var existing = body.querySelector('.md-sidebar-audio-player');
    if (existing) existing.remove();

    var wrapper = document.createElement('div');
    wrapper.className = 'md-sidebar-audio-player';
    wrapper.innerHTML = playerHTML;
    body.insertBefore(wrapper, body.firstChild);

    setTimeout(function() { toggleAudio(id, url); }, 100);
  }

  // ─── Helpers ──────────────────────────────
  function fmt(secs) {
    if (isNaN(secs)) return '0:00';
    var m = Math.floor(secs / 60);
    var s = Math.floor(secs % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function esc(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function resolveUrl(href) {
    if (href.startsWith('http')) return href;

    var currentDir = state.currentFile.indexOf('/') !== -1
      ? state.currentFile.split('/').slice(0, -1).join('/')
      : '';

    var resolved = currentDir ? currentDir + '/' + href : href;
    return RAW_BASE + '/' + state.owner + '/' + state.repo + '/' + state.branch + '/' + resolved;
  }

  function closeMobileSidebar() {
    var sidebar = document.getElementById('mdSidebar');
    var overlay = document.getElementById('mdOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  }

  function setupMobileToggle() {
    var toggle = document.getElementById('mdMenuToggle');
    var sidebar = document.getElementById('mdSidebar');
    var overlay = document.getElementById('mdOverlay');

    if (toggle) {
      toggle.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', closeMobileSidebar);
    }
  }

  // ─── Public API ───────────────────────────
  window.MiData = {
    init: init,
    toggleAudio: toggleAudio,
    seekAudio: seekAudio,
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();