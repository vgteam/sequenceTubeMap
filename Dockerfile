# ---------------------------
# vg container

FROM quay.io/vgteam/vg:v1.6.0-382-g0fe63b96-t133-run as vgBinary

# create indices from vg and gam files
RUN mkdir -p /vg/data/out
COPY data/ /vg/data
WORKDIR /vg/data
RUN ./prepare.sh

# ---------------------------
# frontend container

FROM node:boron as frontend
RUN npm install -g bower gulp

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY frontend/package.json /usr/src/app/
RUN npm install

COPY frontend/bower.json /usr/src/app/
RUN bower install --allow-root

# build frontend
COPY frontend/.babelrc /usr/src/app/
COPY frontend/app/ /usr/src/app/app/
COPY frontend/config.default.json /usr/src/app/
COPY frontend/gulpfile.js /usr/src/app/
RUN gulp

# ---------------------------
# backend container

FROM node:boron-alpine
RUN apk add --update bash

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY backend/package.json /usr/src/app/
RUN npm install

# copy backend files
COPY backend/app.js /usr/src/app/
COPY backend/prepare_vg.sh /usr/src/app/
COPY backend/prepare_gam.sh /usr/src/app/

# copy frontend files
COPY --from=frontend /usr/src/app/dist/ /usr/src/app/public/

# copy vg
COPY --from=vgBinary /vg/bin/vg /usr/src/app/vg/vg

# copy sequence data
COPY --from=vgBinary /vg/data/out/ /usr/src/app/internalData

EXPOSE 3000

CMD [ "node", "app.js" ]
