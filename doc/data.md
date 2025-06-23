# Adding Your Own Data

You can add your own data to the Sequence Tube Map, by placing it in the data path (by default, the `sequenceTubeMap/exampleData/` directory) of a local copy, uploading it through the web interface, or hosting it online and providing a track or BED URL.

## Adding Full Graphs

- The vg files you want to visualize need to contain haplotype or path info. Generating visualizations for a graph without any haplotypes or paths is not supported; only nodes covered by at least one haplotype or path will be displayed.
- If you have a `.vg` file, you can index it into an `.xg` for faster access. Go to the `sequenceTubeMap/scripts/` directory and run
  ```
  ./prepare_vg.sh <vg_file>
  ```
  `<vg_file>` is the file name of your vg file including path information.
  If there are `.vcf.gz` and `.vcf.gz.tbi` files next to your `.vg`, they will be used to generate a GBWT index of haplotypes from the VCF. In this case, the `.vg` file must contain alt paths, from the `-a` option of vg construct.
- You can also visualize aligned reads from GAM or indexed GAF files.
- To generate an index of your GAM file, go to the `sequenceTubeMap/scripts/` directory and run:
  ```
  ./prepare_gam.sh <gam_file>
  ```
  `<gam_file>` is the path to your GAM file.
- The output files from the preparation scripts will be generated in the same folder as the original files. You probably will need to move everything into the `sequenceTubeMap/exampleData/` directory, which is the default data path.
- You can change the data path where the Sequence Tube Map looks for data files. To do this, edit `sequenceTubeMap/src/config.json` and modify the entry for `dataPath`:
  ```
  "dataPath": "<path to my data folder>/",
  ```
  If you want to use a relative path, this path should be relative to the `sequenceTubeMaps/` folder. Make sure to restart the server.
- To actually use your data, make sure to choose `custom (mounted files)` from the data dropdown in the UI, and then click the gear icon to add tracks. For more information on selecting data files in the Sequence Tube Map, see the [Usage Guide](../public/help/help.md).

## Fetching Subgraphs in Advance

The sequenceTubeMap will fetch the necessary data when a region is queried. 
That can sometimes up to 10-20 seconds.
If you already know of regions/subgraphs that you will be looking at, you can pre-fetch the data in advance. 
This will save some time during the interactive visualization, especially if there are a lot of regions to visualize.

The net result needs to be one or more chunk directories on disk, referenced from a BED file.

To generate each chunk, you can use the `sequenceTubeMap/scripts/prepare_chunks.sh` script. You ought to run it from the directory containing your input files and where your output chunks will be stored (i.e. the `dataPath` in `sequenceTubeMaps/src/config.json`), which defaults to the `sequenceTubeMap/exampleData/` directory in the repo.

For example:

```
cd exampleData/
../scripts/prepare_chunks.sh -x mygraph.xg -h mygraph.gbwt -r chr1:1-100 -d 'Region A' -o chunk-chr1-1-100 -g mygam1.gam -g mygam2.gam >> mychunks.bed
../scripts/prepare_chunks.sh -x mygraph.gbz -r chr1:101-200 -d 'Region B' -o chunk-chr1-100-200 -g mygam1.gam -g mygam2.gam >> mychunks.bed
```

The BED file linking to the chunks has two additional nonstandard columns: 

- a description of the region (column 4)
- the path to the output directory of the chunk, `chunk-chr1-1-100` in the example above, (column 5). 

```
chr1	1	100	Region A	chunk-chr1-1-100
chr1	101	200	Region B	chunk-chr2-101-200
```
Note each column is seperated by tabs

This BED file needs to be in the `dataPath` directory, or it can be hosted on the web along with its chunk directories and accessed via URL.

If you want certain nodes of the graph to be colored, place the node names to be colored in a `nodeColors.tsv` file, with a node name on each line, within output directory of the chunk. When rendered, these specified nodes will be colored differently than other nodes.

You can use `prepare_chunks.sh` script to generate this additional `nodeColors.tsv` by adding an additional option. Here is an example:

```
cd exampleData/
../scripts/prepare_chunks.sh -x mygraph.xg -h mygraph.gbwt -r chr1:1-100 -d 'Region A' -o chunk-chr1-1-100 -g mygam1.gam -g mygam2.gam -n "1 2 3" >> mychunks.bed
```

Adding this additional `n` flag will allow a string space delimited input of node names which will be outputted to `nodeColors.tsv`.

```
1
2
3
```

## Custom Local Subgraphs

You may want to look at a graph that has already been extracted from a larger graph.
To support this, there is a `prepare_local_chunk.sh` script, which takes a subgraph rather than a full graph.
It supports most of the options that `prepare_chunks.sh` does, with the notable exception of haplotype files.
It assumes that the graph represents some region along some reference path that is present in the graph, and expects that region to be provided with the `-r` option.
It assumes that path names in the subgraph *don't* use subregion suffixes (bracket-enclosed numbers).
The path name used in the region should *exactly* match the name of one of the paths in the graph.

`prepare_local_chunk.sh` also accepts `.gaf` files, which will automatically be converted into a GAM file using `vg convert`.

For example, you can run it like:

```
cd exampleData/
../scripts/prepare_local_chunk.sh -x subgraph.gbz -r chr5:1023911-1025911 -g subgraph_reads.gam -g other_sample_reads.gam -g another_sample_reads.gaf -o subgraph1 >> subgraphs.bed
```

Your graph can be a `.vg`, `.xg`, `.gfa`, or any other graph format understood by vg, but it *must* be in the same node ID space as your reads, and the script does *not* check this for you! In particular, indexing a GFA graph and mapping to it with `vg giraffe` can result in the original GFA nodes being cut into manageable pieces and assigned new numbers in the graph that the reads actually are aligned to, meaning the original GFA won't work here. You can check your reads against your graph with `vg validate subgraph.gfa --gam subgraph_reads.gam`. If your read alignments look completely absurd and jump all over the place, this is likely the problem.

If the original subgraph file does not remain in place under the configured `dataPath` and accessible by the tube map, errors may occur complaining that it couldn't be accessed when the tube map attempts to list ist contained paths.

The net result will be that you can select the BED file, select the region it specifies, and view a precomputed view of the subgraph, with coordinates computed assuming it covers the region provided to `prepare_local_chunk.sh`.

A note on naming node IDs when using `.gfa` files:
VG keeps node IDs the same when all node names are strictly positive integers. However, node IDs are renamed upon encountering string-named nodes. Renaming begins at the first encounter of a string-named node, using the highest integer encountered so far (+1), or 1 if the first node is string-named in the GFA file. Future nodes are renamed in a +1 manner regardless of their datatype.

Here's an example of a rename:

```
Original -> Renamed
3 -> 3
1 -> 1
five -> 4
7 -> 5
four -> 6
```

You will need to account for the graph nodes having been renamed when interpreting the visualization.
