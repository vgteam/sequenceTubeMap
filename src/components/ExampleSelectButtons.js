import React, { Component } from "react";
import PropTypes from "prop-types";
import { Form, Button } from "reactstrap";
import { dataOriginTypes } from "../enums";

class ExampleSelectButtons extends Component {
  handleClick = (dataOrigin, haploColor, readColor) => {
    this.props.setDataOrigin(dataOrigin);
    // Set haplotype color. Examples always have haplotypes as track 0.
    this.props.setColorSetting("mainPalette", 0, haploColor);
    if (readColor) {
      // Set read color. Examples always have reads as track 1.
      this.props.setColorSetting("mainPalette", 1, readColor);
    }
  };

  render() {
    return (
      <Form>
        <Button
          color="primary"
          id="example1"
          onClick={() =>
            this.handleClick(dataOriginTypes.EXAMPLE_1, "plainColors")
          }
        >
          Indels and Polymorphisms only
        </Button>
        <Button
          color="primary"
          id="example2"
          onClick={() =>
            this.handleClick(dataOriginTypes.EXAMPLE_2, "plainColors")
          }
        >
          Inversions
        </Button>
        <Button
          color="primary"
          id="example3"
          onClick={() =>
            this.handleClick(dataOriginTypes.EXAMPLE_3, "plainColors")
          }
        >
          Nested Inversions
        </Button>
        <Button
          color="primary"
          id="example4"
          onClick={() =>
            this.handleClick(dataOriginTypes.EXAMPLE_4, "plainColors")
          }
        >
          Duplications
        </Button>
        <Button
          color="primary"
          id="example5"
          onClick={() =>
            this.handleClick(dataOriginTypes.EXAMPLE_5, "plainColors")
          }
        >
          Translocations
        </Button>
        <Button
          color="primary"
          id="example6"
          onClick={() =>
            this.handleClick(dataOriginTypes.EXAMPLE_6, "greys", "reds")
          }
        >
          Aligned Reads
        </Button>
        <Button
          color="primary"
          id="example7"
          onClick={() =>
            this.handleClick(dataOriginTypes.EXAMPLE_7, "greys", "reds")
          }
        >
          Alignments to Reverse Nodes
        </Button>
        <Button
          color="primary"
          id="example8"
          onClick={() =>
            this.handleClick(dataOriginTypes.EXAMPLE_8, "plainColors")
          }
        >
          Multiple Nodes Cycle 1
        </Button>
        <Button
          color="primary"
          id="example9"
          onClick={() =>
            this.handleClick(dataOriginTypes.EXAMPLE_9, "plainColors")
          }
        >
          Multiple Nodes Cycle 2
        </Button>
      </Form>
    );
  }
}

ExampleSelectButtons.propTypes = {
  setColorSetting: PropTypes.func.isRequired,
  setDataOrigin: PropTypes.func.isRequired,
};

export default ExampleSelectButtons;
