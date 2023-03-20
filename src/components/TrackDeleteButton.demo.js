import Demo, {props as P} from 'react-demo'
// See https://github.com/rpominov/react-demo for how to make a demo

import TrackDeleteButton from "./TrackDeleteButton";

export default (<Demo
  props={{
    id: P.string('deleteButton'),
    className: P.string('someCSSClass'),
  }}
>
  {
    (props) => {
      // We need to render the component under test using the props in props
      return <TrackDeleteButton {...props} onClick={() => {
        // button has been clicked
        alert("clicked");
      }}/>
    }
  }
</Demo>)

