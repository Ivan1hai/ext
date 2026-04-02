load("config.js");

function ktcPushTocItems(doc, list, seen) {
    let items = doc.select(".entries article .entry-title a");
    if (items.size() === 0) items = doc.select("h2.entry-title a");

    items.forEach(item => {
        let link = ktcToAbsolute(item.attr("href"));
        let name = ktcTrim(item.text().replace(/\s+/g, " "));
        if (!name || !link || seen[link]) return;

        seen[link] = true;
        list.push({
            name: name,
            url: link,
            host: BASE_URL
        });
    });
}

function ktcFindNextTocUrl(doc) {
    let nextEl = doc.select(".ct-pagination a.next.page-numbers, .ct-pagination a.next").first();
    if (!nextEl) nextEl = doc.select("link[rel='next']").first();
    if (!nextEl) return "";
    return ktcToAbsolute(nextEl.attr("href"));
}

function ktcFetchStoryTerm(url) {
    let slug = ktcStorySlug(url);
    if (!slug) return null;

    let apiUrl = BASE_URL
        + "/wp-json/wp/v2/bo_truyen?slug="
        + encodeURIComponent(slug)
        + "&_fields=id,link,name,count";

    let jsonData = ktcFetchJson(apiUrl, null, url);
    if (!jsonData.data || Object.prototype.toString.call(jsonData.data) !== "[object Array]" || jsonData.data.length === 0) {
        return null;
    }

    return jsonData.data[0];
}

function ktcFetchTocFromHtml(url) {
    let list = [];
    let seen = {};
    let currentUrl = ktcNormalizeUrl(url);
    let pageCount = 0;

    while (currentUrl && pageCount < 100) {
        let pageData = ktcFetchPage(currentUrl, null, 15000, url);
        if (!pageData || !pageData.doc || pageData.blocked) break;

        ktcPushTocItems(pageData.doc, list, seen);

        let nextUrl = ktcFindNextTocUrl(pageData.doc);
        if (!nextUrl || nextUrl === currentUrl) break;

        currentUrl = nextUrl;
        pageCount += 1;
    }

    return list;
}

function ktcChapterTitle(item) {
    if (!item) return "";

    let title = "";
    if (item.title && typeof item.title === "object") {
        title = item.title.rendered || "";
    } else {
        title = item.title || "";
    }

    return ktcPlainText(title);
}

function ktcFetchTocFromRest(url) {
    let storyTerm = ktcFetchStoryTerm(url);
    if (!storyTerm || !storyTerm.id) {
        return [];
    }

    let list = [];
    let seen = {};
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= 100) {
        let apiUrl = BASE_URL
            + "/wp-json/wp/v2/posts?bo_truyen="
            + encodeURIComponent(storyTerm.id)
            + "&per_page=100&page="
            + page
            + "&order=asc&orderby=date&_fields=link,title";

        let jsonData = ktcFetchJson(apiUrl, null, storyTerm.link || url);
        if (!jsonData.data || Object.prototype.toString.call(jsonData.data) !== "[object Array]") {
            break;
        }

        totalPages = ktcRestTotalPages(jsonData.response);

        jsonData.data.forEach(item => {
            let link = ktcToAbsolute(item && item.link ? item.link : "");
            let name = ktcChapterTitle(item);
            if (!name || !link || seen[link]) return;

            seen[link] = true;
            list.push({
                name: name,
                url: link,
                host: BASE_URL
            });
        });

        if (page >= totalPages) break;
        page += 1;
    }

    return list;
}

function execute(url) {
    let list = ktcFetchTocFromHtml(url);
    if (list.length > 0) {
        return Response.success(list);
    }

    return Response.success(ktcFetchTocFromRest(url));
}
