load("config.js");

function toAbsolute(url) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("//")) return "https:" + url;
    return BASE_URL + (url.startsWith("/") ? "" : "/") + url;
}

function normalizeUrl(url) {
    if (!url) return BASE_URL;
    if (url.startsWith("http")) {
        return url.replace(/^http:\/\//i, "https://");
    }
    return BASE_URL + (url.startsWith("/") ? "" : "/") + url;
}

function withPage(url, page) {
    if (/([?&])page=\d+/.test(url)) {
        return url.replace(/([?&])page=\d+/, "$1page=" + page);
    }
    return url + (url.indexOf("?") > -1 ? "&" : "?") + "page=" + page;
}

function fetchDoc(url) {
    let response = fetch(url);
    if (response && response.ok) {
        return response.html();
    }

    if (response && (response.status === 403 || response.status === 503 || response.status === 401 || response.status === 400)) {
        let browser = Engine.newBrowser();
        browser.launch(url, 7000);
        let doc = browser.html();
        browser.close();
        return doc;
    }

    return null;
}

function parseNext(doc, page) {
    let current = parseInt(page || "1");

    let next = doc.select("#pagination-container .page-item.active + .page-item button.page-link").text().trim();
    if (!next) next = doc.select("#pagination-container .page-item.active + .page-item a.page-link").text().trim();
    if (!next) next = doc.select(".pagination .page-item.active + .page-item .page-link").text().trim();
    if (next && /^\d+$/.test(next) && parseInt(next) > current) return next;

    let min = Number.POSITIVE_INFINITY;
    doc.select("a[href*='page=']").forEach(a => {
        let href = a.attr("href") || "";
        let m = href.match(/[?&]page=(\d+)/);
        if (m) {
            let p = parseInt(m[1]);
            if (p > current && p < min) min = p;
        }
    });

    if (min !== Number.POSITIVE_INFINITY) return String(min);
    return "";
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

            let link = toAbsolute(titleEl.attr("href"));
            let name = titleEl.text().replace(/\s+/g, " ").trim();

            let coverEl = item.select("img.story-poster").first();
            if (!coverEl) coverEl = item.select("img").first();
            let cover = coverEl ? (coverEl.attr("data-src") || coverEl.attr("src") || "") : "";

            let desc = item.select(".story-desc").text().trim();
            if (!desc) desc = item.select(".story-meta").text().replace(/\s+/g, " ").trim();

            if (name && link) {
                list.push({
                    name: name,
                    link: link,
                    cover: toAbsolute(cover),
                    description: desc,
                    host: BASE_URL
                });
            }
        });

        return list;
    }

    let rows = doc.select("table tbody tr");
    if (rows.size() > 0) {
        rows.forEach(tr => {
            let a = tr.select("a.fw-bold").first();
            if (!a) a = tr.select("a[href*='/truyen/']").first();
            if (!a) return;

            let name = a.text().replace(/\s+/g, " ").trim();
            let link = toAbsolute(a.attr("href"));
            let img = tr.select("img.story-cover").first();
            if (!img) img = tr.select("img").first();
            let cover = img ? (img.attr("data-src") || img.attr("src") || "") : "";

            let author = "";
            try {
                author = tr.select("td").get(2).text().replace(/\s+/g, " ").trim();
            } catch (e) {}

            if (name && link) {
                list.push({
                    name: name,
                    link: link,
                    cover: toAbsolute(cover),
                    description: author,
                    host: BASE_URL
                });
            }
        });
    }

    if (list.length > 0) return list;

    let cards = doc.select("a.mobile-rank-item");
    cards.forEach(a => {
        let link = toAbsolute(a.attr("href"));
        let name = a.select(".mobile-title").text().replace(/\s+/g, " ").trim();
        if (!name) name = a.text().replace(/\s+/g, " ").trim();

        let img = a.select("img.mobile-story-cover").first();
        if (!img) img = a.select("img").first();
        let cover = img ? (img.attr("data-src") || img.attr("src") || "") : "";

        let author = a.select(".mobile-meta").text();
        author = author.replace(/^.*:/, "").replace(/\s+/g, " ").trim();

        if (name && link) {
            list.push({
                name: name,
                link: link,
                cover: toAbsolute(cover),
                description: author,
                host: BASE_URL
            });
        }
    });

    return list;
}

function execute(url, page) {
    if (!page) page = "1";

    let finalUrl = withPage(normalizeUrl(url), page);
    let doc = fetchDoc(finalUrl);
    if (!doc) return Response.success([]);

    let list = parseList(doc);
    let next = list.length > 0 ? parseNext(doc, page) : "";

    return Response.success(list, next);
}
