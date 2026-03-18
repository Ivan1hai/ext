load("config.js");

function execute(url) {
    var info = parseBookUrl(url);
    var chapterSlug = info.latestChapterSlug;

    if (!chapterSlug) {
        chapterSlug = fetchFirstChapterSlug(info.mangaId);
    }
    if (!info.mangaId || !chapterSlug) {
        return Response.success([]);
    }

    var chapterRes = fetch(AJAX_URL, {
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "x-requested-with": "XMLHttpRequest"
        },
        body: buildQueryString({
            action: "manga_get_reading_nav",
            manga: info.mangaId,
            chapter: chapterSlug,
            volume_id: 0,
            style: "select",
            type: "manga"
        })
    });
    if (!chapterRes || !chapterRes.ok) return Response.success([]);

    var doc = Html.parse(chapterRes.text());
    var chapters = [];

    doc.select("option").forEach(function (item) {
        var itemSlug = cleanText(item.attr("value") || extractChapterSlug(item.attr("data-redirect")));
        if (!itemSlug) return;

        chapters.push({
            name: cleanText(item.text()),
            url: buildChapterLink(info, itemSlug, item.attr("data-redirect")),
            host: BASE_URL
        });
    });

    chapters.reverse();
    return Response.success(chapters);
}
