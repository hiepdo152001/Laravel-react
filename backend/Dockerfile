FROM php:8.2-fpm
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

# Create the user and set the home directory
RUN useradd -ms /bin/bash hiepdo

# Change ownership of the directory
RUN chown -R hiepdo:hiepdo /var/www/html

# Switch to the new user
USER hiepdo

# Set working directory
WORKDIR /var/www/html

# Copy existing application directory contents to the working directory
COPY ./ .
