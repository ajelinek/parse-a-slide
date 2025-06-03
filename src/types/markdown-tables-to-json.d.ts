declare module 'markdown-tables-to-json' {
  /**
   * Converts a markdown table string to a JSON array of objects
   * @param markdown The markdown table as a string
   * @param options Optional configuration
   */
  function markdownTablesToJson<T = Record<string, string>[]>(
    markdown: string,
    options?: {
      /** Whether to remove the header row from the output */
      stripHeaderRow?: boolean;
      /** Custom headers to use instead of the ones in the markdown */
      headers?: string[];
    }
  ): T;

  export = markdownTablesToJson;
}
