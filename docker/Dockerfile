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
	nano

RUN npm cache clean -f

RUN npm install -g n && n stable

# download vg binary
RUN wget --quiet --no-check-certificate  https://github.com/vgteam/vg/releases/download/v1.59.0/vg \
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
