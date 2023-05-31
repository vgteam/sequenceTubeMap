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

    const [trackListChanges, setTrackListChanges] = useState({});

    // gets the highest trackID bewteen pending changes and tracks + 1
    let nextTrackID = parseInt(Object.keys({...tracks, ...trackListChanges}).reduce((t1, t2) => {
        if (t1 > t2) {
            return t1;
        }
        return t2;
    })) + 1;

    // returns an updated track list combining the 2 inputs, with trackChanges taking priority
    const applyTrackListChanges = (tracks, trackChanges) => {
        let newTrackList = {...tracks};
        Object.keys(trackChanges).forEach((trackID, index) => {
            // if the trackprops are marked as -1, they are deleted
            if (trackChanges[trackID] === -1) {
                delete newTrackList[trackID];
            } else {
                newTrackList[trackID] = trackChanges[trackID];
            }
        });
        return newTrackList;
    }

    const addTrackItem = () => {
        let newTrackList = {...trackListChanges};

        // create a track item with default trackProps
        newTrackList[nextTrackID.toString()] = {...config.defaultTrackProps};
        setTrackListChanges(newTrackList);
    }

    const trackListOnChange = (newTracks) => {
        setTrackListChanges(applyTrackListChanges(trackListChanges, newTracks));
    }

    const onDelete = (trackID) => {
        let newTrackList = {...trackListChanges};
        // store to be deleted tracks as -1
        newTrackList[trackID] = -1;
        setTrackListChanges(newTrackList);
    }


    useEffect(() => {
        // construct the new track list
        let newTrackList = applyTrackListChanges(tracks, trackListChanges)

        let validTrackList = true;
        // track list is valid to commit if all fileNames have been selected
        Object.keys(newTrackList).forEach((trackID, index) => {
            const trackProps = newTrackList[trackID];
            if (trackProps.trackFile === undefined) {
                validTrackList = false;
            }
        });

        // call onChange if the track list is valid and changes have been made        
        if (validTrackList && JSON.stringify(newTrackList) !== JSON.stringify(tracks)) {
            console.log("tracks", tracks);
            console.log("trackChanges", trackListChanges);
            console.log("calling Track Picker Display onChange with ", newTrackList);
            onChange(newTrackList);
            // clear out pending changes
            setTrackListChanges({});
        }


    }, [trackListChanges, onChange, tracks]);

    return(
        <Col>
            <Row>
                <TrackList
                    tracks={applyTrackListChanges(tracks, trackListChanges)}
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