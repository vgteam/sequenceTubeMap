import React, { Component } from 'react';
import { Form, Button } from 'reactstrap';
import { dataOriginTypes } from '../enums';

class ExampleSelectButtons extends Component {
  handleClick = (dataOrigin, haploColor, readColor) => {
    this.props.setDataOrigin(dataOrigin);
    this.props.setColorSetting('haplotypeColors', haploColor);
    if (readColor) {
      this.props.setColorSetting('forwardReadColors', readColor);
    }
  };

  render() {
    return (
      <Form inline>
        <Button
          color="primary"
          id="example1"
          onClick={() =>
            this.handleClick(dataOriginTypes.EXAMPLE_1, 'plainColors')
          }
        >
          Indels and Polymorphisms only
        </Button>
        <Button
          color="primary"
          id="example2"
          onClick={() =>
            this.handleClick(dataOriginTypes.EXAMPLE_2, 'plainColors')
          }
        >
          Inversions
        </Button>
        <Button
          color="primary"
          id="example3"
          onClick={() =>
            this.handleClick(dataOriginTypes.EXAMPLE_3, 'plainColors')
          }
        >
          Nested Inversions
        </Button>
        <Button
          color="primary"
          id="example4"
          onClick={() =>
            this.handleClick(dataOriginTypes.EXAMPLE_4, 'plainColors')
          }
        >
          Duplications
        </Button>
        <Button
          color="primary"
          id="example5"
          onClick={() =>
            this.handleClick(dataOriginTypes.EXAMPLE_5, 'plainColors')
          }
        >
          Translocations
        </Button>
        <Button
          color="primary"
          id="example6"
          onClick={() =>
            this.handleClick(dataOriginTypes.EXAMPLE_6, 'greys', 'reds')
          }
        >
          Aligned Reads
        </Button>
      </Form>
    );
  }
}

export default ExampleSelectButtons;
