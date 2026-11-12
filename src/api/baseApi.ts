import type { APIRequestContext, APIResponse, Response } from '@playwright/test';
import type { JsonValue } from '../interfaces/json.js';

export abstract class BaseApi {
  protected constructor(private readonly request: APIRequestContext) {}

  /**
   * Sends a GET request through the supplied context, preserving its cookies and settings.
   *
   * @param url - Request URL supplied by the concrete API client.
   * @returns The response for domain-specific processing.
   */
  protected async get(url: string): Promise<APIResponse> {
    return this.request.get(url);
  }

  /**
   * Checks the HTTP status and decodes a browser or API response as JSON.
   *
   * @param response - Captured browser response or an API request response.
   * @returns JSON data for domain-specific validation.
   * @throws Error for an unsuccessful HTTP response or invalid JSON.
   */
  protected static async getResponseJson(response: Response | APIResponse): Promise<JsonValue> {
    if (!response.ok()) {
      throw new Error(`API HTTP ${response.status()}: ${response.url()}`);
    }

    return (await response.json()) as JsonValue;
  }
}
