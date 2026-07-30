export class ParseError extends Error {
  line: number;
  col: number;
  index: number;

  constructor(message: string, line: number, col: number, index: number) {
    super(`${message} (line ${line}, col ${col})`);
    this.name = "ParseError";
    this.line = line;
    this.col = col;
    this.index = index;
  }
}
