export type ComponentFramework = 'react' | 'vue' | 'wc' | 'swiftui' | 'compose';

export type ComponentSpecPropType = 'string' | 'number' | 'boolean' | 'enum' | 'node';

export interface ComponentSpecProp {
  name: string;
  type: ComponentSpecPropType;
  default?: string | number | boolean;
  enum?: (string | number | boolean)[];
}

export interface ComponentSpecBinding {
  selector: string;
  variable: string;
}

export interface ComponentSpecSizing {
  horizontal: 'hug' | 'fill' | 'fixed';
  vertical: 'hug' | 'fill' | 'fixed';
}

export interface ComponentSpecLayout {
  direction: 'horizontal' | 'vertical';
  gap: string;
  padding?: string;
  sizing: ComponentSpecSizing;
}

export interface ComponentSpecSubComponent {
  name: string;
  registryRef: string;
}

export type ComponentSpecConfidenceLevel = 'high' | 'medium' | 'low';

export interface ComponentSpecConfidence {
  layout: ComponentSpecConfidenceLevel;
  bindings: ComponentSpecConfidenceLevel;
  unresolved?: string[];
}

export type ComponentSpecLayoutArchetype =
  | 'chip'
  | 'surface-stack'
  | 'field'
  | 'row-item'
  | 'tiny'
  | 'container'
  | 'control';

export type ComponentSpecCategory =
  | 'Form & Input'
  | 'Layout & Display'
  | 'Overlay & Dialog'
  | 'Navigation'
  | 'Feedback & Status'
  | 'Data Display'
  | 'Typography & platform';

export interface ComponentSpecComposeEntry {
  component: string;
  slot: string;
  cardinality: 'one' | 'many';
  count?: number;
  defaultProps?: Record<string, string | number | boolean>;
}

export interface ComponentSpecArchetypeConfig {
  archetype?: ComponentSpecLayoutArchetype;
  surface?: Record<string, unknown>;
  field?: Record<string, unknown>;
  row?: Record<string, unknown>;
  tiny?: Record<string, unknown> & {
    shape?:
      | 'separator'
      | 'skeleton'
      | 'spinner'
      | 'progress'
      | 'avatar'
      | 'aspect-ratio'
      | 'scroll-area';
  };
  control?: Record<string, unknown> & {
    shape?: 'checkbox' | 'radio' | 'switch';
  };
  container?: Record<string, unknown> & {
    kind?: 'accordion' | 'tabs';
  };
  iconSlots?: {
    leading?: boolean;
    trailing?: boolean;
    size?: number;
  };
  componentProps?: Record<string, unknown>;
  category?: ComponentSpecCategory;
  composes?: ComponentSpecComposeEntry[];
}

export interface ComponentSpecV1 extends ComponentSpecArchetypeConfig {
  v: 1;
  kind: 'component-spec';
  name: string;
  framework: ComponentFramework;
  variantMatrix: Record<string, (string | boolean)[]>;
  props: ComponentSpecProp[];
  bindings: ComponentSpecBinding[];
  layout: ComponentSpecLayout;
  subComponents?: ComponentSpecSubComponent[];
  confidence?: ComponentSpecConfidence;
}
