module.exports = {
  chainWebpack: (config) => {
    // Zorg ervoor dat de ts-loader goed is ingesteld voor TypeScript-bestanden
    config.module
      .rule("ts")
      .test(/\.ts$/)
      .use("ts-loader")
      .loader("ts-loader")
      .options({
        appendTsSuffixTo: [/\.vue$/], // Zorg ervoor dat .ts bestanden in .vue-bestanden worden verwerkt
      })
      .end();

    // Zorg ervoor dat vue-loader goed is ingesteld voor Vue-bestanden
    config.module.rule("vue").use("vue-loader").loader("vue-loader").end();
  },
};
