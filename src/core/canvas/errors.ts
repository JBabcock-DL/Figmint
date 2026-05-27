export class CanvasBuildError extends Error {
  readonly code = 'CANVAS_BUILD_ERROR';
  readonly missing: string[];

  constructor(message: string, missing?: string[]) {
    super(message);
    this.name = 'CanvasBuildError';
    this.missing = missing !== undefined ? missing : [];
  }
}
