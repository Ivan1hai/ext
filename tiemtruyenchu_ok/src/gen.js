function execute(url, page) {
    load('config.js');
    if (!page) page = "1";

    if (!url.includes(BASE_URL)) url = BASE_URL + url;

    let joiner = url.includes("?") ? "&" : "?";
    let response = fetch(url + joiner + "page=" + page);

    if (response.ok) {
        let doc = response.html();

        // Pagination: list page uses button, ranking uses a
        let next = doc.select("#pagination-container .page-item.active + .page-item button.page-link").text();
        if (!next) next = doc.select("#pagination-container .page-item.active + .page-item .page-link").text();
        if (!next) next = doc.select(".pagination .page-item.active + .page-item .page-link").text();

        let list = [];

        // =========================
        // 1) Normal list page
        // =========================
        let items = doc.select("#story-list-container .story-item");
        if (items.size() > 0) {
            items.forEach(item => {
                let a = item.select("a.story-title").first();
                if (!a) a = item.select("a").first();
                if (!a) return;

                let link = a.attr("href");
                let name = a.text().replace(/\s+/g, " ").trim();

                let img = item.select("img.story-poster").first();
                if (!img) img = item.select("img").first();
                let cover = img ? img.attr("src") : "";

                let meta = item.select(".story-meta").text().replace(/\s+/g, " ").trim();
                let desc = item.select(".story-desc").text().trim();

                list.push({
                    name: name,
                    link: link,
                    cover: cover,
                    description: desc || meta,
                    host: BASE_URL
                });
            });

            return Response.success(list, next);
        }

        // =========================
        // 2) Ranking page (desktop)
        // =========================
        let rows = doc.select("table tbody tr");
        if (rows.size() > 0) {
            rows.forEach(tr => {
                let a = tr.select("a.fw-bold").first();
                if (!a) a = tr.select("a").first();
                if (!a) return;

                let link = a.attr("href");
                let name = a.text().replace(/\s+/g, " ").trim();

                let img = tr.select("img.story-cover").first();
                if (!img) img = tr.select("img").first();
                let cover = img ? img.attr("src") : "";

                // Lấy tác giả (cột 3)
                let author = "";
                try { author = tr.select("td").get(2).text(); } catch(e) { author = ""; }
                author = author.replace(/\s+/g, " ").trim();

                list.push({
                    name: name,
                    link: link,
                    cover: cover,
                    description: author,
                    host: BASE_URL
                });
            });

            return Response.success(list, next);
        }

        // =========================
        // 3) Ranking page (mobile)
        // =========================
        let cards = doc.select("a.mobile-rank-item");
        if (cards.size() > 0) {
            cards.forEach(a => {
                let link = a.attr("href");

                let name = a.select(".mobile-title").text().replace(/\s+/g, " ").trim();
                if (!name) name = a.text().replace(/\s+/g, " ").trim();

                let img = a.select("img.mobile-story-cover").first();
                if (!img) img = a.select("img").first();
                let cover = img ? img.attr("src") : "";

                let author = a.select(".mobile-meta:contains(Tác giả)").text();
                author = author.replace("Tác giả:", "").replace(/\s+/g, " ").trim();

                list.push({
                    name: name,
                    link: link,
                    cover: cover,
                    description: author,
                    host: BASE_URL
                });
            });

            return Response.success(list, next);
        }

        // fallback empty
        return Response.success(list, next);
    }

    return null;
}
