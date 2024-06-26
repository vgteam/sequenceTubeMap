import React from "react";
import PropTypes from "prop-types";
import PopupDialog from "./PopupDialog.js";

export const PopUpInfoDialog = ({ open, attributes, close }) => {
  return (
    <div>
      <PopupDialog open={open} close={close}>
        <h5>Object Information</h5>
        <table>
          <tbody>
            {/* Track or Node info here */}
            {(attributes || []).map(function (attribute) {
              return (
                <tr key={attribute[0]}>
                  <td style={{ fontWeight: "bold", border: "1px solid black" }}>
                    {attribute[0]}
                  </td>
                  <td style={{ border: "1px solid black" }}>{attribute[1]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </PopupDialog>
    </div>
  );
};

export default PopUpInfoDialog;

PopUpInfoDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  /* array argument of track or node attribute pairs containing attribute name as a string and attribute value
  as a string or number */
  attributes: PropTypes.arrayOf(
    PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number]))
  ),
  close: PropTypes.func.isRequired,
};
