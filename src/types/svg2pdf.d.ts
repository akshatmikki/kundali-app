declare module "svg2pdf.js" {
  const svg2pdf: (svgElement: SVGElement, pdfInstance: any, options: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }) => void;

  export default svg2pdf;
}
