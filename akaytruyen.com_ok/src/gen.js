load("config.js");

function normalizeSourceInput(input) {
    if (input === undefined || input === null) return BASE_URL + "/";

    if (typeof input === "string") {
        let raw = input.trim();
        if (!raw) return BASE_URL + "/";
        return raw;
    }

    if (typeof input === "object") {
        let raw = input.input;
        if (!raw) raw = input.url;
        if (!raw) raw = input.link;
        if (!raw) raw = input.value;
        if (!raw) raw = input.slug;
        if (raw) return ("" + raw).trim();
    }

    return BASE_URL + "/";
}

function execute(input, page) {
    let pageNum = parseInt(page || "1");
    if (!pageNum || pageNum < 1) pageNum = 1;

    let source = normalizeSourceInput(input);
    let doc = fetchDoc(withPage(source, pageNum));
    if (!doc) return Response.success([]);

    let list = parseStoryCards(doc);
    let next = list.length > 0 ? parseNextPage(doc, pageNum) : "";

    return Response.success(list, next);
}
