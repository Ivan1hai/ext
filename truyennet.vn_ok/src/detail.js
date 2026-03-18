load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();

        // Title
        let name = "";
        let titleEl = doc.select("h1").first();
        if (titleEl) name = titleEl.text().trim();

        // Cover image
        let cover = "";
        let coverEl = doc.select(".book-info-pic img").first();
        if (coverEl) {
            cover = coverEl.attr("data-src");
            if (!cover) cover = coverEl.attr("src");
        }

        // Author
        let author = "";
        let authorEl = doc.select("[itemprop='author']").first();
        if (authorEl) {
            author = authorEl.text().trim();
        }

        // Description
        let description = "";
        let descEl = doc.select(".book-intro").first();
        if (descEl) {
            description = descEl.html();
        }

        // Status
        let ongoing = true;
        let statusEl = doc.select(".label-status").first();
        if (statusEl) {
            let statusText = statusEl.text().trim().toLowerCase();
            if (statusText.indexOf("hoàn thành") !== -1 || statusText.indexOf("hoan thanh") !== -1 || statusText.indexOf("full") !== -1) {
                ongoing = false;
            }
        }

        // Genres
        let genres = [];
        doc.select(".book-info a[href*='/the-loai/']").forEach(function (e) {
            let title = e.text().trim();
            if (title) {
                genres.push({
                    title: title,
                    input: e.attr("href"),
                    script: "gen.js"
                });
            }
        });

        // Detail info
        let detail = getDetail(doc);

        return Response.success({
            name: name,
            cover: cover,
            author: author,
            description: description,
            detail: detail,
            host: BASE_URL,
            genres: genres,
            ongoing: ongoing
        });
    }
    return null;
}

function getDetail(doc) {
    var lines = [];

    // Status
    var statusEl = doc.select(".label-status").first();
    if (statusEl) {
        lines.push("<b>Trạng thái:</b> " + statusEl.text().trim());
    }

    // Author
    var authorEl = doc.select("[itemprop='author']").first();
    if (authorEl) {
        lines.push("<b>Tác giả:</b> " + authorEl.text().trim());
    }

    // Genres
    var genreEls = doc.select(".book-info a[href*='/the-loai/']");
    if (genreEls.size() > 0) {
        var genreTexts = [];
        genreEls.forEach(function (e) {
            genreTexts.push(e.text().trim());
        });
        lines.push("<b>Thể loại:</b> " + genreTexts.join(", "));
    }

    // Views / other info from the info section
    var infoLines = doc.select(".book-info p.line");
    infoLines.forEach(function (e) {
        var text = e.text().trim();
        if (text && text.indexOf("Tác giả") === -1 && text.indexOf("Thể loại") === -1) {
            lines.push(text);
        }
    });

    return lines.join("<br>");
}
