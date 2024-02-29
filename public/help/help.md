#### Sequence Tube Map Usage Guide
The Sequence Tube Map is used to generate visualizations of genomic sequence graphs. This guide will demonstrate how to select custom data to visualize. [You can also read this guide on Github.](https://github.com/vgteam/sequenceTubeMap/blob/master/public/help/help.md)


##### Selecting Tracks
The following procedure describes adding and updating settings of custom tracks. You can use a custom track to load your own graph file, haplotype database, or file of aligned reads.

1. From the "Data" dropdown box, select "custom (mounted files)"  
![Selecting Custom Files](helpGuideImages/img1.png)  
2. Select the button that says "Configure Tracks".  
![Configure Tracks Button](helpGuideImages/img2.png)
3. Once the button is clicked on, a popup with a "+" button will be displayed. Click on this button to add tracks.  
![Track Add Button](helpGuideImages/img3.png)  
4. Select a graph, read, or haplotype track from the first dropdown. Make sure to always have at least 1 graph track. Select a data file from the list of files of that type in the second dropdown.  
![Track Selection](helpGuideImages/img4.png)  
5. Click on the settings button, where there are options to color the tracks from an existing color palette, or select any other color.  
![Track Settings Button](helpGuideImages/img5.png)  
7. To delete a track, click on the button with the "x" icon.  
![Track Delete Button](helpGuideImages/img6.png)

##### Displaying Visualizations
1. Add as many tracks as needed and exit the track picker. 
2. Add a BED file, if needed. This step is optional.
![Bed File Selection](helpGuideImages/img7.png)
3. Specify a region input. The region input can be:
   * A coordinate range (e.g. "chr1:1-100")
   * A node ID range (e.g. "node:100-110")
   * A start position and a distance (e.g. "chr1:1+100")
   * A node ID anchor and a distance (e.g. "node:100+10")
![Region Input Options](helpGuideImages/img8.png)
4. If simplifying the BED file chunk or graph is possible, users will see a "Simplify Off" button, which when clicked with toggle to "Simplify On". This option enables vg simplify, which would remove small snarls. This option will only appear when there aren't any reads to be displayed. 
5. Click Go to see the selected tracks render in the visualization area.
![Go Button](helpGuideImages/img9.png)

##### How to make link-to-view URLs
Users can compose URLs that link to a specific view. To do so, users will require specific information about files and tracks. The link has a [query string](https://en.wikipedia.org/wiki/Query_string#Structure) that consists of key-value pairs separated by ampersands, where the keys are not URL-econded and the values are URL-encoded. Keys can use brackets to encode hierarchical structures such as arrays and objects. For arrays, put a number in brackets to assign a new value to or access a value in that entry in the array, and for objects, put the key's name in brackets to assign a new value to or access a value in that entry in the object. The key's name should **not** be in quotes.

These are the fields that can be included in the URL:
1. `tracks` 

   Information about tracks. Tracks are objects consisting of `trackFile`, `trackType`, and `trackColorSettings`.

   A track object in JSON format might look like this:
   ```
   {
      "trackFile": "exampleData/internal/snp1kg-BRCA1.vg.xg",
      "trackType": "graph",
      "trackColorSettings": {
         "mainPalette": "greys",
         "auxPalette": "ygreys",
         "colorReadsByMappingQuality": false
      }
   }
   ```

   * The `trackFile` is the path (from the server working directory) or URL (any HTTP/HTTPS URL) to the track file 
     Examples:
      * `tracks[0][trackFile]=exampleData/internal/snp1kg-BRCA1.vg.xg`
      * `tracks[0][trackFile]=https://public.gi.ucsc.edu/~anovak/graphs/trivial-brca1.vg`
   * The `trackType` specifies the type of the track, which can be "graph", "haplotype", "read"
      * Example: `tracks[0][trackType]=graph`
   * The `trackColorSettings` provides color information and is an optional setting.
      * The color palettes are `mainPalette` and `auxPalette`. 
         * The colors for the palettes can be hex codes starting with a `#`, or premade palettes: `greys`, `ygreys`, `blues`, `reds`, `plainColors`, or `lightColors`. 
         * The palettes are used differently for different track types
            * For graphs, the `mainPalette` colors the primary reference path while `auxPalette` is used for the other paths. 
            * For haplotypes, only the `mainPalette` is used. 
            - For reads, the `mainPalette` colors the forward-strand reads and the `auxPalette` colors the reverse-strand reads. 
      * `colorReadsByMappingQuality` is a boolean value that determines if reads are colored based on their mapping quality or not. It is an optional field that has a default of `false`. 
      * `trackColorSettings` examples
         * `tracks[0][trackColorSettings][mainPalette]=greys`
         * `tracks[0][trackColorSettings][auxPalette]=ygreys`
         * `colorReadsByMappingQuality=true`
2. `region`

   Region input. This is documented at step 3 of
   [Displaying Visualizations](#displaying-visualizations). This region will be loaded in the tubemap visualization once the link is followed.
   * examples: `region=17:3A1-100`
3. `bedFile`

   Path (from the server working directory) or URL (any HTTP/HTTPS URL) to the bed file. It is an optional field. More information on bed file structure and creation is documented [here](https://github.com/vgteam/sequenceTubeMap?tab=readme-ov-file#preparing-subgraphs-in-advance). 
   * Examples:
      * `bedFile=exampleData/internal/snp1kg-BRCA1.bed`
      * `bedFile=https://raw.githubusercontent.com/vgteam/sequenceTubeMap/ca4f2485231ee4182173bec19489ba940b27461a/exampleData/cactus.bed`
      * `bedFile=none`
4. `datatype`

   Data can be `built-in`, `mounted files`, or synthetic `examples`.
      * `built-in`: If the `datatype` field is set to `built-in`, you should set the `name` field to the name of a preset defined in `DATA_SOURCES` in `config.json`.
      * `mounted files`: If the `datatype` field is set to `mounted files`, the `name` field must be set to custom, and you should select custom tracks along with an optional bedfile.
      * `examples`: Links to synthetic examples cannot currently be created.
   * Example: `dataType=built-in`
5. `Simplify`. 

   Whether small snarls (e.g. single base indels and SNPs) are displayed or removed. It defaults to false, which means that the small snarls are not removed.
   * Example: `simplify=false`
6. `name` 

   Name of data. This is a field that indicates the name of preset data, which is defined in `DATA_SOURCES` in `config.json`. `name` is used when `datatype` is set to `built-in`. You do not have to use these presets. 
   * Example: `name=snp1kg-BRCA1`

