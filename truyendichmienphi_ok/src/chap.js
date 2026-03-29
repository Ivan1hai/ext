load("crypto.js");

function execute(url) {
  const PASSPHRASE = "z4x8vog2a13vz4x8vog2a13v";

  // 1. Lấy HTML trang truyện
  let text = fetch(getUrl(url)).text();

  // 2. Tìm ảnh SVG chứa chìa khóa
  let match = text.match(/data:image\/svg\+xml;base64,([^"']+)/);
  if (!match) {
    return Response.error("Lỗi: Không tìm thấy ảnh SVG chứa chìa khóa.");
  }

  // 3. Giải mã Base64 thành chuỗi XML (Vượt qua lỗi Canvas Fingerprinting)
  let svgString = "";
  try {
    svgString = CryptoJS.enc.Base64.parse(match[1]).toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return Response.error("Lỗi giải mã Base64 ảnh SVG.");
  }

  // 4. Trích xuất mã MD5 trực tiếp bằng Text Regex
  let token = extractToken(svgString);
  if (!token || token.length < 32) {
    return Response.error("Giải mã Token thất bại. Thu được: " + token);
  }

  // 5. Gọi API lấy cục dữ liệu mã hóa AES
  const response = fetch(url, {
    headers: {
      "X-Chapter-Token": token,
      "user-agent": "vozer",
    },
  });

  if (!response.ok) {
    return Response.error("Lỗi lấy dữ liệu API. Status: " + response.status);
  }

  let data = response.json();
  if (!data || !data.content) {
    return Response.error("Lỗi: API trả về không chứa dữ liệu chương.");
  }

  // 6. Giải mã AES và trình bày văn bản
  try {
    const decodedText = CryptoJS.AES.decrypt(data.content, PASSPHRASE).toString(CryptoJS.enc.Utf8);
    const lines = decodedText.split("\n");
    lines.reverse(); // Bẻ ngược luồng text theo cấu trúc API
    const content = lines.join("<br>");
    return Response.success(content);
  } catch (e) {
    return Response.error("Lỗi giải mã văn bản AES: " + e.message);
  }
}

// Thuật toán trích xuất LSB bằng Regex (Bỏ qua hoàn toàn bộ render của điện thoại)
function extractToken(svgString) {
  // Quét trực tiếp các tọa độ màu rgb() trong text
  let rgbRegex = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g;
  let m;
  let bits = [];

  while ((m = rgbRegex.exec(svgString)) !== null) {
    bits.push(parseInt(m[1]) & 1); // Trích bit lẻ của Red
    bits.push(parseInt(m[2]) & 1); // Trích bit lẻ của Green
    bits.push(parseInt(m[3]) & 1); // Trích bit lẻ của Blue
  }

  // Cắt bỏ 16 bit độ dài (header giả)
  let contentBits = bits.slice(16);
  let token = "";

  // Gom nhóm 8 bit thành 1 ký tự ASCII
  for (let i = 0; i < 32; i++) {
    let start = i * 8;
    if (start + 8 > contentBits.length) break;

    let charBits = contentBits.slice(start, start + 8);
    let charCode = parseInt(charBits.join(''), 2);

    if (charCode >= 32 && charCode <= 126) {
      token += String.fromCharCode(charCode);
    } else if (charCode === 0) {
      break;
    }
  }

  return token.substring(0, 32); // Trả về chìa khóa MD5 chuẩn
}

function getUrl(apiUrl) {
  let pageUrl = apiUrl.replace(/^(https?:\/\/)(api\.)/, "$1");
  pageUrl = pageUrl
    .replace("/api/novels/", "/truyen/")
    .replace("/chapter/", "/chuong/");
  pageUrl = pageUrl.replace(/\?.*$/, "");
  return pageUrl;
}