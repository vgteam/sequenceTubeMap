import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.css";
import App from "./App";
import demo from "./components/RegionInput.demo";


ReactDOM.render((

<BrowserRouter>
  <Routes>
    <Route path="/">
      <Route index element={<App />} />
      <Route path="demo" element={demo} />
    </Route>
  </Routes>
</BrowserRouter>

), document.getElementById("root"));
