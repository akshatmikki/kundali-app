import { jsPDF } from "jspdf";

declare module "svg2pdf.js" {
  export function svg2pdf(
    svgElement: SVGElement,
    pdfInstance: jsPDF,
    options?: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }
  ): void;
}