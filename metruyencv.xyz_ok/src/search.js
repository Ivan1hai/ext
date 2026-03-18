load("config.js");

function execute(key, page) {
    var pageUrl = buildFilterUrl(
        BASE_URL + "/?" + buildQueryString({
            s: key || "",
            post_type: "wp-manga"
        }),
        page || "1"
    );
    var response = fetch(pageUrl);
    if (!response || !response.ok) return null;

    var doc = response.html();
    var novels = [];

    extractListItems(doc).forEach(function (item) {
        novels.push(toNovel(item));
    });

    return Response.success(novels, getNextPage(doc));
}
