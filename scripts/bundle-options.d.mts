import type { BuildOptions } from "esbuild"

export interface BundleOptionsInput extends Partial<BuildOptions> {
  readonly root: string
  readonly pkg: { readonly name: string; readonly version: string }
}

export declare function bundleOptions(input: BundleOptionsInput): BuildOptions
