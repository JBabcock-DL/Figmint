export interface HandoffScreenshot {
  format: 'png';
  dataUrl: string;
}

export interface HandoffFrame {
  nodeId: string;
  name: string;
  deepLink: string;
  screenshot: HandoffScreenshot;
}

export interface HandoffComponentUsage {
  name: string;
  instances: number;
  codeConnectUrl?: string;
}

export interface HandoffAutoLayout {
  direction: 'vertical' | 'horizontal';
  gap: string;
  padding?: string;
}

export interface HandoffContextMeta {
  capturedAt: string;
  figmaFileKey: string;
  frameUrl: string;
}

export interface HandoffContextV1 {
  v: 1;
  kind: 'handoff-context';
  meta: HandoffContextMeta;
  frames: HandoffFrame[];
  components: HandoffComponentUsage[];
  tokensUsed: string[];
  autoLayout: HandoffAutoLayout;
}
