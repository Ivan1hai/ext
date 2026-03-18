load("config.js");

function execute(url) {
    var info = parseBookUrl(url);
    var chapterSlug = info.chapterSlug || extractChapterSlug(url);
    if (!info.mangaId || !chapterSlug) return null;

    var response = fetch(AJAX_URL + "?" + buildQueryString({
        postID: info.mangaId,
        chapter: chapterSlug,
        "truyen-paged": 1,
        style: "paged",
        action: "chapter_navigate_page"
    }), {
        headers: {
            accept: "application/json, text/javascript, */*; q=0.01",
            "x-requested-with": "XMLHttpRequest"
        }
    });
    if (!response || !response.ok) return null;

    var payload = response.json();
    var html = extractAjaxContent(payload);
    if (!html) return null;

    var doc = Html.parse(html);
    doc.select("script").remove();
    doc.select("style").remove();

    var content = doc.select(".text-left").html();
    if (!content) content = doc.select(".reading-content").html();
    if (!content) content = html;

    return Response.success(cleanReadingHtml(content));
}
