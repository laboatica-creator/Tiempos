/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        unoptimized: true,
    },
    // Ensure trailing slashes don't break the API calls
    trailingSlash: false,
};

module.exports = nextConfig;
