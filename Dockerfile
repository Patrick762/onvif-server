FROM node:22-alpine

ADD . /app
WORKDIR /app
RUN npm install

ENV ONVIF_PORT=8081
ENV RTSP_PORT=8554
ENV SNAPSHOT_PORT=8580

ENV STREAM_UUID=
ENV STREAM_RTSP_PATH=
ENV STREAM_SNAPSHOT_PATH=
ENV STREAM_WIDTH=
ENV STREAM_HEIGHT=
ENV STREAM_FRAMERATE=
ENV STREAM_BITRATE=
ENV STREAM_QUALITY=
ENV STREAM_TARGET_HOST=
ENV STREAM_TARGET_RTSP=
ENV STREAM_TARGET_SNAPSHOT=

CMD ["node", "main.js"]
