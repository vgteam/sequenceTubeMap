# ---------------------------
# vg container

# FROM quay.io/vgteam/vg:v1.5.0-1753-gb1a214aa-t109-run as vgBinary
# FROM quay.io/vgteam/vg:v1.5.0-1967-g59e94bbf-t116-run as vgBinary
FROM quay.io/vgteam/vg:v1.5.0-1999-g3f8fb66f-t118-run as vgBinary

# create indices from vg and gam files
RUN mkdir -p /vg/data/out
COPY data/ /vg/data
WORKDIR /vg/data
RUN /bin/sh prepare.sh

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
COPY frontend/gulpfile.js /usr/src/app/
RUN gulp

# ---------------------------
# backend container

FROM node:boron-alpine

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
