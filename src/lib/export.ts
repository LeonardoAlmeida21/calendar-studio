import { toCanvas } from "html-to-image";
import { downloadBlob, safeFilename } from "./storage";
export type ExportFormat = "jpg" | "png" | "pdf";
export async function captureImage(
  element: HTMLElement,
  scale: number,
  type: "image/png" | "image/jpeg",
  quality = 0.95,
): Promise<Blob> {
  await document.fonts.ready;
  const width = element.scrollWidth,
    height = element.scrollHeight;
  if (
    width * scale > 8192 ||
    height * scale > 8192 ||
    width * height * scale * scale > 40_000_000
  )
    throw new Error(
      "Esta imagem é demasiado grande. Escolhe menos meses ou a resolução 2×.",
    );
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  const canvas = await toCanvas(element, {
    pixelRatio: scale,
    width,
    height,
    backgroundColor: getComputedStyle(element).backgroundColor,
    skipAutoScale: true,
    preferredFontFormat: "woff2",
  });
  try {
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(
                new Error(
                  "O navegador não conseguiu gerar a imagem. Escolhe menos meses ou menor resolução.",
                ),
              ),
        type,
        quality,
      ),
    );
    if (blob.type !== type)
      throw new Error(
        "Este navegador não suporta o formato selecionado. Experimenta PNG.",
      );
    return blob;
  } finally {
    canvas.width = canvas.height = 1;
  }
}
export async function exportImages(
  element: HTMLElement,
  format: "jpg" | "png",
  scale: number,
  name: string,
) {
  const blob = await captureImage(
    element,
    scale,
    format === "jpg" ? "image/jpeg" : "image/png",
  );
  downloadBlob(blob, `${safeFilename(name)}.${format}`);
}
export async function exportPdf(
  elements: HTMLElement[],
  paper: "a4" | "a3",
  orientation: "landscape" | "portrait",
  name: string,
  onProgress: (message: string) => void,
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: paper,
    compress: true,
  });
  const pageWidth = pdf.internal.pageSize.getWidth(),
    pageHeight = pdf.internal.pageSize.getHeight();
  for (let index = 0; index < elements.length; index++) {
    const element = elements[index];
    const ratio = Math.min(
      (pageWidth - 20) / element.scrollWidth,
      (pageHeight - 20) / element.scrollHeight,
    );
    const width = element.scrollWidth * ratio,
      height = element.scrollHeight * ratio;
    const minimumFont =
      (Number(
        getComputedStyle(element)
          .getPropertyValue("--event-font")
          .replace("px", ""),
      ) *
        ratio *
        72) /
      25.4;
    if (minimumFont < 7.95)
      throw new Error(
        "Há um mês demasiado denso para este papel. Usa A3, outra orientação ou ajusta o texto.",
      );
    onProgress(`A gerar página ${index + 1} de ${elements.length}…`);
    const scale = ((width / 25.4) * 300) / element.scrollWidth;
    const blob = await captureImage(element, scale, "image/png");
    if (index) pdf.addPage(paper, orientation);
    pdf.addImage(
      new Uint8Array(await blob.arrayBuffer()),
      "PNG",
      (pageWidth - width) / 2,
      10,
      width,
      height,
      undefined,
      "FAST",
    );
  }
  downloadBlob(pdf.output("blob"), `${safeFilename(name)}.pdf`);
}
