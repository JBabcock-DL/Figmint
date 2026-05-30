export function buildFigmaNodeUrl(input: {
  fileKey: string;
  fileSlug: string;
  nodeId: string;
}): string {
  const encodedNodeId = input.nodeId.replace(/:/g, '-');
  return (
    'https://www.figma.com/design/' +
    input.fileKey +
    '/' +
    encodeURIComponent(input.fileSlug) +
    '?node-id=' +
    encodedNodeId
  );
}
