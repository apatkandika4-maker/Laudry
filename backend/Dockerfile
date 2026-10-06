# Backend Laravel untuk hosting Render (plan free, Docker).
# Build: composer install. Start: migrate (+ seed sekali) lalu serve di $PORT Render.
FROM php:8.3-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev libzip-dev zip unzip git \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql bcmath zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .
RUN composer install --no-dev --optimize-autoloader --no-interaction \
    && chmod -R ug+rw storage bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker-start.sh /usr/local/bin/docker-start.sh
RUN chmod +x /usr/local/bin/docker-start.sh

CMD ["/usr/local/bin/docker-start.sh"]
