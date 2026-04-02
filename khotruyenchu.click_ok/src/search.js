load("config.js");

function ktcSearchItemToBook(item) {
    let name = ktcDecodeHtml(item && item.name ? item.name : "");
    let link = ktcToAbsolute(item && item.link ? item.link : "");
    let description = ktcShortText(item && item.description ? item.description : "", 240);

    if (!description && item && item.count) {
        description = "Số chương: " + item.count;
    } else if (description && item && item.count) {
        description += " | Số chương: " + item.count;
    }

    if (!name || !link) return null;

    return {
        name: name,
        link: link,
        cover: ktcResolveStoryCover(item),
        description: description,
        host: BASE_URL
    };
}

function execute(key, page) {
    let keyword = ktcTrim(key);
    if (!keyword) return Response.success([]);
    if (!page) page = "1";

    let apiUrl = BASE_URL
        + "/wp-json/wp/v2/bo_truyen?search="
        + encodeURIComponent(keyword)
        + "&per_page=24&page="
        + page
        + "&_fields=id,slug,link,name,description,count";

    let jsonData = ktcFetchJson(apiUrl, null, BASE_URL);
    if (!jsonData.data || Object.prototype.toString.call(jsonData.data) !== "[object Array]") {
        return Response.success([]);
    }

    let list = [];
    jsonData.data.forEach(item => {
        let parsed = ktcSearchItemToBook(item);
        if (parsed) list.push(parsed);
    });

    let current = parseInt(page || "1", 10);
    let totalPages = ktcRestTotalPages(jsonData.response);
    let next = current < totalPages ? String(current + 1) : "";
    return Response.success(list, next);
}
