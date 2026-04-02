load("config.js");

function ktcCleanChapterElement(contentEl) {
    if (!contentEl) return "";

    contentEl.select("script").remove();
    contentEl.select("style").remove();
    contentEl.select("noscript").remove();
    contentEl.select("iframe").remove();
    contentEl.select(".story-navigation").remove();
    contentEl.select(".reading-tools-bar").remove();
    contentEl.select(".btn-open-toc").remove();
    contentEl.select(".mibgey").remove();
    contentEl.select(".sharedaddy").remove();

    contentEl.select("[style*='overflow:hidden']").forEach(item => {
        let style = ktcFoldText(item.attr("style"));
        if (style.indexOf("height:0") > -1 || style.indexOf("width:0") > -1 || style.indexOf("display:inline-block") > -1) {
            item.remove();
        }
    });

    let html = contentEl.html() || "";
    html = html.replace(/<span[^>]*class=['"]mibgey['"][\s\S]*?<\/span>/gi, "");
    html = html.replace(/<div[^>]*class=['"][^'"]*story-navigation[^'"]*['"][\s\S]*?<\/div>/gi, "");
    html = html.replace(/<div[^>]*class=['"][^'"]*reading-tools-bar[^'"]*['"][\s\S]*?<\/div>/gi, "");
    html = html.replace(/<p>\s*<\/p>/gi, "");

    return ktcTrim(html);
}

function ktcExtractChapterContent(doc) {
    if (!doc) return "";

    let contentEl = doc.select(".entry-content").first();
    if (!contentEl) contentEl = doc.select("article .entry-content").first();
    if (!contentEl) return "";

    return ktcCleanChapterElement(contentEl);
}

function ktcChapterSlug(url) {
    let normalized = ktcNormalizeUrl(url).replace(/[?#].*$/, "").replace(/\/+$/, "");
    let parts = normalized.split("/");
    return ktcTrim(parts.length > 0 ? parts[parts.length - 1] : "");
}

function ktcFetchChapterFromRest(url) {
    let slug = ktcChapterSlug(url);
    if (!slug) return "";

    let apiUrl = BASE_URL
        + "/wp-json/wp/v2/posts?slug="
        + encodeURIComponent(slug)
        + "&per_page=1&_fields=content";

    let jsonData = ktcFetchJson(apiUrl, null, url);
    if (!jsonData.data || Object.prototype.toString.call(jsonData.data) !== "[object Array]" || jsonData.data.length === 0) {
        return "";
    }

    let post = jsonData.data[0];
    let rendered = post && post.content ? post.content.rendered || "" : "";
    if (!rendered) return "";

    let doc = Html.parse("<div class='entry-content'>" + rendered + "</div>");
    return ktcCleanChapterElement(doc.select(".entry-content").first());
}

function execute(url) {
    let content = ktcFetchChapterFromRest(url);
    if (content) {
        return Response.success(content);
    }

    let page = ktcFetchPage(url, null, 15000, url);
    if (!page || !page.doc) {
        return Response.error("Không thể tải nội dung chương.");
    }

    if (page.blocked) {
        return Response.error("Kho Truyện Chữ đang chặn nội dung chương hoặc yêu cầu xác thực trình duyệt.");
    }

    content = ktcExtractChapterContent(page.doc);

    if (!content) {
        return Response.error("Không tìm thấy nội dung chương. Cấu trúc trang có thể đã thay đổi.");
    }

    return Response.success(content);
}
