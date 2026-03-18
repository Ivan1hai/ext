load('config.js');

function execute(url, page) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }

    if (page) {
        if (url.indexOf("?") !== -1) {
            url = url + "&page=" + page;
        } else {
            url = url + "?page=" + page;
        }
    }

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();
        let novelList = [];

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
            let lines = e.select("p.line");
            if (lines.size() > 0) {
                desc = lines.first().text();
            }

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
        let pageLinks = doc.select("a.btn-page");
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

        return Response.success(novelList, next);
    }

    return null;
}
