import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'lh3.googleusercontent.com',  // Google profile pictures
      's.gravatar.com',             // Gravatar images
      'cdn.auth0.com',              // Auth0 default images
    ],
  },
};

export default nextConfig;
