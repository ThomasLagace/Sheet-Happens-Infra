FROM nginx:latest

ARG CATALOG_CACHE=1

# Drop the stock welcome server so only our conf.d snippets are loaded.
RUN rm -f /etc/nginx/conf.d/default.conf

COPY conf.d/ /etc/nginx/conf.d/
COPY snippets/ /etc/nginx/snippets/

RUN set -eu; \
    if [ "$CATALOG_CACHE" = "0" ] || [ "$CATALOG_CACHE" = "false" ]; then \
        rm -f /etc/nginx/conf.d/10-catalog-cache-path.conf; \
        cp /etc/nginx/snippets/catalog-location.nocache.conf \
            /etc/nginx/snippets/catalog-location.active.conf; \
    else \
        cp /etc/nginx/snippets/catalog-location.cache.conf \
            /etc/nginx/snippets/catalog-location.active.conf; \
    fi
