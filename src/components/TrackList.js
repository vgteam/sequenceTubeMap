import PropTypes from "prop-types";
import {
    Container,
    Row
  } from "reactstrap";
import {TrackListItem} from './TrackListItem';
import React, { useState, useRef, useEffect} from 'react';


export const TrackList = ({
    // tracks expects an object mapping an trackID to trackProps, which includes
        // * trackType: string
        // * trackFile: file object / undefined
        // * trackColorSettings: object(aka. colorScheme)
    tracks,
    // availableTracks: array of tracks(see types.ts)
    availableTracks,
    // availableColors: array of ColorPalletes
    availableColors,
    onChange, // expects a new tracks object
    onDelete,
  }) => {
    const [myTracks, setTracks] = useState(tracks);
    const _onChange = useRef(onChange);

    function trackItemOnChange(trackID, trackProps) {
        let newTracks = {...myTracks};

        newTracks[trackID] = trackProps;
        if (JSON.stringify(newTracks) !== JSON.stringify(myTracks)) {
            setTracks(newTracks);
        }

    }

    useEffect(() => {
        if (JSON.stringify(myTracks) !== JSON.stringify(tracks)) {
          _onChange.current(myTracks);
        }
        
      }, [myTracks, _onChange, tracks]);
  


    function renderTracks() {
        let trackMarkdown = [];

        Object.keys(myTracks).forEach((trackID, index) => {
            const trackProps = myTracks[trackID]
            trackMarkdown.push(           
            <Row>
                <TrackListItem trackProps={trackProps}
                availableTracks={availableTracks}
                availableColors={availableColors}
                onChange={trackItemOnChange}
                onDelete={onDelete}
                trackID={trackID}/>
            </Row>
            );
        })

        return trackMarkdown;
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
  
  
