/*
 * public-content.js — VETOC.RU
 * SECURITY HARDENING v2
 * ─────────────────────────────────────────────────────────────────────
 * [SEC-1] Все данные из API попадают в DOM только через textContent
 *         или setAttribute. innerHTML не используется.
 * [SEC-2] URL медиафайлов валидируются: разрешены только *.supabase.co
 *         и *.supabase.in.
 * [SEC-3] kind-поле фильтруется по whitelist перед использованием.
 * ─────────────────────────────────────────────────────────────────────
 */
(function () {
  "use strict";

  var config = window.VETOC_CONFIG || {};
  if (!config.supabaseUrl || !config.supabaseAnonKey) return;

  /* [SEC-2] допустимые хосты медиафайлов */
  var SAFE_MEDIA_RE = /^https:\/\/[a-z0-9-]+\.(supabase\.co|supabase\.in)\//i;
  function isSafeUrl(url) {
    return typeof url === "string" && SAFE_MEDIA_RE.test(url);
  }

  /* [SEC-3] whitelist допустимых значений kind */
  var ALLOWED_KINDS = ["review", "event_photo", "video", "hall", "certificate"];
  function isSafeKind(k) { return ALLOWED_KINDS.indexOf(k) !== -1; }

  /* ── DOM helpers ────────────────────────────────────────────────── */
  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }
  function txt(tag, cls, value) {
    var node = el(tag, cls);
    node.textContent = String(value || "");
    return node;
  }

  /* ── [SEC-1] построение карточки медиа через DOM API ────────────── */
  function buildMediaCard(item) {
    if (!isSafeKind(item.kind)) return null;

    var figure = el("figure", "photo-card");
    var title  = String(item.title || "Материал VETOC");

    if (item.media_url && isSafeUrl(item.media_url)) {
      if (item.kind === "video") {
        var video = el("video");
        video.controls = true;
        video.preload  = "metadata";
        video.setAttribute("src", item.media_url); /* src — атрибут, не innerHTML */
        figure.appendChild(video);
      } else {
        var img = el("img");
        img.setAttribute("src", item.media_url);
        img.alt = title;
        figure.appendChild(img);
      }
    }

    figure.appendChild(txt("figcaption", "cap", title));
    return figure;
  }

  /* ── [SEC-1] построение карточки отзыва через DOM API ───────────── */
  function buildReviewCard(item) {
    var article = el("article", "content-card review-card");
    article.appendChild(txt("h3", null, item.title || "Отзыв участника"));
    article.appendChild(txt("p",  null, item.body  || ""));
    if (item.author) {
      article.appendChild(txt("span", "review-author", item.author));
    }
    return article;
  }

  /* ── рендер в контейнер ─────────────────────────────────────────── */
  function renderInto(containerId, items, builder) {
    var container = document.getElementById(containerId);
    if (!container || !items.length) return;

    /* очищаем через removeChild — не через innerHTML = "" */
    while (container.firstChild) { container.removeChild(container.firstChild); }

    items.forEach(function (item) {
      var node = builder(item);
      if (node) container.appendChild(node);
    });
  }

  /* ── fetch с таймаутом ──────────────────────────────────────────── */
  var apiUrl = config.supabaseUrl.replace(/\/$/, "")
    + "/rest/v1/vetoc_content?select=id,kind,title,body,author,media_url,is_published"
    + "&is_published=eq.true&order=created_at.desc&limit=200";

  var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  if (controller) setTimeout(function () { controller.abort(); }, 10000);

  fetch(apiUrl, {
    headers: {
      apikey:        config.supabaseAnonKey,
      Authorization: "Bearer " + config.supabaseAnonKey
    },
    signal: controller ? controller.signal : undefined
  })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      if (!Array.isArray(data)) return;
      renderInto("reviews-list",      data.filter(function(i){ return i.kind === "review"; }),      buildReviewCard);
      renderInto("event-photos",      data.filter(function(i){ return i.kind === "event_photo"; }), buildMediaCard);
      renderInto("videos-list",       data.filter(function(i){ return i.kind === "video"; }),       buildMediaCard);
      renderInto("halls-list",        data.filter(function(i){ return i.kind === "hall"; }),        buildMediaCard);
      renderInto("certificates-list", data.filter(function(i){ return i.kind === "certificate"; }), buildMediaCard);
    })
    .catch(function (err) {
      if (err && err.name !== "AbortError") {
        console.warn("VETOC: content not loaded.", err.message);
      }
    });
}());
