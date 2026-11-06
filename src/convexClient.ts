import { ConvexReactClient } from "convex/react";

const convexUrl = (import.meta.env.VITE_CONVEX_URL as string) || "https://shocking-opossum-923.eu-west-1.convex.cloud";

export const convex = new ConvexReactClient(convexUrl);
