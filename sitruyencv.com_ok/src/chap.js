load("config.js");

function execute(url) {
    try {
        let storyId = stvExtractStoryId(url);
        let chapterNumber = stvExtractChapterNumber(url);
        if (!storyId || !chapterNumber) {
            return Response.error("URL chuong khong hop le.");
        }

        let versionId = stvExtractTranslateVersionId(url);
        if (!versionId) {
            let version = stvPickTranslateVersion(stvFetchTranslateVersions(storyId), "");
            if (!version || !version.id) {
                return Response.error("Khong tim thay ban dich de doc chuong.");
            }
            versionId = stvTrim(version.id);
        }

        let chapter = stvUnwrapData(stvApiGet(
            "/chapters/" + encodeURIComponent(versionId) +
            "/read/" + encodeURIComponent(chapterNumber) +
            "?story_id=" + encodeURIComponent(storyId)
        ));

        if (chapter && chapter.content) {
            return Response.success(stvTextToHtml(chapter.content));
        }

        let message = "";
        if (chapter && chapter.message) message = stvTrim(chapter.message);
        if (!message && chapter && chapter.has_access === false) {
            message = "Chuong nay can mo khoa tren website.";
        }

        return Response.error(message || "Khong lay duoc noi dung chuong.");
    } catch (error) {
        return Response.error(stvErrorMessage(error, "Khong tai duoc noi dung chuong."));
    }
}
