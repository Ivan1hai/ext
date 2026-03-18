load("crypto.js");
load("config.js");

const TOC_PAGE_SIZE_PRIMARY = 1000;
const TOC_PAGE_SIZE_FALLBACK = 400;
const TOC_MAX_PAGE_GUARD = 200;

function tryParseJson(raw) {
    if (!raw || typeof raw !== "string") return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function parseJsonResponse(response) {
    if (!response) return null;

    let json = safeJson(response);
    if (json) return json;

    if (typeof response.string === "function") {
        try {
            return JSON.parse(response.string());
        } catch (e) {
        }
    }

    return null;
}

function parseApiRows(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;

    if (typeof data === "string") {
        let direct = tryParseJson(data);
        if (direct && Array.isArray(direct)) return direct;

        let decoded = decrypt(data);
        let parsed = tryParseJson(decoded);
        if (parsed && Array.isArray(parsed)) return parsed;
    }

    return [];
}

function normalizeStoryInput(input) {
    let storyUrl = normalizeStoryUrl(input || "");
    return storyUrl.replace(/[?#].*$/, "").replace(/\/+$/, "");
}

function extractStorySlug(storyUrl) {
    let parts = (storyUrl || "").split("/");
    return (parts[parts.length - 1] || "").trim();
}

function resolveStoryId(storyUrl) {
    let nextData = parseNextDataByUrl(storyUrl);
    let pageProps = (((nextData || {}).props || {}).pageProps || {});
    let fromPage = (((pageProps || {}).story || {}).id || "").toString().trim();
    if (fromPage) return fromPage;

    let slug = extractStorySlug(storyUrl);
    if (!slug) return "";

    let response = requestPost("/stories/get-story", {
        slug: encrypt(slug)
    });
    if (!response || !response.ok) return "";

    let json = parseJsonResponse(response);
    if (!json) return "";

    let rows = parseApiRows(json.data);
    if (!rows || rows.length === 0) return "";

    return ((rows[0] || {}).id || "").toString().trim();
}

function fetchChapterPage(storyId, page, pageSize) {
    let response = requestPost("/chapters/list-chapters", encryptObject({
        id_story: storyId,
        page: page,
        items_per_page: pageSize,
        order: "ASC"
    }));

    if (!response || !response.ok) return null;
    let json = parseJsonResponse(response);
    if (!json) return null;

    return parseApiRows(json.data);
}

function fetchChapterPageWithFallback(storyId, page, preferredPageSize) {
    let sizes = [preferredPageSize];
    if (preferredPageSize !== TOC_PAGE_SIZE_PRIMARY) sizes.push(TOC_PAGE_SIZE_PRIMARY);
    if (preferredPageSize !== TOC_PAGE_SIZE_FALLBACK) sizes.push(TOC_PAGE_SIZE_FALLBACK);

    for (let i = 0; i < sizes.length; i++) {
        let size = sizes[i];
        let rows = fetchChapterPage(storyId, page, size);
        if (rows !== null) {
            return {
                rows: rows,
                pageSize: size
            };
        }
    }

    return null;
}

function execute(url) {
    let storyUrl = normalizeStoryInput(url);
    let storyId = resolveStoryId(storyUrl);
    if (!storyId) {
        return Response.error("Khong lay duoc ID truyen.");
    }

    let rows = [];
    let seenRow = {};
    let page = 1;
    let pageSize = TOC_PAGE_SIZE_PRIMARY;
    let guard = 0;

    while (guard < TOC_MAX_PAGE_GUARD) {
        let fetched = fetchChapterPageWithFallback(storyId, page, pageSize);
        if (!fetched) {
            if (rows.length === 0) {
                return Response.error("Khong lay duoc danh sach chuong.");
            }
            break;
        }

        let part = fetched.rows || [];
        pageSize = fetched.pageSize || pageSize;
        if (part.length === 0) break;

        part.forEach(item => {
            if (!item) return;
            let key = (item.id || item.slug || item.chapter_order || "").toString();
            if (!key || seenRow[key]) return;
            seenRow[key] = true;
            rows.push(item);
        });

        if (part.length < pageSize) break;
        page += 1;
        guard += 1;
    }

    if (!rows || rows.length === 0) {
        return Response.error("Khong lay duoc danh sach chuong.");
    }

    let list = [];
    let seenUrl = {};
    rows.forEach(chap => {
        if (!chap) return;
        let slug = (chap.slug || chap.chapter_slug || "").toString().trim();
        if (!slug) return;

        let chapterUrl = normalizeChapterUrl(slug);
        if (seenUrl[chapterUrl]) return;
        seenUrl[chapterUrl] = true;

        let chapterName = (chap.title || "").toString().trim();
        if (!chapterName) {
            chapterName = "Chuong " + ((chap.chapter_order || chap.order || "").toString());
        }

        list.push({
            name: chapterName,
            url: chapterUrl,
            host: BASE_URL,
            pay: !!(chap.locked || chap.is_locked || chap.not_free === true || chap.not_free === "true")
        });
    });

    if (list.length === 0) {
        return Response.error("Khong tao duoc danh sach chuong.");
    }

    return Response.success(list);
}
