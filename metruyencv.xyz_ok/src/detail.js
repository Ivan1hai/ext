load("config.js");

function execute(url) {
    var info = resolveBookInfo(url);

    return Response.success({
        name: info.title || slugToKeyword(info.slug),
        cover: info.cover || "",
        host: BASE_URL,
        author: "N/A",
        description: info.descriptionHtml || info.descriptionText || "",
        ongoing: info.ongoing !== false,
        genres: info.genres || []
    });
}
