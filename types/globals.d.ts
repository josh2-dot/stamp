declare module "react-qr-scanner" {
  import type { ComponentType } from "react";

  export interface QrScannerProps {
    delay?: number | false;
    onScan?: (data: { text: string } | string | null) => void;
    onError?: (err: unknown) => void;
    style?: React.CSSProperties;
    className?: string;
    constraints?: MediaStreamConstraints;
    facingMode?: "user" | "environment";
    resolution?: number;
  }

  const QrScanner: ComponentType<QrScannerProps>;
  export default QrScanner;
}
