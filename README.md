# Sequence Tube Maps

![Header Graphic](/images/header.png)

### A JavaScript module for the visualization of genomic sequence graphs. It automatically generates a "tube map"-like visualization of sequence graphs which have been created with [vg](https://github.com/vgteam/vg).

### Link to working demo: [https://vgteam.github.io/sequenceTubeMap/](https://vgteam.github.io/sequenceTubeMap/)

## Biological Background

Recent scientific advances have lead to a huge increase in the amount of available genomic sequence information. In the past this sequence information consisted of a single reference sequence, which can be relatively easily visualized in a linear way. Today we often know multiple variants of a particular DNA sequence. These could be sequences from different individuals of the same species, but also homologous (= having shared ancestry) sequences from different species. The differences between the individual sequences are called polymorphisms and can range in size from variations of a single base pair to variations involving long stretches of DNA. These polymorphisms are a key focus point for all kinds of sequence analysis, since analyzing the differences between sequences and correlating them to possible differences in phenotype allows to make conclusions about the function of the analyzed sequence.

Graph data structures allow the encoding of multiple related sequences in a single data structure. The intention is to simplify the comparison of multiple sequences by making it easy to find the sequences' similarities and differences. There are a number of approaches (and file formats) for formally encoding variants of genomic sequences and their relationships in the form of graphs. Unfortunately it is often difficult to visualize these graphs in a way which conveys the complex information yet is easy to understand.

## Functionality

The purpose of this module is to generate visual representations of genomic sequence graphs. The visualization aims to display the information about all sequence variants in an intuitive way and as elegantly as possible.

Genomic sequence graphs consist of nodes and paths:

- A **Node** represents a specific sequence of bases. The length of this sequence determines the node's width in the graphical display.
- A **Path** connects multiple nodes. Each path represents one of the sequences underlying the graph data structure and its walk along multiple nodes.

This simple example shows two paths along three nodes:

![Simple Example 1](/images/example1.png)

Since both paths connect the same nodes, their sequences are identical (and the three nodes could actually be merged into a single one). If the two sequences would differ somewhere in the middle, this would result in the following image:

![Simple Example 2](/images/example2.png)

The way genomic sequences change in living organisms can lead to subsequences being inverted. For these cases, instead of creating two different nodes, a single node is traversed in two different directions:

![Simple Example 3](/images/example3.png)

The sequenceTubeMap module uses these elements as building blocks and automatically lays out and draws visualizations of graphs which are a lot bigger and more complicated.

There already exist various JavaScript tools for the visualization of graphs (see [D3.js](https://d3js.org/) [force field graphs](https://bl.ocks.org/mbostock/4062045) or the [hierarchy-based approach](http://www.graphviz.org/content/fsm) by [Graphviz](http://www.graphviz.org/)). These tools are great at displaying typical graphs as they are usually defined. But these regular graphs consist of nodes and edges instead of paths and have significant differences compared to genomic sequence graphs. Regular graphs have edges connecting two nodes each and not continuous paths connecting multiple nodes sequentially, nor do their nodes have a forward or backward orientation. We therefore need a specialized solution for displaying genomic sequence graphs (nevertheless the sequenceTubeMap module uses [D3.js](https://d3js.org/) for the actual drawing of svg graphics after calculating the coordinates of the various components).

## Usage

### Online Version: Explore Without Installing Anything

The easiest way to have a look at some graph visualizations is to check out the online demo at [https://vgteam.github.io/sequenceTubeMap/](https://vgteam.github.io/sequenceTubeMap/). There you can play with visualizations from a few different data sets as well as look at some examples showcasing different structural features of variation graphs. You can even provide your own [vg](https://github.com/vgteam/vg)-generated data as an input (limited to small file sizes only).

### Run Sequence Tube Maps On Your Own

If you are using vg and want visualize the graphs it generates, the online version is limited to small file sizes. For visualizing bigger data sets you can run Sequence Tube Maps on your own. You can either run Tube Maps completely on your local (Linux) machine or use your local browser to access Tube Maps running on any other (Linux) machine you have access to.

(Previously we provided a docker image at [https://hub.docker.com/r/wolfib/sequencetubemap/](https://hub.docker.com/r/wolfib/sequencetubemap/), which contained the build of this repo as well as a vg executable for data preprocessing and extraction. We now recommend a different installation approach.)

#### Prerequisites:

yarn or npm, nodejs, and [vg](https://github.com/vgteam/vg) (vg can be tricky to compile. If you run into problems, there are docker images for vg at [https://github.com/vgteam/vg_docker](https://github.com/vgteam/vg_docker).)

The directory containing the vg executable needs to be added to your environment path:

```
PATH=/<your_path_to_vg>:$PATH
```

#### Installation:

- Clone the repo:
  ```
  git clone https://github.com/vgteam/sequenceTubeMap.git
  ```
- Switch to the `sequenceTubeMap` folder
- Install npm dependencies:
  ```
  yarn install
  ```
  or
  ```
  npm install
  ```
- Build the frontend:
  ```
  yarn build
  ```
  or
  ```
  npm run build
  ```

#### Execution:

- Start the node server:
  ```
  yarn serve
  ```
  or
  ```
  npm run serve
  ```
- If the node server is running on your local machine, open a browser tab and go to `localhost:3000`.
- If the node server is running on a different machine, open a local browser tab and go to the server's URL on port 3000 `http://<your server's IP or URL>:3000/`.
  If you cannot access the server's port 3000 from the browser, instead of configuring firewall rules etc., it's probably easiest to set up an SSH tunnel.

```
ssh -N -L 3000:localhost:3000 <your username>@<your server>
```

#### Adding your own data:

- The vg files you want to visualize need to contain haplotype/path info. Generating visualizations for the graph itself only is not supported. In addition to the haplotype graph, you can optionally visualize aligned reads from a gam file.
- Your data needs to be indexed by vg. To generate an index of your vg file, go to the `sequenceTubeMap/scripts/` directory and run
  ```
  ./prepare_vg.sh <vg_file>
  ```
  `<vg_file>` is the file name of your vg file including path information.
  If there are `.vcf.gz` and `.vcf.gz.tbi` files next to your `.vg`, they will be used to generate a GBWT index of haplotypes from the VCF. In this case, the `.vg` file must contain alt paths, from the `-a` option of vg construct.
- To generate an index of your gam file (optional, you can view vg only too):
  ```
  ./prepare_gam.sh <gam_file>
  ```
  `<gam_file>` is the file name of your gam file including path information.
- The output files will be generated in the same folder as the original files. To tell Sequence Tube Maps this location, edit `sequenceTubeMpas/src/config.json` and modify the entry for `dataPath`:
  ```
  "dataPath": "<path to my data folder>/",
  ```
  If you want to use a relative path, this path should be relative to the `sequenceTubeMaps/` folder.
- restart the server and choose `custom (mounted files)` from the data dropdown in the UI to be able to pick from the files in your data folder.

## License

Copyright (c) 2018 Wolfgang Beyer, licensed under the MIT License.
