load("config.js");

function parseChapterLinks(doc, output, seen) {
    var links = doc.select("#list-chapter li a");
    for (var i = 0; i < links.size(); i++) {
        var link = links.get(i);
        var href = normalizeUrl(link.attr("href"));
        if (!href || seen[href]) continue;
        seen[href] = true;
        output.push({
            name: link.text().trim(),
            url: href,
            host: BASE_URL
        });
    }
}

function extractLastPage(doc) {
    var lastPage = 1;
    var links = doc.select(".pagination li a[href*='/trang-']");

    for (var i = 0; i < links.size(); i++) {
        var href = links.get(i).attr("href");
        var match = href.match(/\/trang-(\d+)\/?/i);
        if (!match) continue;

        var pageNo = parseInt(match[1], 10);
        if (pageNo > lastPage) lastPage = pageNo;
    }

    return lastPage;
}

function execute(url) {
    var requestUrl = normalizeUrl(url);
    var response = fetch(requestUrl);
    if (!response.ok) return null;

    var doc = response.html();
    var chapters = [];
    var seen = {};

    parseChapterLinks(doc, chapters, seen);

    var lastPage = extractLastPage(doc);
    var baseUrl = requestUrl.replace(/\/+$/, "");
    for (var page = 2; page <= lastPage; page++) {
        var pageResponse = fetch(baseUrl + "/trang-" + page + "/");
        if (!pageResponse.ok) break;
        parseChapterLinks(pageResponse.html(), chapters, seen);
    }

    return Response.success(chapters);
}
