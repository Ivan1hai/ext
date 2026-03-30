load("config.js");

function execute(key, page) {
    try {
        let query = stvTrim(key);
        if (!query) return Response.success([], null);

        let currentPage = stvTrim(page) || "1";
        let data = stvUnwrapData(stvApiPost(
            "/stories/search?page=" + encodeURIComponent(currentPage) + "&limit=" + DEFAULT_LIMIT,
            { search: query }
        ));

        return Response.success(
            stvMapStories(data && data.items ? data.items : []),
            stvNextPage(data ? data.metadata : null)
        );
    } catch (error) {
        return Response.error(stvErrorMessage(error, "Khong tim duoc truyen."));
    }
}
