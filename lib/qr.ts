import QRCode from "qrcode";

export async function generateQR(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    errorCorrectionLevel: "H",
    width: 600,
    margin: 2,
    color: {
      dark: "#0A0A14",
      light: "#F7F6F2",
    },
  });
}

export async function generateQRDataURL(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "H",
    width: 600,
    margin: 2,
    color: {
      dark: "#0A0A14",
      light: "#F7F6F2",
    },
  });
}
