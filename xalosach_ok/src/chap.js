load("config.js");

function execute(url) {
  let doc = fetch(url).html();
  if (!doc) return Response.error("Lỗi khi tải trang chương từ xalosach");

  // Loại bỏ các thẻ không cần thiết: script, style, quảng cáo, nút điều hướng (Trước, Mục Lục, Sau), thẻ title thừa
  doc.select("script, style, .ads, #prevchap, #nextchap, #prevchapbot, #nextchapbot, .btnmucluc, ul.navew, h1.title, .breakcumb").remove();

  // Lấy nội dung chương, ưu tiên selector #lst_content theo DOM web mới nhất
  let content = doc.select("#lst_content").html();
  if (!content) content = doc.select("#chapcontent").html();
  if (!content) content = doc.select(".chapcontent").html();
  if (!content) content = doc.select("#content_chap").html();

  if (content) {
    return Response.success(content);
  }
  return Response.error("Không tìm thấy nội dung chương, có thể do cấu trúc trang web đã thay đổi.");
}
