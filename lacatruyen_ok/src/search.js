load("config.js");

function execute(key, page) {
    let pageNum = parseInt(page || "1");
    if (!pageNum || pageNum < 1) pageNum = 1;

    let pageSize = 24;
    let response = requestPost("/stories/get-search", {
        page: pageNum,
        items_per_page: pageSize,
        search: key || "",
        sort_by: "newest"
    });

    if (!response || !response.ok) return null;

    let json = safeJson(response);
    if (!json) return null;

    let list = [];
    let rows = json.data || [];
    rows.forEach(item => {
        let mapped = mapStoryItem(item);
        if (mapped) list.push(mapped);
    });

    let next = "";
    if (list.length > 0) {
        let count = parseInt(json.count || "0");
        if (!count || pageNum * pageSize < count) {
            next = (pageNum + 1).toString();
        }
    }

    return Response.success(list, next);
}

