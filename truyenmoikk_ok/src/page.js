function execute(url) {
    let baseUrl = url.split('/').slice(0, 3).join('/');

    // Xử lý URL gốc của truyện
    let novelPath = url.replace("https://truyenmoikk.com", "").replace(/\/$/, "");
    if (novelPath.indexOf("https://") !== -1) novelPath = novelPath.replace("https://truyenmoiii.org", "");
    if (novelPath.indexOf("https://") !== -1) novelPath = novelPath.replace("https://truyenmoiyy.com", "");

    // Dùng .string() để lấy văn bản raw thay vì .html() phân tích DOM (nhằm tăng tốc)
    let pageText = Http.get(url).string();
    if (!pageText) return Response.success([baseUrl + novelPath + "/trang-1"]); // Nếu lỗi, trả về trang 1

    let totalPages = 1;

    // Regex tìm link tới trang cuối cùng
    let maxMatch = pageText.match(/href="([^"]+(?:trang-|page=)(\d+)[^"]*)"[^>]*title="Đến trang cuối"/i);
    if (!maxMatch) {
        maxMatch = pageText.match(/href="([^"]+(?:trang-|page=)(\d+)[^"]*)"[^>]*aria-label="Next"/i);
    }

    if (maxMatch) {
        totalPages = parseInt(maxMatch[2]);
    } else {
        // Dự phòng quét thủ công các link phân trang
        let regex = /href="[^"]*(?:trang-|page=)(\d+)[^"]*"/ig;
        let m;
        while ((m = regex.exec(pageText)) !== null) {
            let pNum = parseInt(m[1]);
            if (pNum > totalPages) totalPages = pNum;
        }
    }

    let list = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1) {
            list.push(url);
        } else {
            list.push(baseUrl + novelPath + "/trang-" + i);
        }
    }

    return Response.success(list);
}
