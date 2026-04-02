load("config.js");

function ktcNormalizeStatus(status) {
    let raw = ktcFoldText(status);
    if (!raw) {
        return {
            text: "",
            ongoing: true
        };
    }

    if (raw.indexOf("hoan") > -1 || raw.indexOf("full") > -1) {
        return {
            text: "Hoàn thành",
            ongoing: false
        };
    }

    if (raw.indexOf("dang") > -1 || raw.indexOf("tien hanh") > -1 || raw.indexOf("ongoing") > -1) {
        return {
            text: "Đang tiến hành",
            ongoing: true
        };
    }

    return {
        text: ktcTrim(status),
        ongoing: true
    };
}

function ktcParseStatusText(doc) {
    let status = "";

    doc.select(".truyen-meta span").forEach(item => {
        let text = ktcTrim(item.text().replace(/\s+/g, " "));
        if (!text) return;

        if (ktcFoldText(text).indexOf("tinh trang") > -1) {
            status = text.replace(/^.*?:\s*/, "");
        }
    });

    return status;
}

function ktcCollectGenres(doc) {
    let genres = [];
    let names = [];
    let seen = {};

    doc.select(".truyen-meta a[href*='/the-loai/']").forEach(item => {
        let title = ktcTrim(item.text());
        let href = item.attr("href") || "";
        if (!title || !href || seen[href]) return;

        seen[href] = true;
        genres.push({
            title: title,
            input: href,
            script: "gen.js"
        });
        names.push(title);
    });

    return {
        items: genres,
        names: names
    };
}

function ktcCollectRecentLines(doc) {
    let lines = [];

    doc.select(".truyen-recent li").forEach(item => {
        let text = ktcTrim(item.text().replace(/\s+/g, " "));
        if (text) lines.push(text);
    });

    return lines;
}

function ktcParseDetailDoc(doc) {
    let name = ktcTrim(doc.select(".truyen-title").first().text());
    if (!name) name = ktcTrim(doc.select("h1").first().text());
    if (!name) name = ktcTrim(doc.select("title").text()).replace(/\s*[\|\-].*$/, "");

    let coverEl = doc.select(".truyen-cover img").first();
    if (!coverEl) coverEl = doc.select("meta[property='og:image']").first();

    let cover = "";
    if (coverEl) {
        cover = coverEl.attr("data-src") || coverEl.attr("src") || coverEl.attr("content") || "";
    }

    let authorEl = doc.select(".truyen-meta a[href*='/tac-gia/'], .truyen-meta a[href*='/author/']").first();
    let author = authorEl ? ktcTrim(authorEl.text()) : "";

    let genreData = ktcCollectGenres(doc);
    let statusData = ktcNormalizeStatus(ktcParseStatusText(doc));

    let detailParts = [];
    if (author) detailParts.push("Tác giả: " + author);
    if (genreData.names.length > 0) detailParts.push("Thể loại: " + genreData.names.join(", "));
    if (statusData.text) detailParts.push("Tình trạng: " + statusData.text);

    let description = "";
    let descEl = doc.select(".truyen-desc").first();
    if (descEl) description = descEl.html();
    if (!description) description = doc.select("meta[name='description']").attr("content");

    let recentLines = ktcCollectRecentLines(doc);
    if (recentLines.length > 0) {
        if (description) description += "<br><br>";
        description += "<b>Chương mới cập nhật:</b><br>" + recentLines.join("<br>");
    }

    return {
        name: name,
        cover: ktcToAbsolute(cover || DEFAULT_COVER),
        author: author,
        description: description,
        detail: detailParts.join("<br>"),
        host: BASE_URL,
        genres: genreData.items,
        ongoing: statusData.ongoing
    };
}

function ktcFetchTermBySlug(slug) {
    if (!slug) return null;

    let apiUrl = BASE_URL
        + "/wp-json/wp/v2/bo_truyen?slug="
        + encodeURIComponent(slug)
        + "&_fields=id,link,name,description,count";

    let jsonData = ktcFetchJson(apiUrl, null, BASE_URL);
    if (!jsonData.data || Object.prototype.toString.call(jsonData.data) !== "[object Array]" || jsonData.data.length === 0) {
        return null;
    }

    return jsonData.data[0];
}

function ktcBuildFallbackDetail(term) {
    if (!term) return null;

    let description = ktcTrim(term.description || "").replace(/\r\n/g, "<br>").replace(/\n/g, "<br>");
    let detail = term.count ? "Số chương: " + term.count : "";

    return {
        name: ktcDecodeHtml(term.name || ""),
        cover: DEFAULT_COVER,
        author: "",
        description: description,
        detail: detail,
        host: BASE_URL,
        genres: [],
        ongoing: true
    };
}

function execute(url) {
    let normalized = ktcNormalizeUrl(url);
    let page = ktcFetchPage(normalized, null, 15000, normalized);

    if (page && page.doc && !page.blocked) {
        let parsed = ktcParseDetailDoc(page.doc);
        if (parsed && parsed.name) {
            return Response.success(parsed);
        }
    }

    let term = ktcFetchTermBySlug(ktcStorySlug(normalized));
    if (term) {
        let fallback = ktcBuildFallbackDetail(term);
        if (fallback && fallback.name) {
            return Response.success(fallback);
        }
    }

    return Response.error("Không tải được chi tiết truyện từ Kho Truyện Chữ.");
}
