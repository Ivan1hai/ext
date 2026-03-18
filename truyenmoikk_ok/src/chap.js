function execute(url) {
  let doc = Http.get(url).html();

  if (!doc) return Response.error("Không thể tải chương (Không kết nối được web)");

  // Hỗ trợ nhiều class/ID tuỳ thuộc vào giao diện (Mobile vs Desktop)
  let contentElement = doc.select("article.chapter-content").first()
    || doc.select("#chapter-c").first()
    || doc.select(".chapter-c").first()
    || doc.select("#chapter-content").first()
    || doc.select(".chapter-content").first()
    || doc.select(".noidung").first()
    || doc.select("div[itemprop='articleBody']").first();

  if (!contentElement) {
    return Response.error("Không tìm thấy nội dung chương (Sai bộ chọn HTML)");
  }

  let content = contentElement.html();

  if (content) {
    // Xoá script và ads
    content = content.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "");
    content = content.replace(/<div class="ads[^>]*>([\s\S]*?)<\/div>/gi, "");
    return Response.success(content);
  }

  return Response.error("HTML chương trống");
}