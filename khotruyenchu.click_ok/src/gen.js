load("config.js");

function ktcWithPage(url, page) {
    let currentPage = parseInt(page || "1", 10);
    let normalized = ktcNormalizeUrl(url).replace(/\/+$/, "");

    if (normalized.indexOf("/wp-json/") > -1) {
        if (/[?&]page=\d+/i.test(normalized)) {
            return normalized.replace(/([?&])page=\d+/i, "$1page=" + currentPage);
        }
        return normalized + (normalized.indexOf("?") > -1 ? "&" : "?") + "page=" + currentPage;
    }

    if (normalized.indexOf("?") > -1) {
        if (/[?&]page=\d+/i.test(normalized)) {
            return normalized.replace(/([?&])page=\d+/i, "$1page=" + currentPage);
        }
        return normalized + "&page=" + currentPage;
    }

    normalized = normalized.replace(/\/page\/\d+$/i, "");
    if (currentPage <= 1) return normalized + "/";
    return normalized + "/page/" + currentPage + "/";
}

function ktcRestItemToBook(item) {
    let name = ktcDecodeHtml(item && item.name ? item.name : "");
    let link = ktcToAbsolute(item && item.link ? item.link : "");
    let description = ktcShortText(item && item.description ? item.description : "", 240);

    if (!description && item && item.count) {
        description = "Số chương: " + item.count;
    } else if (description && item && item.count) {
        description += " | Số chương: " + item.count;
    }

    if (!name || !link) return null;

    return {
        name: name,
        link: link,
        cover: ktcResolveStoryCover(item),
        description: description,
        host: BASE_URL
    };
}

function ktcParseHtmlCard(item) {
    let titleEl = item.select(".entry-title a").first();
    if (!titleEl) titleEl = item.select(".hs-title a").first();
    if (!titleEl) titleEl = item.select(".story-list-title").first();
    if (!titleEl) titleEl = item.select("a[href*='/truyen/']").first();
    if (!titleEl) titleEl = item.select("a").first();
    if (!titleEl) return null;

    let link = ktcToAbsolute(titleEl.attr("href") || item.attr("href"));
    let name = ktcTrim(titleEl.text().replace(/\s+/g, " "));
    if (!name || !link) return null;

    let coverEl = item.select(".ct-media-container img").first();
    if (!coverEl) coverEl = item.select(".hs-thumb img").first();
    if (!coverEl) coverEl = item.select(".story-thumb-fixed img, .story-thumb-img").first();
    if (!coverEl) coverEl = item.select("img").first();

    let cover = "";
    if (coverEl) {
        cover = coverEl.attr("data-src") || coverEl.attr("data-lazy-src") || coverEl.attr("src") || "";
    }

    let description = ktcTrim(item.select(".entry-excerpt").text().replace(/\s+/g, " "));
    if (!description) description = ktcTrim(item.select(".entry-meta").text().replace(/\s+/g, " "));
    if (!description) description = ktcTrim(item.select(".hs-meta").text().replace(/\s+/g, " "));
    if (!description) {
        let author = ktcTrim(item.select(".story-list-author").text().replace(/\s+/g, " "));
        let time = ktcTrim(item.select(".story-list-time").text().replace(/\s+/g, " "));
        description = author;
        if (time) description += (description ? " | " : "") + time;
    }

    return {
        name: name,
        link: link,
        cover: ktcToAbsolute(cover || DEFAULT_COVER),
        description: description,
        host: BASE_URL
    };
}

function ktcParseHtmlList(doc) {
    let list = [];
    let items = doc.select(".entries article");
    if (items.size() === 0) items = doc.select(".home-story-card, .hs-item");

    items.forEach(item => {
        let parsed = ktcParseHtmlCard(item);
        if (parsed) list.push(parsed);
    });

    return list;
}

function ktcNormalizeNeedle(text) {
    return ktcFoldText(text).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

function ktcSectionNeedle(sectionKey) {
    switch (ktcTrim(sectionKey)) {
        case "new":
            return "truyen moi cua kho";
        case "updated":
            return "truyen moi cap nhat";
        case "top-qidian":
            return "top xep hang qidian";
        case "yeu-cau-dich":
            return "doc gia yeu cau dich";
        case "huyen-huyen-tien-hiep":
            return "huyen huyen tien hiep";
        default:
            return "";
    }
}

function ktcParseHomeSection(sectionKey) {
    let needle = ktcSectionNeedle(sectionKey);
    if (!needle) return [];

    let response = ktcFetch(BASE_URL);
    let html = response && response.ok ? (response.text() || "") : "";

    if (!html || html.indexOf("home-genre-title") === -1) {
        ktcOpenBrowser(BASE_URL, 15000);
        response = ktcFetch(BASE_URL);
        html = response && response.ok ? (response.text() || "") : "";
    }

    if (!html) return [];

    let headingRegex = /<h2[^>]*class=["'][^"']*home-genre-title[^"']*["'][^>]*>\s*<span>([\s\S]*?)<\/span>\s*<\/h2>/ig;
    let matches = [];
    let matched = null;

    while ((matched = headingRegex.exec(html)) !== null) {
        matches.push({
            index: matched.index,
            title: ktcNormalizeNeedle(ktcDecodeHtml(matched[1] || ""))
        });
    }

    for (let i = 0; i < matches.length; i++) {
        let item = matches[i];
        if (!item.title || item.title.indexOf(needle) === -1) continue;

        let endIndex = i + 1 < matches.length ? matches[i + 1].index : html.length;
        let segment = html.substring(item.index, endIndex);
        let segmentDoc = Html.parse("<div>" + segment + "</div>");
        let list = [];

        segmentDoc.select(".home-story-card, .story-list-item").forEach(card => {
            let parsed = ktcParseHtmlCard(card);
            if (parsed) list.push(parsed);
        });

        if (list.length > 0) return list;
    }

    return [];
}

function ktcParseNextPage(doc, page) {
    let current = parseInt(page || "1", 10);
    let nextEl = doc.select(".ct-pagination a.next.page-numbers").first();
    if (!nextEl) nextEl = doc.select(".ct-pagination a.next").first();

    if (nextEl) {
        let href = nextEl.attr("href") || "";
        let matched = href.match(/\/page\/(\d+)\/?$/i);
        if (!matched) matched = href.match(/[?&]page=(\d+)/i);
        if (matched && parseInt(matched[1], 10) > current) {
            return matched[1];
        }
        return String(current + 1);
    }

    let min = Number.POSITIVE_INFINITY;
    doc.select("a[href*='/page/'], a[href*='page=']").forEach(item => {
        let href = item.attr("href") || "";
        let matched = href.match(/\/page\/(\d+)\/?$/i);
        if (!matched) matched = href.match(/[?&]page=(\d+)/i);
        if (!matched) return;

        let value = parseInt(matched[1], 10);
        if (value > current && value < min) {
            min = value;
        }
    });

    return min !== Number.POSITIVE_INFINITY ? String(min) : "";
}

function execute(url, page) {
    if (!page) page = "1";

    let rawUrl = ktcTrim(url);
    if (rawUrl.indexOf("@section:") === 0) {
        if (page !== "1") return Response.success([]);
        return Response.success(ktcParseHomeSection(rawUrl.replace(/^@section:/, "")));
    }

    let normalized = ktcNormalizeUrl(url);
    if (normalized.indexOf("/wp-json/wp/v2/bo_truyen") > -1) {
        let jsonData = ktcFetchJson(ktcWithPage(normalized, page), null, BASE_URL);
        if (!jsonData.data || Object.prototype.toString.call(jsonData.data) !== "[object Array]") {
            return Response.success([]);
        }

        let list = [];
        jsonData.data.forEach(item => {
            let parsed = ktcRestItemToBook(item);
            if (parsed) list.push(parsed);
        });

        let current = parseInt(page || "1", 10);
        let totalPages = ktcRestTotalPages(jsonData.response);
        let next = current < totalPages ? String(current + 1) : "";
        return Response.success(list, next);
    }

    let pageData = ktcFetchPage(ktcWithPage(normalized, page), null, 15000, normalized);
    if (!pageData || !pageData.doc || pageData.blocked) {
        return Response.success([]);
    }

    let list = ktcParseHtmlList(pageData.doc);
    let next = list.length > 0 ? ktcParseNextPage(pageData.doc, page) : "";
    return Response.success(list, next);
}
