function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle("Data Entry Dashboard")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}