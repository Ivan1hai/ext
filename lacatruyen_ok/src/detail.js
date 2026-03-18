load("config.js");

function formatStatus(status) {
    let s = (status || "").toString().trim();
    let lower = s.toLowerCase();

    if (lower === "completed" || lower === "done" || lower === "full") return "Hoàn thành";
    if (lower === "ongoing" || lower === "updating") return "Đang ra";
    if (lower === "d") return "Hoàn thành";
    if (lower === "o") return "Đang ra";

    return s;
}

function execute(url) {
    let storyUrl = normalizeStoryUrl(url);
    let nextData = parseNextDataByUrl(storyUrl);
    if (!nextData) {
        return Response.error("Không lấy được dữ liệu truyện.");
    }

    let pageProps = (((nextData || {}).props || {}).pageProps || {});
    let story = pageProps.story || null;
    if (!story) {
        return Response.error("Không tìm thấy thông tin truyện.");
    }

    let name = (story.title || "").trim();
    let author = (story.author || story.pen_name_user || story.name_user || "").trim();
    let cover = toAbsoluteUrl(story.image || "");
    let description = (story.description || story.detail || "").trim();

    let categories = [];
    if (story.name_category) categories.push(story.name_category);
    if (story.type) categories.push(story.type);

    let detailParts = [];
    if (author) detailParts.push("Tác giả: " + author);
    if (categories.length > 0) detailParts.push("Thể loại: " + categories.join(", "));
    if (story.count_chapter) detailParts.push("Số chương: " + story.count_chapter);
    if (story.view) detailParts.push("Lượt xem: " + story.view);

    let status = formatStatus(story.status);
    if (status) detailParts.push("Trạng thái: " + status);

    return Response.success({
        name: name,
        cover: cover,
        author: author,
        description: description,
        detail: detailParts.join("<br>"),
        host: BASE_URL
    });
}

