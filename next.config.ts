import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Turns on React's `<ViewTransition>`, which the month deck needs.
     *
     * The problem it solves: React removes the old month from the DOM before
     * the new one paints, and you cannot animate a thing that no longer exists.
     * Every exit animation in this app until now belonged to a Radix primitive,
     * and it worked only because Radix deliberately delays unmounting until its
     * CSS animation ends. Nothing does that for a plain `setState`.
     *
     * `<ViewTransition>` gets around it from the other side: the browser
     * screenshots the old tree and the new one, paints both as pseudo-elements
     * over the page, and interpolates between them. React's job is only to say
     * *which* elements pair up and what class to give them.
     *
     * Flagged experimental, and worth knowing what that means here: the API
     * shape can change between Next versions. Without browser support the app
     * still works — the transitions simply don't animate.
     */
    viewTransition: true,
  },
};

export default nextConfig;
