import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.css";
import App from "./App";
import { DemoLibrary } from "./components/DemoLibrary";


ReactDOM.render((

<BrowserRouter>
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
    </Route>
  </Routes>
</BrowserRouter>

), document.getElementById("root"));
