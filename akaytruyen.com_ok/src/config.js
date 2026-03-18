let BASE_URL = "https://akaytruyen.com";
let SESSION_COOKIE = "";
let CHAPTER_LINK_SELECTOR = ".story-detail__list-chapter--list .chapter-card-mobile a[href], .story-detail__list-chapter--list .chapter-card-desktop a[href]";
let MAX_TOC_PAGES = 400;

try {
    if (CONFIG_URL) {
        BASE_URL = ("" + CONFIG_URL).trim().replace(/\/+$/, "");
    }
} catch (e) {
}

try {
    if (CONFIG_COOKIE) {
        SESSION_COOKIE = ("" + CONFIG_COOKIE).trim();
    }
} catch (e) {
}

function cleanText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
}

function removeQueryAndHash(url) {
    return (url || "").replace(/[?#].*$/, "");
}

function toAbsolute(url) {
    if (!url) return "";
    let raw = ("" + url).trim();
    if (!raw) return "";

    if (raw.startsWith("http://")) return "https://" + raw.substring(7);
    if (raw.startsWith("https://")) return raw;
    if (raw.startsWith("//")) return "https:" + raw;

    return BASE_URL + (raw.startsWith("/") ? "" : "/") + raw;
}

function normalizeUrl(url) {
    if (!url) return BASE_URL;
    return toAbsolute(url).replace(/\/+$/, "");
}

function zeroPadNumber(value, width) {
    let text = String(parseInt(value || "0", 10) || 0);
    while (text.length < width) text = "0" + text;
    return text;
}

function buildChapterSortName(name, chapterNumber) {
    let order = parseInt(chapterNumber || "0", 10);
    if (order <= 0) return name;

    let prefix = "";
    let padCount = Math.max(0, 6 - String(order).length);
    for (let i = 0; i < padCount; i++) prefix += "\u200B";
    return prefix + name;
}

function buildChapterKey(realUrl, chapterNumber) {
    let order = parseInt(chapterNumber || "0", 10);
    if (order <= 0) return realUrl;
    return "chap:" + zeroPadNumber(order, 6) + ":" + encodeURIComponent(realUrl);
}

function extractChapterUrlFromKey(value) {
    let text = (value || "").toString().trim();
    if (!text) return "";

    for (let i = 0; i < 3; i++) {
        let idx = text.toLowerCase().indexOf("chap:");
        if (idx > -1) {
            let raw = text.substring(idx);
            let matched = raw.match(/^chap:\d+:(.+)$/i);
            if (matched && matched[1]) {
                try {
                    return decodeURIComponent(matched[1]);
                } catch (e) {
                    return matched[1];
                }
            }
        }

        try {
            let decoded = decodeURIComponent(text);
            if (!decoded || decoded === text) break;
            text = decoded;
        } catch (e) {
            break;
        }
    }

    return text;
}

function buildRequestOptions(extraHeaders) {
    let headers = {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Referer: BASE_URL + "/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
    };

    if (SESSION_COOKIE) headers.Cookie = SESSION_COOKIE;

    if (extraHeaders) {
        Object.keys(extraHeaders).forEach(k => {
            headers[k] = extraHeaders[k];
        });
    }

    let options = {};
    if (Object.keys(headers).length > 0) options.headers = headers;
    return options;
}

function fetchText(url, extraHeaders) {
    let finalUrl = normalizeUrl(url);
    let response = null;

    try {
        response = fetch(finalUrl, buildRequestOptions(extraHeaders));
    } catch (e) {
        response = null;
    }

    if (response && response.ok) {
        try {
            return response.text();
        } catch (e) {
        }
    }

    try {
        response = fetch(finalUrl);
    } catch (e) {
        response = null;
    }

    if (response && response.ok) {
        try {
            return response.text();
        } catch (e) {
        }
    }

    return "";
}

function fetchDoc(url) {
    let finalUrl = normalizeUrl(url);
    let response = null;
    let fallbackResponse = null;

    try {
        response = fetch(finalUrl, buildRequestOptions());
    } catch (e) {
        response = null;
    }

    if (response && response.ok) {
        return response.html();
    }

    try {
        fallbackResponse = fetch(finalUrl);
    } catch (e) {
        fallbackResponse = null;
    }

    if (fallbackResponse && fallbackResponse.ok) {
        return fallbackResponse.html();
    }

    if ((response && (response.status === 403 || response.status === 503 || response.status === 401 || response.status === 400))
        || (fallbackResponse && (fallbackResponse.status === 403 || fallbackResponse.status === 503 || fallbackResponse.status === 401 || fallbackResponse.status === 400))) {
        try {
            let browser = Engine.newBrowser();
            browser.launch(finalUrl, 5000);
            let doc = browser.html();
            browser.close();
            return doc;
        } catch (e) {
        }
    }

    return null;
}

function withPage(url, page) {
    let pageNum = parseInt(page || "1");
    if (!pageNum || pageNum <= 1) return normalizeUrl(url);

    let out = normalizeUrl(url);
    if (/[?&]page=\d+/i.test(out)) {
        return out.replace(/([?&])page=\d+/i, "$1page=" + pageNum);
    }

    return out + (out.indexOf("?") > -1 ? "&" : "?") + "page=" + pageNum;
}

function ensureOldFirst(url) {
    let out = normalizeUrl(url);
    if (/[?&]old_first=\d+/i.test(out)) {
        return out.replace(/([?&]old_first=)\d+/i, function (_, prefix) {
            return prefix + "1";
        });
    }

    return out + (out.indexOf("?") > -1 ? "&" : "?") + "old_first=1";
}

function stripPageParam(url) {
    let out = normalizeUrl(url);
    out = out.replace(/([?&])page=\d+/ig, "$1");
    out = out.replace(/\?&/g, "?").replace(/&&/g, "&");
    return out.replace(/[?&]$/, "");
}

function extractPageNumber(value) {
    let text = (value || "").toString().trim();
    if (!text) return 0;

    let matched = text.match(/[?&]page=(\d+)/i);
    if (matched && matched[1]) return parseInt(matched[1], 10);

    matched = text.match(/^(\d+)$/);
    if (matched && matched[1]) return parseInt(matched[1], 10);

    return 0;
}

function parseMaxPage(doc) {
    if (!doc) return 1;

    let maxPage = 1;
    doc.select(".pagination [data-url], .pagination a[href], .pagination .input-paginate, .pagination input[max]").forEach(el => {
        let pageNum = extractPageNumber(el.attr("data-url") || el.attr("href") || cleanText(el.text()));
        if (pageNum > maxPage) maxPage = pageNum;

        let maxAttr = parseInt((el.attr("max") || "").trim(), 10);
        if (maxAttr > maxPage) maxPage = maxAttr;

        let valueAttr = parseInt((el.attr("value") || "").trim(), 10);
        if (valueAttr > maxPage) maxPage = valueAttr;
    });

    return maxPage;
}

function countUniqueChapterLinks(doc) {
    if (!doc) return 0;

    let seen = {};
    let count = 0;

    doc.select(CHAPTER_LINK_SELECTOR).forEach(a => {
        let href = a.attr("href") || "";
        if (!href) return;

        let link = removeQueryAndHash(normalizeUrl(href));
        if (!/\/chuong-[^\/?#]+$/i.test(link)) return;
        if (seen[link]) return;

        seen[link] = true;
        count += 1;
    });

    return count;
}

function normalizeStoryLink(url) {
    let abs = removeQueryAndHash(normalizeUrl(url)).replace(/\/+$/, "");
    let matched = abs.match(/^(https?:\/\/[^\/]+\/truyen\/[^\/?#]+)/i);
    return matched ? matched[1] : abs;
}

function pushUniqueStory(list, seen, item) {
    if (!item || !item.link || !item.name) return;

    let key = normalizeStoryLink(item.link).toLowerCase();
    if (!key || seen[key]) return;
    seen[key] = true;
    list.push(item);
}

function parseStoryCards(doc) {
    let list = [];
    let seen = {};
    if (!doc) return list;

    let cards = doc.select(".story-item, .story-item-list");
    cards.forEach(card => {
        let linkEl = card.select("a[href*='/truyen/']").first();
        if (!linkEl) return;

        let link = normalizeStoryLink(linkEl.attr("href"));
        if (!/\/truyen\/[^\/?#]+$/i.test(link)) return;

        let name = cleanText(card.select(".story-name").first() ? card.select(".story-name").first().text() : "");
        if (!name) name = cleanText(card.select(".story-item__name").first() ? card.select(".story-item__name").first().text() : "");
        if (!name) name = cleanText(card.select(".story-item-list__name").first() ? card.select(".story-item-list__name").first().text() : "");
        if (!name) name = cleanText(linkEl.text());
        if (!name) return;

        let coverEl = card.select("img").first();
        let cover = coverEl ? (coverEl.attr("data-src") || coverEl.attr("src") || "") : "";

        let description = "";
        let authorEl = card.select(".author-name").first();
        if (authorEl) description = cleanText(authorEl.text());
        if (!description) {
            let chapterEl = card.select(".story-item-list__chapter").first();
            if (chapterEl) description = cleanText(chapterEl.text());
        }

        pushUniqueStory(list, seen, {
            name: name,
            link: link,
            cover: toAbsolute(cover),
            description: description,
            host: BASE_URL
        });
    });

    if (list.length > 0) return list;

    doc.select("a[href*='/truyen/']").forEach(a => {
        let link = normalizeStoryLink(a.attr("href"));
        if (!/\/truyen\/[^\/?#]+$/i.test(link)) return;

        let name = cleanText(a.text());
        if (!name) return;

        let block = a.parent();
        let cover = "";
        if (block) {
            let img = block.select("img").first();
            if (!img) img = block.parent() ? block.parent().select("img").first() : null;
            if (img) cover = img.attr("data-src") || img.attr("src") || "";
        }

        pushUniqueStory(list, seen, {
            name: name,
            link: link,
            cover: toAbsolute(cover),
            description: "",
            host: BASE_URL
        });
    });

    return list;
}

function parseNextPage(doc, currentPage) {
    let pageNum = parseInt(currentPage || "1");
    if (!pageNum || pageNum < 1) pageNum = 1;

    let min = Number.POSITIVE_INFINITY;
    doc.select("a[href*='page=']").forEach(a => {
        let href = a.attr("href") || "";
        let matched = href.match(/[?&]page=(\d+)/i);
        if (!matched) return;
        let p = parseInt(matched[1]);
        if (p > pageNum && p < min) min = p;
    });

    if (min !== Number.POSITIVE_INFINITY) return String(min);
    return "";
}

function parseCategoryLinks(doc) {
    let list = [];
    let seen = {};
    if (!doc) return list;

    doc.select("a[href*='/the-loai/']").forEach(a => {
        let href = removeQueryAndHash(toAbsolute(a.attr("href") || ""));
        let matched = href.match(/\/the-loai\/([^\/?#]+)/i);
        if (!matched || !matched[1]) return;

        let slug = matched[1].toLowerCase();
        if (seen[slug]) return;
        seen[slug] = true;

        let title = cleanText(a.text());
        if (!title) return;

        list.push({
            title: title,
            url: BASE_URL + "/the-loai/" + matched[1]
        });
    });

    return list;
}
