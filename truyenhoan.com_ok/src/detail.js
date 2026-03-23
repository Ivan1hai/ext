load("config.js");

function execute(url) {
    var requestUrl = normalizeUrl(url);
    var response = fetch(requestUrl);
    if (!response.ok) return null;

    var doc = response.html();
    var titleEl = doc.select("h1.title").first();
    if (!titleEl) titleEl = doc.select("h1").first();

    var cover = "";
    var coverEl = doc.select(".books img, .book img, [itemprop='image']").first();
    if (coverEl) {
        cover = coverEl.attr("data-pc");
        if (!cover) cover = coverEl.attr("data-mb");
        if (!cover) cover = coverEl.attr("src");
    }

    var author = "";
    var authorEl = doc.select("a[itemprop='author']").first();
    if (authorEl) author = authorEl.text().trim();

    var description = "";
    var descEl = doc.select(".desc-text").first();
    if (!descEl) descEl = doc.select("[itemprop='description']").first();
    if (descEl) {
        descEl.select("script,iframe,ins,.ads").remove();
        description = descEl.html();
    }

    var genres = [];
    var genreEls = doc.select("a[itemprop='genre']");
    for (var i = 0; i < genreEls.size(); i++) {
        var genreEl = genreEls.get(i);
        genres.push({
            title: genreEl.text().trim(),
            input: normalizeUrl(genreEl.attr("href")),
            script: "gen.js"
        });
    }

    var statusText = "";
    var infoEls = doc.select(".info div");
    for (var j = 0; j < infoEls.size(); j++) {
        var infoEl = infoEls.get(j);
        if (infoEl.select("a[itemprop='author']").size() > 0) continue;
        if (infoEl.select("a[itemprop='genre']").size() > 0) continue;

        var heading = removeAccents(infoEl.select("h3").text().trim());
        if (heading.indexOf("trang thai") !== -1) {
            statusText = infoEl.text().replace(/^\s*[^:]+:\s*/i, "").trim();
            break;
        }
    }

    var ongoing = true;
    var statusLower = removeAccents(statusText);
    if (statusLower.indexOf("hoan") !== -1 || statusLower.indexOf("full") !== -1) {
        ongoing = false;
    }

    var detail = [];
    if (author) detail.push("<b>Tac gia:</b> " + author);
    if (statusText) detail.push("<b>Trang thai:</b> " + statusText);
    if (genres.length > 0) {
        var genreNames = [];
        for (var k = 0; k < genres.length; k++) {
            genreNames.push(genres[k].title);
        }
        detail.push("<b>The loai:</b> " + genreNames.join(", "));
    }

    var published = doc.select("meta[itemprop='datePublished']").attr("content");
    var modified = doc.select("meta[itemprop='dateModified']").attr("content");
    if (published) detail.push("<b>Dang:</b> " + cleanDate(published));
    if (modified) detail.push("<b>Cap nhat:</b> " + cleanDate(modified));

    return Response.success({
        name: titleEl ? titleEl.text().trim() : "",
        cover: normalizeUrl(cover),
        author: author,
        description: description,
        detail: detail.join("<br>"),
        host: BASE_URL,
        genres: genres,
        ongoing: ongoing
    });
}
