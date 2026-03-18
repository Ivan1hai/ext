load('config.js');

function execute(key, page) {
    if (!page) page = "1";
    var url = BASE_URL + "/danh-sach?keyword=" + encodeURIComponent(key) + "&page=" + page + "&ajax=1";

    let response = fetch(url);
    if (response.ok) {
        let json = response.json();
        if (json.success && json.stories) {
            let novelList = [];

            json.stories.forEach(item => {
                let link = "/truyen/" + item.id;
                let cover = item.poster;
                if (cover && !cover.startsWith("http")) {
                    cover = BASE_URL + cover;
                }
                novelList.push({
                    name: item.title,
                    link: link,
                    cover: cover,
                    description: item.author,
                    host: BASE_URL
                });
            });

            let next = "";
            let currentPage = parseInt(json.currentPage || page);
            let totalPages = parseInt(json.totalPages || 0);

            if (currentPage < totalPages) {
                next = "" + (currentPage + 1);
            }

            return Response.success(novelList, next);
        } else {
            // fallback structure
            let doc = response.html();
            let novelList = [];

            doc.select(".story-item").forEach(function (e) {
                let titleEl = e.select(".story-title").first();
                if (!titleEl) {
                    titleEl = e.select("a").first();
                }
                if (!titleEl) return;

                let link = "";
                let linkEl = e.select("a[href*='/truyen/']").first();
                if (linkEl) {
                    link = linkEl.attr("href");
                } else {
                    link = titleEl.attr("href");
                }

                let coverEl = e.select("img.story-poster").first();
                if (!coverEl) {
                    coverEl = e.select("img").first();
                }
                let cover = "";
                if (coverEl) {
                    cover = coverEl.attr("data-src");
                    if (!cover) cover = coverEl.attr("src");
                }

                let desc = "";
                let metaEl = e.select(".story-meta").first();
                if (metaEl) desc = metaEl.text();

                novelList.push({
                    name: titleEl.text().trim(),
                    link: link,
                    cover: cover,
                    description: desc,
                    host: BASE_URL
                });
            });

            // Pagination
            let next = null;
            let currentPage = page ? parseInt(page) : 1;
            let pageLinks = doc.select(".pagination .page-link, .pagination a");
            if (pageLinks.size() > 0) {
                let lastLink = pageLinks.last();
                let href = lastLink.attr("href");
                if (href && href.indexOf("page=") !== -1) {
                    let match = href.match(/page=(\d+)/);
                    if (match && parseInt(match[1]) > currentPage) {
                        next = "" + (currentPage + 1);
                    }
                }
            }

            if (novelList.length > 0) {
                return Response.success(novelList, next);
            }
        }
    }

    return null;
}
