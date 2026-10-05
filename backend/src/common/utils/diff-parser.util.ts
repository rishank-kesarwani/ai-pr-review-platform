export interface DiffHunkLine {
  oldLineNumber?: number;
  newLineNumber?: number;
  type: 'add' | 'del' | 'normal';
  content: string;
}

export interface ParsedDiffFile {
  filename: string;
  previousFilename?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  validLines: number[]; // All new line numbers that exist in this PR diff
}

export function parseDiffPatch(patch: string | undefined): { validLines: number[]; hunks: DiffHunkLine[] } {
  const validLines: number[] = [];
  const hunks: DiffHunkLine[] = [];

  if (!patch) {
    return { validLines, hunks };
  }

  const lines = patch.split('\n');
  let currentNewLine = 0;
  let currentOldLine = 0;

  for (const line of lines) {
    // Hunk header format: @@ -oldStart,oldLen +newStart,newLen @@
    const hunkHeader = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkHeader) {
      currentOldLine = parseInt(hunkHeader[1], 10);
      currentNewLine = parseInt(hunkHeader[2], 10);
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      validLines.push(currentNewLine);
      hunks.push({
        newLineNumber: currentNewLine,
        type: 'add',
        content: line.substring(1),
      });
      currentNewLine++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      hunks.push({
        oldLineNumber: currentOldLine,
        type: 'del',
        content: line.substring(1),
      });
      currentOldLine++;
    } else if (line.startsWith(' ') || line === '') {
      validLines.push(currentNewLine);
      hunks.push({
        oldLineNumber: currentOldLine,
        newLineNumber: currentNewLine,
        type: 'normal',
        content: line.startsWith(' ') ? line.substring(1) : line,
      });
      currentOldLine++;
      currentNewLine++;
    }
  }

  return { validLines, hunks };
}
