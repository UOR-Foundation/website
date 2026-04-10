/**
 * API Explorer module types.
 */

export interface Param {
  name: string;
  in: "query" | "body";
  type: string;
  required: boolean;
  default?: string;
  description: string;
  enum?: string[];
}

export interface Endpoint {
  operationId: string;
  method: "GET" | "POST";
  path: string;
  label: string;
  explanation: string;
  useCase: string;
  params: Param[];
  defaultBody?: string;
  responseCodes: number[];
  example: string;
}

export interface V2Stub {
  label: string;
  description: string;
  path: string;
}

export interface Layer {
  id: string;
  icon: React.ElementType;
  layerNum: number;
  title: string;
  oneLiner: string;
  whyItMatters: string;
  solves: string;
  endpoints: Endpoint[];
  v2stubs?: V2Stub[];
}

export interface DiscoveryEndpoint {
  method: "GET";
  path: string;
  label: string;
  explanation: string;
  example: string;
}
