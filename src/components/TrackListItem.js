import PropTypes from "prop-types";
import { Container, Row, Col } from "reactstrap";
import { TrackFilePicker } from "./TrackFilePicker";
import { TrackTypeDropdown } from "./TrackTypeDropdown";
import { TrackDeleteButton } from "./TrackDeleteButton";
import { TrackSettingsButton } from "./TrackSettingsButton";
import React, { useEffect, useState } from "react";
import { defaultTrackColors } from "../common.mjs";
import "../config-client.js";
import { config } from "../config-global.mjs";

export const TrackListItem = ({
  // trackProps expects an object with:
  // * trackType: string
  // * trackFile: file object / undefined
  // * trackColorSettings: object(aka. colorScheme)
  trackProps,
  // availableTracks: array of tracks(see Types.ts)
  availableTracks,
  // availableColors: array of ColorPalettes
  availableColors,
  onChange, // expects a new trackProps object
  onDelete,
  trackID,
  handleFileUpload,
}) => {
  // propChanges only store new trackType, trackFile, and trackColorSettings changes
  // reset after onChange is called
  const [propChanges, setPropChanges] = useState({});

  const [pickerType, setPickerType] = useState("mounted");

  const trackTypeOnChange = async (newTrackType) => {
    // wait until file change to call onChange
    let newPropChanges = { ...propChanges };
    newPropChanges["trackType"] = newTrackType;
    newPropChanges["trackFile"] = undefined;
    newPropChanges["trackColorSettings"] = defaultTrackColors(newTrackType);
    setPropChanges(newPropChanges);
  };

  const trackFileOnChange = async (newFile) => {
    let newPropChanges = { ...propChanges };
    newPropChanges["trackFile"] = newFile;
    setPropChanges(newPropChanges);
  };

  const trackSettingsOnChange = async (key, value) => {
    let newTrackColorSettings = { ...trackProps["trackColorSettings"] };
    newTrackColorSettings[key] = value;
    let newPropChanges = { ...propChanges };
    newPropChanges["trackColorSettings"] = newTrackColorSettings;
    setPropChanges(newPropChanges);
  };

  // useEffect hook to tell react to call onchange after state changes
  // setPropChanges are async, useEffect acts as a callback to setPropChanges
  // https://stackoverflow.com/questions/54954091/how-to-use-callback-with-usestate-hook-in-react/56394177#56394177
  useEffect(() => {
    // get an updated version of trackProps
    let newTrackProps = { ...trackProps };
    for (const key in propChanges) {
      newTrackProps[key] = propChanges[key];
    }

    // push it if changes are made
    if (JSON.stringify(trackProps) !== JSON.stringify(newTrackProps)) {
      onChange(trackID, newTrackProps);
      setPropChanges({});
    }
  }, [propChanges, onChange, trackProps, trackID]);

  // displayed elements uses propChanges(local state) first, then uses trackProps
  // Isn't just a || because propChanges can set the trackFile to be undefined
  const displayedFile =
    "trackFile" in propChanges
      ? propChanges["trackFile"]
      : trackProps["trackFile"];
  console.log(displayedFile);
  return (
    <Container
      key={trackID}
      style={{ width: "900px", marginLeft: 0, marginRight: 15 }}
    >
      <Row className="g-0">
        <Col className="tracklist-dropdown">
          <TrackTypeDropdown
            value={propChanges["trackType"] || trackProps["trackType"]}
            onChange={trackTypeOnChange}
            testID={"file-type-select-component".concat(trackID)}
            options={["graph", "haplotype", "read", "node"]}
          />
        </Col>
        <Col className="tracklist-dropdown">
          <TrackTypeDropdown
            value={pickerType}
            onChange={setPickerType}
            testID={"picker-type-select-component".concat(trackID)}
            options={config.pickerTypeOptions}
          />
        </Col>

        <Col className="tracklist-dropdown">
          <TrackFilePicker
            tracks={availableTracks}
            fileType={propChanges["trackType"] || trackProps["trackType"]}
            value={displayedFile}
            pickerType={pickerType}
            handleInputChange={trackFileOnChange}
            testID={"file-select-component".concat(trackID)}
            handleFileUpload={handleFileUpload}
          />
        </Col>
        <Col className="tracklist-button" md="1">
          <TrackSettingsButton
            fileType={propChanges["trackType"] || trackProps["trackType"]}
            trackColorSettings={
              propChanges["trackColorSettings"] ||
              trackProps["trackColorSettings"]
            }
            setTrackColorSetting={trackSettingsOnChange}
            availableColors={availableColors}
            testID={"settings-button-component".concat(trackID)}
          />
          <TrackDeleteButton
            onClick={() => {
              onDelete(trackID);
            }}
            testID={"delete-button-component".concat(trackID)}
          />
        </Col>
      </Row>
    </Container>
  );
};

TrackListItem.propTypes = {
  trackProps: PropTypes.object.isRequired,
  availableTracks: PropTypes.array.isRequired,
  availableColors: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  trackID: PropTypes.number.isRequired,
  handleFileUpload: PropTypes.func.isRequired,
};

export default TrackListItem;
