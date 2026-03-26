load("config.js");

function extractStoryId(url) {
    let matched = (url || "").match(/\/truyen\/(\d+)/i);
    return matched ? parseInt(matched[1], 10) : 0;
}

function fetchStoryById(storyId) {
    if (!storyId) return null;

    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= 80) {
        let apiUrl = BASE_URL + "/danh-sach?ajax=true&sort=updated&page=" + page;
        let response = ttcFetch(apiUrl);
        if (!response || !response.ok) return null;

        let json = null;
        try {
            json = response.json();
        } catch (error) {
            return null;
        }

        if (!json || !json.success || !json.stories) return null;

        for (let i = 0; i < json.stories.length; i++) {
            if (parseInt(json.stories[i].id, 10) === storyId) {
                return json.stories[i];
            }
        }

        totalPages = parseInt(json.totalPages || "1", 10);
        if (!totalPages || totalPages < 1) totalPages = 1;
        page += 1;
    }

    return null;
}

function buildSyntheticToc(storyId, totalChapters) {
    let list = [];
    for (let i = 1; i <= totalChapters; i++) {
        list.push({
            name: "Chuong " + i,
            url: ttcToAbsolute("/doc-truyen/" + storyId + "/chuong/" + i),
            host: BASE_URL
        });
    }
    return list;
}

function execute(url) {
    let normalized = ttcNormalizeUrl(url);
    let page = ttcFetchPage(normalized, null, 15000);

    if (page && page.doc && !page.loginRequired) {
        let list = [];
        let items = page.doc.select("#chapter-list-container a.chapter-item-link");
        if (items.size() === 0) items = page.doc.select("a.chapter-item-link");

        items.forEach(item => {
            let name = ttcTrim(item.text());
            let link = ttcToAbsolute(item.attr("href"));
            if (!name || !link) return;

            list.push({
                name: name,
                url: link,
                host: BASE_URL
            });
        });

        if (list.length > 0) {
            return Response.success(list);
        }
    }

    let storyId = extractStoryId(normalized);
    if (storyId) {
        let story = fetchStoryById(storyId);
        if (story) {
            let totalChapters = parseInt(story.total_chapters || "0", 10);
            if (totalChapters > 0) {
                return Response.success(buildSyntheticToc(storyId, totalChapters));
            }
        }
    }

    if (page && page.loginRequired) {
        if (ttcHasCookie()) {
            return Response.error("Khong tai duoc muc luc. Cookie dang nhap co the da het han, hay cap nhat lai trong muc Cookie cua plugin.");
        }
        return Response.error("Tiem Truyen Chu yeu cau dang nhap de lay muc luc. Hay dang nhap lai trong trinh duyet tich hop hoac dan cookie vao muc Cookie cua plugin.");
    }

    return Response.success([]);
}
