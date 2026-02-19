import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { apiPlugin, storyblokInit } from "@storyblok/react";

import App from "./App.jsx";

const storyblokToken = import.meta.env.VITE_STORYBLOK_TOKEN;

storyblokInit({
  accessToken: storyblokToken,
  use: [apiPlugin],
  apiOptions: {
    region: "eu",
  },
  components: {},
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
