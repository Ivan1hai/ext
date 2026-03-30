load("config.js");

function execute(input, page) {
    try {
        let parsed = stvParseListingInput(input);

        if (parsed.mode === "home") {
            let dashboard = stvFetchDashboard();
            let items = dashboard && dashboard[parsed.section] ? dashboard[parsed.section] : [];
            return Response.success(stvMapStories(items), null);
        }

        if (parsed.relatedId) {
            return Response.success(stvMapStories(stvFetchRelatedStories(parsed.relatedId)), null);
        }

        let currentPage = stvTrim(page) || parsed.page || "1";
        let data = stvUnwrapData(stvApiPost(
            "/stories/search?page=" + encodeURIComponent(currentPage) + "&limit=" + DEFAULT_LIMIT,
            stvBuildListingPayload(parsed)
        ));

        return Response.success(
            stvMapStories(data && data.items ? data.items : []),
            stvNextPage(data ? data.metadata : null)
        );
    } catch (error) {
        return Response.error(stvErrorMessage(error, "Khong tai duoc danh sach truyen."));
    }
}
