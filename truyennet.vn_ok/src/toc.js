load('config.js');

function execute(url) {
    if (!url.startsWith("http")) {
        url = BASE_URL + url;
    }
    url = url.replace(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/img, BASE_URL);

    let response = fetch(url);
    if (response.ok) {
        let doc = response.html();
        let data = [];

        // Parse first page chapters from the initial HTML
        let el = doc.select("#chapter-list li a");
        for (let i = 0; i < el.size(); i++) {
            let e = el.get(i);
            let name = e.text().trim();
            let chapterUrl = e.attr("href");
            if (name && chapterUrl) {
                data.push({
                    name: name,
                    url: chapterUrl,
                    host: BASE_URL
                });
            }
        }

        // Extract storyId from page(storyId, pageNum) pattern in scripts
        let pageHtml = doc.html();
        let storyIdMatch = pageHtml.match(/page\((\d+),/);
        if (storyIdMatch) {
            let storyId = storyIdMatch[1];

            // Fetch remaining pages via AJAX API
            let pageNum = 2;
            let maxPages = 50; // Safety limit
            while (pageNum <= maxPages) {
                let apiUrl = BASE_URL + "/get/listchap/" + storyId + "?page=" + pageNum;
                let apiResponse = fetch(apiUrl);
                if (apiResponse.ok) {
                    let json = apiResponse.json();
                    if (json && json.data) {
                        let chapterDoc = Html.parse(json.data);
                        let chapters = chapterDoc.select("li a");
                        if (chapters.size() === 0) {
                            break;
                        }
                        for (let j = 0; j < chapters.size(); j++) {
                            let c = chapters.get(j);
                            let cName = c.text().trim();
                            let cUrl = c.attr("href");
                            if (cName && cUrl) {
                                data.push({
                                    name: cName,
                                    url: cUrl,
                                    host: BASE_URL
                                });
                            }
                        }

                        // Check if there are more pages
                        let paging = chapterDoc.select(".paging");
                        if (paging.size() === 0) {
                            break;
                        }
                        // Check if current page is the last
                        let nextPageExists = false;
                        let pagingLinks = chapterDoc.select(".paging a, .paging span");
                        for (let k = 0; k < pagingLinks.size(); k++) {
                            let text = pagingLinks.get(k).text().trim();
                            if (text === "" + (pageNum + 1)) {
                                nextPageExists = true;
                                break;
                            }
                        }
                        if (!nextPageExists) {
                            break;
                        }

                        pageNum++;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
        }

        return Response.success(data);
    }

    return null;
}
