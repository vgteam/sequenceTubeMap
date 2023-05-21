import PropTypes from "prop-types";
import React, { useState, useEffect } from "react";
import {
    Row,
    Col
  } from "reactstrap";
import {TrackList} from "./TrackList";
import {TrackAddButton} from "./TrackAddButton";
import config from "./../config.json";

export const TrackPickerDisplay = ({
    // tracks expects an object mapping an trackID to trackProps, which includes
      // * trackType: string
      // * trackFile: file object / undefined
      // * trackColorSettings: object(aka. colorScheme)
    tracks, 
    availableTracks, // array of tracks(see types.ts)
    availableColors, // array of ColorPalettes
    onChange, // expects a new tracks object


}) => {


    const [myTrackList, setMyTrackList] = useState(tracks);

    // gets the highest trackID in tracks + 1
    let nextTrackID = parseInt(Object.keys(myTrackList).reduce((t1, t2) => {
        if (t1 > t2) {
            return t1;
        }
        return t2;
    })) + 1;

    const addTrackItem = () => {
        let newTrackList = {...myTrackList};

        // create a track item with default trackProps
        newTrackList[nextTrackID.toString()] = {...config.defaultTrackProps};
        setMyTrackList(newTrackList);

    }

    const trackListOnChange = (newTracks) => {
        let newTrackList = {...myTrackList};
        Object.keys(newTracks).forEach((trackID, index) => {
            newTrackList[trackID] = newTracks[trackID];
        })
        setMyTrackList(newTrackList);
    }

    const onDelete = (trackID) => {
        let newTrackList = {...myTrackList};
        delete newTrackList[trackID];
        setMyTrackList(newTrackList);
    }


    useEffect(() => {
        // track list is valid to commit if all fileNames have been selected
        let validTrackList = true;
        Object.keys(myTrackList).forEach((trackID, index) => {
            const trackProps = myTrackList[trackID];
            if (trackProps.trackFile === undefined) {
                validTrackList = false;
            }
        });

        // commit changes when files are valid and changes are made
        if (validTrackList && JSON.stringify(tracks) !== JSON.stringify(myTrackList)) {
            onChange(myTrackList);
        }

    }, [myTrackList, onChange, tracks]);

    return(
        <Col>
            <Row>
                <TrackList
                    tracks={myTrackList}
                    availableTracks={availableTracks}
                    availableColors={availableColors}
                    onChange={trackListOnChange}
                    onDelete={onDelete}
                />
            </Row>
            <Row>
                <TrackAddButton
                    onChange={addTrackItem}
                />
            </Row>
        </Col>

    );
};

TrackPickerDisplay.propTypes = {
    tracks: PropTypes.object.isRequired,
    availableTracks: PropTypes.array.isRequired,
    availableColors: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired
}

export default TrackPickerDisplay;