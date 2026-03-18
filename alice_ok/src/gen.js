load('config.js');

function absoluteUrl(url) {
    if (!url) return "";
    if (url.indexOf("http") === 0) return url;
    if (url.indexOf("//") === 0) return "https:" + url;
    return BASE_URL + (url.charAt(0) === "/" ? "" : "/") + url;
}

function withPage(url, page) {
    if (/([?&])page=\d+/i.test(url)) {
        return url.replace(/([?&])page=\d+/i, "$1page=" + page);
    }
    return url + (url.indexOf("?") !== -1 ? "&" : "?") + "page=" + page;
}

function getPage(url, page) {
    url = (url || "").trim();
    if (!url) return "";
    if (url.indexOf("http") !== 0) {
        url = absoluteUrl(url);
    }
    return withPage(url, page);
}

function extractPage(url) {
    let match = (url || "").match(/[?&]page=(\d+)/i);
    return match ? parseInt(match[1]) : 0;
}

function findNextPage(doc, page) {
    let current = parseInt(page || 1);
    let next = 0;

    doc.select(".pagination a").forEach(function (e) {
        let candidate = extractPage(e.attr("href"));
        if (!candidate || candidate <= current) return;
        if (!next || candidate < next) {
            next = candidate;
        }
    });

    return next ? String(next) : "";
}

function buildDescription(item) {
    let parts = [];
    let author = item.select(".four").text().trim();
    let words = item.select(".five").text().trim();
    let updatedAt = item.select(".six").text().trim();

    if (author) parts.push(author);
    if (words) parts.push(words);
    if (updatedAt) parts.push(updatedAt);

    return parts.join(" | ");
}

function execute(url, page) {
    if (!page) page = 1;

    let response = httpGet(getPage(url, page));
    if (!response || !response.ok) return null;

    let doc = response.html();
    let data = [];

    doc.select(".clearfix.rec_rullist > ul, .clearfix.rec_rboxone > div ul").forEach(function (e) {
        let link = e.select(".two a").attr("href");
        let name = e.select(".two").first().text().trim();
        if (!name || !link) return;

        data.push({
            name: name,
            cover: "",
            link: absoluteUrl(link),
            description: buildDescription(e),
            host: BASE_URL
        });
    });

    return Response.success(data, findNextPage(doc, page));
}
