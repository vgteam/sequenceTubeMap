import React from 'react';
import PropTypes from "prop-types";
import {
    Form,
  } from "reactstrap";
import RadioRow from "./RadioRow";

/**
 * A component meant to contain settings related to an individual track
 * 
 * fileType expects a string specifying the filetype, e.g "haplotype", "read"
 * 
 * trackColorSettings expects an object in the form of 
 * {mainPallete: string,
 *  auxPallate: string,
 *  colorReadsByMappingQuality: boolean}
 * 
 * The handleInputChange function expects to be passed a new trackColorSettings object
 * 
 * availableColors expects an array of colors, must correspond to valid colors defined in RadioRow.js and tubemap.js
 *  
 * See demo and test file for examples of this component.
 */

export const TrackSettings = ({
    fileType,
    trackColorSettings,
    setTrackColorSetting,
    label,
    availableColors
}) => {
    function colorRenderSwitch(fileType) {
        switch(fileType) {
            case "graph":
            case "haplotype":
                return(
                    <Form>
                        <RadioRow
                            rowHeading="Haplotypes"
                            color={trackColorSettings.mainPallete}
                            setting="mainPallete"
                            setColorSetting={setTrackColorSetting}
                            availableColors={availableColors}
                        />
                    </Form>
                );
            case  "read":
                return(
                    <Form>
                        <RadioRow
                            rowHeading="Forward Reads"
                            color={trackColorSettings.mainPallete}
                            setting="mainPallete"
                            setColorSetting={setTrackColorSetting}
                            availableColors={availableColors}
                        />
                        <RadioRow
                            rowHeading="Reverse Reads"
                            color={trackColorSettings.auxPallete}
                            setting="auxPallete"
                            setColorSetting={setTrackColorSetting}
                            availableColors={availableColors}
                        />
                    </Form>
                );
            default:
                throw new Error("Invalid file type");
        }
    }

    return(
        <>
          <h5>{label} Colors</h5>
          {colorRenderSwitch(fileType)}
        </>
    )
}

TrackSettings.propTypes = {
    fileType: PropTypes.string.isRequired,
    trackColorSettings: PropTypes.object.isRequired,
    setTrackColorSetting: PropTypes.func.isRequired,
    label: PropTypes.string,
    availableColors: PropTypes.array
}

TrackSettings.defaultProps = {
    fileType: "haplotype",
    availableColors: ["greys", "ygreys", "blues", "reds", "plainColors", "lightColors"]
}

export default TrackSettings;
