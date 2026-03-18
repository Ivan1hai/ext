load("config.js");

function execute(key, page) {
    let pageNum = parseInt(page || "1");
    if (!pageNum || pageNum < 1) pageNum = 1;

    let q = key ? ("" + key).trim() : "";
    let url = BASE_URL + "/tim-kiem?key_word=" + encodeURIComponent(q);
    let doc = fetchDoc(withPage(url, pageNum));
    if (!doc) return Response.success([]);

    let list = parseStoryCards(doc);
    let next = list.length > 0 ? parseNextPage(doc, pageNum) : "";

    return Response.success(list, next);
}
