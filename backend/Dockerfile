# Backend Laravel untuk hosting gratis Render (plan free, Docker).
# Build: composer install. Start: migrate lalu serve di $PORT Render.
FROM php:8.3-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev libzip-dev zip unzip git \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql bcmath zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .
RUN composer install --no-dev --optimize-autoloader --no-interaction \
    && chown -R www-data:www-data storage bootstrap/cache

CMD php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=${PORT:-10000}
