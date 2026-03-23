load("config.js");

function execute(key, page) {
    var currentPage = page || "1";
    var url = BASE_URL + "/tim-kiem/?tukhoa=" + encodeURIComponent(key);
    if (currentPage !== "1") url += "&paged=" + currentPage;

    var response = fetch(url);
    if (!response.ok) return null;

    var doc = response.html();
    var items = extractListingItems(doc);
    if (items.length > 0) {
        return Response.success(items, extractNextPage(doc, currentPage));
    }

    if (currentPage !== "1") return Response.success([], null);

    var suggestResponse = fetch(BASE_URL + "/api/quicksearch/?searchKey=" + encodeURIComponent(key) + "&t=" + (new Date()).getTime());
    if (!suggestResponse.ok) return Response.success([], null);

    var json = suggestResponse.json();
    var fallback = [];
    if (json && json.stories) {
        for (var i = 0; i < json.stories.length; i++) {
            var story = json.stories[i];
            fallback.push({
                name: story.title,
                link: storyUrlFromItem(story),
                cover: storyCover(story.storyID, story.alias, "large"),
                description: "Goi y nhanh",
                host: BASE_URL
            });
        }
    }

    return Response.success(fallback, null);
}
