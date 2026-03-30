load("config.js");

function execute(url) {
    try {
        let storyId = stvExtractStoryId(url);
        if (!storyId) return Response.error("URL chi tiet khong hop le.");

        let story = stvFetchStory(storyId);
        if (!story || !story.id) {
            return Response.error("Khong tim thay thong tin truyen.");
        }

        let versionId = stvExtractTranslateVersionId(url);
        let version = stvPickTranslateVersion(stvFetchTranslateVersions(storyId), versionId);
        if (!version || !version.id) {
            return Response.error("Khong tim thay ban dich de tai muc luc.");
        }

        let totalChapters = stvToInt(
            story.total_chapters || story.latest_chapter_number || 0,
            0
        );

        // Fallback an toan: URL doc cua site chi can storyId + chapterNumber.
        // Sinh muc luc truc tiep se nhanh va on dinh hon viec goi nhieu trang API.
        if (totalChapters > 0) {
            let synthetic = [];
            let vipFrom = stvToInt(story.vip_from_chapter, 0);
            let isVipStory = !!story.is_vip && vipFrom > 0;

            for (let chapterNo = 1; chapterNo <= totalChapters; chapterNo++) {
                let name = "Chuong " + chapterNo;
                if (isVipStory && chapterNo >= vipFrom) {
                    name += " [VIP]";
                }

                synthetic.push({
                    name: name,
                    url: stvBuildChapterUrl(storyId, chapterNo, version.id),
                    host: BASE_URL
                });
            }

            return Response.success(synthetic);
        }

        let data = stvUnwrapData(stvApiGet(
            "/chapters/" + encodeURIComponent(version.id) +
            "?page=1&limit=5000" +
            "&story_id=" + encodeURIComponent(storyId) +
            "&sort_order=asc"
        ));

        let items = data && data.items ? data.items : [];
        let out = [];
        items.forEach(function (chapter) {
            let chapterNumber = stvTrim(chapter.chapter_number);
            if (!chapterNumber) return;

            out.push({
                name: stvChapterName(chapter),
                url: stvBuildChapterUrl(storyId, chapterNumber, version.id),
                host: BASE_URL
            });
        });

        return Response.success(out);
    } catch (error) {
        return Response.error(stvErrorMessage(error, "Khong tai duoc muc luc."));
    }
}
