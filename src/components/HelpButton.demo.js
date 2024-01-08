import Demo, { props as P } from "react-demo";
// See https://github.com/rpominov/react-demo for how to make a demo

import HelpButton from "./HelpButton.js";

export default (
  <Demo
    props={{
      file: P.string("./help/help.md"),
    }}
  >
    {(props) => {
      return <HelpButton {...props} />;
    }}
  </Demo>
);
