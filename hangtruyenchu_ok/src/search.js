load("config.js");

function toAbsolute(url) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("//")) return "https:" + url;
    return BASE_URL + (url.startsWith("/") ? "" : "/") + url;
}

function fetchDoc(url) {
    let response = fetch(url);
    if (response && response.ok) return response.html();

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

function parseJsonResult(json, page) {
    let list = [];

    json.stories.forEach(story => {
        let link = story.url || "";
        if (!link && story.slug) link = "/truyen/" + story.slug;
        if (!link) link = "/truyen/" + story.id;
        list.push({
            name: story.title || story.name || "",
            link: toAbsolute(link),
            cover: toAbsolute(story.poster || story.cover || ""),
            description: story.author || "",
            host: BASE_URL
        });
    });

    let next = "";
    let currentPage = parseInt(json.currentPage || page || "1");
    let totalPages = parseInt(json.totalPages || json.lastPage || "0");
    if (currentPage < totalPages) next = String(currentPage + 1);

    return Response.success(list, next);
}

function execute(key, page) {
    if (!page) page = "1";

    let jsonUrl = BASE_URL + "/danh-sach?keyword=" + encodeURIComponent(key) + "&page=" + page + "&ajax=1";
    let response = fetch(jsonUrl);

    if (response && response.ok) {
        try {
            let json = response.json();
            if (json && json.success && json.stories) {
                return parseJsonResult(json, page);
            }
        } catch (e) {}

        try {
            let doc = response.html();
            let list = parseList(doc);
            let next = list.length > 0 ? parseNext(doc, page) : "";
            return Response.success(list, next);
        } catch (e) {}
    }

    let fallbackUrl = BASE_URL + "/danh-sach?keyword=" + encodeURIComponent(key) + "&page=" + page;
    let doc = fetchDoc(fallbackUrl);
    if (!doc) return Response.success([]);

    let list = parseList(doc);
    let next = list.length > 0 ? parseNext(doc, page) : "";
    return Response.success(list, next);
}
