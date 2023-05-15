import PropTypes from "prop-types";
import {
    Container,
    Row
  } from "reactstrap";
import {TrackListItem} from './TrackListItem';


export const TrackList = ({
  // tracks expects an object mapping an trackID to trackProps, which includes
      // * trackType: string
      // * trackFile: file object / undefined
      // * trackColorSettings: object(aka. colorScheme)
  tracks,
  // availableTracks: array of tracks(see types.ts)
  availableTracks,
  // availableColors: array of ColorPalettes
  availableColors,
  onChange, // expects a new tracks object
  onDelete,
}) => {

  function trackItemOnChange(trackID, trackProps) {
    (function(callback){ console.log(callback.toString()); })(onChange);
      let newTracks = {...tracks};
      newTracks[trackID] = trackProps;
      if (JSON.stringify(newTracks) !== JSON.stringify(tracks)) {
          onChange(newTracks);
      }

  }


  function renderTracks() {
      let trackHTML = [];

      Object.keys(tracks).forEach((trackID, index) => {
          const trackProps = tracks[trackID]
          trackHTML.push(          
          <Row key={trackID}>
              <TrackListItem 
              trackProps={trackProps}
              availableTracks={availableTracks}
              availableColors={availableColors}
              onChange={trackItemOnChange}
              onDelete={onDelete}
              trackID={trackID}/>
          </Row>
          );
      })

      return trackHTML;
  }

  return(<Container>
            {renderTracks()}
         </Container>);
  
}

TrackListItem.propTypes = {
  tracks: PropTypes.object.isRequired,
  availableTracks: PropTypes.array.isRequired,
  availableColors: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}
  

export default TrackList;