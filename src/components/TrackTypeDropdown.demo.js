import Demo, { props as P } from "react-demo";
// See https://github.com/rpominov/react-demo for how to make a demo

import TrackTypeDropdown from "./TrackTypeDropdown";

export default (
  <Demo
    props={{
      id: P.string("theDropdown"),
      className: P.string("someCSSClass"),
      value: P.choices(["graph", "haplotype", "read"]),
    }}
  >
    {(props, update) => {
      // We need to render the component under test using the props in props, and
      // call update when the component wants to adjust the props.
      return (
        <TrackTypeDropdown
          {...props}
          onChange={(new_value) => {
            // Bind new value back up to value.
            // Remember: we get a string
            update({ value: new_value });
          }}
        />
      );
    }}
  </Demo>
);
