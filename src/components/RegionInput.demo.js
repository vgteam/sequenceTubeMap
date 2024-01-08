import Demo, { props as P } from "react-demo";
// See https://github.com/rpominov/react-demo for how to make a demo

import RegionInput from "./RegionInput";

// We want to two-way-bind the demo region prop so we use advanced mode and pass the render function.
export default (
  <Demo
    props={{
      region: P.string("pathy:1-100"),
      regionInfo: P.json({
        chr: ["chr600"],
        start: [10],
        end: [90],
        desc: ["Something cool"],
      }),
      pathNames: P.json(["pathy", "anotherPath", "node", "chr600"]),
    }}
  >
    {(props, update) => {
      // We need to render the component under test using the props in props, and
      // call update when the component wants to adjust the props.
      return (
        <RegionInput
          {...props}
          handleRegionChange={(newRegion) => {
            // When region is changed by the component, update the demo's region state
            update({ region: newRegion });
          }}
        />
      );
    }}
  </Demo>
);
