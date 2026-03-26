load("config.js");

function parseNext(doc, page) {
    let current = parseInt(page || "1", 10);
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

function parseJsonResult(json, page) {
    let list = [];

    json.stories.forEach(item => {
        let link = item.url || "";
        if (!link && item.slug) link = "/truyen/" + item.slug;
        if (!link) link = "/truyen/" + item.id;

        list.push({
            name: item.title || item.name || "",
            link: ttcToAbsolute(link),
            cover: ttcToAbsolute(item.poster || item.cover || ""),
            description: item.author || "",
            host: BASE_URL
        });
    });

    let next = "";
    let currentPage = parseInt(json.currentPage || page || "1", 10);
    let totalPages = parseInt(json.totalPages || json.lastPage || "0", 10);
    if (currentPage < totalPages) next = String(currentPage + 1);

    return Response.success(list, next);
}

function execute(key, page) {
    if (!page) page = "1";

    let jsonUrl = BASE_URL + "/danh-sach?keyword=" + encodeURIComponent(key) + "&page=" + page + "&ajax=1";
    let response = ttcFetch(jsonUrl);

    if (response && response.ok) {
        try {
            let json = response.json();
            if (json && json.success && json.stories) {
                return parseJsonResult(json, page);
            }
        } catch (error) {}

        try {
            let doc = response.html();
            if (!ttcIsLoginDocument(doc)) {
                let list = parseList(doc);
                let next = list.length > 0 ? parseNext(doc, page) : "";
                return Response.success(list, next);
            }
        } catch (error) {}
    }

    let pageData = ttcFetchPage(BASE_URL + "/danh-sach?keyword=" + encodeURIComponent(key) + "&page=" + page, null, 12000);
    if (!pageData || !pageData.doc || pageData.loginRequired) {
        return Response.success([]);
    }

    let list = parseList(pageData.doc);
    let next = list.length > 0 ? parseNext(pageData.doc, page) : "";
    return Response.success(list, next);
}
