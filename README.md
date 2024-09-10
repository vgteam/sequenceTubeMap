# Sequence Tube Map

![Header Graphic](/images/header.png)

**Generates a "tube map"-like visualization of sequence graphs which have been created with [vg](https://github.com/vgteam/vg).**

*[See the online demo!](https://vgteam.github.io/sequenceTubeMap/)*

No idea what those squiggles are supposed to be? Read the [Introduction](doc/intro.md).

## Online Version: Explore Without Installing Anything

The easiest way to have a look at some graph visualizations is to check out the online demo at [https://vgteam.github.io/sequenceTubeMap/](https://vgteam.github.io/sequenceTubeMap/). There you can play with visualizations from a few different data sets as well as look at some examples showcasing different structural features of variation graphs. You can even provide your own [vg](https://github.com/vgteam/vg)-generated data as an input (limited to small file sizes only).

## Local Version: Run the Sequence Tube Map On Your Own

If you are using vg and want visualize the graphs it generates, the online version is limited to small file sizes. For visualizing bigger data sets you can run the Sequence Tube Map on your own. You can either run the Tube Map completely on your local  machine or use your local browser to access a Tube Map server running on any other machine you have access to.

(Previously we provided a docker image at [https://hub.docker.com/r/wolfib/sequencetubemap/](https://hub.docker.com/r/wolfib/sequencetubemap/), which contained the build of this repo as well as a vg executable for data preprocessing and extraction. We now recommend a different installation approach.)

### Prerequisites

* The NodeJS version [specified in the `.nvmrc` file](https://github.com/vgteam/sequenceTubeMap/blob/master/.nvmrc), which as of this writing is **18.7.0**. Other several other NodeJS versions will work, or at least mostly work, but only this version is tested. This version of NodeJS can be installed on most systems with [nvm](https://github.com/nvm-sh/nvm).
* NPM. NPM comes included in most NodeJS installations. Ubuntu packages it as a separate `npm` package.
* [vg](https://github.com/vgteam/vg) (vg can be tricky to compile. If you run into problems, there are docker images for vg at [https://github.com/vgteam/vg_docker](https://github.com/vgteam/vg_docker).)

The directory containing the vg executable needs to be added to your environment path:

```
PATH=/<your_path_to_folder_with_vg>:$PATH
```

### Installation

- Clone the repo:
  ```
  git clone https://github.com/vgteam/sequenceTubeMap.git
  ```
- Switch to the `sequenceTubeMap` folder:
  ```
  cd sequenceTubeMap
  ```
- Install npm dependencies:
  ```
  npm install
  ```
- Build the frontend:
  ```
  npm run build
  ```

### Execution

- Start the node server:
  ```
  npm run serve
  ```
- If the node server is running on your local machine, open a browser tab and go to `localhost:3001`.
- If the node server is running on a different machine, open a local browser tab and go to the server's URL on port 3001 `http://<your server's IP or URL>:3001/`.
  If you cannot access the server's port 3001 from the browser, instead of configuring firewall rules etc., it's probably easiest to set up an SSH tunnel.

```
ssh -N -L 3001:localhost:3001 <your username>@<your server>
```

### Setting Up a Visualization

The application comes with pre-set demos that you can use to learn the tool's visual language and basic features.

To set up a custom visualization of particular files, you will need to configure a set of "tracks" describing the files you want to visualize, using the "Configure Tracks" dialog in "custom (mounted files)" mode. For information on how to do this, click on the "?" help button, or [read the help documentation online](public/help/help.md).


## Contributing

For information on how to develop on the Sequence Tube Map codebase, pleas see [the Development Guide](doc/development.md).

## License

Copyright (c) 2018 Wolfgang Beyer, licensed under the MIT License.
