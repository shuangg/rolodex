declare module "vcf" {
  interface VCardProperty {
    valueOf(): string | string[];
  }
  class VCard {
    get(key: string): VCardProperty | undefined;
    static parse(input: string): VCard[];
  }
  export default VCard;
}
