import type { DeviceCodeResponse, DeviceTokenPollResult } from '@/io/github/deviceFlow';
import { pollDeviceTokenViaRelay, requestDeviceCodeViaRelay } from '@/io/github/relayClient';

export async function startDeviceFlow(scope: string): Promise<DeviceCodeResponse> {
  return requestDeviceCodeViaRelay(scope);
}

export async function pollDeviceFlow(deviceCode: string): Promise<DeviceTokenPollResult> {
  return pollDeviceTokenViaRelay(deviceCode);
}
