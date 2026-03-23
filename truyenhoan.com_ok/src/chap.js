load("config.js");

function execute(url) {
    var requestUrl = normalizeUrl(url);
    var response = fetch(requestUrl);
    if (!response.ok) return null;

    var doc = response.html();
    var contentEl = doc.select("#chapter-c").first();
    if (!contentEl) contentEl = doc.select(".chapter-c").first();
    if (!contentEl) return null;

    contentEl.select(".ads,script,ins,iframe,.highlight-box").remove();
    return Response.success(contentEl.html());
}
