FROM php:8.2-fpm
# Install system dependencies including OpenJDK 21, Xvfb, xdotool, ImageMagick, and Openbox
RUN apt-get update && apt-get install -y \
    curl \
    git \
    zip \
    unzip \
    procps \
    xvfb \
    xdotool \
    imagemagick \
    openbox \
    openjdk-21-jre \
    && rm -rf /var/lib/apt/lists/*

# Fix ImageMagick security policy if needed
RUN sed -i 's/<policy domain="coder" rights="none" pattern="PDF" \/>/<policy domain="coder" rights="read|write" pattern="PDF" \/>/g' /etc/ImageMagick-6/policy.xml 2>/dev/null || true

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
