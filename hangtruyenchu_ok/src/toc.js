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

function buildRequestOptions() {
    let options = {};
    if (SESSION_COOKIE) {
        options.headers = {
            Cookie: SESSION_COOKIE
        };
    }
    return options;
}

function fetchPage(url) {
    let response = fetch(url, buildRequestOptions());
    if (response && response.ok) {
        return {
            response: response,
            doc: response.html()
        };
    }

    if (response && (response.status === 403 || response.status === 503 || response.status === 401 || response.status === 400)) {
        let browser = Engine.newBrowser();
        browser.launch(url, 7000);
        let doc = browser.html();
        browser.close();
        return {
            response: response,
            doc: doc
        };
    }

    return null;
}

function extractStoryId(url) {
    let m = (url || "").match(/\/truyen\/(\d+)/);
    return m ? parseInt(m[1]) : 0;
}

function isLoginRequired(page) {
    if (!page || !page.doc) return false;
    if (page.response && page.response.url && page.response.url.indexOf("login=required") > -1) return true;

    let title = page.doc.select("title").text().trim().toLowerCase();
    let hasChapterList = page.doc.select("#chapter-list-container").size() > 0
        || page.doc.select("a.chapter-item-link").size() > 0;

    return title === "trang chủ" && !hasChapterList;
}

function fetchStoryById(storyId) {
    if (!storyId) return null;

    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= 80) {
        let apiUrl = BASE_URL + "/danh-sach?ajax=true&sort=updated&page=" + page;
        let response = fetch(apiUrl, buildRequestOptions());
        if (!response || !response.ok) return null;

        let json = null;
        try {
            json = response.json();
        } catch (e) {
            return null;
        }

        if (!json || !json.success || !json.stories) return null;

        for (let i = 0; i < json.stories.length; i++) {
            let story = json.stories[i];
            if (parseInt(story.id) === storyId) return story;
        }

        let total = parseInt(json.totalPages || "1");
        totalPages = total > 0 ? total : 1;
        page += 1;
    }

    return null;
}

function buildSyntheticToc(storyId, totalChapters) {
    let list = [];
    for (let i = 1; i <= totalChapters; i++) {
        list.push({
            name: "Chương " + i,
            url: toAbsolute("/doc-truyen/" + storyId + "/chuong/" + i),
            host: BASE_URL
        });
    }
    return list;
}

function execute(url) {
    let normalized = normalizeUrl(url);
    let page = fetchPage(normalized);

    if (page && page.doc) {
        let list = [];
        let items = page.doc.select("#chapter-list-container a.chapter-item-link");
        if (items.size() === 0) items = page.doc.select("a.chapter-item-link");

        items.forEach(item => {
            let name = item.text().trim();
            let link = toAbsolute(item.attr("href"));
            if (name && link) {
                list.push({
                    name: name,
                    url: link,
                    host: BASE_URL
                });
            }
        });

        if (list.length > 0) return Response.success(list);
        if (!isLoginRequired(page)) return Response.success([]);
    }

    let storyId = extractStoryId(normalized);
    if (storyId) {
        let story = fetchStoryById(storyId);
        if (story) {
            let totalChapters = parseInt(story.total_chapters || "0");
            if (totalChapters > 0) {
                return Response.success(buildSyntheticToc(storyId, totalChapters));
            }
        }
    }

    return Response.success([]);
}
