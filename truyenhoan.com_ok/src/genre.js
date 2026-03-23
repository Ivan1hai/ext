load("config.js");

function execute() {
    var response = fetch(BASE_URL);
    if (!response.ok) return null;

    var doc = response.html();
    return Response.success(extractGenresFromDocument(doc));
}
