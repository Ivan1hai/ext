load("config.js");

function parseItems(json) {
    let rows = (json && Array.isArray(json.data)) ? json.data : [];
    let list = [];

    rows.forEach(item => {
        let mapped = mapStoryItem(item);
        if (mapped) list.push(mapped);
    });

    return list;
}

function normalizeSourceInput(input) {
    if (input === undefined || input === null) return "feed:new-updates";

    if (typeof input === "number") {
        return "cat:" + input;
    }

    if (typeof input === "string") {
        let raw = input.trim();
        if (!raw) return "feed:new-updates";

        if (raw.charAt(0) === "{") {
            try {
                let parsed = JSON.parse(raw);
                return normalizeSourceInput(parsed);
            } catch (e) {
            }
        }

        return raw;
    }

    if (typeof input === "object") {
        let raw = input.input;
        if (raw === undefined || raw === null || ("" + raw).trim() === "") raw = input.url;
        if (raw === undefined || raw === null || ("" + raw).trim() === "") raw = input.link;
        if (raw === undefined || raw === null || ("" + raw).trim() === "") raw = input.value;
        if (raw === undefined || raw === null || ("" + raw).trim() === "") raw = input.slug;
        if (raw !== undefined && raw !== null && ("" + raw).trim() !== "") {
            return ("" + raw).trim();
        }

        if (input.id !== undefined && input.id !== null && ("" + input.id).trim() !== "") {
            return "cat:" + input.id;
        }
    }

    let fallback = ("" + input).trim();
    return fallback || "feed:new-updates";
}

function parseCategoryValue(raw) {
    let value = (raw || "").toString().trim();
    if (!value) return "";

    if (value.startsWith("cat:")) value = value.substring(4).trim();
    if (value.startsWith("category:")) value = value.substring(9).trim();

    let queryMatched = value.match(/[?&](?:category_ids?|categories|category|cat)=([^&#]+)/i);
    if (queryMatched && queryMatched[1]) value = queryMatched[1];

    let pathMatched = value.match(/\/(?:categories?|the-loai|theloai|genre)\/([^/?#]+)/i);
    if (pathMatched && pathMatched[1]) value = pathMatched[1];

    if (value.indexOf(",") > -1) value = value.split(",")[0].trim();
    value = value.trim();
    if (!value) return "";

    try {
        value = decodeURIComponent(value);
    } catch (e) {
    }

    if (/^\d+$/.test(value)) return parseInt(value, 10);
    return value;
}

function isCategorySource(source) {
    if (!source) return false;
    if (source.startsWith("cat:")) return true;
    if (source.startsWith("category:")) return true;
    if (/^\d+$/.test(source)) return true;
    if (/[?&](?:category_ids?|categories|category|cat)=/i.test(source)) return true;
    if (/\/(?:categories?|the-loai|theloai|genre)\//i.test(source)) return true;
    return false;
}

function safeJsonResponse(response) {
    if (!response || !response.ok) return null;
    let json = safeJson(response);
    return json && typeof json === "object" ? json : null;
}

function requestCategoryJson(categoryValue, pageNum, pageSize) {
    return safeJsonResponse(requestPost("/stories/get-search", {
        page: pageNum,
        items_per_page: pageSize,
        search: "",
        sort_by: "newest",
        category_ids: [categoryValue]
    }));
}

function requestCategoryWithFallback(source, pageNum, pageSize) {
    let parsed = parseCategoryValue(source);
    if (parsed === "") return null;

    let variants = [parsed];

    if (typeof parsed === "number") {
        variants.push(parsed.toString());
    } else if (typeof parsed === "string" && /^\d+$/.test(parsed)) {
        variants.push(parseInt(parsed, 10));
    }

    let firstJson = null;

    for (let i = 0; i < variants.length; i++) {
        let json = requestCategoryJson(variants[i], pageNum, pageSize);
        if (!json) continue;

        if (!firstJson) firstJson = json;
        if (Array.isArray(json.data) && json.data.length > 0) return json;
    }

    return firstJson;
}

function requestFeedJson(feed, pageNum, pageSize) {
    if (feed === "recommended") {
        return safeJsonResponse(requestPost("/stories/recommended", {
            page: pageNum,
            items_per_page: pageSize
        }));
    }

    if (feed === "completed") {
        return safeJsonResponse(requestPost("/stories/get-search", {
            page: pageNum,
            items_per_page: pageSize,
            search: "",
            sort_by: "newest",
            status: 2
        }));
    }

    return safeJsonResponse(requestGet("/stories/" + feed, {
        page: pageNum,
        items_per_page: pageSize
    }));
}

function buildFeedJson(source, pageNum, pageSize) {
    if (source.startsWith("feed:")) {
        return requestFeedJson(source.substring(5), pageNum, pageSize);
    }

    if (isCategorySource(source)) {
        return requestCategoryWithFallback(source, pageNum, pageSize);
    }

    return requestFeedJson("new-updates", pageNum, pageSize);
}

function execute(input, page) {
    let pageNum = parseInt(page || "1");
    if (!pageNum || pageNum < 1) pageNum = 1;

    let pageSize = 24;
    let source = normalizeSourceInput(input);
    let json = buildFeedJson(source, pageNum, pageSize);
    if (!json) return null;

    let list = parseItems(json);
    let next = "";

    if (list.length > 0) {
        let count = parseInt(json.count || "0");
        if (!count || pageNum * pageSize < count) {
            next = (pageNum + 1).toString();
        }
    }

    return Response.success(list, next);
}
