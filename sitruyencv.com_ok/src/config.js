let BASE_URL = "https://sitruyencv.com";
let API_URL = "https://api.sitruyencv.com/api";
let DEFAULT_LIMIT = 24;
let DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

function stvTrim(value) {
    if (value === null || typeof value === "undefined") return "";
    return ("" + value).replace(/^\s+|\s+$/g, "");
}

function stvToInt(value, fallbackValue) {
    let num = parseInt(value, 10);
    return isFinite(num) ? num : (typeof fallbackValue === "number" ? fallbackValue : 0);
}

function stvCompareText(a, b) {
    let left = stvTrim(a).toLowerCase();
    let right = stvTrim(b).toLowerCase();
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
}

function stvToAbsolute(url) {
    let raw = stvTrim(url);
    if (!raw) return "";
    if (raw.indexOf("http://") === 0 || raw.indexOf("https://") === 0) {
        return raw.replace(/^http:\/\//i, "https://");
    }
    if (raw.indexOf("//") === 0) return "https:" + raw;
    return BASE_URL + (raw.charAt(0) === "/" ? "" : "/") + raw;
}

function stvEscapeHtml(text) {
    return stvTrim(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function stvTextToHtml(text) {
    let value = stvTrim(text);
    if (!value) return "";

    let lower = value.toLowerCase();
    if (lower.indexOf("<p") >= 0 || lower.indexOf("<br") >= 0 || lower.indexOf("<div") >= 0) {
        return value;
    }

    value = stvEscapeHtml(value);
    value = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    value = value.replace(/\n{3,}/g, "\n\n");
    value = value.replace(/\n\n/g, "<br/><br/>");
    value = value.replace(/\n/g, "<br/>");
    return value;
}

function stvFormatNumber(value) {
    let num = parseInt(value, 10);
    if (!isFinite(num)) return stvTrim(value);
    return ("" + num).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function stvStatusLabel(status) {
    let value = stvTrim(status).toLowerCase();
    if (value === "ongoing") return "Dang ra";
    if (value === "completed") return "Hoan thanh";
    if (value === "dropped") return "Tam dung";
    return stvTrim(status) || "Khong ro";
}

function stvIsOngoing(status) {
    let value = stvTrim(status).toLowerCase();
    return value !== "completed" && value !== "dropped";
}

function stvNormalizeStatus(status) {
    let value = stvTrim(status).toLowerCase();
    if (!value) return "";
    if (value === "ongoing" || value === "dangra" || value === "dang-ra") return "OnGoing";
    if (value === "completed" || value === "hoanthanh" || value === "hoan-thanh") return "Completed";
    if (value === "dropped" || value === "tamdung" || value === "tam-dung") return "Dropped";
    return stvTrim(status);
}

function stvNormalizeStoryType(storyType) {
    let value = stvTrim(storyType).toLowerCase();
    if (!value) return "";
    if (value === "convert") return "Convert";
    if (value === "dich" || value === "translation") return "Dich";
    return stvTrim(storyType);
}

function stvBuildHeaders(extraHeaders) {
    let headers = {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": DEFAULT_UA,
        "Referer": BASE_URL + "/",
        "Origin": BASE_URL
    };

    if (extraHeaders) {
        Object.keys(extraHeaders).forEach(function (key) {
            headers[key] = extraHeaders[key];
        });
    }

    return headers;
}

function stvFetch(url, options) {
    let requestOptions = {};
    let source = options || {};

    Object.keys(source).forEach(function (key) {
        if (key === "headers") return;
        requestOptions[key] = source[key];
    });

    requestOptions.headers = stvBuildHeaders(source.headers || null);

    try {
        return fetch(url, requestOptions);
    } catch (error) {
        return null;
    }
}

function stvReadJson(response) {
    if (!response) return null;

    try {
        return response.json();
    } catch (jsonError) {
        try {
            let raw = response.text();
            return raw ? JSON.parse(raw) : null;
        } catch (textError) {
            return null;
        }
    }
}

function stvApi(path, options) {
    let rawPath = stvTrim(path);
    let url = rawPath.indexOf("http://") === 0 || rawPath.indexOf("https://") === 0
        ? rawPath
        : API_URL + (rawPath.charAt(0) === "/" ? "" : "/") + rawPath;

    let response = stvFetch(url, options || {});
    if (!response) {
        throw new Error("Khong the ket noi toi Si Truyen CV.");
    }

    let data = stvReadJson(response);
    if (!response.ok) {
        let message = "";

        if (data && typeof data === "object") {
            if (data.message) message = stvTrim(data.message);
            if (!message && data.data && data.data.message) message = stvTrim(data.data.message);
        }

        if (!message) {
            message = "Yeu cau toi Si Truyen CV that bai (" + response.status + ").";
        }

        let error = new Error(message);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    if (data && typeof data === "object" && typeof data.status !== "undefined") {
        return data;
    }

    return {
        status: response.status || 200,
        data: data
    };
}

function stvApiGet(path) {
    return stvApi(path, { method: "GET" });
}

function stvApiPost(path, payload) {
    return stvApi(path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json;charset=UTF-8"
        },
        body: JSON.stringify(payload || {})
    });
}

function stvUnwrapData(result) {
    if (result && typeof result === "object" && typeof result.data !== "undefined") {
        return result.data;
    }
    return result;
}

function stvParseQuery(url) {
    let out = {};
    let raw = stvTrim(url);
    if (!raw) return out;

    let queryIndex = raw.indexOf("?");
    if (queryIndex < 0) return out;

    let query = raw.substring(queryIndex + 1);
    let hashIndex = query.indexOf("#");
    if (hashIndex >= 0) query = query.substring(0, hashIndex);

    query.split("&").forEach(function (part) {
        if (!part) return;

        let eq = part.indexOf("=");
        let key = eq >= 0 ? part.substring(0, eq) : part;
        let value = eq >= 0 ? part.substring(eq + 1) : "";

        try {
            key = decodeURIComponent(key.replace(/\+/g, " "));
        } catch (error) {}

        try {
            value = decodeURIComponent(value.replace(/\+/g, " "));
        } catch (error) {}

        key = stvTrim(key);
        if (!key) return;
        out[key] = stvTrim(value);
    });

    return out;
}

function stvParseIdList(value) {
    let raw = stvTrim(value);
    if (!raw) return [];

    let out = [];
    raw.split(",").forEach(function (part) {
        let item = stvTrim(part);
        if (!item) return;
        if (!/^\d+$/.test(item)) return;
        out.push(item);
    });

    return out;
}

function stvParseListingInput(input) {
    let raw = stvTrim(input);
    if (!raw) raw = BASE_URL + "/stories";

    if (raw.indexOf("home:") === 0) {
        return {
            mode: "home",
            section: stvTrim(raw.substring(5))
        };
    }

    let params = stvParseQuery(raw);
    return {
        mode: "stories",
        page: stvTrim(params.page) || "1",
        search: stvTrim(params.search || params.q || params.title),
        categoryIds: stvParseIdList(params.category_ids || params.category_id || params.categoryId),
        status: stvNormalizeStatus(params.status),
        authorId: stvTrim(params.author_id || params.authorId),
        storyType: stvNormalizeStoryType(params.story_type || params.storyType),
        relatedId: stvTrim(params.related_id || params.relatedId)
    };
}

function stvBuildListingPayload(parsed) {
    let payload = {};
    if (!parsed) return payload;

    if (parsed.search) payload.search = parsed.search;
    if (parsed.categoryIds && parsed.categoryIds.length) payload.category_ids = parsed.categoryIds.map(function (id) {
        return stvToInt(id, 0);
    }).filter(function (id) {
        return id > 0;
    });
    if (parsed.status) payload.status = parsed.status;
    if (parsed.authorId && /^\d+$/.test(parsed.authorId)) payload.author_id = stvToInt(parsed.authorId, 0);
    if (parsed.storyType) payload.story_type = parsed.storyType;

    return payload;
}

function stvNextPage(metadata) {
    let current = metadata ? parseInt(metadata.current_page, 10) : NaN;
    let total = metadata ? parseInt(metadata.total_pages, 10) : NaN;
    if (isFinite(current) && isFinite(total) && current < total) {
        return String(current + 1);
    }
    return null;
}

function stvExtractStoryId(url) {
    let raw = stvTrim(url);
    if (!raw) return "";

    let match = raw.match(/\/story\/(\d+)(?:-|\/|$)/i);
    if (match) return stvTrim(match[1]);

    match = raw.match(/\/read\/(\d+)\/\d+/i);
    if (match) return stvTrim(match[1]);

    if (/^\d+$/.test(raw)) return raw;
    return "";
}

function stvExtractChapterNumber(url) {
    let raw = stvTrim(url);
    if (!raw) return "";

    let match = raw.match(/\/read\/\d+\/(\d+)(?:[/?#]|$)/i);
    if (match) return stvTrim(match[1]);
    return "";
}

function stvExtractTranslateVersionId(url) {
    let params = stvParseQuery(url);
    let value = stvTrim(params.translate_version_id || params.translateVersionId);
    return /^\d+$/.test(value) ? value : "";
}

function stvBuildStoryUrl(storyId, slug) {
    return BASE_URL + "/story/" + stvTrim(storyId) + "-" + stvTrim(slug);
}

function stvBuildChapterUrl(storyId, chapterNumber, translateVersionId) {
    let url = BASE_URL + "/read/" + stvTrim(storyId) + "/" + stvTrim(chapterNumber);
    if (stvTrim(translateVersionId)) {
        url += "?translate_version_id=" + stvTrim(translateVersionId);
    }
    return url;
}

function stvStoryDescription(story) {
    let parts = [];
    if (!story) return "";

    let author = story.author && story.author.name ? stvTrim(story.author.name) : "";
    if (author) parts.push("Tac gia: " + author);
    if (story.total_chapters !== null && typeof story.total_chapters !== "undefined") {
        parts.push(stvFormatNumber(story.total_chapters) + " chuong");
    }
    if (story.total_views !== null && typeof story.total_views !== "undefined") {
        parts.push(stvFormatNumber(story.total_views) + " luot xem");
    }
    if (story.status) parts.push(stvStatusLabel(story.status));
    if (story.story_type) parts.push(stvTrim(story.story_type));
    return parts.join(" | ");
}

function stvMapStory(story) {
    if (!story || !story.id || !story.slug || !story.title) return null;

    return {
        name: stvTrim(story.title),
        link: stvBuildStoryUrl(story.id, story.slug),
        cover: stvToAbsolute(story.cover_image_url),
        description: stvStoryDescription(story),
        host: BASE_URL
    };
}

function stvMapStories(items) {
    let out = [];
    if (!items || !items.length) return out;

    items.forEach(function (story) {
        let item = stvMapStory(story);
        if (item) out.push(item);
    });

    return out;
}

function stvBuildGenres(categories) {
    let genres = [];
    if (!categories || !categories.length) return genres;

    categories.forEach(function (category) {
        if (!category || !category.id || !category.name) return;
        genres.push({
            title: stvTrim(category.name),
            input: BASE_URL + "/stories?category_id=" + stvTrim(category.id),
            script: "gen.js"
        });
    });

    return genres;
}

function stvPickTranslateVersion(versions, preferredId) {
    let preferred = stvTrim(preferredId);
    if (!versions || !versions.length) return null;

    if (preferred) {
        for (let i = 0; i < versions.length; i++) {
            if (stvTrim(versions[i].id) === preferred) return versions[i];
        }
    }

    for (let j = 0; j < versions.length; j++) {
        if (stvTrim(versions[j].version_type).toLowerCase() === "official") {
            return versions[j];
        }
    }

    return versions[0];
}

function stvFetchStory(storyId) {
    return stvUnwrapData(stvApiGet("/stories/" + encodeURIComponent(storyId)));
}

function stvFetchTranslateVersions(storyId) {
    let data = stvUnwrapData(stvApiGet("/stories/" + encodeURIComponent(storyId) + "/translate-versions"));
    return data && data.length ? data : [];
}

function stvFetchRelatedStories(storyId) {
    let data = stvUnwrapData(stvApiGet("/stories/" + encodeURIComponent(storyId) + "/related?limit=12"));
    return data && data.length ? data : [];
}

function stvFetchDashboard() {
    return stvUnwrapData(stvApiGet("/stories/dashboard"));
}

function stvChapterName(chapter) {
    if (!chapter) return "";

    let title = stvTrim(chapter.title);
    let number = stvTrim(chapter.chapter_number);
    if (!title) {
        title = number ? "Chuong " + number : "Chuong";
    }

    if (chapter.is_paid && !chapter.is_purchased) {
        title += " [VIP]";
    }

    return title;
}

function stvErrorMessage(error, fallbackMessage) {
    if (error && error.message) {
        let message = stvTrim(error.message);
        if (message) return message;
    }
    return fallbackMessage || "Da xay ra loi khong xac dinh.";
}
