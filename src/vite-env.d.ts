/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module "*.svg" {
  import React from "react";
  import { SVGProps } from "react";
  
  export const ReactComponent: React.FC<SVGProps<SVGSVGElement> & { title?: string }>;
  
  const src: string;
  export default src;
}
