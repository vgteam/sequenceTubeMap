import React from 'react';
import PropTypes from "prop-types";
import {
    Container,
    CardBody,
    Card,
    Form,
  } from "reactstrap";
import RadioRow from "./RadioRow";

export const TrackSettings = ({
    fileType,
    trackColorSettings,
    setTrackColorSetting,
    availableColors
}) => {
    function renderSwitch(fileType) {
        switch(fileType) {
            case "graph":
            case "haplotype":
                return(
                    <Form>
                        <RadioRow
                            rowHeading="Haplotypes Forward"
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
                    {renderSwitch(fileType)}
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