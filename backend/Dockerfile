FROM php:8.1-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    zip \
    unzip

# Install composer and php-extension-installer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/

# Install PHP extensions
RUN install-php-extensions gettext intl calendar redis zip pcntl gd
RUN docker-php-ext-install pdo_mysql

# Set the user
# USER www-data

# Set working directory
WORKDIR /var/www/html

# Copy existing application directory contents to the working directory
COPY ./ .
# RUN composer install
