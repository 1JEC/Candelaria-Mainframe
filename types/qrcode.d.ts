declare module "qrcode" {
  export function toDataURL(
    data: string,
    options?: any
  ): Promise<string>;
}
