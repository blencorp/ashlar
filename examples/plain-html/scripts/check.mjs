import { accessSync } from "node:fs";

accessSync(new URL("../index.html", import.meta.url));
accessSync(new URL("../src/button.css", import.meta.url));
