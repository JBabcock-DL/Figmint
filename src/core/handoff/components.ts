/// <reference types="@figma/plugin-typings" />

import type { HandoffComponentUsage } from '@detroitlabs/fighub-contracts';

import { pluginLog } from '@/core/pluginLog';

import { walkSceneTree } from './walk';

export interface EnumerateComponentsOptions {
  /** Cache dev resource lookups by mainComponent.id */
  cacheDevResources?: boolean;
}

interface DevResourceLike {
  url?: string;
}

const HTTPS_URL_PATTERN = /^https?:\/\//;

function componentAggregateKey(main: ComponentNode): string {
  const parent = main.parent;
  if (parent !== null && parent.type === 'COMPONENT_SET') {
    return parent.name;
  }
  return main.name;
}

function pickDevResourceUrl(resources: DevResourceLike[]): string | undefined {
  let firstHttps: string | undefined;
  let firstGithub: string | undefined;

  for (let i = 0; i < resources.length; i++) {
    const url = resources[i].url;
    if (typeof url !== 'string' || !HTTPS_URL_PATTERN.test(url)) {
      continue;
    }
    if (firstHttps === undefined) {
      firstHttps = url;
    }
    if (url.includes('github.com')) {
      firstGithub = url;
      break;
    }
  }

  return firstGithub ?? firstHttps;
}

async function resolveCodeConnectUrl(
  main: ComponentNode,
  cache: Map<string, string | undefined>,
  useCache: boolean,
): Promise<string | undefined> {
  if (useCache && cache.has(main.id)) {
    return cache.get(main.id);
  }

  const record = main as unknown as {
    getDevResourcesAsync?: (options?: {
      includeChildren?: boolean;
    }) => Promise<DevResourceLike[]>;
  };
  let url: string | undefined;

  if (typeof record.getDevResourcesAsync === 'function') {
    const resources = await record.getDevResourcesAsync({ includeChildren: false });
    url = pickDevResourceUrl(resources);
  }

  if (useCache) {
    cache.set(main.id, url);
  }

  return url;
}

async function resolveMainComponent(instance: InstanceNode): Promise<ComponentNode | null> {
  const syncMain = instance.mainComponent;
  if (syncMain !== null) {
    return syncMain;
  }
  return instance.getMainComponentAsync();
}

export async function enumerateComponents(
  root: SceneNode,
  options?: EnumerateComponentsOptions,
): Promise<HandoffComponentUsage[]> {
  const useCache = options?.cacheDevResources !== false;
  const instances: InstanceNode[] = [];
  const countMap = new Map<string, { count: number; main: ComponentNode }>();
  const devResourceCache = new Map<string, string | undefined>();

  walkSceneTree(root, function (node) {
    if (node.type === 'INSTANCE') {
      instances.push(node);
    }
  });

  for (let i = 0; i < instances.length; i++) {
    const instance = instances[i];

    const detached = (instance as InstanceNode & { detached?: boolean }).detached;
    if (detached === true) {
      pluginLog('[handoff] skip detached instance', instance.name);
      continue;
    }

    const main = await resolveMainComponent(instance);
    if (main === null) {
      pluginLog('[handoff] skip instance without main component', instance.name);
      continue;
    }

    const key = componentAggregateKey(main);
    const existing = countMap.get(key);
    if (existing !== undefined) {
      existing.count += 1;
    } else {
      countMap.set(key, { count: 1, main: main });
    }
  }

  const keys = Array.from(countMap.keys()).sort(function (left, right) {
    return left.localeCompare(right);
  });

  const usages: HandoffComponentUsage[] = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const entry = countMap.get(key);
    if (entry === undefined) {
      continue;
    }

    const url = await resolveCodeConnectUrl(entry.main, devResourceCache, useCache);
    const usage: HandoffComponentUsage = { name: key, instances: entry.count };
    if (url !== undefined) {
      usage.codeConnectUrl = url;
    }
    usages.push(usage);
  }

  pluginLog('[handoff] enumerateComponents', root.name, String(usages.length));

  return usages;
}
