import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.css";
import App from "./App";
import { DemoLibrary } from "./components/DemoLibrary";
import package_json from "../package.json";

console.log("Sequence Tube Map booting up");

// We need to work out if we have a homepage set. If so, our routes all need to be under the path part of that URL, like the build system expects in its index.html.
let basename = "";
if (package_json.homepage) {
  let homepage_url = new URL(package_json.homepage);
  basename = homepage_url.pathname;
}

console.log("Configuring router with basename " + basename);

ReactDOM.render((
<BrowserRouter basename={basename}>
  <Routes>
    <Route path="/">
      {
        // Main application renders at the root
      }
      <Route index element={<App />} />
      {
        // Demos for custom controls show up at /demo
        // Each demo gets a nice hashbang URL.
      }
      <Route path="demo" element={<DemoLibrary />} />
      <Route path="*" element={() => {<p>No React route found for current path</p>}}/>
    </Route>
    <Route path="*" element={() => {<p>No React route found for current path</p>}}/>
  </Routes>
</BrowserRouter>
), document.getElementById("root"));
