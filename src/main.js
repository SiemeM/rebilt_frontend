import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";

// Import FontAwesome
import { library } from "@fortawesome/fontawesome-svg-core";
import { faCaretRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

// Add FontAwesome icons to the library
library.add(faCaretRight);

createApp(App)
  .component("font-awesome-icon", FontAwesomeIcon) // Register FontAwesome component globally
  .use(router)
  .use(createPinia())
  .mount("#app");
