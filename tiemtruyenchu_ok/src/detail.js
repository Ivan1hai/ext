load("config.js");

function extractStoryId(url) {
    let matched = (url || "").match(/\/truyen\/(\d+)/i);
    return matched ? parseInt(matched[1], 10) : 0;
}

function normalizeStatus(status) {
    let raw = ttcFoldText(status);
    if (!raw) return "";
    if (raw.indexOf("full") > -1 || raw.indexOf("hoan") > -1) return "Hoan thanh";
    if (raw.indexOf("dang") > -1 || raw.indexOf("ongoing") > -1) return "Dang ra";
    return ttcTrim(status);
}

function parseFromDoc(doc) {
    let name = ttcTrim(doc.select(".story-header h2 span.align-middle").last().text());
    if (!name) {
        let titleEl = doc.select("h1.story-title").first();
        if (!titleEl) titleEl = doc.select("h1").first();
        if (!titleEl) titleEl = doc.select("h2").first();
        if (titleEl) name = ttcTrim(titleEl.text());
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
    if (authorEl) author = ttcTrim(authorEl.text());
    if (!author) {
        let authorMeta = doc.select("meta[name=author]").first();
        if (authorMeta) author = ttcTrim(authorMeta.attr("content"));
    }

    let genres = [];
    let genreNames = [];

    doc.select("a.tag-pill[href*='cat=']").forEach(item => {
        let title = ttcTrim(item.text());
        let href = item.attr("href") || "";
        if (!title || !href) return;
        genres.push({ title: title, input: href, script: "gen.js" });
        genreNames.push(title);
    });

    doc.select("a.tag-pill[href*='tag=']").forEach(item => {
        let title = ttcTrim(item.text());
        let href = item.attr("href") || "";
        if (!title || !href) return;
        genres.push({ title: title, input: href, script: "gen.js" });
        genreNames.push(title);
    });

    let status = doc.select("span.tag-pill.text-success").text();
    if (!status) {
        let statusEl = doc.select(".story-meta .text-danger, .story-meta .text-success").first();
        if (statusEl) status = statusEl.text();
    }
    status = normalizeStatus(status);

    let detail = "";
    if (author) detail += "Tac gia: " + author + "<br>";
    if (genreNames.length > 0) detail += "The loai: " + genreNames.join(", ") + "<br>";
    if (status) detail += "Trang thai: " + status;

    let description = "";
    let descriptionEl = doc.select("#tab-info").first();
    if (descriptionEl) description = descriptionEl.html();
    if (!description) description = doc.select(".content-text").html();
    if (!description) description = doc.select(".story-desc").html();
    if (!description) description = ttcTrim(doc.select("meta[name=description]").attr("content"));

    return {
        name: name,
        cover: ttcToAbsolute(cover),
        author: author,
        description: description,
        detail: detail,
        host: BASE_URL,
        genres: genres,
        ongoing: status === "Dang ra"
    };
}

function fetchStoryById(storyId) {
    if (!storyId) return null;

    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= 80) {
        let apiUrl = BASE_URL + "/danh-sach?ajax=true&sort=updated&page=" + page;
        let response = ttcFetch(apiUrl);
        if (!response || !response.ok) return null;

        let json = null;
        try {
            json = response.json();
        } catch (error) {
            return null;
        }

        if (!json || !json.success || !json.stories) return null;

        for (let i = 0; i < json.stories.length; i++) {
            if (parseInt(json.stories[i].id, 10) === storyId) {
                return json.stories[i];
            }
        }

        totalPages = parseInt(json.totalPages || "1", 10);
        if (!totalPages || totalPages < 1) totalPages = 1;
        page += 1;
    }

    return null;
}

function fromStoryData(story) {
    let author = ttcTrim(story.author || "");
    let genres = [];
    let genreNames = [];

    [
        story.category,
        story.character_tag,
        story.world_tag,
        story.style_tag
    ].forEach(item => {
        let title = ttcTrim(item || "");
        if (!title) return;
        genres.push({
            title: title,
            input: "/danh-sach?keyword=" + encodeURIComponent(title),
            script: "gen.js"
        });
        genreNames.push(title);
    });

    let status = normalizeStatus(story.status || "");
    let detail = "";
    if (author) detail += "Tac gia: " + author + "<br>";
    if (genreNames.length > 0) detail += "The loai: " + genreNames.join(", ") + "<br>";
    if (status) detail += "Trang thai: " + status + "<br>";
    if (story.total_chapters) detail += "So chuong: " + story.total_chapters;

    let description = ttcTrim(story.description || "");
    if (description) {
        description = description.replace(/\r\n/g, "<br>").replace(/\n/g, "<br>");
    }
    if (story.latest_chapter_title) {
        if (description) description += "<br><br>";
        description += "<b>Chuong moi nhat:</b> " + story.latest_chapter_title;
    }

    return {
        name: story.title || ("Truyen #" + story.id),
        cover: ttcToAbsolute(story.poster || ""),
        author: author,
        description: description,
        detail: detail,
        host: BASE_URL,
        genres: genres,
        ongoing: status === "Dang ra"
    };
}

function execute(url) {
    let normalized = ttcNormalizeUrl(url);
    let page = ttcFetchPage(normalized, null, 15000);

    if (page && page.doc && !page.loginRequired) {
        let parsed = parseFromDoc(page.doc);
        if (parsed && parsed.name) {
            return Response.success(parsed);
        }
    }

    let storyId = extractStoryId(normalized);
    if (storyId) {
        let story = fetchStoryById(storyId);
        if (story) {
            return Response.success(fromStoryData(story));
        }
    }

    if (page && page.doc) {
        let fallback = parseFromDoc(page.doc);
        if (fallback && fallback.name) {
            return Response.success(fallback);
        }
    }

    if (ttcHasCookie()) {
        return Response.error("Khong tai duoc chi tiet truyen. Cookie dang nhap co the da het han, hay cap nhat lai trong muc Cookie cua plugin.");
    }

    return Response.error("Tiem Truyen Chu dang chan noi dung cho tai khoan chua xac thuc. Hay dang nhap lai trong trinh duyet tich hop hoac dan cookie tai khoan vao muc Cookie cua plugin.");
}
