declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: import("jspdf-autotable").UserOptions) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}
