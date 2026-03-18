load('config.js');

function execute(url, page) {
    var requestUrl = BASE_URL;
    if (url === "completed") {
        requestUrl = BASE_URL + "/danh-sach/truyen-full/";
    } else if (url === "hot") {
        requestUrl = BASE_URL + "/danh-sach/truyen-hot/";
    } else {
        // new
        requestUrl = BASE_URL;
    }

    if (page) {
        if (requestUrl.indexOf("?") !== -1) {
            requestUrl = requestUrl + "&page=" + page;
        } else {
            requestUrl = requestUrl + "?page=" + page;
        }
    }

    let response = fetch(requestUrl);
    if (response.ok) {
        let doc = response.html();
        let novelList = [];

        if (url !== "completed" && url !== "hot") {
            doc.select(".home-content .itemupdate").forEach(function (e) {
                let titleEl = e.select(".iname h3 a").first();
                if (!titleEl) return;

                let name = titleEl.text();
                // The text might contain the icon's text or whitespace
                // Actually jsoup gets text inside tags.

                let link = titleEl.attr("href");
                if (link && link.startsWith("/")) {
                    link = BASE_URL + link;
                } else if (link && !link.startsWith("http")) {
                    link = BASE_URL + "/" + link;
                }

                let cate = e.select(".icate").text();
                let chapter = e.select(".ichapter a").text();
                let updated = e.select(".iupdated").text();

                let desc = cate + " - " + chapter + " - " + updated;

                let cover = "";
                let responseDetail = fetch(link);
                if (responseDetail.ok) {
                    let docDetail = responseDetail.html();
                    let coverEl = docDetail.select(".book-info-pic img").first();
                    if (coverEl) {
                        cover = coverEl.attr("data-src") || coverEl.attr("src") || "";
                    }
                }

                novelList.push({
                    name: name,
                    link: link,
                    cover: cover,
                    description: desc,
                    host: BASE_URL
                });
            });

            return Response.success(novelList, null);
        }

        doc.select(".item").forEach(function (e) {
            let titleEl = e.select("h3 a").first();
            if (!titleEl) {
                titleEl = e.select("a").first();
            }
            if (!titleEl) return;

            let coverEl = e.select(".cover img").first();
            if (!coverEl) {
                coverEl = e.select("img").first();
            }
            let cover = "";
            if (coverEl) {
                cover = coverEl.attr("data-src");
                if (!cover) cover = coverEl.attr("src");
            }

            let desc = "";
            let descEl = e.select("p.line").first();
            if (descEl) desc = descEl.text();

            novelList.push({
                name: titleEl.text(),
                link: titleEl.attr("href"),
                cover: cover,
                description: desc,
                host: BASE_URL
            });
        });

        // Pagination
        let next = null;
        let currentPage = page ? parseInt(page) : 1;
        let nextPageLink = doc.select("a.btn-page").last();
        if (nextPageLink) {
            let href = nextPageLink.attr("href");
            if (href && href.indexOf("page=") !== -1) {
                let match = href.match(/page=(\d+)/);
                if (match && parseInt(match[1]) > currentPage) {
                    next = "" + (currentPage + 1);
                }
            }
        }

        return Response.success(novelList, next);
    }

    return null;
}
