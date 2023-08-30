import React from 'react';
import PropTypes from "prop-types";
import {
    Form,
    Row,
    Col
  } from "reactstrap";
import RadioRow from "./RadioRow";
import ColorPicker from "./ColorPicker";

/**
 * A component meant to contain settings related to an individual track
 * 
 * fileType expects a string specifying the filetype, e.g "haplotype", "read"
 * 
 * trackColorSettings expects an object in the form of 
 * {mainPalette: string,
 *  auxPallate: string,
 *  colorReadsByMappingQuality: boolean}
 * 
 * The setTrackColorSetting function expects to be passed a key value pair updating the trackColorSettings object
 * 
 * availableColors expects an array of colors(string), must correspond to valid colors defined in RadioRow.js and tubemap.js
 * 
 * presetColors expect an array of hex colors, this is used in the single colorPicker
 *  
 * See demo and test file for examples of this component.
 */

export const TrackSettings = ({
    fileType,
    trackColorSettings,
    setTrackColorSetting,
    label,
    availableColors,
    presetColors
}) => {

    function colorRenderSwitch(fileType) {
        switch(fileType) {
            case "haplotype":
                return(
                    <Form>
                        <Row>
                            <Col className="radio-row">
                                <RadioRow
                                    rowHeading="Haplotypes"
                                    color={trackColorSettings.mainPalette}
                                    setting="mainPalette"
                                    setColorSetting={setTrackColorSetting}
                                    availableColors={availableColors}
                                />
                            </Col>
                            <Col className="tracklist-button" md="1">
                                <ColorPicker
                                    color={trackColorSettings.mainPalette}
                                    presetColors={presetColors}
                                    onChange={(color) => {
                                        setTrackColorSetting("mainPalette", color);
                                    }}
                                />
                            </Col>
                        </Row>
                    </Form>
                );
            case "graph":
            case  "read":
                return(
                    <Form>
                        <Row>
                            <Col className="radio-row">
                                <RadioRow
                                    rowHeading={fileType === "read" ? "Forward Reads" : "Reference Path"}
                                    color={trackColorSettings.mainPalette}
                                    setting="mainPalette"
                                    setColorSetting={setTrackColorSetting}
                                    availableColors={availableColors}
                                />
                            </Col>
                            <Col className="tracklist-button" md="1">
                                <ColorPicker
                                    color={trackColorSettings.mainPalette}
                                    presetColors={presetColors}
                                    onChange={(color) => {
                                        setTrackColorSetting("mainPalette", color);
                                    }}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col className="radio-row">
                                <RadioRow
                                    rowHeading={fileType === "read" ? "Reverse Reads" : "Non-Reference Path"}
                                    color={trackColorSettings.auxPalette}
                                    setting="auxPalette"
                                    setColorSetting={setTrackColorSetting}
                                    availableColors={availableColors}
                                />
                            </Col>
                            <Col className="tracklist-button" md="1">
                                <ColorPicker
                                    color={trackColorSettings.auxPalette}
                                    presetColors={presetColors}
                                    onChange={(color) => {
                                        setTrackColorSetting("auxPalette", color);
                                    }}
                                />
                            </Col>
                        </Row>
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
    trackColorSettings: PropTypes.object,
    setTrackColorSetting: PropTypes.func.isRequired,
    label: PropTypes.string,
    availableColors: PropTypes.array,
    presetColors: PropTypes.array
}

TrackSettings.defaultProps = {
    fileType: "haplotype",
    availableColors: ["greys", "ygreys", "blues", "reds", "plainColors", "lightColors"],
    presetColors: ['#FF6900', '#FCB900', '#7BDCB5', '#00D084', '#8ED1FC', '#0693E3', '#ABB8C3', '#EB144C', '#F78DA7', '#9900EF'],
    trackColorSettings: {    
        mainPalette: "blues",
        auxPalette: "reds",
        colorReadsByMappingQuality: false
    },
}

export default TrackSettings;
