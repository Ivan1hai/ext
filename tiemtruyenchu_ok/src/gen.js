load("config.js");

function withPage(url, page) {
    let normalized = ttcNormalizeUrl(url);
    if (/([?&])page=\d+/.test(normalized)) {
        return normalized.replace(/([?&])page=\d+/, "$1page=" + page);
    }
    return normalized + (normalized.indexOf("?") > -1 ? "&" : "?") + "page=" + page;
}

function parseNext(doc, page) {
    let current = parseInt(page || "1", 10);

    let next = ttcTrim(doc.select("#pagination-container .page-item.active + .page-item button.page-link").text());
    if (!next) next = ttcTrim(doc.select("#pagination-container .page-item.active + .page-item a.page-link").text());
    if (!next) next = ttcTrim(doc.select(".pagination .page-item.active + .page-item .page-link").text());
    if (next && /^\d+$/.test(next) && parseInt(next, 10) > current) return next;

    let min = Number.POSITIVE_INFINITY;
    doc.select("a[href*='page=']").forEach(item => {
        let href = item.attr("href") || "";
        let matched = href.match(/[?&]page=(\d+)/);
        if (!matched) return;

        let value = parseInt(matched[1], 10);
        if (value > current && value < min) {
            min = value;
        }
    });

    return min !== Number.POSITIVE_INFINITY ? String(min) : "";
}

function parseList(doc) {
    let list = [];

    let items = doc.select("#story-list-container .story-item");
    if (items.size() === 0) items = doc.select(".story-item");

    if (items.size() > 0) {
        items.forEach(item => {
            let titleEl = item.select("a.story-title").first();
            if (!titleEl) titleEl = item.select("a[href*='/truyen/']").first();
            if (!titleEl) titleEl = item.select("a").first();
            if (!titleEl) return;

            let link = ttcToAbsolute(titleEl.attr("href"));
            let name = ttcTrim(titleEl.text().replace(/\s+/g, " "));

            let coverEl = item.select("img.story-poster").first();
            if (!coverEl) coverEl = item.select("img").first();
            let cover = coverEl ? (coverEl.attr("data-src") || coverEl.attr("src") || "") : "";

            let desc = ttcTrim(item.select(".story-desc").text());
            if (!desc) desc = ttcTrim(item.select(".story-meta").text().replace(/\s+/g, " "));

            if (!name || !link) return;
            list.push({
                name: name,
                link: link,
                cover: ttcToAbsolute(cover),
                description: desc,
                host: BASE_URL
            });
        });

        return list;
    }

    let rows = doc.select("table tbody tr");
    if (rows.size() > 0) {
        rows.forEach(item => {
            let titleEl = item.select("a.fw-bold").first();
            if (!titleEl) titleEl = item.select("a[href*='/truyen/']").first();
            if (!titleEl) return;

            let name = ttcTrim(titleEl.text().replace(/\s+/g, " "));
            let link = ttcToAbsolute(titleEl.attr("href"));
            let coverEl = item.select("img.story-cover").first();
            if (!coverEl) coverEl = item.select("img").first();
            let cover = coverEl ? (coverEl.attr("data-src") || coverEl.attr("src") || "") : "";

            let author = "";
            try {
                author = ttcTrim(item.select("td").get(2).text().replace(/\s+/g, " "));
            } catch (error) {}

            if (!name || !link) return;
            list.push({
                name: name,
                link: link,
                cover: ttcToAbsolute(cover),
                description: author,
                host: BASE_URL
            });
        });
    }

    if (list.length > 0) return list;

    doc.select("a.mobile-rank-item").forEach(item => {
        let link = ttcToAbsolute(item.attr("href"));
        let name = ttcTrim(item.select(".mobile-title").text().replace(/\s+/g, " "));
        if (!name) name = ttcTrim(item.text().replace(/\s+/g, " "));

        let coverEl = item.select("img.mobile-story-cover").first();
        if (!coverEl) coverEl = item.select("img").first();
        let cover = coverEl ? (coverEl.attr("data-src") || coverEl.attr("src") || "") : "";

        let author = ttcTrim(item.select(".mobile-meta").text());
        author = author.replace(/^.*:/, "").replace(/\s+/g, " ").trim();

        if (!name || !link) return;
        list.push({
            name: name,
            link: link,
            cover: ttcToAbsolute(cover),
            description: author,
            host: BASE_URL
        });
    });

    return list;
}

function execute(url, page) {
    if (!page) page = "1";

    let pageData = ttcFetchPage(withPage(url, page), null, 12000);
    if (!pageData || !pageData.doc || pageData.loginRequired) {
        return Response.success([]);
    }

    let list = parseList(pageData.doc);
    let next = list.length > 0 ? parseNext(pageData.doc, page) : "";
    return Response.success(list, next);
}
