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
    if (infoItems.size() > 0) {
        author = extractValue(infoItems.get(0).text());
    }

    var descriptionNode = doc.select("#gioithieu [itemprop=description]").first();
    var description = descriptionNode ? cleanDescription(descriptionNode.text()) : "";

    return Response.success({
        name: cleanText(doc.select(".mRightCol h1").text()),
        cover: resourceUrl(doc.select(".book-info-pic img").attr("src")),
        author: author,
        description: description,
        detail: detailLines.join("<br>"),
        host: HOST_URL,
        ongoing: doc.select(".label-status.label-updating").size() > 0,
        genres: genres
    });
}

function cleanDescription(text) {
    return cleanText(text);
}

function extractValue(text) {
    var parts = String(text || "").split(":");
    if (parts.length <= 1) return cleanText(text);
    parts.shift();
    return cleanText(parts.join(":"));
}
