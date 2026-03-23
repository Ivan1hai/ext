load("config.js");

function buildCatalogPagePattern(bookId) {
    return new RegExp("/catalog_1/" + bookId + "(?:/(\\d+))?/?$", "i");
}

function extractCatalogPageOrder(url, bookId) {
    var match = normalizeUrl(url).match(buildCatalogPagePattern(bookId));
    if (!match) return 1;
    return match[1] ? parseInt(match[1], 10) || 1 : 1;
}

function isCatalogPageUrl(url, bookId) {
    return buildCatalogPagePattern(bookId).test(normalizeUrl(url));
}

function collectCatalogPageUrls(doc, bookId) {
    var urls = [];
    var seen = {};
    var selectors = [
        "select.pagelist option",
        "select option[value*='/catalog_1/" + bookId + "']",
        ".chapter_page a[href*='/catalog_1/" + bookId + "']",
        "a[href*='/catalog_1/" + bookId + "']"
    ];

    for (var s = 0; s < selectors.length; s++) {
        var nodes = doc.select(selectors[s]);

        for (var i = 0; i < nodes.size(); i++) {
            var node = nodes.get(i);
            var raw = node.attr("value");
            if (!raw) raw = node.attr("href");
            if (!raw) raw = node.attr("data-url");
            if (!raw) raw = node.attr("data-href");
            if (!raw) continue;

            var value = cleanText(raw);
            if (!value) continue;
            if (/^\d+$/.test(value)) value = buildCatalogUrl(bookId, value);

            var href = normalizeUrl(value);
            if (!isCatalogPageUrl(href, bookId) || seen[href]) continue;

            seen[href] = true;
            urls.push(href);
        }
    }

    urls.sort(function(a, b) {
        return extractCatalogPageOrder(a, bookId) - extractCatalogPageOrder(b, bookId);
    });

    return urls;
}

function isNoiseChapterName(name) {
    var value = cleanText(name);
    if (!value) return true;

    return value === "免费阅读"
        || value === "开始阅读"
        || value === "上一页"
        || value === "下一页"
        || value === "刷新";
}

function normalizeChapterName(name, order) {
    var value = cleanText(name);
    if (!value) return "";

    var match = value.match(/^0*(\d+)(?:\s*[:：、.．-]\s*|\s+)(.+)$/);
    if (!match) return value;

    var index = parseInt(match[1], 10) || 0;
    if (!index || index !== order || !match[2]) return value;

    return cleanText(match[2]);
}

function collectChapterEntries(doc, bookId, seen) {
    var entries = [];
    var links = doc.select("a[href*='/xs_1/" + bookId + "/']");
    var pattern = new RegExp("/xs_1/" + bookId + "/(\\d+)/?$", "i");

    for (var i = 0; i < links.size(); i++) {
        var link = links.get(i);
        var href = normalizeUrl(link.attr("href"));
        var match = href.match(pattern);
        var order = match ? parseInt(match[1], 10) || 0 : 0;
        var name = normalizeChapterName(link.text(), order);
        if (!match || seen[href] || isNoiseChapterName(name)) continue;

        seen[href] = true;
        entries.push({
            name: name,
            url: href,
            host: BASE_URL,
            order: order
        });
    }

    return entries;
}

function execute(url) {
    var bookId = extractBookId(url);
    if (!bookId) return Response.success([]);

    var detailUrl = buildDetailUrl(bookId);
    var chapters = [];
    var seenChapters = {};
    var seenPages = {};
    var queuedPages = {};
    var pendingPages = [buildCatalogUrl(bookId, 1)];
    var guard = 0;

    queuedPages[pendingPages[0]] = true;
    fetchText(detailUrl, BASE_URL);

    while (pendingPages.length > 0 && guard < 4000) {
        var currentUrl = pendingPages.shift();
        if (!currentUrl || seenPages[currentUrl]) continue;

        seenPages[currentUrl] = true;
        guard += 1;

        var doc = fetchStableDocument(currentUrl, detailUrl, detailUrl);
        if (!doc) continue;

        var entries = collectChapterEntries(doc, bookId, seenChapters);
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].name) chapters.push(entries[i]);
        }

        var pageUrls = collectCatalogPageUrls(doc, bookId);
        for (var j = 0; j < pageUrls.length; j++) {
            var pageUrl = pageUrls[j];
            if (seenPages[pageUrl] || queuedPages[pageUrl]) continue;

            queuedPages[pageUrl] = true;
            pendingPages.push(pageUrl);
        }
    }

    chapters.sort(function(a, b) {
        return a.order - b.order;
    });

    for (var k = 0; k < chapters.length; k++) {
        delete chapters[k].order;
    }

    return Response.success(chapters);
}
