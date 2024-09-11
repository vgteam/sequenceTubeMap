# Sequence Tube Map

![Header Graphic](/images/header.png)

**Generates a "tube map"-like visualization of sequence graphs which have been created with [vg](https://github.com/vgteam/vg).**

*[See the online demo!](https://vgteam.github.io/sequenceTubeMap/)*

No idea what those squiggles are supposed to be? Read the [Introduction](doc/intro.md).

## Online Version
**Explore Without Installing Anything**

The easiest way to have a look at some graph visualizations is to check out the [online demo](https://vgteam.github.io/sequenceTubeMap/). There you can play with visualizations from a few different data sets as well as look at some examples showcasing different structural features of variation graphs. You can even provide your own [vg](https://github.com/vgteam/vg)-generated data as an input (limited to small file sizes only).

## Local Version
**Run the Sequence Tube Map on Your Own**

If you are using vg and want visualize the graphs it generates, the online version is limited to small file sizes. For visualizing bigger data sets you can run the Sequence Tube Map on your own Linux or Mac computer. You can either run the Tube Map completely on your local machine, or use your local browser to access a Tube Map server running on any other machine you have access to.

### Installation

1. Open your terminal. On Linux, you can usually hit `Ctrl` + `Alt` + `T`. On Mac, hit `Command` + `Space`, type `terminal.app`, and hit `Enter`.
2. If you don't already have Git installed, [install Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git).
3. Clone the Git repository by typing:
    ```
    git clone https://github.com/vgteam/sequenceTubeMap.git
    ```
    Then press `Enter`.
4. Switch to the `sequenceTubeMap` directory:
    ```
    cd sequenceTubeMap
    ```
5. If you don't already have vg installed, [install vg](https://github.com/vgteam/vg?tab=readme-ov-file#installation).
    - For Linux: you can drop the `vg` program file into the `sequenceTubeMap` directory and the Sequence Tube Map will find it.
        1. If you don't have `curl` installed, you may need to do something like `sudo apt update && sudo apt install curl`.
        2. Download the `vg` program and make it executable.
            ```
            curl -o vg https://github.com/vgteam/vg/releases/latest/download/vg
            chmod +x vg
            ```
            If you have an ARM computer, use `https://github.com/vgteam/vg/releases/latest/download/vg-arm64` instead.
        3. To use the data preparation scripts in `sequenceTubeMap/scripts/`, you will need to have the directory with vg in it in your `PATH` environment variable:
            ```
            echo 'export PATH="${PATH}:'"$(pwd)"'"' >>~/.bashrc
            . ~/.bashrc
            ```
    - For Mac: Open a new terminal, and follow the [vg instructions for building on MacOS](https://github.com/vgteam/vg?tab=readme-ov-file#building-on-macos). Make sure to do the part about adding vg to your `PATH` environment variable. When you come back to your original terminal, run:
        ```
        . ~/.zshrc
        ```
6. If you don't already have the right version of NodeJS, [install nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#install--update-script) which can install NodeJS:
    ```
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    ```
    (If you don't have `curl` installed, you may need to do something like `sudo apt update && sudo apt install curl`.)
7. Install the version of NodeJS that the Sequence Tube Map [asks for in its `.nvmrc` file](https://github.com/vgteam/sequenceTubeMap/blob/master/.nvmrc). As of this writing that is **18.7.0**. You can install the right version automatically with `nvm`:
    ```
    nvm install
    ```
8. Activate the appropriate version of NodeJS:
    ```
    nvm use
    ```
9. Install the exact versions of NPM dependencies that the Sequence Tube Map is tested against:
    ```
    npm ci
    ```
    Note that this is using **npm**, not **nvm** as in the previous step.
10. Build the frontend:
    ```
    npm run build
    ```

### Execution

After installation, you can run the Sequence Tube Map:

1. Open your terminal. On Linux, you can usually hit `Ctrl` + `Alt` + `T`. On Mac, hit `Command` + `Space`, type `terminal.app`, and hit `Enter`.
2. Switch to the `sequenceTubeMap` directory:
    ```
    cd sequenceTubeMap
    ```
    If you didn't clone the Git repository immediately inside your home directory, you may need to navigate to another directory first.
3. Activate the appropriate version of NodeJS. If you installed `nvm` to manage NodeJS versions, you can run:
    ```
    nvm use
    ```
4. Start the Sequence Tube Map server:
    ```
    npm run serve
    ```
    Note that this is using **npm**, not **nvm** as in the previous step.
5. Open the Sequence Tube Map in your browser.
    - If you are running the Sequence Tube Map on your local computer, you can visit [http://[::]:3001](http://[::]:3001) or [http://localhost:3001](http://localhost:3001).
    - If you are running the Sequence Tube Map on a *different* computer (for example, one accessed by SSH), you will need to connect to it there. You can try browsing to port 3001 on that machine's hostname. For example, if you connected with `ssh yourname@bigserver.example.edu`, then `bigserver.example.edu` is the hostname, and you want to visit `http://bigserver.example.edu:3001`. If that doesn't work, you can try setting up an SSH tunnel by making a second SSH connection with:
        ```
        ssh -L 3001:localhost:3001 yourname@bigserver.example.edu
        ```
        While that SSH connection is open, you will be able to see the Sequence Tube Map at [http://localhost:3001](http://localhost:3001).

### Setting Up a Visualization

The application comes with pre-set demos that you can use to learn the tool's visual language and basic features.

To set up a custom visualization of particular files, you will need to configure a set of "tracks" describing the files you want to visualize, using the "Configure Tracks" dialog in "custom (mounted files)" mode. For information on how to do this, click on the "?" help button, or [read the help documentation online](public/help/help.md).

### Adding your Own Data

To load your own data into the Sequence Tube Map, see the guide to [Adding Your Own Data](doc/data.md).

## Docker

Previously we provided a Docker image at [https://hub.docker.com/r/wolfib/sequencetubemap/](https://hub.docker.com/r/wolfib/sequencetubemap/), which contained the build of this repo as well as a vg executable for data preprocessing and extraction. We now recommend a different installation approach, either using the [online version](#online-version) or a full installation of the [local version](#local-version). However, if you would like to Dockerize the Sequence Tube Map, the repository includes a `Dockerfile`.

## Contributing

For information on how to develop on the Sequence Tube Map codebase, pleas see the [Development Guide](doc/development.md).

## License

Copyright (c) 2018 Wolfgang Beyer, licensed under the MIT License.
