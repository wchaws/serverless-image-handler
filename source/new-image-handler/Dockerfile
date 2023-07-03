# FROM public.ecr.aws/docker/library/node:14-alpine3.16 as node-with-vips

# ARG VIPS_VERSION=8.11.3

# RUN set -x -o pipefail \
#     && wget -O- https://github.com/libvips/libvips/releases/download/v${VIPS_VERSION}/vips-${VIPS_VERSION}.tar.gz | tar xzC /tmp \
#     && apk update \
#     && apk upgrade \
#     && apk add build-base \
#     zlib-dev libxml2-dev glib-dev gobject-introspection-dev \
#     libjpeg-turbo-dev libexif-dev lcms2-dev fftw-dev giflib-dev libpng-dev \
#     libwebp-dev orc-dev tiff-dev poppler-dev librsvg-dev libgsf-dev openexr-dev \
#     libheif-dev libimagequant-dev pango-dev cfitsio-dev expat-dev openjpeg-dev imagemagick-dev \
#     py-gobject3-dev \
#     && cd /tmp/vips-${VIPS_VERSION} \
#     && ./configure --prefix=/usr \
#                    --with-magick \
#                    --disable-static \
#                    --disable-dependency-tracking \
#                    --enable-silent-rules \
#     && make -s install-strip \
#     && cd $OLDPWD \
#     && rm -rf /tmp/vips-${VIPS_VERSION} \
#     # && apk del --purge vips-dependencies \
#     && rm -rf /var/cache/apk/*

FROM public.ecr.aws/docker/library/node:14-alpine3.16 as builder

WORKDIR /app

COPY package.json yarn.lock /app/

# FIXME: try to remove font-noto when https://github.com/lovell/sharp/issues/3393 is fixed.
RUN apk update && \
    apk add fontconfig font-noto

RUN yarn

COPY . .

RUN yarn build


FROM public.ecr.aws/docker/library/node:14-alpine3.16

WORKDIR /app

COPY package.json yarn.lock /app/
COPY ./fonts/* /usr/share/fonts/

# FIXME: try to remove font-noto when https://github.com/lovell/sharp/issues/3393 is fixed.
RUN apk update && \
    apk add fontconfig font-noto ffmpeg

ENV NODE_ENV=production

RUN yarn --production && \
    yarn cache clean --all

COPY --from=builder /app/lib /app/lib
# COPY test/fixtures /app/lib/test/fixtures

EXPOSE 8080

CMD ["node", "/app/lib/src/index.js"]