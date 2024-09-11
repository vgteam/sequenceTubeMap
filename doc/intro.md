# Introduction to the Sequence Tube Map

## Biological Background

Recent scientific advances have lead to a huge increase in the amount of available genomic sequence information. In the past this sequence information consisted of a single reference sequence, which can be relatively easily visualized in a linear way. Today we often know multiple variants of a particular DNA sequence. These could be sequences from different individuals of the same species, but also homologous (= having shared ancestry) sequences from different species. The differences between the individual sequences are called polymorphisms and can range in size from variations of a single base pair to variations involving long stretches of DNA. These polymorphisms are a key focus point for all kinds of sequence analysis, since analyzing the differences between sequences and correlating them to possible differences in phenotype allows to make conclusions about the function of the analyzed sequence.

Graph data structures allow the encoding of multiple related sequences in a single data structure. The intention is to simplify the comparison of multiple sequences by making it easy to find the sequences' similarities and differences. There are a number of approaches (and file formats) for formally encoding variants of genomic sequences and their relationships in the form of graphs. Unfortunately it is often difficult to visualize these graphs in a way which conveys the complex information yet is easy to understand.

## Functionality

The purpose of the Sequence Tube Map is to generate visual representations of genomic sequence graphs. The visualization aims to display the information about all sequence variants in an intuitive way and as elegantly as possible.

Genomic sequence graphs consist of nodes and paths:

- A **Node** represents a specific sequence of bases. The length of this sequence determines the node's width in the graphical display.
- A **Path** connects multiple nodes. Each path represents one of the sequences underlying the graph data structure and its walk along multiple nodes.

This simple example shows two paths along three nodes:

![Simple Example 1](images/example1.png)

Since both paths connect the same nodes, their sequences are identical (and the three nodes could actually be merged into a single one). If the two sequences would differ somewhere in the middle, this would result in the following image:

![Simple Example 2](images/example2.png)

The way genomic sequences change in living organisms can lead to subsequences being inverted. For these cases, instead of creating two different nodes, a single node is traversed in two different directions:

![Simple Example 3](images/example3.png)

The Sequence Tube Map uses these elements as building blocks and automatically lays out and draws visualizations of graphs which are a lot bigger and more complicated.

There already exist various JavaScript tools for the visualization of graphs (see [D3.js](https://d3js.org/) [force field graphs](https://bl.ocks.org/mbostock/4062045) or the [hierarchy-based approach](http://www.graphviz.org/content/fsm) by [Graphviz](http://www.graphviz.org/)). These tools are great at displaying typical graphs as they are usually defined. But these regular graphs consist of nodes and edges instead of paths and have significant differences compared to genomic sequence graphs. Regular graphs have edges connecting two nodes each and not continuous paths connecting multiple nodes sequentially, nor do their nodes have a forward or backward orientation. We therefore need a specialized solution for displaying genomic sequence graphs. (Internally, the Sequence Tube Map uses [D3.js](https://d3js.org/) for the actual drawing of svg graphics, after calculating the coordinates of the various components).

