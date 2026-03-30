load("config.js");

function execute(url) {
    try {
        let storyId = stvExtractStoryId(url);
        if (!storyId) return Response.error("URL chi tiet khong hop le.");

        let story = stvFetchStory(storyId);
        if (!story || !story.id) return Response.error("Khong tim thay thong tin truyen.");

        let versions = stvFetchTranslateVersions(storyId);
        let version = stvPickTranslateVersion(versions, stvExtractTranslateVersionId(url));
        let author = story.author && story.author.name ? stvTrim(story.author.name) : "";

        let detail = [];
        if (author) detail.push("<b>Tac gia:</b> " + stvEscapeHtml(author));
        detail.push("<b>Trang thai:</b> " + stvEscapeHtml(stvStatusLabel(story.status)));
        if (story.story_type) detail.push("<b>Loai:</b> " + stvEscapeHtml(stvTrim(story.story_type)));
        if (story.total_chapters !== null && typeof story.total_chapters !== "undefined") {
            detail.push("<b>So chuong:</b> " + stvFormatNumber(story.total_chapters));
        }
        if (story.total_views !== null && typeof story.total_views !== "undefined") {
            detail.push("<b>Luot xem:</b> " + stvFormatNumber(story.total_views));
        }
        if (version && version.name) {
            detail.push("<b>Ban dich:</b> " + stvEscapeHtml(stvTrim(version.name)));
        }
        if (story.latest_chapter_number !== null && typeof story.latest_chapter_number !== "undefined") {
            let latestTitle = stvTrim(story.latest_chapter_title);
            detail.push("<b>Moi nhat:</b> " + stvEscapeHtml(latestTitle || ("Chuong " + story.latest_chapter_number)));
        }
        if (story.is_vip && story.vip_from_chapter) {
            detail.push("<b>VIP tu chuong:</b> " + stvFormatNumber(story.vip_from_chapter));
        }

        let suggests = [];
        if (story.author && story.author.id) {
            suggests.push({
                title: "Cung Tac Gia",
                input: BASE_URL + "/stories?author_id=" + stvTrim(story.author.id),
                script: "gen.js"
            });
        }
        suggests.push({
            title: "Truyen Lien Quan",
            input: BASE_URL + "/stories?related_id=" + stvTrim(story.id),
            script: "gen.js"
        });

        return Response.success({
            name: stvTrim(story.title),
            cover: stvToAbsolute(story.cover_image_url),
            host: BASE_URL,
            author: author,
            description: stvTextToHtml(story.description),
            detail: detail.join("<br>"),
            ongoing: stvIsOngoing(story.status),
            genres: stvBuildGenres(story.categories),
            suggests: suggests
        });
    } catch (error) {
        return Response.error(stvErrorMessage(error, "Khong tai duoc chi tiet truyen."));
    }
}
