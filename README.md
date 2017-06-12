# Sequence Tube Maps

![Header Graphic](/images/header.png)

### A JavaScript module for the visualization of genomic sequence graphs. It automatically generates a "tube map"-like visualization of given sequence graphs.

### Link to working demo: [https://wolfib.github.io/sequenceTubeMap/](https://wolfib.github.io/sequenceTubeMap/)

## Biological Background

Recent scientific advances have lead to a huge increase in the amount of available genomic sequence information. In the past this sequence information consisted of a single reference sequence, which can be relatively easily visualized in a linear way. Today we often know multiple variants of a particular DNA sequence. These could be sequences from different individuals of the same species, but also homologous (= having shared ancestry) sequences from different species. The differences between the individual sequences are called polymorphisms and can range in size from variations of a single base pair to variations involving long stretches of DNA. These polymorphisms are a key focus point for all kinds of sequence analysis, since analyzing the differences between sequences and correlating them to possible differences in phenotype allows to make conclusions about the function of the analyzed sequence.

Graph data structures allow the encoding of multiple related sequences in a single data structure. The intention is to simplify the comparison of multiple sequences by making it easy to find the sequences' similarities and differences. There are a number of approaches (and file formats) for formally encoding variants of genomic sequences and their relationships in the form of graphs. Unfortunately it is often difficult to visualize these graphs in a way which conveys the complex information yet is easy to understand.

## Functionality

The purpose of this module is to generate visual representations of genomic sequence graphs. The visualization aims to display the information about all sequence variants in an intuitive way and as elegantly as possible.

Genomic sequence graphs consist of nodes and paths:

* A **Node** represents a specific sequence of bases. The length of this sequence determines the node's width in the graphical display.
* A **Path** connects multiple nodes. Each path represents one of the sequences underlying the graph data structure and its walk along multiple nodes.

This simple example shows two paths along three nodes:

![Simple Example 1](/images/example1.png)

Since both paths connect the same nodes, their sequences are identical (and the three nodes could actually be merged into a single one). If the two sequences would differ somewhere in the middle, this would result in the following image:

![Simple Example 2](/images/example2.png)

The way genomic sequences change in living organisms can lead to subsequences being inverted. For these cases, instead of creating two different nodes, a single node is traversed in two different directions:

![Simple Example 3](/images/example3.png)

The sequenceTubeMap module uses these elements as building blocks and automatically lays out and draws visualizations of graphs which are a lot bigger and more complicated.

There already exist various JavaScript tools for the visualization of graphs (see [D3.js](https://d3js.org/) [force field graphs](https://bl.ocks.org/mbostock/4062045) or the [hierarchy-based approach](http://www.graphviz.org/content/fsm) by [Graphviz](http://www.graphviz.org/)). These tools are great at displaying typical graphs as they are usually defined. But these regular graphs consist of nodes and edges instead of paths and have significant differences compared to genomic sequence graphs. Regular graphs have edges connecting two nodes each and not continuous paths connecting multiple nodes sequentially, nor do their nodes have a forward or backward orientation. We therefore need a specialized solution for displaying genomic sequence graphs (nevertheless the sequenceTubeMap module uses [D3.js](https://d3js.org/) for the actual drawing of svg graphics after calculating the coordinates of the various components).

## Usage

The demo at [https://wolfib.github.io/sequenceTubeMap/](https://wolfib.github.io/sequenceTubeMap/) contains some example visualizations as well as a way to generate visalizations from custom data.

Another way to use this module is to include it in your own code. The whole visualization logic is contained in [`tubemap.js`](https://github.com/wolfib/sequenceTubeMap/blob/master/app/scripts/tubemap.js) and a handful of css rules are defined in [`tubemap.css`](https://github.com/wolfib/sequenceTubeMap/blob/master/app/styles/tubemap.css). tubemap.js is an ES6 module and importing it requires ES6's import command, which is not supported by most browsers natively at this time. The code therefore needs to be transpiled before it can be executed in the browser.

In addition, the module uses [d3.js](https://d3js.org/), [jQuery](https://jquery.com/) and [Bootstrap](https://getbootstrap.com/).

A minimal example would look like this:

miniExample.html (a big part of this file are just commands for the JavaScript building and compiling, the actual html is minimal)
```html
<!DOCTYPE html>
<html>
<head>
  <title>Sequence Tube Map Minimal Example</title>
  <!-- build:css styles/vendor.css -->
  <!-- bower:css -->
  <link rel="stylesheet" href="/bower_components/bootstrap/dist/css/bootstrap.css" />
  <!-- endbower -->
  <!-- endbuild -->

  <!-- build:css styles/main.css -->
  <link rel="stylesheet" href="styles/tubemap.css">
  <!-- endbuild -->
</head>
<body>
  <p>A minimal example created with the Sequence Tube Maps JavaScript Module:</p>
  <div id="legendDiv"></div>
  <div id="chart">
    <svg id="svg">
    </svg>
  </div>
  <!-- build:js scripts/vendor.js -->
  <!-- bower:js -->
  <script src="/bower_components/jquery/dist/jquery.js"></script>
  <script src="/bower_components/d3/d3.js"></script>
  <!-- endbower -->
  <!-- endbuild -->

  <!-- build:js scripts/miniExample.js -->
  <script src="scripts/miniExample.bundle.js"></script>
  <!-- endbuild -->
</body>
</html>
```

miniExample.js
```javascript
import * as tubeMap from './tubemap';

const nodes = [
  { name: 'A', seq: 'AAAA' },
  { name: 'B', seq: 'TTG' },
  { name: 'C', seq: 'CC' },
];

const paths = [
  { id: 0, name: 'Track 1', sequence: ['A', 'B', 'C'] },
  { id: 1, name: 'Track 2', sequence: ['A', '-B', 'C'] },
  { id: 2, name: 'Track 3', sequence: ['A', 'C'] },
];

tubeMap.create({
  svgID: '#svg',
  nodes,
  tracks: paths,
});
tubeMap.useColorScheme(0);
```html

(See the result [here](https://wolfib.github.io/sequenceTubeMap/miniExample.html).)

[`tubemap.js`](https://github.com/wolfib/sequenceTubeMap/blob/master/app/scripts/tubemap.js) uses very simple custom JSON data structures for its input data:

Nodes are defined by a `name` attribute (has to be unique) and a `seq` attribute which contains the node's sequence of bases.
```javascript
const nodes = [
  { name: 'A', seq: 'AAAA' },
  { name: 'B', seq: 'TTG' },
  { name: 'C', seq: 'CC' },
];
```
Paths each have a unique and consecutively numbered `id` attribute (starting with 0), a `name` attribute and a `sequence` attribute which contains a array of node `name` attributes. If a node is traversed in reversed direction, the node `name` is prefixed by a `-`-symbol.
```javascript
const paths = [
  { id: 0, name: 'Track 1', sequence: ['A', 'B', 'C'] },
  { id: 1, name: 'Track 2', sequence: ['A', '-B', 'C'] },
  { id: 2, name: 'Track 3', sequence: ['A', 'C'] },
];
```

The sequence tube maps module also has the ability to parse JSON data generated by [vg](https://github.com/vgteam/vg/) ([https://github.com/vgteam/vg/](https://github.com/vgteam/vg/)). vg builds variation graphs from sequence data. Its output are typically binary .vg files, which it can transform into JSON files via
```
vg view -j filename.vg >filename.json
```
JSON files generated in such a way can be parsed and displayed by the demo at [https://wolfib.github.io/sequenceTubeMap/](https://wolfib.github.io/sequenceTubeMap/).

## License
Copyright (c) 2017 Wolfgang Beyer, licensed under the MIT License.
