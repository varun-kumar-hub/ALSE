/**
 * Pluggable Universal File Parser Registry
 * Supports Documents, Spreadsheets, Code, Data, Images, and OCR.
 */

export interface ParsedFileSection {
  title?: string;
  pageNumber?: number;
  content: string;
  type: 'text' | 'table' | 'code' | 'ocr_handwritten' | 'ocr_printed' | 'data';
}

export interface ParsedFileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  extension: string;
  pageCount?: number;
  recordCount?: number;
  isScanned?: boolean;
  containsHandwriting?: boolean;
  language?: string;
}

export interface ParsedFileResult {
  fileId: string;
  metadata: ParsedFileMetadata;
  fullText: string;
  sections: ParsedFileSection[];
  tables?: string[];
  codeStructure?: {
    functions: string[];
    classes: string[];
    imports: string[];
  };
  summary: string;
}

export interface IFileParser {
  id: string;
  name: string;
  supportedExtensions: string[];
  supportedMimeTypes: string[];
  parse(file: File | { name: string; size: number; type: string; content: string | ArrayBuffer }): Promise<ParsedFileResult>;
}

/**
 * Text & Markdown Parser
 */
export class TextAndMarkdownParser implements IFileParser {
  id = 'text_markdown';
  name = 'Text & Markdown Parser';
  supportedExtensions = ['txt', 'md', 'markdown', 'rtf', 'log', 'csv', 'tsv', 'json', 'xml', 'yaml', 'yml', 'toml'];
  supportedMimeTypes = ['text/plain', 'text/markdown', 'text/csv', 'application/json', 'text/xml'];

  async parse(file: File | { name: string; size: number; type: string; content: string | ArrayBuffer }): Promise<ParsedFileResult> {
    let contentText = '';
    if ('content' in file && typeof file.content === 'string') {
      contentText = file.content;
    } else if (file instanceof File) {
      contentText = await file.text();
    } else if ('content' in file && file.content instanceof ArrayBuffer) {
      contentText = new TextDecoder('utf-8').decode(file.content);
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
    const lines = contentText.split('\n');

    return {
      fileId: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'text/plain',
        extension: ext,
        recordCount: lines.length,
      },
      fullText: contentText,
      sections: [
        {
          title: file.name,
          pageNumber: 1,
          content: contentText.slice(0, 12000),
          type: ext === 'json' || ext === 'yaml' ? 'data' : 'text',
        },
      ],
      summary: `Parsed ${ext.toUpperCase()} file (${file.name}) with ${lines.length} lines.`,
    };
  }
}

/**
 * Code File Parser (AST & Structure Extraction)
 */
export class CodeFileParser implements IFileParser {
  id = 'code_parser';
  name = 'Source Code AST Parser';
  supportedExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'php', 'html', 'css', 'sql', 'sh', 'bat', 'ps1'
  ];
  supportedMimeTypes = ['text/x-python', 'text/javascript', 'text/x-typescript', 'text/x-java-source', 'text/x-c'];

  async parse(file: File | { name: string; size: number; type: string; content: string | ArrayBuffer }): Promise<ParsedFileResult> {
    let codeText = '';
    if ('content' in file && typeof file.content === 'string') {
      codeText = file.content;
    } else if (file instanceof File) {
      codeText = await file.text();
    } else if ('content' in file && file.content instanceof ArrayBuffer) {
      codeText = new TextDecoder('utf-8').decode(file.content);
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'code';
    const lines = codeText.split('\n');

    // Extract functions, classes, and imports
    const functions: string[] = [];
    const classes: string[] = [];
    const imports: string[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (/^(import|export|require|use|include|using)\b/i.test(trimmed)) {
        imports.push(trimmed);
      } else if (/\b(class|struct|interface|enum|type)\s+([A-Za-z0-9_]+)/i.test(trimmed)) {
        const match = trimmed.match(/\b(class|struct|interface|enum|type)\s+([A-Za-z0-9_]+)/i);
        if (match) classes.push(`${match[1]} ${match[2]}`);
      } else if (/\b(function|def|fn|func|public|private|async)\s+([A-Za-z0-9_]+)/i.test(trimmed)) {
        const match = trimmed.match(/\b(function|def|fn|func|public|private|async)\s+([A-Za-z0-9_]+)/i);
        if (match) functions.push(match[2]);
      }
    });

    return {
      fileId: `code_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'text/plain',
        extension: ext,
        recordCount: lines.length,
        language: ext,
      },
      fullText: codeText,
      sections: [
        {
          title: `Source Code: ${file.name}`,
          pageNumber: 1,
          content: codeText.slice(0, 15000),
          type: 'code',
        },
      ],
      codeStructure: {
        functions: functions.slice(0, 20),
        classes: classes.slice(0, 15),
        imports: imports.slice(0, 15),
      },
      summary: `Parsed ${ext.toUpperCase()} source file with ${lines.length} lines, ${functions.length} functions, and ${classes.length} types/classes.`,
    };
  }
}

/**
 * Universal File Parser Registry Coordinator
 */
export class FileParserRegistry {
  private parsers: IFileParser[] = [
    new TextAndMarkdownParser(),
    new CodeFileParser(),
  ];

  public registerParser(parser: IFileParser): void {
    this.parsers.unshift(parser);
  }

  public async parseFile(
    file: File | { name: string; size: number; type: string; content: string | ArrayBuffer }
  ): Promise<ParsedFileResult> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // Find matching parser
    const matched = this.parsers.find(
      (p) => p.supportedExtensions.includes(ext) || p.supportedMimeTypes.includes(file.type)
    );

    if (matched) {
      return matched.parse(file);
    }

    // Default fallback to text parser
    const fallback = new TextAndMarkdownParser();
    return fallback.parse(file);
  }
}

export const fileParserRegistry = new FileParserRegistry();
