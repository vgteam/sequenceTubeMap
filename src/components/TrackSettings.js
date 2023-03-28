import React from 'react';
import PropTypes from "prop-types";
import {
    Container,
    CardBody,
    Card,
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
                            trackType="mainPallete"
                            setColorSetting={setTrackColorSetting}
                            availableColors={availableColors}
                        />
                    </Form>
                );
            case  "read":
                return(
                    <Form>
                        <RadioRow
                            rowHeading="Gam Forward"
                            color={trackColorSettings.mainPallete}
                            trackType="mainPallete"
                            setColorSetting={setTrackColorSetting}
                            availableColors={availableColors}
                        />
                        <RadioRow
                            rowHeading="Gam Reverse"
                            color={trackColorSettings.auxPallete}
                            trackType="auxPallete"
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
        <Container>
            <Card>
                <CardBody>
                    <h5>Colors</h5>
                    {colorRenderSwitch(fileType)}
                </CardBody>
            </Card>
        </Container>
    )
}

TrackSettings.propTypes = {
    fileType: PropTypes.string.isRequired,
    trackColorSettings: PropTypes.object.isRequired,
    setTrackColorSetting: PropTypes.func.isRequired,
    availableColors: PropTypes.array
}

TrackSettings.defaultProps = {
    fileType: "haplotype",
    availableColors: ["greys", "ygreys", "blues", "reds", "plainColors", "lightColors"]
}

export default TrackSettings;
