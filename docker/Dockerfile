FROM ubuntu:20.04
MAINTAINER jmonlong@ucsc.edu

ENV DEBIAN_FRONTEND noninteractive
ENV DEBCONF_NONINTERACTIVE_SEEN true

ENV TZ=America/Los_Angeles

# install basic apt dependencies
# note: most vg apt dependencies are installed by "make get-deps" below
RUN apt-get -qq update && apt-get -qq install -y \
    git \
    wget \
    less \
    npm \
    nano \
    make \
    g++ \
    gcc \
    zlib1g-dev \
    libbz2-dev \
    liblzma-dev \
    python3 \
    build-essential

# install tabix/bgzip
RUN wget --quiet --no-check-certificate https://github.com/samtools/htslib/releases/download/1.21/htslib-1.21.tar.bz2 && \
    tar -xjvf htslib-1.21.tar.bz2 && \
    cd htslib-1.21 && \
    ./configure && \
    make && make install

# install node
RUN npm cache clean -f

RUN npm install -g n && n stable

# download vg binary
RUN wget --quiet --no-check-certificate  https://github.com/vgteam/vg/releases/download/v1.64.1/vg \
	&& mv vg /bin/vg && chmod +x /bin/vg

WORKDIR /build
# RUN git clone https://github.com/vgteam/sequenceTubeMap.git
COPY . /build/sequenceTubeMap/

# change the config to look for files in /data
COPY docker/config.json /build/sequenceTubeMap/src/

WORKDIR /build/sequenceTubeMap

RUN npm install

RUN npx browserslist@latest --update-db

# RUN npm audit fix

RUN npm rebuild node-sass

RUN npm run build

WORKDIR /build/sequenceTubeMap/
CMD ["npm", "run", "serve"]
