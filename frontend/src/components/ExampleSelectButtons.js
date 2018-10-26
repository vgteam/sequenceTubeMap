import React, { Component } from 'react';
import { Form, Button } from 'reactstrap';
import { dataSource } from '../enums';

class ExampleSelectButtons extends Component {
  render() {
    return (
      <Form inline>
        <Button
          color="primary"
          id="example1"
          onClick={() => this.props.setDataSource(dataSource.EXAMPLE_1)}
        >
          Indels and Polymorphisms only
        </Button>
        <Button
          color="primary"
          id="example2"
          onClick={() => this.props.setDataSource(dataSource.EXAMPLE_2)}
        >
          Inversions
        </Button>
        <Button
          color="primary"
          id="example3"
          onClick={() => this.props.setDataSource(dataSource.EXAMPLE_3)}
        >
          Nested Inversions
        </Button>
        <Button
          color="primary"
          id="example4"
          onClick={() => this.props.setDataSource(dataSource.EXAMPLE_4)}
        >
          Duplications
        </Button>
        <Button
          color="primary"
          id="example5"
          onClick={() => this.props.setDataSource(dataSource.EXAMPLE_5)}
        >
          Translocations
        </Button>
        <Button
          color="primary"
          id="example6"
          onClick={() => this.props.setDataSource(dataSource.EXAMPLE_6)}
        >
          Aligned Reads
        </Button>
      </Form>
    );
  }
}

export default ExampleSelectButtons;
