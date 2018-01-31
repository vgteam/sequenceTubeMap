# Sequence Tube Maps

![Header Graphic](/images/header.png)

### A JavaScript module for the visualization of genomic sequence graphs. It automatically generates a "tube map"-like visualization of given sequence graphs.

### Link to working demo: [https://vgteam.github.io/sequenceTubeMap/](https://vgteam.github.io/sequenceTubeMap/)

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

### Online Version: Explore Without Installing Anything
The easiest way to have a look at some graph visualizations is to check out the online demo at [https://vgteam.github.io/sequenceTubeMap/](https://vgteam.github.io/sequenceTubeMap/). There you can play with visualizations from a few different data sets as well as look at some examples showcasing different structural features of variation graphs.

### Docker Version: Visualizing Your Custom Data
If you are using vg and want visualize the graphs it generates, the easiest way to do that is to use the docker container provided at [https://hub.docker.com/r/wolfib/sequencetubemap/](https://hub.docker.com/r/wolfib/sequencetubemap/). The ```sequencetubemap``` docker image contains the build of this repo as well as a vg executable, which is needed for data preprocessing and extraction.

Follow these steps to use the docker image:

 - The vg files you want to visualize need to contain haplotype/path info. Generating visualizations for the graph itself only is not supported. In addition to the haplotype graph, you can optionally visualize aligned reads from a gam file.
 - Install docker (https://docs.docker.com/engine/installation/)
 - Pull the docker image:
 ```
 docker pull wolfib/sequencetubemap:vg2018 
 ```
 - Alternatively you can build the docker image directly from the repo
 ```
 git clone https://github.com/vgteam/sequenceTubeMap.git
 cd sequencetubemap
 docker build -t wolfib/sequencetubemap:vg2018 .
 ```
 - Start the container: 
	There is some demo data included, but if you want to look at your own data, put vg and gam files in the same folder. This folder needs to be mounted for the docker container, so that the vg executable within the container can access those files:
    ```
    docker run -v <path_do_data>:/usr/src/app/mountedData --restart unless-stopped -p 80:3000 -d wolfib/sequencetubemap:vg2018
    ```
    (leave out the `-v` part if you don't have your own data)
 - Your data needs to be indexed by vg. This is done within the container to avoid issues with differing versions of vg.
 - To generate an index of your vg file:
    ```
    docker exec -it <container_id> /bin/sh prepare_vg.sh <vg_file>
    ```
	Run `docker ps`to see the id of the running container.
  `<vg_file>` is the file name of your vg file without any path information.
 - To generate an index of your gam file (optional, you can view vg only too): 
    ```
    docker exec -it <container_id> /bin/sh prepare_gam.sh <gam_file>
    ```
	 `<gam_file>` is the file name of your gam file without any path information.
 - open `localhost` in the browser, pick data -> custom, select xg file and optionally gam index
 - pick the location with start, length and unit input fields (or keep them the way they are)
 - Click go and hope to see a graph visualization
 
### Local Version: Build And Modify Sequence Tube Maps Yourself
If you need full control over Sequence Tube Maps and want to be able to modify its source code, you need to build it yourself.

#### Prerequisites: 
npm, nodejs, and [vg](https://github.com/vgteam/vg) (vg can be tricky to compile. If you run into problems, there are docker images for vg at [https://github.com/vgteam/vg_docker](https://github.com/vgteam/vg_docker).)

If you have gulp and bower installed globally, you will be able to use the ```gulp``` and ```bower``` commands, rather than ```node_modules/gulp/bin/gulp.js``` and ```node_modules/bower/bin/bower```, when working on the frontend.

#### Backend:
- Clone the repo:
  ```
  git clone https://github.com/vgteam/sequenceTubeMap.git
  ```
- Switch to the ```sequenceTubeMap/backend/``` folder
- Install npm dependencies:
  ```
  npm install
  ```
  
#### Data:
- ```mkdir /<your_path>/sequenceTubeMap/backend/vg```
- Copy the vg executable to ```sequenceTubeMap/backend/vg/```
- Add vg to your environment path:
  ```
  PATH=/<your_path>/sequenceTubeMap/backend/vg:$PATH
  ```
- Switch to the ```sequenceTubeMap/data``` folder and build indices for the test data:
  ```
  /bin/sh ./prepare_dev.sh
  ```
- Switch to the ```sequenceTubeMap/backend/``` folder and start server:
  ```
  nodejs app.js
  ```

#### Frontend:
- Switch to the ```sequenceTubeMap/frontend/``` folder
- Install npm dependencies:
  ```
  npm install
  ```
- Install bower dependencies:
  ```
  node_modules/bower/bin/bower install
  ```
- Create a local configuration setting BACKEND_URL to the location of your backend. If you ran `nodejs app.js` for the backend, and are working on a single machine, this will be `http://localhost:3000`. You can do:
  ```
  echo '{"BACKEND_URL": "http://localhost:3000"}' > config.json
  ```
  Make sure not to include a trailing slash in the URL.
- Run ```node_modules/gulp/bin/gulp.js``` to build the frontend into the `sequenceTubeMap/frontend/dist` directory.
- An easy way to view the built frontend is with the ```http-server``` module:
  ```
  npm install -g http-server
  http-server ./dist
  ```
  This serves the frontend on ```localhost:8080```.
- Alternatively use ```node_modules/gulp/bin/gulp.js serve``` to build and continually rebuild the frontend after each change. Open ```localhost:9000``` in the browser for the page, and ```localhost:3001``` for the instrumentation and cross-device page synchronization UI.

  

## License
Copyright (c) 2017 Wolfgang Beyer, licensed under the MIT License.
