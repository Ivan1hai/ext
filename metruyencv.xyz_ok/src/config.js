var BASE_URL = "https://metruyencv.xyz";

try {
    if (CONFIG_URL) {
        BASE_URL = CONFIG_URL.replace(/\/+$/, "");
    }
} catch (error) {
}

var AJAX_URL = BASE_URL + "/wp-admin/admin-ajax.php";

function absoluteUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.indexOf("//") === 0) return "https:" + url;
    if (url.charAt(0) === "/") return BASE_URL + url;
    return BASE_URL + "/" + url.replace(/^\/+/, "");
}

function normalizeUrl(url) {
    if (!url) return BASE_URL;
    if (/^https?:\/\//i.test(url)) {
        return url.replace(/^(https?:\/\/)(www\.)?[^\/?#]+/i, BASE_URL);
    }
    return absoluteUrl(url);
}

function cleanText(text) {
    return (text || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function decodeValue(value) {
    try {
        return decodeURIComponent(value || "");
    } catch (error) {
        return value || "";
    }
}

function firstValue(value) {
    return Array.isArray(value) ? value[0] : value;
}

function parseQueryParams(url) {
    var params = {};

    try {
        var query = (url || "").split("?")[1] || "";
        if (!query) return params;

        query.split("&").forEach(function (part) {
            if (!part) return;

            var pair = part.split("=");
            var key = decodeValue(pair[0]).trim();
            var value = decodeValue(pair.slice(1).join("="));
            if (!key) return;

            if (params.hasOwnProperty(key)) {
                if (!Array.isArray(params[key])) {
                    params[key] = [params[key]];
                }
                params[key].push(value);
            } else {
                params[key] = value;
            }
        });
    } catch (error) {
    }

    return params;
}

function buildQueryString(params) {
    var parts = [];
    if (!params) return "";

    Object.keys(params).forEach(function (key) {
        var value = params[key];
        if (value === undefined || value === null) return;

        if (Array.isArray(value)) {
            value.forEach(function (entry) {
                if (entry === undefined || entry === null) return;
                parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(entry)));
            });
            return;
        }

        parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(value)));
    });

    return parts.join("&");
}

function extractBookSlug(url) {
    var match = normalizeUrl(url || "").match(/\/truyen\/([^\/?#]+)(?:\/|$)/i);
    return match ? match[1] : "";
}

function extractChapterSlug(url) {
    var match = normalizeUrl(url || "").match(/\/truyen\/[^\/?#]+\/([^\/?#]+)(?:\/|$)/i);
    return match ? match[1] : "";
}

function extractGenreSlug(url) {
    var match = normalizeUrl(url || "").match(/\/the-loai\/([^\/?#]+)(?:\/|$)/i);
    return match ? match[1] : "";
}

function slugToKeyword(slug) {
    return cleanText((slug || "").replace(/-/g, " "));
}

function isOngoingStatus(statusText) {
    var raw = cleanText(statusText).toLowerCase();
    if (!raw) return true;
    return raw.indexOf("hoàn thành") === -1 &&
        raw.indexOf("hoan thanh") === -1 &&
        raw.indexOf("hoan-thanh") === -1 &&
        raw.indexOf("/trang-thai/hoan-thanh/") === -1 &&
        raw.indexOf("full") === -1 &&
        raw.indexOf(" end") === -1 &&
        raw.indexOf("đã hoàn thành") === -1;
}

function buildFilterUrl(input, page) {
    var source = normalizeUrl(input || BASE_URL);
    var params = parseQueryParams(source);
    var query = {
        s: firstValue(params.s),
        post_type: firstValue(params.post_type) || "wp-manga"
    };
    var genreSlug = extractGenreSlug(source);

    if (query.s === undefined) query.s = "";
    if (genreSlug) query["genre[]"] = genreSlug;
    if (params.hasOwnProperty("genre[]")) query["genre[]"] = params["genre[]"];
    if (params.hasOwnProperty("status[0]")) query["status[0]"] = params["status[0]"];
    if (params.hasOwnProperty("m_orderby")) query["m_orderby"] = params["m_orderby"];
    if (params.hasOwnProperty("author")) query.author = params.author;
    if (params.hasOwnProperty("release")) query.release = params.release;
    if (params.hasOwnProperty("adult")) query.adult = params.adult;

    if (/\/trang-thai\/hoan-thanh\/?$/i.test(source)) {
        query["status[0]"] = "end";
    }

    if (!query.s && !query["genre[]"] && !query["status[0]"] && !query["m_orderby"]) {
        query["m_orderby"] = "latest";
    }

    if (page) query.paged = String(page);

    return BASE_URL + "/?" + buildQueryString(query);
}

function buildGenreInput(slug) {
    return BASE_URL + "/?" + buildQueryString({
        s: "",
        post_type: "wp-manga",
        "genre[]": slug
    });
}

function toGenreItem(title, href) {
    return {
        title: cleanText(title),
        input: buildFilterUrl(href, 1),
        script: "book.js"
    };
}

function pickImage(node) {
    if (!node) return "";

    var src = node.attr("src");
    if (!src || src.indexOf("data:image") === 0) {
        src = node.attr("data-src") || node.attr("data-lazy-src") || node.attr("data-original") || src;
    }

    return absoluteUrl(src);
}

function buildBookLink(rawUrl, mangaId, extra) {
    var slug = extractBookSlug(rawUrl);
    var base = slug ? BASE_URL + "/truyen/" + slug + "/" : normalizeUrl(rawUrl);
    var query = {};

    if (mangaId) query.manga_id = mangaId;
    if (extra) {
        if (extra.title) query.title = extra.title;
        if (extra.cover) query.cover = extra.cover;
        if (extra.statusText) query.status = extra.statusText;
        if (extra.latestChapterSlug) query.latest = extra.latestChapterSlug;
    }

    var queryString = buildQueryString(query);
    return queryString ? base + "?" + queryString : base;
}

function buildChapterLink(bookInfo, chapterSlug, redirectUrl) {
    var info = typeof bookInfo === "string" ? parseBookUrl(bookInfo) : bookInfo;
    var slug = info.slug || extractBookSlug(redirectUrl);
    var base = slug && chapterSlug ? BASE_URL + "/truyen/" + slug + "/" + chapterSlug + "/" : normalizeUrl(redirectUrl);
    var query = {};

    if (info.mangaId) query.manga_id = info.mangaId;
    if (info.title) query.title = info.title;
    if (info.cover) query.cover = info.cover;
    if (info.statusText) query.status = info.statusText;
    if (chapterSlug) query.chapter = chapterSlug;

    var queryString = buildQueryString(query);
    return queryString ? base + "?" + queryString : base;
}

function parseBookUrl(url) {
    var normalized = normalizeUrl(url || "");
    var params = parseQueryParams(normalized);

    return {
        url: normalized,
        slug: extractBookSlug(normalized),
        mangaId: cleanText(firstValue(params.manga_id) || ""),
        title: cleanText(firstValue(params.title) || ""),
        cover: firstValue(params.cover) || "",
        statusText: cleanText(firstValue(params.status) || ""),
        latestChapterSlug: cleanText(firstValue(params.latest) || ""),
        chapterSlug: cleanText(firstValue(params.chapter) || extractChapterSlug(normalized))
    };
}

function extractItemData(node) {
    var titleNode = node.select(".post-title a, h3 a").first();
    if (!titleNode) return null;

    var descNode = node.select(".except-summary").first();
    var latestNode = node.select(".latest-chap a, .font-meta.chapter a, .chapter-item a, .list-chapter a").first();
    var title = cleanText(titleNode.text());
    var rawLink = normalizeUrl(titleNode.attr("href"));
    var statusNode = node.select(".trangthai, .summary-content, .mg_status").first();
    var statusLink = statusNode ? statusNode.select("a").last() : null;
    var statusText = cleanText((statusLink ? statusLink.attr("href") + " " : "") + (statusNode ? statusNode.text() : ""));
    var genres = [];

    node.select(".genres-content-search a, .genres-content a").forEach(function (genreNode) {
        var genreTitle = cleanText(genreNode.text());
        var genreHref = genreNode.attr("href");
        if (!genreTitle || !genreHref) return;
        genres.push(toGenreItem(genreTitle, genreHref));
    });

    var item = {
        title: title,
        rawLink: rawLink,
        slug: extractBookSlug(rawLink),
        mangaId: cleanText(descNode ? descNode.attr("data-manga-id") : ""),
        cover: pickImage(node.select("img").first()),
        descriptionHtml: descNode ? (descNode.html() || "") : "",
        descriptionText: cleanText(descNode ? descNode.text() : ""),
        statusText: statusText,
        ongoing: isOngoingStatus(statusText),
        genres: genres,
        latestChapterSlug: cleanText(latestNode ? (extractChapterSlug(latestNode.attr("href")) || latestNode.attr("value")) : ""),
        latestChapterName: cleanText(latestNode ? latestNode.text() : ""),
        latestChapterUrl: latestNode ? normalizeUrl(latestNode.attr("href")) : "",
        host: BASE_URL
    };

    item.link = buildBookLink(item.rawLink, item.mangaId, item);
    return item;
}

function extractListItems(doc) {
    var items = [];

    doc.select(".row.c-tabs-item__content").forEach(function (node) {
        var item = extractItemData(node);
        if (item) items.push(item);
    });

    if (items.length === 0) {
        doc.select(".page-item-detail").forEach(function (node) {
            var item = extractItemData(node);
            if (item) items.push(item);
        });
    }

    return items;
}

function toNovel(item) {
    return {
        name: item.title,
        link: item.link,
        cover: item.cover,
        author: "N/A",
        description: item.descriptionText,
        host: BASE_URL
    };
}

function getNextPage(doc) {
    var pageInput = doc.select("#madara_goto_page").first();
    if (!pageInput) return "";

    var current = parseInt(pageInput.attr("placeholder") || "1", 10);
    var total = parseInt(pageInput.attr("max") || "0", 10);
    if (!isNaN(current) && !isNaN(total) && current < total) {
        return String(current + 1);
    }

    return "";
}

function matchResolvedItem(items, info) {
    var i;

    for (i = 0; i < items.length; i++) {
        if (info.mangaId && items[i].mangaId === info.mangaId) {
            return items[i];
        }
    }

    for (i = 0; i < items.length; i++) {
        if (info.slug && items[i].slug === info.slug) {
            return items[i];
        }
    }

    for (i = 0; i < items.length; i++) {
        if (info.title && cleanText(items[i].title).toLowerCase() === cleanText(info.title).toLowerCase()) {
            return items[i];
        }
    }

    return items.length ? items[0] : null;
}

function mergeBookInfo(baseInfo, resolvedInfo) {
    var merged = {
        url: baseInfo.url,
        slug: resolvedInfo && resolvedInfo.slug ? resolvedInfo.slug : baseInfo.slug,
        mangaId: resolvedInfo && resolvedInfo.mangaId ? resolvedInfo.mangaId : baseInfo.mangaId,
        title: resolvedInfo && resolvedInfo.title ? resolvedInfo.title : (baseInfo.title || slugToKeyword(baseInfo.slug)),
        cover: resolvedInfo && resolvedInfo.cover ? resolvedInfo.cover : baseInfo.cover,
        statusText: resolvedInfo && resolvedInfo.statusText ? resolvedInfo.statusText : baseInfo.statusText,
        descriptionHtml: resolvedInfo && resolvedInfo.descriptionHtml ? resolvedInfo.descriptionHtml : "",
        descriptionText: resolvedInfo && resolvedInfo.descriptionText ? resolvedInfo.descriptionText : "",
        ongoing: resolvedInfo ? resolvedInfo.ongoing : isOngoingStatus(baseInfo.statusText),
        genres: resolvedInfo && resolvedInfo.genres ? resolvedInfo.genres : [],
        latestChapterSlug: resolvedInfo && resolvedInfo.latestChapterSlug ? resolvedInfo.latestChapterSlug : baseInfo.latestChapterSlug,
        latestChapterName: resolvedInfo && resolvedInfo.latestChapterName ? resolvedInfo.latestChapterName : "",
        latestChapterUrl: resolvedInfo && resolvedInfo.latestChapterUrl ? resolvedInfo.latestChapterUrl : "",
        host: BASE_URL
    };

    merged.link = buildBookLink(
        resolvedInfo && resolvedInfo.rawLink ? resolvedInfo.rawLink : baseInfo.url,
        merged.mangaId,
        merged
    );

    return merged;
}

function resolveBookInfo(url) {
    var info = parseBookUrl(url);
    var keyword = info.title || slugToKeyword(info.slug);
    var resolved = null;

    if (keyword) {
        var response = fetch(BASE_URL, {
            queries: {
                s: keyword,
                post_type: "wp-manga"
            }
        });

        if (response && response.ok) {
            resolved = matchResolvedItem(extractListItems(response.html()), info);
        }
    }

    return mergeBookInfo(info, resolved);
}

function fetchFirstChapterSlug(mangaId) {
    if (!mangaId) return "";

    var response = fetch(AJAX_URL + "?" + buildQueryString({
        action: "get_first_chapter_content",
        manga_id: mangaId
    }));
    if (!response || !response.ok) return "";

    var payload = response.json();
    var html = extractAjaxContent(payload);
    if (!html) return "";

    var doc = Html.parse(html);
    var chapterInput = doc.select("#wp-manga-current-chap").first();
    return cleanText(chapterInput ? chapterInput.attr("value") : "");
}

function extractAjaxContent(payload) {
    if (!payload) return "";
    if (typeof payload === "string") return payload;
    if (payload.data && typeof payload.data === "string") return payload.data;
    if (payload.data && payload.data.content) return payload.data.content;
    if (payload.data && payload.data.data && payload.data.data.content) return payload.data.data.content;
    if (payload.content) return payload.content;
    return "";
}

function cleanReadingHtml(html) {
    return (html || "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .trim();
}
