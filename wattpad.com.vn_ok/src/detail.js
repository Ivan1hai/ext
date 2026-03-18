load("config.js");

function execute(url) {
    var response = fetch(normalizeUrl(url));
    if (!response.ok) return null;

    var doc = response.html();
    var infoItems = doc.select(".book-info-text li");
    var detailLines = [];
    var genres = [];

    infoItems.forEach(function (item) {
        var text = cleanText(item.text());
        if (text) detailLines.push(text);
    });

    doc.select(".li--genres a").forEach(function (item) {
        var title = cleanText(item.text());
        var href = item.attr("href");
        if (!title || !href) return;

        genres.push({
            title: title,
            input: href,
            script: "gen.js"
        });
    });

    var author = "";
    var authorNode = doc.select(".book-info-text a[itemprop=author]").first();
    if (authorNode) {
        author = cleanText(authorNode.text());
    } else if (infoItems.size() > 0) {
        author = extractValue(infoItems.get(0).text());
    }

    var descriptionNode = doc.select("#gioithieu .scrolltext").first();
    var description = descriptionNode ? descriptionNode.html() : "";

    var statusNode = doc.select(".label-status").first();
    var ongoing = true;
    if (statusNode) {
        ongoing = isOngoingStatus(statusNode.text());
    }

    return Response.success({
        name: cleanText(doc.select(".mRightCol h1").text()),
        cover: absoluteUrl(doc.select(".book-info-pic img").attr("src")),
        author: author,
        description: description,
        detail: detailLines.join("<br>"),
        host: BASE_URL,
        ongoing: ongoing,
        genres: genres
    });
}

function extractValue(text) {
    var parts = String(text || "").split(":");
    if (parts.length <= 1) return cleanText(text);
    parts.shift();
    return cleanText(parts.join(":"));
}
