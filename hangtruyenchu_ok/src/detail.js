load("config.js");

function toAbsolute(url) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("//")) return "https:" + url;
    return BASE_URL + (url.startsWith("/") ? "" : "/") + url;
}

function normalizeUrl(url) {
    if (!url) return BASE_URL;
    if (url.startsWith("http")) {
        return url.replace(/^http:\/\//i, "https://");
    }
    return BASE_URL + (url.startsWith("/") ? "" : "/") + url;
}

function buildRequestOptions() {
    let options = {};
    if (SESSION_COOKIE) {
        options.headers = {
            Cookie: SESSION_COOKIE
        };
    }
    return options;
}

function fetchPage(url) {
    let response = fetch(url, buildRequestOptions());
    if (response && response.ok) {
        return {
            response: response,
            doc: response.html()
        };
    }

    if (response && (response.status === 403 || response.status === 503 || response.status === 401 || response.status === 400)) {
        let browser = Engine.newBrowser();
        browser.launch(url, 7000);
        let doc = browser.html();
        browser.close();
        return {
            response: response,
            doc: doc
        };
    }

    return null;
}

function extractStoryId(url) {
    let m = (url || "").match(/\/truyen\/(\d+)/);
    return m ? parseInt(m[1]) : 0;
}

function isLoginRequired(page) {
    if (!page || !page.doc) return false;
    if (page.response && page.response.url && page.response.url.indexOf("login=required") > -1) return true;

    let title = page.doc.select("title").text().trim().toLowerCase();
    let hasStoryMarker = page.doc.select(".story-header").size() > 0
        || page.doc.select("#chapter-list-container").size() > 0
        || page.doc.select("a.chapter-item-link").size() > 0;

    return title === "trang chủ" && !hasStoryMarker;
}

function normalizeStatus(status) {
    let raw = (status || "").toLowerCase();
    if (!raw) return "";
    if (raw.indexOf("full") > -1 || raw.indexOf("hoàn") > -1 || raw.indexOf("hoan") > -1) return "Hoàn thành";
    if (raw.indexOf("ongoing") > -1 || raw.indexOf("đang") > -1 || raw.indexOf("dang") > -1) return "Đang ra";
    return status;
}

function parseFromDoc(doc) {
    let name = doc.select(".story-header h2 span.align-middle").last().text().trim();
    if (!name) {
        let e = doc.select("h1.story-title").first();
        if (e) name = e.text().trim();
    }
    if (!name) name = doc.select("h2.fw-bold span.align-middle").last().text().trim();
    if (!name) name = doc.select("h2.fw-bold").text().trim();
    if (!name) {
        let e = doc.select("h1").first();
        if (e) name = e.text().trim();
    }
    if (!name) {
        let e = doc.select("h2").first();
        if (e) name = e.text().trim();
    }

    let coverEl = doc.select("img.story-poster").first();
    if (!coverEl) coverEl = doc.select(".story-poster").first();
    if (!coverEl) coverEl = doc.select(".story-poster-container img").first();
    if (!coverEl) coverEl = doc.select("meta[property=og:image]").first();

    let cover = "";
    if (coverEl) {
        cover = coverEl.attr("data-src") || coverEl.attr("src") || coverEl.attr("content") || "";
    }

    let author = "";
    let authorEl = doc.select("a.tag-pill[href*='/tac-gia/']").first();
    if (authorEl) author = authorEl.text().trim();
    if (!author) {
        let authorMeta = doc.select("meta[name=author]").first();
        if (authorMeta) author = authorMeta.attr("content").trim();
    }

    let categories = [];
    doc.select("a.tag-pill[href*='cat=']").forEach(e => {
        let t = e.text().trim();
        if (t) categories.push(t);
    });
    doc.select("a.tag-pill[href*='tag=']").forEach(e => {
        let t = e.text().trim();
        if (t) categories.push(t);
    });
    if (categories.length === 0) {
        let metaLine = doc.select(".story-meta").text().trim();
        if (metaLine) categories.push(metaLine.replace(/\s+/g, " ").trim());
    }

    let status = doc.select("span.tag-pill.text-success").text().trim();
    if (!status) {
        let statusEl = doc.select(".story-meta .text-danger, .story-meta .text-success").first();
        if (statusEl) status = statusEl.text().trim();
    }
    status = normalizeStatus(status);

    let detail = "";
    if (author) detail += "Tác giả: " + author + "<br>";
    if (categories.length > 0) detail += "Thể loại: " + categories.join(", ") + "<br>";
    if (status) detail += "Trạng thái: " + status;

    let description = "";
    let descriptionEl = doc.select("#tab-info").first();
    if (descriptionEl) description = descriptionEl.html();
    if (!description) description = doc.select(".content-text").html();
    if (!description) description = doc.select(".story-desc").html();
    if (!description) {
        let d = doc.select("meta[name=description]").attr("content");
        description = d ? d.trim() : "";
    }

    return {
        name: name,
        cover: toAbsolute(cover),
        author: author,
        description: description,
        detail: detail,
        host: BASE_URL
    };
}

function fetchStoryById(storyId) {
    if (!storyId) return null;

    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= 80) {
        let apiUrl = BASE_URL + "/danh-sach?ajax=true&sort=updated&page=" + page;
        let response = fetch(apiUrl, buildRequestOptions());
        if (!response || !response.ok) return null;

        let json = null;
        try {
            json = response.json();
        } catch (e) {
            return null;
        }

        if (!json || !json.success || !json.stories) return null;

        for (let i = 0; i < json.stories.length; i++) {
            let story = json.stories[i];
            if (parseInt(story.id) === storyId) return story;
        }

        let total = parseInt(json.totalPages || "1");
        totalPages = total > 0 ? total : 1;
        page += 1;
    }

    return null;
}

function fromStoryData(story) {
    let author = (story.author || "").trim();

    let categories = [];
    if (story.category) categories.push(story.category);
    if (story.character_tag) categories.push(story.character_tag);
    if (story.world_tag) categories.push(story.world_tag);
    if (story.style_tag) categories.push(story.style_tag);

    let status = normalizeStatus(story.status || "");
    let detail = "";
    if (author) detail += "Tác giả: " + author + "<br>";
    if (categories.length > 0) detail += "Thể loại: " + categories.join(", ") + "<br>";
    if (status) detail += "Trạng thái: " + status + "<br>";
    if (story.total_chapters) detail += "Số chương: " + story.total_chapters;

    let description = (story.description || "").trim();
    if (description) description = description.replace(/\r\n/g, "<br>").replace(/\n/g, "<br>");
    if (story.latest_chapter_title) {
        if (description) description += "<br><br>";
        description += "<b>Chương mới nhất:</b> " + story.latest_chapter_title;
    }

    return Response.success({
        name: story.title || ("Truyện #" + story.id),
        cover: toAbsolute(story.poster || ""),
        author: author,
        description: description,
        detail: detail,
        host: BASE_URL
    });
}

function execute(url) {
    let normalized = normalizeUrl(url);
    let page = fetchPage(normalized);

    if (page && page.doc && !isLoginRequired(page)) {
        let parsed = parseFromDoc(page.doc);
        if (parsed && parsed.name) return Response.success(parsed);
    }

    let storyId = extractStoryId(normalized);
    if (storyId) {
        let story = fetchStoryById(storyId);
        if (story) return fromStoryData(story);
    }

    if (page && page.doc) {
        let fallback = parseFromDoc(page.doc);
        if (fallback && fallback.name) return Response.success(fallback);
    }

    return Response.error("Không thể tải chi tiết truyện (trang yêu cầu đăng nhập hoặc dữ liệu đã thay đổi).");
}
