# Docker container for the sequenceTubeMap

The provided [Dockerfile](Dockerfile) can build an image with the sequenceTubeMap and its dependencies.

An image is provided at `quay.io/jmonlong/sequencetubemap` ([quay.io](quay.io/jmonlong/sequenceTubeMap)).

## How to run

The sequenceTubeMap in the image is configured to look for mounted files in the `/data` folder within the container. 
Hence, assuming all files (pangenomes, reads) are in the current working directory, start the container with:

```sh
docker run -it -p 3210:3000 -v `pwd`:/data quay.io/jmonlong/sequencetubemap:vg1.48.0
```

Of note, the `-p` option redirects port 3000 to 3210. 
In practice, pick an unused port.

Then open: http://localhost:3210/

### Access a sequenceTubeMap running on a server with SSH

If the container is running on a server, accessed through SSH, the browser page can be accessed locally by creating a SSH tunnel with, for example:

```sh
ssh -N -L 3210:localhost:3210 USER@SERVER
```

## Building/updating

### Building the docker image locally

From this directory:

```sh
docker build -t sequencetubemap -f Dockerfile ..
```

### Pushing to quay.io

```sh
docker tag sequencetubemap quay.io/jmonlong/sequencetubemap:vg1.48.0
docker push quay.io/jmonlong/sequencetubemap:vg1.48.0
```
