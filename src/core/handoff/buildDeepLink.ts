export function buildDeepLink(fileKey: string, fileName: string, nodeId: string): string {
  if (fileKey === '') {
    return '';
  }
  const encodedName = encodeURIComponent(fileName);
  const nodeParam = nodeId.replace(/:/g, '-');
  return 'https://www.figma.com/design/' + fileKey + '/' + encodedName + '?node-id=' + nodeParam;
}
