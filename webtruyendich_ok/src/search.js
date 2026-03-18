load("config.js");

function execute(key, page) {
    if (!page) page = "1";
    const curPage = parseInt(page);
    const apiUrl = BASE_URL + "/api/search-novels?sort=update_date&keyword=" + encodeURIComponent(key) + "&page=" + curPage;

    const res = fetch(apiUrl);
    if (!res || !res.ok) return Response.success([]);

    const json = res.json();
    if (!json) return Response.success([]);

    const arr = json.novels || json.data || json.items || [];
    const books = [];

    for (let i = 0; i < arr.length; i++) {
        let item = arr[i];
        if (!item) continue;

        const title = item.title || item.name || item.novel_title || "";

        let link = "";
        const urlField = (item.url || "") + "";
        const slug = item.slug || item.novel_slug || "";

        if (urlField && !urlField.startsWith("http") && !urlField.startsWith("/")) {
            link = BASE_URL + "/truyen/" + urlField;
        } else if (slug && slug.indexOf("/") === -1) {
            link = BASE_URL + "/truyen/" + slug;
        } else if (urlField) {
            link = BASE_URL + (urlField.startsWith("/") ? "" : "/") + urlField;
        }

        const coverRaw = item.thumbnail || item.cover || item.cover_url || item.image || "";
        let cover = coverRaw;
        if (cover && !cover.startsWith("http")) {
            if (cover.startsWith("//")) cover = "https:" + cover;
            else cover = BASE_URL + (cover.startsWith("/") ? "" : "/") + cover;
        }

        let meta = [];
        const author = item.author || item.authors || item.novel_author;
        if (author) meta.push(("" + author).toString());
        if (item.genre_name) meta.push(("" + item.genre_name).toString());
        const status = item.status || item.novel_status;
        if (status) meta.push(("" + status).toString());
        if (item.max_chapters) meta.push("Chương: " + item.max_chapters);
        const latest = item.latest_chapter || item.last_chapter || item.newest_chapter;
        if (latest) meta.push(("Chương mới: " + latest).toString());
        const description = meta.join(" · ");

        if (title && link) {
            books.push({
                name: title,
                link: link,
                cover: cover,
                description: description,
                host: BASE_URL
            });
        }
    }

    let nextPage = "";
    if (json.total_pages && curPage < json.total_pages) {
        nextPage = String(curPage + 1);
    } else if (json.last_page && curPage < json.last_page) {
        nextPage = String(curPage + 1);
    } else if (json.pagination && json.pagination.total_pages && curPage < json.pagination.total_pages) {
        nextPage = String(curPage + 1);
    } else if (books.length > 0) {
        nextPage = String(curPage + 1);
    }

    return Response.success(books, nextPage);
}
