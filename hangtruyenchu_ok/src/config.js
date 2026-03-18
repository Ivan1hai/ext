let BASE_URL = "https://hangtruyenchu.com";
let SESSION_COOKIE = "";
try {
    if (CONFIG_URL) BASE_URL = CONFIG_URL;
} catch (error) {}
try {
    if (CONFIG_COOKIE) SESSION_COOKIE = CONFIG_COOKIE;
} catch (error) {}
