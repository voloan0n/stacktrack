import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,

  // Allow both /app and /pages/api to coexist
  pageExtensions: ["ts", "tsx"],
  outputFileTracingRoot: path.join(__dirname, ".."),

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            // Make icons CSS-resizable by removing hardcoded width/height attributes.
            // Consumers can size via Tailwind classes like `h-4 w-4`.
            dimensions: false,
            expandProps: "end",
            svgo: true,
            svgoConfig: {
              plugins: [
                {
                  name: "preset-default",
                  params: {
                    overrides: {
                      // Keep viewBox so icons remain scalable.
                      removeViewBox: false,
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    });
    return config;
  },
};

export default nextConfig;
