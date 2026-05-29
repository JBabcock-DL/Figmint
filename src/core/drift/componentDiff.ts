import type { ComponentSpecBinding, ComponentSpecProp } from '@detroitlabs/fighub-contracts';

import { expandVariantMatrix } from '@/core/components/scaffold/variantMatrix';

import type { ComponentComparable, ComponentDiff } from './types';

function stripPropertySuffix(key: string): string {
  const hashIndex = key.indexOf('#');
  if (hashIndex >= 0) {
    return key.slice(0, hashIndex);
  }
  return key;
}

function propsEqual(left: ComponentSpecProp[], right: ComponentSpecProp[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const leftByName: Record<string, ComponentSpecProp> = {};
  for (let i = 0; i < left.length; i++) {
    leftByName[left[i].name] = left[i];
  }
  for (let i = 0; i < right.length; i++) {
    const prop = right[i];
    const match = leftByName[prop.name];
    if (match === undefined) {
      return false;
    }
    if (JSON.stringify(match) !== JSON.stringify(prop)) {
      return false;
    }
  }
  return true;
}

function bindingKey(binding: ComponentSpecBinding): string {
  return binding.selector + '\0' + binding.variable;
}

function bindingsEqual(left: ComponentSpecBinding[], right: ComponentSpecBinding[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const leftKeys: Record<string, boolean> = {};
  for (let i = 0; i < left.length; i++) {
    leftKeys[bindingKey(left[i])] = true;
  }
  for (let i = 0; i < right.length; i++) {
    if (!leftKeys[bindingKey(right[i])]) {
      return false;
    }
  }
  return true;
}

function comboNames(matrix: Record<string, (string | boolean)[]> | undefined): string[] {
  if (matrix === undefined) {
    return [];
  }
  const expanded = expandVariantMatrix(matrix);
  const names: string[] = [];
  for (let i = 0; i < expanded.length; i++) {
    names.push(expanded[i].name);
  }
  names.sort();
  return names;
}

export function componentComparableEqual(a: ComponentComparable, b: ComponentComparable): boolean {
  if (a.variantMatrixHash !== b.variantMatrixHash) {
    return false;
  }
  if (!propsEqual(a.props, b.props)) {
    return false;
  }
  return bindingsEqual(a.bindings, b.bindings);
}

export function componentHashEqual(a: ComponentComparable, b: ComponentComparable): boolean {
  return a.variantMatrixHash === b.variantMatrixHash;
}

export function buildComponentDiff(
  a: ComponentComparable,
  b: ComponentComparable,
): ComponentDiff | null {
  if (componentComparableEqual(a, b)) {
    return null;
  }

  const diff: ComponentDiff = {};

  if (a.variantMatrixHash !== b.variantMatrixHash) {
    const figmaCombos = comboNames(a.variantMatrix);
    const repoCombos = comboNames(b.variantMatrix);
    const figmaSet: Record<string, boolean> = {};
    const repoSet: Record<string, boolean> = {};
    for (let i = 0; i < figmaCombos.length; i++) {
      figmaSet[figmaCombos[i]] = true;
    }
    for (let i = 0; i < repoCombos.length; i++) {
      repoSet[repoCombos[i]] = true;
    }
    const added: string[] = [];
    const removed: string[] = [];
    for (let i = 0; i < figmaCombos.length; i++) {
      if (!repoSet[figmaCombos[i]]) {
        added.push(figmaCombos[i]);
      }
    }
    for (let i = 0; i < repoCombos.length; i++) {
      if (!figmaSet[repoCombos[i]]) {
        removed.push(repoCombos[i]);
      }
    }
    diff.variantMatrix = {
      added: added,
      removed: removed,
      hashFigma: a.variantMatrixHash,
      hashRepo: b.variantMatrixHash,
    };
  }

  const leftProps: Record<string, ComponentSpecProp> = {};
  const rightProps: Record<string, ComponentSpecProp> = {};
  for (let i = 0; i < a.props.length; i++) {
    leftProps[a.props[i].name] = a.props[i];
  }
  for (let i = 0; i < b.props.length; i++) {
    rightProps[b.props[i].name] = b.props[i];
  }

  const propsAdded: ComponentSpecProp[] = [];
  const propsRemoved: string[] = [];
  const propsChanged: string[] = [];
  for (const name of Object.keys(rightProps)) {
    if (leftProps[name] === undefined) {
      propsAdded.push(rightProps[name]);
    } else if (JSON.stringify(leftProps[name]) !== JSON.stringify(rightProps[name])) {
      propsChanged.push(name);
    }
  }
  for (const name of Object.keys(leftProps)) {
    if (rightProps[name] === undefined) {
      propsRemoved.push(name);
    }
  }
  if (propsAdded.length > 0 || propsRemoved.length > 0 || propsChanged.length > 0) {
    diff.props = {
      added: propsAdded,
      removed: propsRemoved,
      changed: propsChanged,
    };
  }

  const leftBindings: Record<string, ComponentSpecBinding> = {};
  const rightBindings: Record<string, ComponentSpecBinding> = {};
  for (let i = 0; i < a.bindings.length; i++) {
    leftBindings[bindingKey(a.bindings[i])] = a.bindings[i];
  }
  for (let i = 0; i < b.bindings.length; i++) {
    rightBindings[bindingKey(b.bindings[i])] = b.bindings[i];
  }

  const bindingsAdded: ComponentSpecBinding[] = [];
  const bindingsRemoved: ComponentSpecBinding[] = [];
  const bindingsChanged: string[] = [];
  for (const key of Object.keys(rightBindings)) {
    if (leftBindings[key] === undefined) {
      bindingsAdded.push(rightBindings[key]);
    } else if (JSON.stringify(leftBindings[key]) !== JSON.stringify(rightBindings[key])) {
      bindingsChanged.push(rightBindings[key].selector);
    }
  }
  for (const key of Object.keys(leftBindings)) {
    if (rightBindings[key] === undefined) {
      bindingsRemoved.push(leftBindings[key]);
    }
  }
  if (bindingsAdded.length > 0 || bindingsRemoved.length > 0 || bindingsChanged.length > 0) {
    diff.bindings = {
      added: bindingsAdded,
      removed: bindingsRemoved,
      changed: bindingsChanged,
    };
  }

  return diff;
}

export function extractVariantMatrixFromDefinitions(
  definitions: ComponentPropertyDefinitions | undefined,
): Record<string, (string | boolean)[]> {
  const matrix: Record<string, (string | boolean)[]> = {};
  if (definitions === undefined || definitions === null) {
    return matrix;
  }
  const keys = Object.keys(definitions);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const def = definitions[key];
    if (def.type !== 'VARIANT') {
      continue;
    }
    const axisKey = stripPropertySuffix(key);
    const options = def.variantOptions !== undefined ? def.variantOptions.slice() : [];
    const values: (string | boolean)[] = [];
    for (let j = 0; j < options.length; j++) {
      const option = options[j];
      if (option === 'true') {
        values.push(true);
      } else if (option === 'false') {
        values.push(false);
      } else {
        values.push(option);
      }
    }
    matrix[axisKey] = values;
  }
  return matrix;
}

export function extractPropsFromDefinitions(
  definitions: ComponentPropertyDefinitions | undefined,
): ComponentSpecProp[] {
  const props: ComponentSpecProp[] = [];
  if (definitions === undefined || definitions === null) {
    return props;
  }
  const keys = Object.keys(definitions);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const def = definitions[key];
    if (def.type === 'VARIANT') {
      continue;
    }
    const name = stripPropertySuffix(key);
    if (def.type === 'BOOLEAN') {
      props.push({ name: name, type: 'boolean', default: def.defaultValue === true });
    } else if (def.type === 'TEXT') {
      props.push({
        name: name,
        type: 'string',
        default: def.defaultValue !== undefined ? String(def.defaultValue) : '',
      });
    } else if (def.type === 'INSTANCE_SWAP') {
      props.push({ name: name, type: 'node' });
    }
  }
  props.sort(function (left, right) {
    return left.name.localeCompare(right.name);
  });
  return props;
}
