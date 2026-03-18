load("config.js");

function absoluteUrl(url) {
    if (!url) return "";
    if (url.indexOf("http") === 0) return url;
    if (url.indexOf("//") === 0) return "https:" + url;
    return BASE_URL + (url.charAt(0) === "/" ? "" : "/") + url;
}

function pushGenre(genres, seen, title, href) {
    title = (title || "").trim();
    href = (href || "").trim();
    if (!title || !href || seen[href]) return;

    seen[href] = true;
    genres.push({
        title: title,
        input: absoluteUrl(href),
        script: "gen.js"
    });
}

function execute() {
    let response = httpGet(BASE_URL);
    if (!response || !response.ok) return null;

    let doc = response.html();
    let genres = [];
    let seen = {};

    doc.select(".nav-fenlei .fenlei-item a[href*='/lists/']").forEach(function (e) {
        pushGenre(genres, seen, e.text(), e.attr("href"));
    });

    return Response.success(genres);
}
