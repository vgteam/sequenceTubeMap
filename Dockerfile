FROM quay.io/vgteam/vg:v1.5.0-1753-gb1a214aa-t109-run as vgBinary

FROM node:boron-alpine

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY backend/package.json /usr/src/app/
RUN npm install

# copy backend
COPY backend/app.js /usr/src/app/
COPY backend/prepare_vg.sh /usr/src/app/
COPY backend/prepare_gam.sh /usr/src/app/

# copy frontend
#COPY public/ /usr/src/app/public/
COPY frontend/dist/ /usr/src/app/public/

# copy vg
#COPY vg/ /usr/src/app/vg/
COPY --from=vgBinary /vg/bin/vg /usr/src/app/vg/vg

# copy sequence data
COPY backend/internalData/ /usr/src/app/internalData

EXPOSE 3000

CMD [ "node", "app.js" ]
